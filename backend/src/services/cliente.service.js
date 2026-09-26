import { prisma } from '../config/prisma.js';

// Gestionar clientes.
export function listar(busqueda = '') {
  const where = busqueda
    ? {
        OR: ['nombre', 'correo', 'telefono'].map((campo) => ({
          [campo]: { contains: busqueda, mode: 'insensitive' }
        }))
      }
    : undefined;
  return prisma.cliente.findMany({ where, orderBy: { nombre: 'asc' } });
}

export async function obtenerPorId(id) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw Object.assign(new Error('Cliente no encontrado.'), { status: 404 });
  return cliente;
}

// Una vez registrado, el cliente queda disponible para asociarlo a nuevas solicitudes.
export function crear(datos) {
  return prisma.cliente.create({ data: datos });
}

export async function actualizar(id, datos) {
  await obtenerPorId(id);
  return prisma.cliente.update({ where: { id }, data: datos });
}
