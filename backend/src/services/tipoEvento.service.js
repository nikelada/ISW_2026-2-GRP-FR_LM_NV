import { prisma } from '../config/prisma.js';

export function listar() {
  return prisma.tipoEvento.findMany({ orderBy: { nombre: 'asc' } });
}

// Si ya existe (aunque cambien las mayúsculas) se devuelve ese
export async function crear({ nombre }) {
  const existente = await prisma.tipoEvento.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } });
  if (existente) {
    throw Object.assign(new Error(`El tipo de evento «${existente.nombre}» ya existe.`), {
      status: 409,
      detalles: { errores: { nombre: 'Ya está en la lista.' }, tipoExistente: existente }
    });
  }
  return prisma.tipoEvento.create({ data: { nombre } });
}

// La solicitud y los cambios solo aceptan tipos de la lista
export async function asegurarTipoEvento(nombre) {
  if (!nombre) return;
  const tipo = await prisma.tipoEvento.findUnique({ where: { nombre } });
  if (!tipo) {
    throw Object.assign(new Error('El tipo de evento no está en la lista.'), {
      status: 400,
      detalles: { errores: { tipoEvento: 'Elige un tipo de evento de la lista o agrega uno nuevo.' } }
    });
  }
}
