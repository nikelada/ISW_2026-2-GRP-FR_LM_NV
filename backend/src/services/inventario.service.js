import { prisma } from '../config/prisma.js';
import { asegurarEventoAbierto } from './operaciones.service.js';
import {
  consultarDisponibilidad as consultarDisponibilidadRecursos,
  reservarRecurso
} from './recursosOperativos.service.js';

function errorConEstado(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

async function obtenerEventoConfirmado(solicitudId) {
  const evento = await prisma.solicitud.findUnique({
    where: { id: solicitudId },
    select: { id: true, estado: true, fecha: true, horaInicio: true, horaFin: true }
  });
  if (!evento) throw errorConEstado('Evento no encontrado.', 404);
  if (evento.estado !== 'confirmado' || !evento.fecha || !evento.horaInicio || !evento.horaFin) {
    throw errorConEstado('La operación solo está disponible para eventos confirmados con fecha y horario definidos.', 409);
  }
  return evento;
}

function aRespuesta(item) {
  return { ...item, precio: Number(item.precio) };
}

function tieneHorario(evento) {
  return Boolean(evento?.fecha && evento?.horaInicio && evento?.horaFin);
}

function seSuperpone(a, b) {
  return tieneHorario(a) && tieneHorario(b)
    && a.fecha.getTime() === b.fecha.getTime()
    && a.horaInicio < b.horaFin
    && a.horaFin > b.horaInicio;
}

function inicioEvento(evento) {
  return new Date(`${evento.fecha.toISOString().slice(0, 10)}T${evento.horaInicio.toISOString().slice(11, 19)}Z`);
}

function finEvento(evento) {
  return new Date(`${evento.fecha.toISOString().slice(0, 10)}T${evento.horaFin.toISOString().slice(11, 19)}Z`);
}

function maximoEnParalelo(reservas) {
  const cambios = reservas.filter((reserva) => tieneHorario(reserva.solicitud)).flatMap((reserva) => [
    { instante: inicioEvento(reserva.solicitud).getTime(), cantidad: reserva.cantidad },
    { instante: finEvento(reserva.solicitud).getTime(), cantidad: -reserva.cantidad }
  ]).sort((a, b) => a.instante - b.instante || a.cantidad - b.cantidad);
  let actual = 0;
  let maximo = 0;
  for (const cambio of cambios) {
    actual += cambio.cantidad;
    maximo = Math.max(maximo, actual);
  }
  return maximo;
}

export async function listar() {
  const items = await prisma.inventario.findMany({
    orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }]
  });
  return items.map(aRespuesta);
}

export async function obtenerPorId(id) {
  const item = await prisma.inventario.findUnique({ where: { id } });
  if (!item) throw errorConEstado('Producto de inventario no encontrado.', 404);
  return aRespuesta(item);
}

export async function consultarDisponibilidad(solicitudId) {
  const evento = await obtenerEventoConfirmado(solicitudId);
  const items = await prisma.inventario.findMany({ orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }] });
  const reservas = await prisma.reservaInventario.findMany({
    where: {
      inventarioId: { in: items.map((item) => item.id) },
      devueltoEn: null,
      solicitud: { is: { estado: 'confirmado' } }
    },
    include: { solicitud: { select: { id: true, fecha: true, horaInicio: true, horaFin: true } } }
  });
  const reservasPorItem = new Map(items.map((item) => [item.id, []]));
  for (const reserva of reservas) reservasPorItem.get(reserva.inventarioId).push(reserva);
  return items.map((item) => {
    const delItem = reservasPorItem.get(item.id);
    const delEvento = delItem.filter((reserva) => reserva.solicitudId === evento.id);
    const totalDelEvento = delEvento.reduce((suma, reserva) => suma + reserva.cantidad, 0);
    const actuales = delItem.filter((reserva) =>
      reserva.solicitudId !== evento.id && seSuperpone(reserva.solicitud, evento)
    );
    const comprometido = item.reutilizable
      ? actuales.reduce((suma, reserva) => suma + reserva.cantidad, 0)
      : delItem
        .filter((reserva) => reserva.solicitudId !== evento.id)
        .reduce((suma, reserva) => suma + reserva.cantidad, 0);
    const capacidad = Math.max(0, item.stock - item.stockFueraServicio - comprometido);
    const puedeReservar = Math.max(0, capacidad - totalDelEvento);
    const ahora = Date.now();
    const enUso = item.reutilizable
      ? delItem
        .filter((reserva) => tieneHorario(reserva.solicitud)
          && inicioEvento(reserva.solicitud).getTime() <= ahora
          && ahora < finEvento(reserva.solicitud).getTime())
        .reduce((suma, reserva) => suma + reserva.cantidad, 0)
      : 0;

    return {
      ...aRespuesta(item),
      stockDisponible: puedeReservar,
      stockReservado: totalDelEvento,
      stockEnUso: enUso,
      stockFueraServicio: item.reutilizable ? item.stockFueraServicio : 0
    };
  });
}

