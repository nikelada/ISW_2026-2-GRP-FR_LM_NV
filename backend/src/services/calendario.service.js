import { prisma } from '../config/prisma.js';
import { aFecha, aHora, aRespuesta, obtenerPorId } from './solicitud.service.js';

const INCLUIR_CLIENTE = { cliente: { select: { id: true, nombre: true } } };

// Eventos registrados por fecha y horario dentro de un rango de fechas.
export async function listarEventos(desde, hasta) {
  const eventos = await prisma.solicitud.findMany({
    where: { fecha: { gte: aFecha(desde), lte: aFecha(hasta) } },
    include: INCLUIR_CLIENTE,
    orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }]
  });
  return eventos.map(aRespuesta);
}

// Hay conflicto con un evento de fecha confirmada el mismo día cuyo horario se superpone.
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

function errorConflicto(conflictos) {
  return Object.assign(new Error('La fecha presenta conflicto con otro evento confirmado; no se puede confirmar.'), {
    status: 409,
    detalles: { disponible: false, fechaHabilitada: false, conflictos }
  });
}

/**
 * Revisa la fecha y horario de una solicitud contra el calendario.
 * Sin conflicto, la fecha queda habilitada para continuar con la confirmación del
 * evento (el estado no cambia). Con conflicto, la fecha queda bloqueada.
 */
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

/**
 * Punto de integración para el proceso que confirme el evento (otra etapa del proceso):
 * debe llamarse antes de pasar una solicitud a confirmado. Lanza 409 si hay conflicto.
 */
export async function asegurarFechaSinConflicto(solicitud) {
  const { disponible, conflictos } = await consultarDisponibilidad({
    fecha: solicitud.fecha,
    horaInicio: solicitud.horaInicio,
    horaFin: solicitud.horaFin,
    excluirId: solicitud.id
  });
  if (!disponible) throw errorConflicto(conflictos);
}
