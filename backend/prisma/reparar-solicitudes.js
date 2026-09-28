import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ESTADOS_REVISADOS = ['confirmado', 'disponible_cotizar'];

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

async function obtenerCatalogoActivo() {
  return prisma.$queryRaw`
    SELECT
      s.id AS servicio_id,
      s.nombre AS servicio_nombre,
      ts.id AS tipo_id,
      ts.nombre AS tipo_nombre,
      vs.id AS version_id,
      vs."tipoPrecio" AS tipo_precio,
      vs.precio AS precio
    FROM "servicios" AS s
    INNER JOIN "tipos_servicio" AS ts ON ts.id = s."tipoServicioId"
    INNER JOIN LATERAL (
      SELECT id, "tipoPrecio", precio
      FROM "versiones_servicio"
      WHERE "servicioId" = s.id AND estado::text = 'activo'
      ORDER BY "vigenciaDesde" DESC, id DESC
      LIMIT 1
    ) AS vs ON true
    WHERE s.activo = true AND ts.activo = true
    ORDER BY ts.nombre, s.nombre
  `;
}

async function obtenerRelacionesExistentes(ids) {
  if (ids.length === 0) return [];

  return prisma.$queryRaw`
    SELECT
      ss."solicitudId" AS solicitud_id,
      ss."servicioId" AS servicio_id,
      ss."versionServicioId" AS version_id,
      s.nombre AS servicio_nombre,
      ts.nombre AS tipo_nombre
    FROM "solicitudes_servicios" AS ss
    INNER JOIN "servicios" AS s ON s.id = ss."servicioId"
    INNER JOIN "tipos_servicio" AS ts ON ts.id = s."tipoServicioId"
    WHERE ss."solicitudId" IN (${Prisma.join(ids)})
    ORDER BY ss."solicitudId", s.nombre
  `;
}

