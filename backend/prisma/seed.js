// Datos de prueba para demostrar clientes, servicios, solicitudes y calendario.
// Uso normal: npm run seed
// Uso acumulativo: npm run seed -- --merge
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const argumentos = new Set(process.argv.slice(2));
const permitirMerge = argumentos.has('--merge');
const argumentosDesconocidos = [...argumentos].filter((argumento) => argumento !== '--merge');

// Fecha a N dias desde hoy, como DATE de PostgreSQL.
function enDias(dias) {
  const hoy = new Date();
  return new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias));
}

const hora = (texto) => new Date(`1970-01-01T${texto}:00Z`);
const textoFecha = (valor) => (valor ? valor.toISOString().slice(0, 10) : null);
const textoHora = (valor) => (valor ? valor.toISOString().slice(11, 16) : null);

async function obtenerOCrearCliente(data) {
  const existente = await prisma.cliente.findFirst({ where: { correo: data.correo } });
  if (existente) return { registro: existente, creado: false };
  return { registro: await prisma.cliente.create({ data }), creado: true };
}

async function obtenerOCrearTipoServicio(data) {
  const existente = await prisma.tipoServicio.findFirst({ where: { nombre: data.nombre } });
  if (existente) return { registro: existente, creado: false };
  return { registro: await prisma.tipoServicio.create({ data }), creado: true };
}

async function obtenerOCrearServicio({ tipoServicioId, nombre, descripcion, tipoPrecio, precio }) {
  const existente = await prisma.servicio.findFirst({
    where: { tipoServicioId, nombre },
    include: {
      versiones: {
        where: { estado: 'activo' },
        orderBy: { vigenciaDesde: 'desc' },
        take: 1
      }
    }
  });

  if (existente) {
    const versionActiva = existente.versiones[0];
    if (!versionActiva) {
      throw new Error(`El servicio existente "${nombre}" no tiene una version activa.`);
    }
    if (versionActiva.tipoPrecio !== tipoPrecio || versionActiva.precio !== precio) {
      console.log(
        `Servicio existente "${nombre}": se conserva su precio actual y no se crea una nueva version.`
      );
    }
    return { registro: { ...existente, versiones: [versionActiva] }, creado: false };
  }

  const creado = await prisma.servicio.create({
    data: {
      tipoServicioId,
      nombre,
      descripcion,
      versiones: {
        create: {
          tipoPrecio,
          precio,
          estado: 'activo',
          vigenciaDesde: enDias(0)
        }
      }
    },
    include: { versiones: true }
  });

  return { registro: creado, creado: true };
}

function referenciaServicio(servicio) {
  const versionActiva = servicio.versiones[0];
  if (!versionActiva) throw new Error(`El servicio "${servicio.nombre}" no tiene una version activa.`);
  return {
    servicioId: servicio.id,
    versionServicioId: versionActiva.id
  };
}

function firmaSolicitud({ clienteCorreo, fecha, horaInicio, horaFin, cantidadPersonas, lugar, servicios }) {
  return JSON.stringify({
    clienteCorreo,
    fecha: textoFecha(fecha),
    horaInicio: textoHora(horaInicio),
    horaFin: textoHora(horaFin),
    cantidadPersonas,
    lugar,
    servicios: servicios
      .map(({ servicioId }) => servicioId)
      .sort((a, b) => a - b)
  });
}

async function obtenerFirmasSolicitudes() {
  const solicitudes = await prisma.solicitud.findMany({
    include: {
      cliente: { select: { correo: true } },
      servicios: { select: { servicioId: true } }
    }
  });

  return new Set(
    solicitudes.map((solicitud) =>
      firmaSolicitud({
        clienteCorreo: solicitud.cliente.correo,
        fecha: solicitud.fecha,
        horaInicio: solicitud.horaInicio,
        horaFin: solicitud.horaFin,
        cantidadPersonas: solicitud.cantidadPersonas,
        lugar: solicitud.lugar,
        servicios: solicitud.servicios
      })
    )
  );
}

async function crearSolicitudConServicios(datos, servicios) {
  return prisma.$transaction(async (transaction) => {
    const solicitud = await transaction.solicitud.create({ data: datos });
    await transaction.solicitudServicio.createMany({
      data: servicios.map((servicio) => ({ solicitudId: solicitud.id, ...referenciaServicio(servicio) })),
      skipDuplicates: true
    });
    return solicitud;
  });
}

