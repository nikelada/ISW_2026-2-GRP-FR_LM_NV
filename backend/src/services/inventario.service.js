import { prisma } from '../config/prisma.js';

function aRespuesta(item) {
  return { ...item, precio: Number(item.precio) };
}

export async function listar() {
  const items = await prisma.inventario.findMany({ orderBy: { nombre: 'asc' } });
  return items.map(aRespuesta);
}

export async function obtenerPorId(id) {
  const item = await prisma.inventario.findUnique({ where: { id } });
  if (!item) throw Object.assign(new Error('Producto de inventario no encontrado.'), { status: 404 });
  return aRespuesta(item);
}

export async function crear(datos) {
  const item = await prisma.inventario.create({ data: datos });
  return aRespuesta(item);
}

export async function actualizar(id, datos) {
  await obtenerPorId(id);
  const item = await prisma.inventario.update({ where: { id }, data: datos });
  return aRespuesta(item);
}

export async function eliminar(id) {
  await obtenerPorId(id);
  await prisma.inventario.delete({ where: { id } });
}