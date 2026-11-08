import { prisma } from '../config/prisma.js';

// Listado con búsqueda por RUT, nombre, correo o teléfono
export function listar(busqueda = '') {
  const where = busqueda
    ? {
        OR: ['rut', 'nombre', 'correo', 'telefono'].map((campo) => ({
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

// Si el RUT o el correo ya existen, el cliente ya está registrado y no se duplica
async function asegurarNoRegistrado({ rut, correo }, excluirId) {
  const existente = await prisma.cliente.findFirst({
    where: {
      OR: [{ rut }, { correo: { equals: correo, mode: 'insensitive' } }],
      id: excluirId ? { not: excluirId } : undefined
    }
  });
  if (existente) {
    const campo = existente.rut === rut ? 'rut' : 'correo';
    const dato = campo === 'rut' ? 'El RUT' : 'El correo';
    const mensaje = excluirId
      ? `${dato} pertenece a otro cliente registrado («${existente.nombre}»).`
      : `El cliente ya se encuentra registrado como «${existente.nombre}». Actualiza sus datos en lugar de registrarlo otra vez.`;
    throw Object.assign(new Error(mensaje), {
      status: 409,
      detalles: { errores: { [campo]: `${dato} pertenece a un cliente registrado.` }, clienteExistente: existente }
    });
  }
}

// Después de registrarlo ya se puede usar en solicitudes nuevas
export async function crear(datos) {
  await asegurarNoRegistrado(datos);
  return prisma.cliente.create({ data: datos });
}

export async function actualizar(id, datos) {
  await obtenerPorId(id);
  await asegurarNoRegistrado(datos, id);
  return prisma.cliente.update({ where: { id }, data: datos });
}
