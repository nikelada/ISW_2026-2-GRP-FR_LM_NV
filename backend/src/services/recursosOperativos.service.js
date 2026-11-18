import { prisma } from '../config/prisma.js';
import { aFecha, aHora } from './solicitud.service.js';
import { asegurarEventoAbierto } from './operaciones.service.js';

function errorConEstado(message, status = 400) {
  return Object.assign(new Error(message), { status });
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
        where: filtroReserva(consulta.fecha, consulta.horaInicio, consulta.horaFin, consulta.solicitudId),
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
    return await prisma.$transaction(async (tx) => {
      const recurso = await tx.recursoOperativo.findUnique({ where: { id: recursoId } });
      if (!recurso) throw errorConEstado('Recurso no encontrado.', 404);
      if (recurso.tipo === 'equipo') {
        throw errorConEstado('Los objetos se reservan desde Inventario.', 409);
      }
      if (recurso.estado !== 'disponible') {
        throw errorConEstado(`El recurso no se puede reservar: su estado es ${recurso.estado.replaceAll('_', ' ')}.`, 409);
      }
      const conflicto = await tx.reservaRecurso.findFirst({
        where: {
          recursoId,
          ...filtroReserva(
            evento.fecha.toISOString().slice(0, 10),
            evento.horaInicio.toISOString().slice(11, 16),
            evento.horaFin.toISOString().slice(11, 16)
          )
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
