import { prisma } from '../config/prisma.js';

export function listar({ incluirInactivos = false } = {}) {
  return prisma.tipoServicio.findMany({
    where: incluirInactivos ? undefined : { activo: true },
    orderBy: { nombre: 'asc' }
  });
}

export async function obtenerPorId(id) {
  const tipo = await prisma.tipoServicio.findUnique({ where: { id } });
  if (!tipo) throw Object.assign(new Error('Tipo de servicio no encontrado.'), { status: 404 });
  return tipo;
}

async function asegurarNombreDisponible(nombre, excluirId) {
  const existente = await prisma.tipoServicio.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' }, id: excluirId ? { not: excluirId } : undefined }
  });
  if (existente) {
    throw Object.assign(new Error('Ya existe un tipo de servicio con ese nombre.'), {
      status: 409,
      detalles: { errores: { nombre: 'Utiliza un nombre diferente.' } }
    });
  }
}

export async function crear(datos) {
  await asegurarNombreDisponible(datos.nombre);
  return prisma.tipoServicio.create({ data: datos });
}

export async function actualizar(id, datos) {
  await obtenerPorId(id);
  await asegurarNombreDisponible(datos.nombre, id);
  return prisma.tipoServicio.update({ where: { id }, data: datos });
}
