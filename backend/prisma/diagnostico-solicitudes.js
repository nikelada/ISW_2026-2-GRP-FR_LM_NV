import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ESTADOS_REVISADOS = ['confirmado', 'disponible_cotizar'];
const argumentos = new Set(process.argv.slice(2));
const mostrarDetalle = argumentos.has('--verbose');
const argumentosDesconocidos = [...argumentos].filter((argumento) => argumento !== '--verbose');

// TODO: detectar relaciones que apunten a servicios inexistentes.
// TODO: detectar relaciones que apunten a versiones inexistentes.
// TODO: detectar incompatibilidad entre el servicio y la version asociada.

async function existeTabla(nombre) {
  const [resultado] = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${nombre}
    ) AS existe
  `;
  return resultado.existe;
}

async function existeColumna(tabla, columna) {
  const [resultado] = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tabla}
        AND column_name = ${columna}
    ) AS existe
  `;
  return resultado.existe;
}

async function obtenerResumen(tieneSolicitudes) {
  if (!tieneSolicitudes) {
    return { total: 0, confirmadas: 0, disponibles: 0 };
  }

  const [resumen] = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado::text = 'confirmado')::int AS confirmadas,
      COUNT(*) FILTER (WHERE estado::text = 'disponible_cotizar')::int AS disponibles
    FROM "solicitudes"
  `;

  return resumen;
}

async function obtenerConflictos({ tieneSolicitudes, tieneServiciosTexto, tieneRelacionServicios }) {
  if (!tieneSolicitudes) return [];

  if (tieneRelacionServicios) {
    return prisma.$queryRaw`
      SELECT s.id, s."clienteId", s.estado::text AS estado
      FROM "solicitudes" AS s
      WHERE s.estado::text IN (${Prisma.join(ESTADOS_REVISADOS)})
        AND NOT EXISTS (
          SELECT 1
          FROM "solicitudes_servicios" AS ss
          WHERE ss."solicitudId" = s.id
        )
      ORDER BY s.estado::text, s.id
    `;
  }

  if (tieneServiciosTexto) {
    return prisma.$queryRaw`
      SELECT id, "clienteId", estado::text AS estado, "servicios" AS detalle
      FROM "solicitudes"
      WHERE estado::text IN (${Prisma.join(ESTADOS_REVISADOS)})
        AND ("servicios" IS NULL OR btrim("servicios") = '')
      ORDER BY estado::text, id
    `;
  }

  return prisma.$queryRaw`
    SELECT id, "clienteId", estado::text AS estado
    FROM "solicitudes"
    WHERE estado::text IN (${Prisma.join(ESTADOS_REVISADOS)})
    ORDER BY estado::text, id
  `;
}

async function obtenerDatosLegado({ tieneSolicitudes, tieneServiciosTexto }) {
  if (!tieneSolicitudes || !tieneServiciosTexto) return [];

  return prisma.$queryRaw`
    SELECT id, "clienteId", estado::text AS estado, "servicios" AS detalle
    FROM "solicitudes"
    WHERE "servicios" IS NOT NULL
      AND btrim("servicios") <> ''
    ORDER BY id
  `;
}

function imprimirConflictos(conflictos) {
  for (const conflicto of conflictos) {
    const detalle = conflicto.detalle ? ` | Dato antiguo: ${conflicto.detalle}` : '';
    console.warn(
      `- Solicitud #${conflicto.id} | Estado: ${conflicto.estado} | ` +
        `Cliente #${conflicto.clienteId}${detalle}`
    );
  }
}

async function diagnosticarSolicitudes() {
  if (argumentosDesconocidos.length > 0) {
    throw new Error(`Opcion no reconocida: ${argumentosDesconocidos[0]}`);
  }

  const tieneSolicitudes = await existeTabla('solicitudes');
  const tieneServiciosTexto = tieneSolicitudes && (await existeColumna('solicitudes', 'servicios'));
  const tieneRelacionServicios = await existeTabla('solicitudes_servicios');
  const resumen = await obtenerResumen(tieneSolicitudes);
  const conflictos = await obtenerConflictos({
    tieneSolicitudes,
    tieneServiciosTexto,
    tieneRelacionServicios
  });
  const datosLegado = await obtenerDatosLegado({ tieneSolicitudes, tieneServiciosTexto });

  if (!mostrarDetalle) {
    console.log('Diagnóstico de conflictos de servicio');
  }

  if (mostrarDetalle) {
    console.log('Diagnóstico de conflictos de servicio');
    console.log(`total de solicitudes en sistema: ${resumen.total}`);
    console.log(`total solicitudes estado confirmado: ${resumen.confirmadas}`);
    console.log(`conflictos estado confirmado sin servicio: ${conflictos.filter(({ estado }) => estado === 'confirmado').length}`);
    console.log(`total disponible_cotizar: ${resumen.disponibles}`);
    console.log(`conflictos disponible_cotizar sin servicio: ${conflictos.filter(({ estado }) => estado === 'disponible_cotizar').length}`);
  }

  if (datosLegado.length > 0) {
    console.warn(
      `ADVERTENCIA: ${datosLegado.length} solicitud(es) tienen datos en ` +
        'solicitudes.servicios, columna que una migración eliminaría.'
    );
    imprimirConflictos(datosLegado);
  }

  if (conflictos.length > 0) {
    console.warn(
      `ADVERTENCIA: se encontraron ${conflictos.length} solicitud(es) ` +
        'confirmadas o disponibles para cotizar sin servicios asociados.'
    );
    imprimirConflictos(conflictos);
  }

  if (datosLegado.length === 0 && conflictos.length === 0) {
    console.log('No se encontraron conflictos que requieran reparación.');
    return;
  }

  process.exitCode = 1;
}

diagnosticarSolicitudes()
  .catch((error) => {
    console.error('No fue posible ejecutar el diagnóstico:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
