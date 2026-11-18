import { prisma } from '../config/prisma.js';
import {
  consultarDisponibilidad as consultarDisponibilidadRecursos,
  reservarRecurso
} from './recursosOperativos.service.js';

function errorConEstado(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export async function listarEspacios() {
  return prisma.recursoOperativo.findMany({
    where: { tipo: 'espacio' },
    select: { id: true, nombre: true, ubicacion: true, estado: true },
    orderBy: { nombre: 'asc' }
  });
}

export async function listarRecursos() {
  return prisma.recursoOperativo.findMany({
    where: { tipo: 'espacio' },
    orderBy: { nombre: 'asc' }
  });
}

export async function crearRecurso(datos) {
  return prisma.recursoOperativo.create({ data: datos });
}

export async function actualizarRecurso(id, datos) {
  const existe = await prisma.recursoOperativo.findFirst({ where: { id, tipo: 'espacio' } });
  if (!existe) throw errorConEstado('Espacio no encontrado.', 404);
  return prisma.recursoOperativo.update({ where: { id }, data: datos });
}

export async function consultarDisponibilidad(consulta) {
  return consultarDisponibilidadRecursos({ ...consulta, tipo: 'espacio' });
}

export async function reservarEspacio(solicitudId, recursoId) {
  const espacio = await prisma.recursoOperativo.findFirst({ where: { id: recursoId, tipo: 'espacio' } });
  if (!espacio) throw errorConEstado('Espacio no encontrado.', 404);
  return reservarRecurso(solicitudId, recursoId);
}
