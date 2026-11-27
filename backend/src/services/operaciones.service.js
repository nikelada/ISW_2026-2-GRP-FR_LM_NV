import { prisma } from '../config/prisma.js';

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

export async function asegurarEventoAbierto(id) {
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
  const inventarioDevuelto = (evento.reservasInventario || []).every((reserva) =>
    !reserva.inventario.reutilizable || Boolean(reserva.devueltoEn)
  );
  const reservasDevueltas = evento.reservasRecursos.every((reserva) => Boolean(reserva.devueltoEn))
    && inventarioDevuelto;
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
    where: { recurso: { is: { tipo: { not: 'equipo' } } } },
    include: { recurso: true },
    orderBy: { createdAt: 'asc' }
  },
  reservasInventario: {
    include: { inventario: true },
    orderBy: { createdAt: 'asc' }
  },
  personalAsignado: {
    include: { personal: true },
    orderBy: { createdAt: 'asc' }
  },
  tareas: {
    include: {
      responsables: {
        include: { personalEvento: { include: { personal: true } } },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  },
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
  const tareaAsignada = await prisma.tareaPersonal.findFirst({ where: { personalEventoId: asignacionId } });
  if (tareaAsignada) {
    throw errorConEstado('No se puede quitar a esta persona porque tiene tareas asignadas en el evento.', 409);
  }
  await asegurarEventoAbierto(asignacion.solicitudId);
  await prisma.personalEvento.delete({ where: { id: asignacionId } });
}

export async function crearTarea(solicitudId, { titulo, descripcion, responsablesIds }) {
  await asegurarEventoAbierto(solicitudId);
  const asignaciones = await prisma.personalEvento.findMany({
    where: { id: { in: responsablesIds }, solicitudId },
    select: { id: true }
  });
  if (asignaciones.length !== responsablesIds.length) {
    throw errorConEstado('Uno o más responsables no están asignados a este evento.', 400);
  }
  return prisma.tareaEvento.create({
    data: {
      solicitudId,
      titulo,
      descripcion,
      responsables: {
        create: responsablesIds.map((personalEventoId) => ({
          personalEvento: { connect: { id: personalEventoId } }
        }))
      }
    },
    include: {
      responsables: {
        include: { personalEvento: { include: { personal: true } } }
      }
    }
  });
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
