import { prisma } from '../config/prisma.js';
import { aFecha, aHora } from './solicitud.service.js';

const textoFecha = (valor) => (valor ? valor.toISOString().slice(0, 10) : null);
const textoHora = (valor) => (valor ? valor.toISOString().slice(11, 16) : null);

const INCLUIR_EVENTO = {
  cliente: { select: { id: true, nombre: true } }
};

function errorConEstado(message, status = 400, detalles) {
  return Object.assign(new Error(message), { status, detalles });
}

async function obtenerSolicitud(id) {
  const solicitud = await prisma.solicitud.findUnique({ where: { id }, include: INCLUIR_EVENTO });
  if (!solicitud) throw errorConEstado('Evento no encontrado.', 404);
  return solicitud;
}

async function asegurarEventoConfirmado(id) {
  const solicitud = await obtenerSolicitud(id);
  if (solicitud.estado !== 'confirmado') {
    throw errorConEstado('La operación solo está disponible para eventos confirmados.', 409);
  }
  if (!solicitud.fecha || !solicitud.horaInicio || !solicitud.horaFin) {
    throw errorConEstado('El evento confirmado debe tener fecha y horario definidos.', 409);
  }
  return solicitud;
}

async function asegurarEventoAbierto(id) {
  const solicitud = await asegurarEventoConfirmado(id);
  const cierre = await prisma.cierreEvento.findUnique({ where: { solicitudId: id } });
  if (cierre?.estado === 'aprobado') {
    throw errorConEstado('El cierre ya fue aprobado; no se puede modificar la operación del evento.', 409);
  }
  if (cierre?.estado === 'revision_gerencia') {
    await prisma.cierreEvento.update({
      where: { solicitudId: id },
      data: { estado: 'pendiente', solicitadoEn: null }
    });
  }
  return solicitud;
}

function condicionCierre(evento) {
  const reservasDevueltas = evento.reservasRecursos.every((reserva) => Boolean(reserva.devueltoEn));
  const tareasCompletadas = evento.tareas.every((tarea) => tarea.estado === 'completada');
  const pagosCompletados = evento.pagos.every((pago) => pago.estado === 'pagado');
  const encuestaConforme = evento.cierre?.encuestaConforme === true;
  const condiciones = {
    recursosDevueltos: reservasDevueltas,
    tareasCompletadas,
    pagosCompletados,
    encuestaConforme
  };
  const pendientes = [];
  if (!reservasDevueltas) pendientes.push('Hay recursos pendientes de devolución.');
  if (!tareasCompletadas) pendientes.push('Hay tareas pendientes.');
  if (!pagosCompletados) pendientes.push('Hay pagos pendientes.');
  if (!encuestaConforme) pendientes.push('La evaluación del cliente no está registrada como conforme.');
  return { condiciones, pendientes };
}

function respuestaEvento(evento) {
  const { condiciones, pendientes } = condicionCierre(evento);
  return {
    ...evento,
    fecha: textoFecha(evento.fecha),
    horaInicio: textoHora(evento.horaInicio),
    horaFin: textoHora(evento.horaFin),
    pagos: evento.pagos.map((pago) => ({ ...pago, monto: Number(pago.monto) })),
    condicionesCierre: condiciones,
    pendientesCierre: pendientes
  };
}

const INCLUIR_OPERACION = {
  ...INCLUIR_EVENTO,
  reservasRecursos: {
    include: { recurso: true },
    orderBy: { createdAt: 'asc' }
  },
  personalAsignado: {
    include: { personal: true },
    orderBy: { createdAt: 'asc' }
  },
  tareas: { orderBy: { createdAt: 'asc' } },
  pagos: { orderBy: { createdAt: 'asc' } },
  cierre: { include: { aprobadoPor: { select: { id: true, name: true } } } }
};

export async function listarEventos() {
  const eventos = await prisma.solicitud.findMany({
    where: { estado: 'confirmado' },
    include: { ...INCLUIR_EVENTO, cierre: true },
    orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }]
  });
  return eventos.map((evento) => ({
    ...evento,
    fecha: textoFecha(evento.fecha),
    horaInicio: textoHora(evento.horaInicio),
    horaFin: textoHora(evento.horaFin)
  }));
}

export async function obtenerOperacion(id) {
  const evento = await prisma.solicitud.findUnique({ where: { id }, include: INCLUIR_OPERACION });
  if (!evento) throw errorConEstado('Evento no encontrado.', 404);
  return respuestaEvento(evento);
}

export async function listarRecursos() {
  return prisma.recursoOperativo.findMany({ orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }] });
}

export async function crearRecurso(datos) {
  return prisma.recursoOperativo.create({ data: datos });
}