export async function crear(datos) {
  const item = await prisma.inventario.create({ data: datos });
  return aRespuesta(item);
}

export async function actualizar(id, datos) {
  const existente = await prisma.inventario.findUnique({ where: { id } });
  if (!existente) throw errorConEstado('Producto de inventario no encontrado.', 404);
  const reservas = await prisma.reservaInventario.findMany({
    where: { inventarioId: id, devueltoEn: null, solicitud: { is: { estado: 'confirmado' } } },
    include: { solicitud: { select: { fecha: true, horaInicio: true, horaFin: true } } }
  });
  if (existente.reutilizable !== datos.reutilizable && reservas.length) {
    throw errorConEstado('No se puede cambiar si el objeto es reutilizable mientras tiene reservas pendientes.', 409);
  }
  const cantidadComprometida = datos.reutilizable
    ? maximoEnParalelo(reservas)
    : reservas.reduce((suma, reserva) => suma + reserva.cantidad, 0);
  if (datos.stock < datos.stockFueraServicio + cantidadComprometida) {
    throw errorConEstado('El stock no puede quedar por debajo de las unidades reservadas o fuera de servicio.', 409);
  }
  const item = await prisma.inventario.update({ where: { id }, data: datos });
  return aRespuesta(item);
}

export async function eliminar(id) {
  await obtenerPorId(id);
  const reservas = await prisma.reservaInventario.count({ where: { inventarioId: id } });
  if (reservas) throw errorConEstado('No se puede eliminar un objeto que tiene reservas asociadas.', 409);
  await prisma.inventario.delete({ where: { id } });
}

export async function reservar(solicitudId, inventarioId, cantidad) {
  const evento = await asegurarEventoAbierto(solicitudId);
  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.inventario.findUnique({ where: { id: inventarioId } });
      if (!item) throw errorConEstado('Objeto de inventario no encontrado.', 404);
      const reservas = await tx.reservaInventario.findMany({
        where: {
          inventarioId,
          devueltoEn: null,
          solicitud: { is: { estado: 'confirmado' } }
        },
        include: { solicitud: { select: { id: true, fecha: true, horaInicio: true, horaFin: true } } }
      });
      const propias = reservas.filter((reserva) => reserva.solicitudId === solicitudId);
      const cantidadPropia = propias.reduce((suma, reserva) => suma + reserva.cantidad, 0);
      const otras = reservas.filter((reserva) => reserva.solicitudId !== solicitudId && (
        !item.reutilizable
        || seSuperpone(reserva.solicitud, evento)
      ));
      const comprometido = otras.reduce((suma, reserva) => suma + reserva.cantidad, 0);
      const maximo = item.stock - item.stockFueraServicio - comprometido;
      if (cantidadPropia + cantidad > maximo) {
        throw errorConEstado(`Solo hay ${Math.max(0, maximo - cantidadPropia)} unidad(es) disponibles para este evento.`, 409);
      }
      return tx.reservaInventario.create({
        data: { inventarioId, solicitudId, cantidad }
      });
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (error.code === 'P2034') {
      throw errorConEstado('El stock cambió durante la reserva; vuelve a consultar la disponibilidad.', 409);
    }
    throw error;
  }
}