async function obtenerSolicitudesParaReparar({ tieneServiciosTexto, tieneRelacionServicios }) {
  if (tieneServiciosTexto && tieneRelacionServicios) {
    return prisma.$queryRaw`
      SELECT
        s.id,
        s."clienteId" AS cliente_id,
        s.estado::text AS estado,
        s."servicios" AS servicios_legado
      FROM "solicitudes" AS s
      WHERE s.estado::text IN (${Prisma.join(ESTADOS_REVISADOS)})
        AND (
          (s."servicios" IS NOT NULL AND btrim(s."servicios") <> '')
          OR NOT EXISTS (
            SELECT 1
            FROM "solicitudes_servicios" AS ss
            WHERE ss."solicitudId" = s.id
          )
        )
      ORDER BY s.estado::text, s.id
    `;
  }

  if (tieneRelacionServicios) {
    return prisma.$queryRaw`
      SELECT
        s.id,
        s."clienteId" AS cliente_id,
        s.estado::text AS estado,
        NULL::text AS servicios_legado
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

  return prisma.$queryRaw`
    SELECT
      s.id,
      s."clienteId" AS cliente_id,
      s.estado::text AS estado,
      s."servicios" AS servicios_legado
    FROM "solicitudes" AS s
    WHERE s.estado::text IN (${Prisma.join(ESTADOS_REVISADOS)})
      AND (s."servicios" IS NULL OR btrim(s."servicios") = '')
    ORDER BY s.estado::text, s.id
  `;
}

function agruparPorTipo(catalogo) {
  const grupos = new Map();
  for (const servicio of catalogo) {
    if (!grupos.has(servicio.tipo_id)) {
      grupos.set(servicio.tipo_id, {
        id: servicio.tipo_id,
        nombre: servicio.tipo_nombre,
        servicios: []
      });
    }
    grupos.get(servicio.tipo_id).servicios.push(servicio);
  }
  return [...grupos.values()];
}

function imprimirSeleccion(seleccionados) {
  if (seleccionados.length === 0) {
    console.log('  (ninguno)');
    return;
  }
  seleccionados.forEach((servicio, indice) => {
    console.log(`  ${indice + 1}. ${servicio.tipo_nombre} - ${servicio.servicio_nombre}`);
  });
}

async function pedirIndice(rl, texto, maximo) {
  while (true) {
    const respuesta = (await rl.question(`${texto} (0 para volver): `)).trim();
    const numero = Number(respuesta);
    if (numero === 0) return null;
    if (Number.isInteger(numero) && numero >= 1 && numero <= maximo) return numero - 1;
    console.log('Seleccion invalida. Ingresa uno de los numeros mostrados.');
  }
}

async function agregarServicio(rl, grupos, seleccionados) {
  const gruposDisponibles = grupos
    .map((grupo) => ({
      ...grupo,
      servicios: grupo.servicios.filter(
        (servicio) => !seleccionados.some(({ servicio_id }) => servicio_id === servicio.servicio_id)
      )
    }))
    .filter(({ servicios }) => servicios.length > 0);

  if (gruposDisponibles.length === 0) {
    console.log('No quedan servicios activos disponibles para agregar.');
    return;
  }

  console.log('Tipos de servicio disponibles:');
  gruposDisponibles.forEach((grupo, indice) => {
    console.log(`  ${indice + 1}. ${grupo.nombre}`);
  });
  const tipoIndice = await pedirIndice(rl, 'Selecciona un tipo de servicio', gruposDisponibles.length);
  if (tipoIndice === null) return;

  const grupo = gruposDisponibles[tipoIndice];
  console.log(`Servicios activos de ${grupo.nombre}:`);
  grupo.servicios.forEach((servicio, indice) => {
    console.log(`  ${indice + 1}. ${servicio.servicio_nombre}`);
  });
  const servicioIndice = await pedirIndice(rl, 'Selecciona un servicio', grupo.servicios.length);
  if (servicioIndice === null) return;

  seleccionados.push(grupo.servicios[servicioIndice]);
  console.log(`Servicio agregado: ${grupo.servicios[servicioIndice].servicio_nombre}`);
}

async function quitarServicio(rl, seleccionados) {
  if (seleccionados.length === 0) {
    console.log('No hay servicios seleccionados para quitar.');
    return;
  }

  imprimirSeleccion(seleccionados);
  const indice = await pedirIndice(rl, 'Selecciona el servicio que quieres quitar', seleccionados.length);
  if (indice === null) return;

  const [quitado] = seleccionados.splice(indice, 1);
  console.log(`Servicio quitado: ${quitado.servicio_nombre}`);
}

async function guardarReparacion(solicitud, seleccionados, relacionesIniciales, tieneServiciosTexto) {
  const idsIniciales = new Set(relacionesIniciales.map(({ servicio_id }) => servicio_id));
  const idsFinales = new Set(seleccionados.map(({ servicio_id }) => servicio_id));
  const relacionesParaEliminar = relacionesIniciales.filter(({ servicio_id }) => !idsFinales.has(servicio_id));
  const serviciosParaAgregar = seleccionados.filter(({ servicio_id }) => !idsIniciales.has(servicio_id));

  await prisma.$transaction(async (transaction) => {
    for (const relacion of relacionesParaEliminar) {
      await transaction.$executeRaw`
        DELETE FROM "solicitudes_servicios"
        WHERE "solicitudId" = ${solicitud.id} AND "servicioId" = ${relacion.servicio_id}
      `;
    }

    for (const servicio of serviciosParaAgregar) {
      await transaction.$executeRaw`
        INSERT INTO "solicitudes_servicios" ("solicitudId", "servicioId", "versionServicioId")
        VALUES (${solicitud.id}, ${servicio.servicio_id}, ${servicio.version_id})
        ON CONFLICT ("solicitudId", "servicioId") DO NOTHING
      `;
    }

    if (tieneServiciosTexto) {
      await transaction.$executeRaw`
        UPDATE "solicitudes"
        SET "servicios" = NULL
        WHERE id = ${solicitud.id}
      `;
    }
  });

  return {
    agregados: serviciosParaAgregar.length,
    quitados: relacionesParaEliminar.length
  };
}

async function repararSolicitud(rl, solicitud, grupos, relaciones, tieneServiciosTexto) {
  const seleccionados = relaciones.map((relacion) => ({
    servicio_id: relacion.servicio_id,
    servicio_nombre: relacion.servicio_nombre,
    tipo_nombre: relacion.tipo_nombre,
    version_id: relacion.version_id
  }));

  console.log(`\nSolicitud #${solicitud.id} | Estado: ${solicitud.estado} | Cliente #${solicitud.cliente_id}`);
  if (solicitud.servicios_legado) {
    console.log(`Dato antiguo encontrado en solicitudes.servicios: ${solicitud.servicios_legado}`);
  }

  while (true) {
    console.log('\nServicios seleccionados:');
    imprimirSeleccion(seleccionados);
    console.log('\n1. Añadir servicio');
    console.log('2. Quitar servicio');
    console.log('3. Confirmar reparación');
    console.log('4. Omitir solicitud');

    const opcion = (await rl.question('Selecciona una opcion: ')).trim();
    if (opcion === '1') {
      await agregarServicio(rl, grupos, seleccionados);
    } else if (opcion === '2') {
      await quitarServicio(rl, seleccionados);
    } else if (opcion === '3') {
      if (seleccionados.length === 0) {
        console.log('No puedes confirmar sin al menos un servicio.');
        continue;
      }
      const confirmar = (await rl.question('Confirma guardar esta reparacion (s/N): ')).trim().toLowerCase();
      if (confirmar !== 's' && confirmar !== 'si') continue;
      const resultado = await guardarReparacion(solicitud, seleccionados, relaciones, tieneServiciosTexto);
      console.log(`Reparacion guardada. Agregados: ${resultado.agregados}. Quitados: ${resultado.quitados}.`);
      return true;
    } else if (opcion === '4') {
      console.log('Solicitud omitida.');
      return false;
    } else {
      console.log('Opcion invalida.');
    }
  }
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('La reparacion requiere una terminal interactiva.');
  }

  const tieneSolicitudes = await existeTabla('solicitudes');
  const tieneServicios = await existeTabla('servicios');
  const tieneTiposServicio = await existeTabla('tipos_servicio');
  const tieneVersiones = await existeTabla('versiones_servicio');
  const tieneRelacionServicios = await existeTabla('solicitudes_servicios');
  const tieneServiciosTexto = tieneSolicitudes && (await existeColumna('solicitudes', 'servicios'));
  const tieneVersionRelacion = tieneRelacionServicios && (await existeColumna('solicitudes_servicios', 'versionServicioId'));

  if (!tieneSolicitudes || !tieneServicios || !tieneTiposServicio || !tieneVersiones || !tieneRelacionServicios || !tieneVersionRelacion) {
    throw new Error(
      'La base de datos no tiene todas las estructuras necesarias para reparar solicitudes. ' +
        'No se realizaron cambios.'
    );
  }

  const catalogo = await obtenerCatalogoActivo();
  if (catalogo.length === 0) {
    console.log('No hay servicios activos con una version de precio activa.');
    return;
  }

  const solicitudes = await obtenerSolicitudesParaReparar({ tieneServiciosTexto, tieneRelacionServicios });
  if (solicitudes.length === 0) {
    console.log('No hay solicitudes que requieran reparacion.');
    return;
  }

  const relaciones = await obtenerRelacionesExistentes(solicitudes.map(({ id }) => id));
  const relacionesPorSolicitud = new Map();
  for (const relacion of relaciones) {
    if (!relacionesPorSolicitud.has(relacion.solicitud_id)) relacionesPorSolicitud.set(relacion.solicitud_id, []);
    relacionesPorSolicitud.get(relacion.solicitud_id).push(relacion);
  }

  const rl = createInterface({ input, output });
  const grupos = agruparPorTipo(catalogo);
  let reparadas = 0;

  try {
    for (const solicitud of solicitudes) {
      const reparada = await repararSolicitud(
        rl,
        solicitud,
        grupos,
        relacionesPorSolicitud.get(solicitud.id) || [],
        tieneServiciosTexto
      );
      if (reparada) reparadas += 1;
    }
  } finally {
    rl.close();
  }

  console.log(`Solicitudes reparadas: ${reparadas} de ${solicitudes.length}.`);
}

main()
  .catch((error) => {
    console.error('No fue posible reparar solicitudes:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
