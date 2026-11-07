import { prisma } from '../config/prisma.js';
import { asegurarFechaSinConflicto, buscarConflictos } from './calendario.service.js';
import { aFecha, aHora, asegurarFechaNoPasada, obtenerPorId as obtenerEvento } from './solicitud.service.js';

const FACTORES = ['revisionRecursos', 'revisionAnticipacion', 'revisionCosto', 'revisionOtrosEventos'];
const ESTADOS = ['pendiente', 'aprobado', 'rechazado'];
const CAMPOS_HORARIO = ['fecha', 'horaInicio', 'horaFin'];

function httpError(status, message, detalles) {
  return Object.assign(new Error(message), { status, detalles });
}

// Pasa fecha y horas al formato que guarda prisma
function aColumna(campo, valor) {
  if (campo === 'fecha') return aFecha(valor);
  if (campo === 'horaInicio' || campo === 'horaFin') return aHora(valor);
  return valor;
}

const cambiaHorario = (cambios) => CAMPOS_HORARIO.some((campo) => campo in cambios);

// Cómo quedaría el evento con el cambio
function eventoConCambios(evento, cambios) {
  return { ...evento, ...cambios };
}

// Si cambia la fecha u hora, muestra con qué eventos confirmados chocaría (para que lo vea gerencia)
async function conflictosPropuestos(evento, cambios) {
  if (!cambiaHorario(cambios)) return [];
  const propuesto = eventoConCambios(evento, cambios);
  return buscarConflictos({ fecha: propuesto.fecha, horaInicio: propuesto.horaInicio, horaFin: propuesto.horaFin, excluirId: evento.id });
}

async function conDetalle(cambio) {
  const evento = await obtenerEvento(cambio.solicitudId);
  return {
    ...cambio,
    evento,
    conflictos: cambio.estado === 'pendiente' ? await conflictosPropuestos(evento, cambio.cambios) : []
  };
}

export async function listar({ estado, solicitudId } = {}) {
  if (estado && !ESTADOS.includes(estado)) throw httpError(400, 'Estado de cambio inválido.');
  const cambios = await prisma.solicitudCambio.findMany({
    where: { estado: estado || undefined, solicitudId: solicitudId || undefined },
    orderBy: { createdAt: 'desc' }
  });
  return Promise.all(cambios.map(conDetalle));
}

export async function obtenerPorId(id) {
  const cambio = await prisma.solicitudCambio.findUnique({ where: { id } });
  if (!cambio) throw httpError(404, 'Cambio no encontrado.');
  return conDetalle(cambio);
}

// Solo para eventos confirmados. Queda pendiente hasta que gerencia lo revise (el evento no cambia aún)
export async function registrar({ solicitudId, cambios, motivo }, usuario) {
  const evento = await obtenerEvento(solicitudId);
  if (evento.estado !== 'confirmado') {
    throw httpError(409, 'Solo los eventos confirmados se modifican con una solicitud de cambio; la solicitud aún puede editarse directamente.');
  }
  const distintos = Object.fromEntries(Object.entries(cambios).filter(([campo, valor]) => evento[campo] !== valor));
  if (!Object.keys(distintos).length) throw httpError(400, 'Los nuevos valores son iguales a los actuales.');
  asegurarFechaNoPasada(distintos.fecha);
  const propuesto = eventoConCambios(evento, distintos);
  if (propuesto.horaFin <= propuesto.horaInicio) {
    throw httpError(400, 'Revisa los datos del cambio.', { errores: { horaFin: 'La hora de término debe ser posterior a la de inicio.' } });
  }

  const creado = await prisma.solicitudCambio.create({
    data: { solicitudId, cambios: distintos, motivo, registradoPor: usuario.name }
  });
  return conDetalle(creado);
}

// Gerencia aprueba o rechaza. Para aprobar tiene que marcar los 4 factores.
// Si se rechaza, el evento queda igual.
export async function revisar(id, { decision, ...factores }, usuario) {
  const cambio = await obtenerPorId(id);
  if (cambio.estado !== 'pendiente') throw httpError(409, 'Este cambio ya fue revisado.');
  if (decision === 'aprobar' && !FACTORES.every((factor) => factores[factor])) {
    throw httpError(400, 'Para aprobar, Gerencia debe marcar como revisados los cuatro factores.');
  }

  const revisado = await prisma.solicitudCambio.update({
    where: { id },
    data: {
      ...factores,
      estado: decision === 'aprobar' ? 'aprobado' : 'rechazado',
      revisadoPor: usuario.name,
      revisadoEn: new Date()
    }
  });
  return conDetalle(revisado);
}

// Aplica solo lo que aprobó gerencia. Si cambia fecha u hora se revisa de nuevo que no
// choque con otro evento confirmado, y cada dato cambiado queda en el historial.
export async function aplicar(id, usuario) {
  const cambio = await obtenerPorId(id);
  if (cambio.estado !== 'aprobado') throw httpError(409, 'Solo se pueden aplicar cambios aprobados por Gerencia.');
  if (cambio.aplicadoEn) throw httpError(409, 'Este cambio ya fue aplicado.');

  const { evento } = cambio;
  if (evento.estado !== 'confirmado') throw httpError(409, 'El evento ya no está confirmado.');
  const nuevo = eventoConCambios(evento, cambio.cambios);
  if (nuevo.horaFin <= nuevo.horaInicio) throw httpError(409, 'Con los datos actuales del evento, el horario aprobado no es válido.');
  if (cambiaHorario(cambio.cambios)) await asegurarFechaSinConflicto(nuevo);

  const campos = Object.keys(cambio.cambios);
  await prisma.$transaction([
    prisma.solicitud.update({
      where: { id: evento.id },
      data: Object.fromEntries(campos.map((campo) => [campo, aColumna(campo, cambio.cambios[campo])]))
    }),
    prisma.historialEvento.createMany({
      data: campos.map((campo) => ({
        solicitudId: evento.id,
        cambioId: id,
        campo,
        valorAnterior: evento[campo] === null ? null : String(evento[campo]),
        valorNuevo: String(cambio.cambios[campo]),
        usuario: usuario.name
      }))
    }),
    prisma.solicitudCambio.update({ where: { id }, data: { aplicadoPor: usuario.name, aplicadoEn: new Date() } })
  ]);
  return obtenerPorId(id);
}

// Historial de lo que se le ha cambiado a un evento
export async function historialDeEvento(solicitudId) {
  await obtenerEvento(solicitudId);
  return prisma.historialEvento.findMany({
    where: { solicitudId },
    include: { cambio: { select: { id: true, motivo: true, revisadoPor: true, revisadoEn: true } } },
    orderBy: { createdAt: 'desc' }
  });
}