export async function actualizarRecurso(id, datos) {
  const existe = await prisma.recursoOperativo.findUnique({ where: { id } });
  if (!existe) throw errorConEstado('Recurso no encontrado.', 404);
  return prisma.recursoOperativo.update({ where: { id }, data: datos });
}

function filtroReserva(fecha, horaInicio, horaFin, excluirSolicitudId) {
  return {
    solicitud: {
      is: {
        estado: 'confirmado',
        fecha: aFecha(fecha),
        horaInicio: { lt: aHora(horaFin) },
        horaFin: { gt: aHora(horaInicio) },
        id: excluirSolicitudId ? { not: excluirSolicitudId } : undefined
      }
    }
  };
}

export async function consultarDisponibilidad(consulta) {
  const recursos = await prisma.recursoOperativo.findMany({
    where: {
      tipo: consulta.tipo,
      categoria: consulta.categoria ? { equals: consulta.categoria, mode: 'insensitive' } : undefined
    },
    include: {
      reservas: {
        where: filtroReserva(consulta.fecha, consulta.horaInicio, consulta.horaFin),
        include: { solicitud: { select: { id: true, cliente: { select: { nombre: true } } } } }
      }
    }
  });

  const resultado = recursos.map((recurso) => {
    let motivo = null;
    if (recurso.estado !== 'disponible') {
      motivo = `Estado del recurso: ${recurso.estado.replaceAll('_', ' ')}.`;
    } else if (recurso.reservas.length) {
      const reserva = recurso.reservas[0];
      motivo = reserva.solicitud.id === consulta.solicitudId
        ? 'Ya reservado para este evento.'
        : `Reservado para el evento #${reserva.solicitud.id} (${reserva.solicitud.cliente.nombre}).`;
    }
    return { ...recurso, disponible: motivo === null, motivo };
  });
  resultado.sort((a, b) => Number(b.disponible) - Number(a.disponible) || a.nombre.localeCompare(b.nombre, 'es'));
  return resultado;
}

export async function reservarRecurso(solicitudId, recursoId) {
  const evento = await asegurarEventoAbierto(solicitudId);
  try {
    const reserva = await prisma.$transaction(async (tx) => {
      const recurso = await tx.recursoOperativo.findUnique({ where: { id: recursoId } });
      if (!recurso) throw errorConEstado('Recurso no encontrado.', 404);
      if (recurso.estado !== 'disponible') {
        throw errorConEstado(`El recurso no se puede reservar: su estado es ${recurso.estado.replaceAll('_', ' ')}.`, 409);
      }
      const conflicto = await tx.reservaRecurso.findFirst({
        where: {
          recursoId,
          ...filtroReserva(textoFecha(evento.fecha), textoHora(evento.horaInicio), textoHora(evento.horaFin))
        },
        include: { solicitud: { select: { id: true, cliente: { select: { nombre: true } } } } }
      });
      if (conflicto) {
        if (conflicto.solicitud.id === solicitudId) {
          throw errorConEstado('El recurso ya está asociado a este evento.', 409);
        }
        throw errorConEstado(`El recurso ya está reservado para el evento #${conflicto.solicitud.id} (${conflicto.solicitud.cliente.nombre}).`, 409);
      }
      return tx.reservaRecurso.create({ data: { recursoId, solicitudId } });
    }, { isolationLevel: 'Serializable' });
    return reserva;
  } catch (error) {
    if (error.code === 'P2034') {
      throw errorConEstado('Otra reserva se guardó al mismo tiempo; vuelve a consultar la disponibilidad.', 409);
    }
    if (error.code === 'P2002') {
      throw errorConEstado('El recurso ya está asociado a este evento.', 409);
    }
    throw error;
  }
}

export async function devolverRecurso(reservaId) {
  const reserva = await prisma.reservaRecurso.findUnique({ where: { id: reservaId }, include: { solicitud: true } });
  if (!reserva) throw errorConEstado('Reserva no encontrada.', 404);
  await asegurarEventoAbierto(reserva.solicitudId);
  if (reserva.devueltoEn) return reserva;
  return prisma.reservaRecurso.update({ where: { id: reservaId }, data: { devueltoEn: new Date() } });
}

export async function listarContactos() {
  return prisma.personalEventual.findMany({
    where: { esContacto: true },
    orderBy: { nombre: 'asc' }
  });
}

