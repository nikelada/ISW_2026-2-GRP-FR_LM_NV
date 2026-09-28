import { prisma } from '../config/prisma.js';
import { fechaActual } from '../utils/fecha.js';
import * as tipoServicioService from './tipoServicio.service.js';

export const INCLUIR_SERVICIO = {
  tipoServicio: { select: { id: true, nombre: true, activo: true } },
  versiones: {
    where: { estado: 'activo' },
    orderBy: { vigenciaDesde: 'desc' },
    take: 1
  }
};

// El precio, su modalidad y su vigencia pertenecen a la versión activa.
export function aRespuesta(servicio) {
  const [versionActiva] = servicio.versiones || [];
  const { versiones, ...datosServicio } = servicio;
  return {
    ...datosServicio,
    versionActiva: versionActiva || null
  };
}

export async function listar({ tipoServicioId, incluirInactivos = false } = {}) {
  const servicios = await prisma.servicio.findMany({
    where: {
      tipoServicioId: tipoServicioId || undefined,
      activo: incluirInactivos ? undefined : true,
      versiones: { some: { estado: 'activo' } }
    },
    include: INCLUIR_SERVICIO,
    orderBy: { nombre: 'asc' }
  });
  return servicios.map(aRespuesta);
}

async function obtenerModeloPorId(id) {
  const servicio = await prisma.servicio.findFirst({
    where: {
      id,
      versiones: { some: { estado: 'activo' } }
    },
    include: INCLUIR_SERVICIO
  });
  if (!servicio) throw Object.assign(new Error('Servicio no encontrado.'), { status: 404 });
  return servicio;
}

export async function obtenerPorId(id) {
  return aRespuesta(await obtenerModeloPorId(id));
}

async function asegurarTipoDisponible(tipoServicioId) {
  const tipo = await tipoServicioService.obtenerPorId(tipoServicioId);
  if (!tipo.activo) {
    throw Object.assign(new Error('El tipo de servicio seleccionado está inactivo.'), {
      status: 409,
      detalles: { errores: { tipoServicioId: 'Selecciona un tipo de servicio activo.' } }
    });
  }
}

export async function crear(datos) {
  await asegurarTipoDisponible(datos.tipoServicioId);
  const { tipoPrecio, precio, ...datosServicio } = datos;
  const vigenciaDesde = fechaActual();

  const servicio = await prisma.$transaction(async (transaction) => {
    const creado = await transaction.servicio.create({ data: datosServicio });
    await transaction.versionServicio.create({
      data: { servicioId: creado.id, tipoPrecio, precio, estado: 'activo', vigenciaDesde }
    });
    return transaction.servicio.findUnique({
      where: { id: creado.id },
      include: INCLUIR_SERVICIO
    });
  });

  return aRespuesta(servicio);
}

export async function actualizar(id, datos) {
  await obtenerModeloPorId(id);
  await asegurarTipoDisponible(datos.tipoServicioId);
  const servicio = await prisma.servicio.update({
    where: { id },
    data: datos,
    include: INCLUIR_SERVICIO
  });
  return aRespuesta(servicio);
}
