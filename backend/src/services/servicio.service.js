import { prisma } from '../config/prisma.js';
import * as tipoServicioService from './tipoServicio.service.js';

const INCLUIR_TIPO = { tipoServicio: { select: { id: true, nombre: true, activo: true } } };

export function listar({ tipoServicioId, incluirInactivos = false } = {}) {
  return prisma.servicio.findMany({
    where: {
      tipoServicioId: tipoServicioId || undefined,
      activo: incluirInactivos ? undefined : true
    },
    include: INCLUIR_TIPO,
    orderBy: { nombre: 'asc' }
  });
}

export async function obtenerPorId(id) {
  const servicio = await prisma.servicio.findUnique({ where: { id }, include: INCLUIR_TIPO });
  if (!servicio) throw Object.assign(new Error('Servicio no encontrado.'), { status: 404 });
  return servicio;
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
  return prisma.servicio.create({ data: datos, include: INCLUIR_TIPO });
}

export async function actualizar(id, datos) {
  await obtenerPorId(id);
  await asegurarTipoDisponible(datos.tipoServicioId);
  return prisma.servicio.update({ where: { id }, data: datos, include: INCLUIR_TIPO });
}