export async function reducirReserva(solicitudId, inventarioId, cantidad = 1) {
  await asegurarEventoAbierto(solicitudId);
  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.inventario.findUnique({
        where: { id: inventarioId },
        select: { id: true }
      });
      if (!item) throw errorConEstado('Producto de inventario no encontrado.', 404);

      const reservas = await tx.reservaInventario.findMany({
        where: { inventarioId, solicitudId, devueltoEn: null },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
      });
      const stockReservado = reservas.reduce((total, reserva) => total + reserva.cantidad, 0);
      if (stockReservado < cantidad) {
        throw errorConEstado('No hay suficientes unidades reservadas de este objeto para el evento.', 409);
      }

      let restante = cantidad;
      for (const reserva of reservas) {
        if (restante === 0) break;
        const cantidadAReducir = Math.min(reserva.cantidad, restante);
        if (cantidadAReducir === reserva.cantidad) {
          await tx.reservaInventario.delete({ where: { id: reserva.id } });
        } else {
          await tx.reservaInventario.update({
            where: { id: reserva.id },
            data: { cantidad: reserva.cantidad - cantidadAReducir }
          });
        }
        restante -= cantidadAReducir;
      }
      return { inventarioId, solicitudId, cantidadReducida: cantidad, stockReservado: stockReservado - cantidad };
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (error.code === 'P2034') {
      throw errorConEstado('La reserva cambió durante el ajuste; vuelve a intentarlo.', 409);
    }
    throw error;
  }
}

export async function devolver(reservaId) {
  const reserva = await prisma.reservaInventario.findUnique({
    where: { id: reservaId },
    include: { inventario: true }
  });
  if (!reserva) throw errorConEstado('Reserva de inventario no encontrada.', 404);
  if (!reserva.inventario.reutilizable) {
    throw errorConEstado('Los objetos no reutilizables se descuentan al reservar y no se devuelven.', 409);
  }
  await asegurarEventoAbierto(reserva.solicitudId);
  if (reserva.devueltoEn) return reserva;
  return prisma.reservaInventario.update({
    where: { id: reservaId },
    data: { devueltoEn: new Date() }
  });
}

export async function listarVehiculos() {
  const vehiculos = await prisma.recursoOperativo.findMany({
    where: { tipo: 'vehiculo' },
    include: {
      reservas: {
        where: { devueltoEn: null, solicitud: { is: { estado: 'confirmado' } } },
        include: { solicitud: { select: { id: true, fecha: true, horaInicio: true, horaFin: true } } },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { nombre: 'asc' }
  });
  return vehiculos.map((vehiculo) => ({
    ...vehiculo,
    precio: vehiculo.precio === null ? null : Number(vehiculo.precio),
    reservas: vehiculo.reservas.map((reserva) => ({
      id: reserva.id,
      solicitudId: reserva.solicitud.id,
      fecha: reserva.solicitud.fecha.toISOString().slice(0, 10),
      horaInicio: reserva.solicitud.horaInicio.toISOString().slice(11, 16),
      horaFin: reserva.solicitud.horaFin.toISOString().slice(11, 16)
    }))
  }));
}

export async function crearVehiculo(datos) {
  const vehiculo = await prisma.recursoOperativo.create({ data: datos });
  return { ...vehiculo, precio: Number(vehiculo.precio) };
}

export async function actualizarVehiculo(id, datos) {
  const vehiculo = await prisma.recursoOperativo.findUnique({ where: { id } });
  if (!vehiculo || vehiculo.tipo !== 'vehiculo') {
    throw errorConEstado('Vehículo no encontrado.', 404);
  }
  const actualizado = await prisma.recursoOperativo.update({ where: { id }, data: datos });
  return { ...actualizado, precio: Number(actualizado.precio) };
}

export async function consultarDisponibilidadVehiculos(solicitudId) {
  const evento = await obtenerEventoConfirmado(solicitudId);
  return consultarDisponibilidadRecursos({
    fecha: evento.fecha.toISOString().slice(0, 10),
    horaInicio: evento.horaInicio.toISOString().slice(11, 16),
    horaFin: evento.horaFin.toISOString().slice(11, 16),
    tipo: 'vehiculo',
    solicitudId
  });
}

export async function reservarVehiculo(solicitudId, recursoId) {
  const vehiculo = await prisma.recursoOperativo.findUnique({ where: { id: recursoId } });
  if (!vehiculo || vehiculo.tipo !== 'vehiculo') {
    throw errorConEstado('Vehículo no encontrado.', 404);
  }
  return reservarRecurso(solicitudId, recursoId);
}
