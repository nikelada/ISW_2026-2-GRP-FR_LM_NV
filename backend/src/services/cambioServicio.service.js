import { prisma } from '../config/prisma.js';
import { fechaActual } from '../utils/fecha.js';
import * as servicioService from './servicio.service.js';

const ESTADOS = ['pendiente', 'aprobado', 'rechazado'];
const INCLUIR_CAMBIO = {
  servicio: { include: servicioService.INCLUIR_SERVICIO }
};

function aRespuesta(cambio) {
  return { ...cambio, servicio: servicioService.aRespuesta(cambio.servicio) };
}

export async function listar({ estado } = {}) {
  if (estado && !ESTADOS.includes(estado)) {
    throw Object.assign(new Error('Estado de cambio de servicio inválido.'), { status: 400 });
  }
  const cambios = await prisma.cambioServicio.findMany({
    where: { estado: estado || undefined },
    include: INCLUIR_CAMBIO,
    orderBy: { id: 'desc' }
  });
  return cambios.map(aRespuesta);
}

export async function obtenerPorId(id) {
  const cambio = await prisma.cambioServicio.findUnique({
    where: { id },
    include: INCLUIR_CAMBIO
  });
  if (!cambio) throw Object.assign(new Error('Cambio de servicio no encontrado.'), { status: 404 });
  return aRespuesta(cambio);
}

export async function crear(servicioId, datos) {
  const servicio = await servicioService.obtenerPorId(servicioId);
  if (!servicio.activo) {
    throw Object.assign(new Error('No se pueden solicitar cambios para un servicio inactivo.'), { status: 409 });
  }
  if (!servicio.versionActiva) {
    throw Object.assign(new Error('El servicio no tiene una versión de precio activa.'), { status: 409 });
  }

  const tipoPrecioNuevo = datos.tipoPrecio ?? servicio.versionActiva.tipoPrecio;
  const precioNuevo = datos.precio ?? servicio.versionActiva.precio;
  if (
    tipoPrecioNuevo === servicio.versionActiva.tipoPrecio &&
    precioNuevo === servicio.versionActiva.precio
  ) {
    throw Object.assign(new Error('El precio y el tipo de precio nuevos son iguales a los de la versión activa.'), {
      status: 409
    });
  }

  const pendiente = await prisma.cambioServicio.findFirst({
    where: { servicioId, estado: 'pendiente' }
  });
  if (pendiente) {
    throw Object.assign(new Error('El servicio ya tiene un cambio pendiente de revisión.'), { status: 409 });
  }

  const cambio = await prisma.cambioServicio.create({
    data: { servicioId, tipoPrecioNuevo, precioNuevo },
    include: INCLUIR_CAMBIO
  });
  return aRespuesta(cambio);
}

export async function aprobar(id) {
  const cambioAprobado = await prisma.$transaction(async (transaction) => {
    const cambio = await transaction.cambioServicio.findUnique({
      where: { id },
      include: { servicio: { select: { activo: true } } }
    });
    if (!cambio) throw Object.assign(new Error('Cambio de servicio no encontrado.'), { status: 404 });
    if (cambio.estado !== 'pendiente') {
      throw Object.assign(new Error('Solo se pueden aprobar cambios pendientes.'), { status: 409 });
    }
    if (!cambio.servicio.activo) {
      throw Object.assign(new Error('No se puede aprobar un cambio para un servicio inactivo.'), { status: 409 });
    }

    const versionActiva = await transaction.versionServicio.findFirst({
      where: { servicioId: cambio.servicioId, estado: 'activo' },
      orderBy: { vigenciaDesde: 'desc' }
    });
    if (!versionActiva) {
      throw Object.assign(new Error('El servicio no tiene una versión de precio activa.'), { status: 409 });
    }

    const hoy = fechaActual();
    await transaction.versionServicio.update({
      where: { id: versionActiva.id },
      data: { estado: 'inactivo', vigenciaHasta: hoy }
    });
    await transaction.versionServicio.create({
      data: {
        servicioId: cambio.servicioId,
        tipoPrecio: cambio.tipoPrecioNuevo,
        precio: cambio.precioNuevo,
        estado: 'activo',
        vigenciaDesde: hoy
      }
    });

    return transaction.cambioServicio.update({
      where: { id },
      data: { estado: 'aprobado' },
      include: INCLUIR_CAMBIO
    });
  });
  return aRespuesta(cambioAprobado);
}

export async function rechazar(id) {
  const cambio = await obtenerPorId(id);
  if (cambio.estado !== 'pendiente') {
    throw Object.assign(new Error('Solo se pueden rechazar cambios pendientes.'), { status: 409 });
  }
  const cambioRechazado = await prisma.cambioServicio.update({
    where: { id },
    data: { estado: 'rechazado' },
    include: INCLUIR_CAMBIO
  });
  return aRespuesta(cambioRechazado);
}