async function main() {
  if (argumentosDesconocidos.length > 0) {
    throw new Error(`Opcion no reconocida: ${argumentosDesconocidos[0]}`);
  }

  const [clientesExistentes, tiposExistentes, serviciosExistentes, solicitudesExistentes] = await Promise.all([
    prisma.cliente.count(),
    prisma.tipoServicio.count(),
    prisma.servicio.count(),
    prisma.solicitud.count()
  ]);

  if (!permitirMerge && (clientesExistentes || tiposExistentes || serviciosExistentes || solicitudesExistentes)) {
    console.log('Ya existen datos; no se insertaron datos de prueba. Usa npm run seed -- --merge para completar faltantes.');
    return;
  }

  let clientesCreados = 0;
  let tiposCreados = 0;
  let serviciosCreados = 0;
  let solicitudesCreadas = 0;
  let solicitudesOmitidas = 0;

  const datosClientes = [
    { nombre: 'Camila Rojas', telefono: '+56 9 8123 4567', correo: 'camila.rojas@example.com' },
    { nombre: 'Tomás Herrera', telefono: '+56 9 7234 5678', correo: 'tomas.herrera@example.com' },
    { nombre: 'Valentina Muñoz', telefono: '+56 9 6345 6789', correo: 'valentina.munoz@example.com' },
    { nombre: 'Diego Fuentes', telefono: '+56 9 5456 7890', correo: 'diego.fuentes@example.com' }
  ];

  const clientes = new Map();
  for (const datos of datosClientes) {
    const resultado = await obtenerOCrearCliente(datos);
    clientes.set(datos.correo, resultado.registro);
    if (resultado.creado) clientesCreados += 1;
  }

  const datosTipos = [
    { nombre: 'Catering', descripcion: 'Servicios de alimentación para eventos.' },
    { nombre: 'Soporte técnico', descripcion: 'Servicios de sonido, iluminación y equipamiento técnico.' },
    { nombre: 'Entretenimiento', descripcion: 'Servicios recreativos y de animación para eventos.' }
  ];

  const tipos = new Map();
  for (const datos of datosTipos) {
    const resultado = await obtenerOCrearTipoServicio(datos);
    tipos.set(datos.nombre, resultado.registro);
    if (resultado.creado) tiposCreados += 1;
  }

  const datosServicios = [
    {
      clave: 'catering',
      tipoServicioId: tipos.get('Catering').id,
      nombre: 'Catering Don Carlos',
      descripcion: 'Menu para eventos de 50 personas.',
      tipoPrecio: 'fijo',
      precio: 250000
    },
    {
      clave: 'sonido',
      tipoServicioId: tipos.get('Soporte técnico').id,
      nombre: 'Amplificación básica',
      descripcion: 'Sistema de sonido para eventos en espacios cerrados de tamaño medio.',
      tipoPrecio: 'por_hora',
      precio: 35000
    },
    {
      clave: 'karaoke',
      tipoServicioId: tipos.get('Entretenimiento').id,
      nombre: 'Sistema de karaoke',
      descripcion: 'Sistema de karaoke, incluye 2 micrófonos, 2 amplificadores y 1 proyector.',
      tipoPrecio: 'fijo',
      precio: 80000
    }
  ];

  const servicios = new Map();
  for (const datos of datosServicios) {
    const resultado = await obtenerOCrearServicio(datos);
    servicios.set(datos.clave, resultado.registro);
    if (resultado.creado) serviciosCreados += 1;
  }

  const firmasExistentes = await obtenerFirmasSolicitudes();
  const datosSolicitudes = [
    {
      clienteCorreo: 'camila.rojas@example.com',
      fecha: enDias(7),
      horaInicio: hora('19:00'),
      horaFin: hora('23:30'),
      cantidadPersonas: 120,
      lugar: 'Centro de Eventos Los Robles',
      estado: 'confirmado',
      fechaHabilitada: true,
      servicios: [servicios.get('catering'), servicios.get('sonido')]
    },
    {
      clienteCorreo: 'tomas.herrera@example.com',
      fecha: enDias(10),
      horaInicio: hora('10:00'),
      horaFin: hora('14:00'),
      cantidadPersonas: 40,
      lugar: 'Hotel Costanera, salón B',
      estado: 'confirmado',
      fechaHabilitada: true,
      servicios: [servicios.get('catering'), servicios.get('karaoke')]
    },
    {
      clienteCorreo: 'valentina.munoz@example.com',
      fecha: enDias(14),
      horaInicio: hora('18:00'),
      horaFin: hora('22:00'),
      cantidadPersonas: 80,
      lugar: 'Casona Las Acacias',
      estado: 'disponible_cotizar',
      fechaHabilitada: false,
      servicios: [servicios.get('catering')]
    },
    {
      clienteCorreo: 'diego.fuentes@example.com',
      fecha: enDias(7),
      horaInicio: hora('20:00'),
      horaFin: null,
      cantidadPersonas: 60,
      lugar: 'Salón del Parque',
      estado: 'pendiente',
      fechaHabilitada: false,
      servicios: [servicios.get('karaoke')]
    }
  ];

  for (const datos of datosSolicitudes) {
    const cliente = clientes.get(datos.clienteCorreo);
    const serviciosSolicitud = datos.servicios.map(referenciaServicio);
    const firma = firmaSolicitud({ ...datos, servicios: serviciosSolicitud });

    if (firmasExistentes.has(firma)) {
      solicitudesOmitidas += 1;
      continue;
    }

    const { clienteCorreo, servicios: _servicios, ...datosSolicitud } = datos;
    await crearSolicitudConServicios(
      { ...datosSolicitud, clienteId: cliente.id },
      datos.servicios
    );
    firmasExistentes.add(firma);
    solicitudesCreadas += 1;
  }

  console.log(
    `Seed completado. Clientes nuevos: ${clientesCreados}; tipos nuevos: ${tiposCreados}; ` +
      `servicios nuevos: ${serviciosCreados}; solicitudes nuevas: ${solicitudesCreadas}; ` +
      `solicitudes omitidas por duplicado: ${solicitudesOmitidas}.`
  );
}

main()
  .catch((error) => {
    console.error('No fue posible insertar datos de prueba:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