export async function asignarPersonal(solicitudId, datos) {
  await asegurarEventoAbierto(solicitudId);
  return prisma.$transaction(async (tx) => {
    const personal = datos.personalId
      ? await tx.personalEventual.findUnique({ where: { id: datos.personalId } })
      : await tx.personalEventual.create({
        data: {
          nombre: datos.nombre,
          telefono: datos.telefono || null,
          correo: datos.correo || null
        }
      });
    if (!personal) throw errorConEstado('Contacto de personal no encontrado.', 404);
    return tx.personalEvento.create({
      data: {
        solicitudId,
        personalId: personal.id,
        funcion: datos.funcion || null
      },
      include: { personal: true }
    });
  });
}

export async function quitarPersonal(asignacionId) {
  const asignacion = await prisma.personalEvento.findUnique({ where: { id: asignacionId } });
  if (!asignacion) throw errorConEstado('Asignación de personal no encontrada.', 404);
  await asegurarEventoAbierto(asignacion.solicitudId);
  await prisma.personalEvento.delete({ where: { id: asignacionId } });
}

export async function crearTarea(solicitudId, datos) {
  await asegurarEventoAbierto(solicitudId);
  return prisma.tareaEvento.create({ data: { solicitudId, ...datos } });
}

export async function alternarTarea(id) {
  const tarea = await prisma.tareaEvento.findUnique({ where: { id } });
  if (!tarea) throw errorConEstado('Tarea no encontrada.', 404);
  await asegurarEventoAbierto(tarea.solicitudId);
  return prisma.tareaEvento.update({
    where: { id },
    data: { estado: tarea.estado === 'pendiente' ? 'completada' : 'pendiente' }
  });
}

export async function crearPago(solicitudId, datos) {
  await asegurarEventoAbierto(solicitudId);
  return prisma.pagoEvento.create({ data: { solicitudId, ...datos } });
}

export async function alternarPago(id) {
  const pago = await prisma.pagoEvento.findUnique({ where: { id } });
  if (!pago) throw errorConEstado('Pago no encontrado.', 404);
  await asegurarEventoAbierto(pago.solicitudId);
  const actualizado = await prisma.pagoEvento.update({
    where: { id },
    data: { estado: pago.estado === 'pendiente' ? 'pagado' : 'pendiente' }
  });
  return { ...actualizado, monto: Number(actualizado.monto) };
}

export async function solicitarCierre(solicitudId, encuesta) {
  await asegurarEventoAbierto(solicitudId);
  await prisma.cierreEvento.upsert({
    where: { solicitudId },
    create: { solicitudId, ...encuesta },
    update: {
      ...encuesta,
      estado: 'pendiente',
      solicitadoEn: null,
      aprobadoPorId: null,
      aprobadoEn: null
    }
  });
  const evento = await prisma.solicitud.findUnique({ where: { id: solicitudId }, include: INCLUIR_OPERACION });
  const { pendientes } = condicionCierre(evento);
  if (pendientes.length) {
    throw errorConEstado('El evento todavía no cumple las condiciones para solicitar aprobación del cierre.', 409, { pendientes });
  }
  return prisma.cierreEvento.update({
    where: { solicitudId },
    data: { estado: 'revision_gerencia', solicitadoEn: new Date() }
  });
}

export async function aprobarCierre(solicitudId, managerId) {
  let resultado;
  try {
    resultado = await prisma.$transaction(async (tx) => {
      const evento = await tx.solicitud.findUnique({ where: { id: solicitudId }, include: INCLUIR_OPERACION });
      if (!evento) throw errorConEstado('Evento no encontrado.', 404);
      if (evento.estado !== 'confirmado') throw errorConEstado('Solo se puede cerrar un evento confirmado.', 409);
      if (!evento.cierre || evento.cierre.estado !== 'revision_gerencia') {
        throw errorConEstado('El evento no está pendiente de aprobación de cierre.', 409);
      }
      const { pendientes } = condicionCierre(evento);
      if (pendientes.length) {
        await tx.cierreEvento.update({
          where: { solicitudId },
          data: { estado: 'pendiente', solicitadoEn: null }
        });
        return { pendientes };
      }
      const cierre = await tx.cierreEvento.update({
        where: { solicitudId },
        data: {
          estado: 'aprobado',
          aprobadoPorId: managerId,
          aprobadoEn: new Date()
        }
      });
      if (cierre.encuestaConforme) {
        await tx.personalEventual.updateMany({
          where: { asignaciones: { some: { solicitudId } } },
          data: { esContacto: true }
        });
      }
      return { cierre };
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (error.code === 'P2034') {
      throw errorConEstado('El evento cambió durante la aprobación; vuelve a consultar su estado antes de intentar nuevamente.', 409);
    }
    throw error;
  }
  if (resultado.pendientes) {
    throw errorConEstado('Las condiciones del evento cambiaron; no se puede aprobar el cierre.', 409, { pendientes: resultado.pendientes });
  }
  return resultado.cierre;
}
