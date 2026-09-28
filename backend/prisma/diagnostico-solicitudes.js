import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ESTADOS_REVISADOS = ['confirmado', 'disponible_cotizar'];
const argumentos = new Set(process.argv.slice(2));
const mostrarDetalle = argumentos.has('--verbose');
const argumentosDesconocidos = [...argumentos].filter((argumento) => argumento !== '--verbose');

// TODO: detectar relaciones que apunten a servicios inexistentes.
// TODO: detectar relaciones que apunten a versiones inexistentes.
// TODO: detectar incompatibilidad entre el servicio y la versión asociada.

async function diagnosticarSolicitudes() {
  if (argumentosDesconocidos.length > 0) {
    throw new Error(`Opcion no reconocida: ${argumentosDesconocidos[0]}`);
  }

  const [totalSolicitudes, totalConfirmadas, conflictosConfirmadas, totalDisponibles, conflictosDisponibles] =
    await Promise.all([
      prisma.solicitud.count(),
      prisma.solicitud.count({ where: { estado: 'confirmado' } }),
      prisma.solicitud.count({
        where: { estado: 'confirmado', servicios: { none: {} } }
      }),
      prisma.solicitud.count({ where: { estado: 'disponible_cotizar' } }),
      prisma.solicitud.count({
        where: { estado: 'disponible_cotizar', servicios: { none: {} } }
      })
    ]);

  const solicitudes = await prisma.solicitud.findMany({
    where: {
      estado: { in: ESTADOS_REVISADOS },
      servicios: { none: {} }
    },
    select: {
      id: true,
      estado: true,
      cliente: { select: { id: true, nombre: true } }
    },
    orderBy: [{ estado: 'asc' }, { id: 'asc' }]
  });

  if (!mostrarDetalle) {
    console.log('Diagnóstico de conflictos de servicio');
  }

  if (mostrarDetalle) {
    console.log('Diagnóstico de conflictos de servicio');
    console.log(`total de solicitudes en sistema: ${totalSolicitudes}`);
    console.log(`total solicitudes estado confirmado: ${totalConfirmadas}`);
    console.log(`conflictos estado confirmado sin servicio: ${conflictosConfirmadas}`);
    console.log(`total disponible_cotizar: ${totalDisponibles}`);
    console.log(`conflictos disponible_cotizar sin servicio: ${conflictosDisponibles}`);
  }

  if (solicitudes.length === 0) {
    console.log('No se encontraron solicitudes inconsistentes.');
    return;
  }

  console.warn(
    `ADVERTENCIA: se encontraron ${solicitudes.length} solicitud(es) en estado ` +
      'confirmado o disponible_cotizar sin servicios asociados.'
  );

  for (const solicitud of solicitudes) {
    const cliente = solicitud.cliente
      ? `Cliente #${solicitud.cliente.id} (${solicitud.cliente.nombre})`
      : 'Cliente no encontrado';
    console.warn(`- Solicitud #${solicitud.id} | Estado: ${solicitud.estado} | ${cliente}`);
  }

}

diagnosticarSolicitudes()
  .catch((error) => {
    console.error('No fue posible ejecutar el diagnóstico:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
