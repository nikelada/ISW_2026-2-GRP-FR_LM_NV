import { prisma } from '../config/prisma.js';
import { fechaActual } from '../utils/fecha.js';
import { aFecha, aHora, aRespuesta, obtenerPorId, textoFecha, textoHora } from './solicitud.service.js';

const INCLUIR_CLIENTE = { cliente: { select: { id: true, nombre: true } } };
// Cuántos días antes y después se buscan alternativas
const DIAS_ALTERNATIVAS = 14;
const MAX_ALTERNATIVAS = 5;
const FIN_DEL_DIA = 23 * 60 + 59;

// Eventos entre dos fechas, ordenados por día y hora
export async function listarEventos(desde, hasta) {
  const eventos = await prisma.solicitud.findMany({
    where: { fecha: { gte: aFecha(desde), lte: aFecha(hasta) } },
    include: INCLUIR_CLIENTE,
    orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }]
  });
  return eventos.map(aRespuesta);
}

// Hay conflicto si un evento confirmado ese mismo día se cruza en horario
export async function buscarConflictos({ fecha, horaInicio, horaFin, excluirId }) {
  const conflictos = await prisma.solicitud.findMany({
    where: {
      estado: 'confirmado',
      fecha: aFecha(fecha),
      horaInicio: { lt: aHora(horaFin) },
      horaFin: { gt: aHora(horaInicio) },
      id: excluirId ? { not: excluirId } : undefined
    },
    include: INCLUIR_CLIENTE,
    orderBy: { horaInicio: 'asc' }
  });
  return conflictos.map(aRespuesta);
}

export async function consultarDisponibilidad(consulta) {
  const conflictos = await buscarConflictos(consulta);
  return { disponible: conflictos.length === 0, conflictos };
}

const aMinutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const aTextoHora = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
// Misma regla que buscarConflictos
const seSuperponen = (a, b) => a.inicio < b.fin && a.fin > b.inicio;

function sumarDias(fecha, dias) {
  const resultado = aFecha(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return textoFecha(resultado);
}

// Si la fecha choca, busca otros horarios ese mismo día (justo antes o después de los
// eventos confirmados) y el mismo horario en los días cercanos. Solo desde hoy.
export async function buscarAlternativas({ fecha, horaInicio, horaFin, excluirId }) {
  const hoy = textoFecha(fechaActual());
  const desde = [hoy, sumarDias(fecha, -DIAS_ALTERNATIVAS)].sort().at(-1);
  const hasta = sumarDias(fecha, DIAS_ALTERNATIVAS);
  const confirmados = await prisma.solicitud.findMany({
    where: {
      estado: 'confirmado',
      fecha: { gte: aFecha(desde), lte: aFecha(hasta) },
      horaInicio: { not: null },
      horaFin: { not: null },
      id: excluirId ? { not: excluirId } : undefined
    },
    select: { fecha: true, horaInicio: true, horaFin: true }
  });

  const ocupadosPorDia = new Map();
  for (const evento of confirmados) {
    const dia = textoFecha(evento.fecha);
    const ocupado = { inicio: aMinutos(textoHora(evento.horaInicio)), fin: aMinutos(textoHora(evento.horaFin)) };
    ocupadosPorDia.set(dia, [...(ocupadosPorDia.get(dia) || []), ocupado]);
  }
  const estaLibre = (dia, franja) => !(ocupadosPorDia.get(dia) || []).some((ocupado) => seSuperponen(ocupado, franja));
  const aAlternativa = (dia, { inicio, fin }) => ({ fecha: dia, horaInicio: aTextoHora(inicio), horaFin: aTextoHora(fin) });

  const pedido = { inicio: aMinutos(horaInicio), fin: aMinutos(horaFin) };
  const duracion = pedido.fin - pedido.inicio;

  const candidatos = (fecha >= hoy ? ocupadosPorDia.get(fecha) || [] : [])
    .flatMap((ocupado) => [
      { inicio: ocupado.fin, fin: ocupado.fin + duracion },
      { inicio: ocupado.inicio - duracion, fin: ocupado.inicio }
    ])
    .filter((franja) => franja.inicio >= 0 && franja.fin <= FIN_DEL_DIA && estaLibre(fecha, franja))
    .sort((a, b) => Math.abs(a.inicio - pedido.inicio) - Math.abs(b.inicio - pedido.inicio));
  const mismoDia = [...new Map(candidatos.map((franja) => [franja.inicio, franja])).values()]
    .slice(0, MAX_ALTERNATIVAS)
    .map((franja) => aAlternativa(fecha, franja));

  const otrasFechas = [];
  for (let dias = 1; dias <= DIAS_ALTERNATIVAS && otrasFechas.length < MAX_ALTERNATIVAS; dias += 1) {
    for (const dia of [sumarDias(fecha, dias), sumarDias(fecha, -dias)]) {
      if (dia >= hoy && otrasFechas.length < MAX_ALTERNATIVAS && estaLibre(dia, pedido)) {
        otrasFechas.push(aAlternativa(dia, pedido));
      }
    }
  }

  return { mismoDia, otrasFechas };
}

function errorConflicto(conflictos) {
  return Object.assign(new Error('La fecha y horario no están disponibles: se superponen con otro evento confirmado.'), {
    status: 409,
    detalles: { disponible: false, fechaHabilitada: false, conflictos }
  });
}

// Revisa la fecha de una solicitud. Si no choca queda habilitada para seguir a la
// confirmación (el estado no cambia); si choca, queda bloqueada.
export async function validarFechaSolicitud(id) {
  const solicitud = await obtenerPorId(id);
  if (solicitud.estado === 'confirmado') {
    throw Object.assign(new Error('El evento ya tiene la fecha confirmada.'), { status: 409 });
  }
  if (!solicitud.fecha || !solicitud.horaInicio || !solicitud.horaFin) {
    throw Object.assign(new Error('La solicitud necesita fecha, hora de inicio y hora de término para revisar la disponibilidad.'), { status: 400 });
  }

  const { disponible, conflictos } = await consultarDisponibilidad({
    fecha: solicitud.fecha,
    horaInicio: solicitud.horaInicio,
    horaFin: solicitud.horaFin,
    excluirId: solicitud.id
  });
  await prisma.solicitud.update({ where: { id }, data: { fechaHabilitada: disponible } });
  if (!disponible) throw errorConflicto(conflictos);
  return {
    disponible: true,
    fechaHabilitada: true,
    conflictos: [],
    message: 'Fecha disponible: queda habilitada para continuar con la confirmación del evento.'
  };
}

// Para llamar antes de confirmar un evento: tira 409 si la fecha choca con otro
export async function asegurarFechaSinConflicto(solicitud) {
  const { disponible, conflictos } = await consultarDisponibilidad({
    fecha: solicitud.fecha,
    horaInicio: solicitud.horaInicio,
    horaFin: solicitud.horaFin,
    excluirId: solicitud.id
  });
  if (!disponible) throw errorConflicto(conflictos);
}
