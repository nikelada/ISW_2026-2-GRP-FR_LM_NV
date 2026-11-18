// Datos de prueba: clientes, servicios, solicitudes, inventario, recursos y operaciones.
// Uso normal: npm run seed
// Uso acumulativo: npm run seed -- --merge
import { PrismaClient } from '@prisma/client';
import { siguienteCodigo } from '../src/utils/codigo.js';

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

async function obtenerOCrearInventario(data) {
  const existente = await prisma.inventario.findFirst({
    where: { nombre: data.nombre, categoria: data.categoria }
  });
  if (existente) return { registro: existente, creado: false };
  return { registro: await prisma.inventario.create({ data }), creado: true };
}

async function obtenerOCrearRecursoOperativo(data) {
  const existente = await prisma.recursoOperativo.findFirst({
    where: { nombre: data.nombre, tipo: data.tipo }
  });
  if (existente) return { registro: existente, creado: false };
  return { registro: await prisma.recursoOperativo.create({ data }), creado: true };
}

async function obtenerOCrearPersonalEventual(data) {
  const existente = await prisma.personalEventual.findFirst({
    where: { nombre: data.nombre, correo: data.correo }
  });
  if (existente) return { registro: existente, creado: false };
  return { registro: await prisma.personalEventual.create({ data }), creado: true };
}

async function obtenerOCrearTareaEvento(solicitudId, data) {
  const existente = await prisma.tareaEvento.findFirst({
    where: { solicitudId, titulo: data.titulo }
  });
  if (existente) return { registro: existente, creado: false };
  return {
    registro: await prisma.tareaEvento.create({ data: { solicitudId, ...data } }),
    creado: true
  };
}

async function obtenerOCrearPagoEvento(solicitudId, data) {
  const existente = await prisma.pagoEvento.findFirst({
    where: { solicitudId, concepto: data.concepto }
  });
  if (existente) return { registro: existente, creado: false };
  return {
    registro: await prisma.pagoEvento.create({ data: { solicitudId, ...data } }),
    creado: true
  };
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
    const codigo = await siguienteCodigo(transaction.solicitud, 'SOL');
    const solicitud = await transaction.solicitud.create({ data: { ...datos, codigo } });
    await transaction.solicitudServicio.createMany({
      data: servicios.map((servicio) => ({ solicitudId: solicitud.id, ...referenciaServicio(servicio) })),
      skipDuplicates: true
    });
    return solicitud;
  });
}

async function crearDatosOperacionesDemo(solicitudId) {
  const resultado = { personal: 0, asignaciones: 0, tareas: 0, pagos: 0, cierres: 0 };
  const cierreExistente = await prisma.cierreEvento.findUnique({ where: { solicitudId } });
  if (cierreExistente && cierreExistente.estado !== 'pendiente') return resultado;

  const trabajadores = [
    { nombre: 'Sofía Torres (prueba)', telefono: '+56 9 7000 0001', correo: 'sofia.torres@example.com', funcion: 'Coordinación de prueba' },
    { nombre: 'Matías Riquelme (prueba)', telefono: '+56 9 7000 0002', correo: 'matias.riquelme@example.com', funcion: 'Montaje de salón' },
    { nombre: 'Valentina Salas (prueba)', telefono: '+56 9 7000 0003', correo: 'valentina.salas@example.com', funcion: 'Sonido e iluminación' },
    { nombre: 'Diego Paredes (prueba)', telefono: '+56 9 7000 0004', correo: 'diego.paredes@example.com', funcion: 'Apoyo logístico' },
    { nombre: 'Camila Fuentes (prueba)', telefono: '+56 9 7000 0005', correo: 'camila.fuentes@example.com', funcion: 'Atención de invitados' }
  ];
  for (const { funcion, ...datos } of trabajadores) {
    const personal = await obtenerOCrearPersonalEventual({ ...datos, esContacto: true });
    if (personal.creado) resultado.personal += 1;

    const asignacionExistente = await prisma.personalEvento.findUnique({
      where: { solicitudId_personalId: { solicitudId, personalId: personal.registro.id } }
    });
    if (!asignacionExistente) {
      await prisma.personalEvento.create({
        data: { solicitudId, personalId: personal.registro.id, funcion }
      });
      resultado.asignaciones += 1;
    }
  }

  const tareas = [
    { titulo: 'Preparar montaje de prueba', descripcion: 'Revisar mesas y sillas del evento.', estado: 'completada' },
    { titulo: 'Probar sonido de prueba', descripcion: 'Verificar micrófonos y amplificación.', estado: 'pendiente' }
  ];
  for (const datos of tareas) {
    const tarea = await obtenerOCrearTareaEvento(solicitudId, datos);
    if (tarea.creado) resultado.tareas += 1;
  }

  const pagos = [
    { concepto: 'Abono de prueba', monto: 100000, estado: 'pagado' },
    { concepto: 'Saldo de prueba', monto: 250000, estado: 'pendiente' }
  ];
  for (const datos of pagos) {
    const pago = await obtenerOCrearPagoEvento(solicitudId, datos);
    if (pago.creado) resultado.pagos += 1;
  }

  if (!cierreExistente) {
    await prisma.cierreEvento.create({
      data: {
        solicitudId,
        estado: 'pendiente',
        encuestaConforme: true,
        encuestaComentario: 'Evaluación ficticia para datos de prueba.'
      }
    });
    resultado.cierres += 1;
  }

  return resultado;
}

const USUARIO_PRODUCCION = 'Leonardo Araya';
const USUARIO_GERENCIA = 'Martina Fuentealba';
const REVISION_COMPLETA = { revisionRecursos: true, revisionAnticipacion: true, revisionCosto: true, revisionOtrosEventos: true };

// Si un cambio trae `anteriores` es porque ya se aplicó, así que también va al historial.
async function crearCambios(solicitudId, cambios) {
  for (const { anteriores, ...datos } of cambios) {
    const revisado = datos.estado !== 'pendiente';
    const cambio = await prisma.solicitudCambio.create({
      data: {
        codigo: await siguienteCodigo(prisma.solicitudCambio, 'CAM'),
        solicitudId,
        ...datos,
        registradoPor: USUARIO_PRODUCCION,
        ...(datos.estado === 'aprobado' ? REVISION_COMPLETA : {}),
        ...(revisado ? { revisadoPor: USUARIO_GERENCIA, revisadoEn: new Date() } : {}),
        ...(anteriores ? { aplicadoPor: USUARIO_PRODUCCION, aplicadoEn: new Date() } : {})
      }
    });
    if (anteriores) {
      await prisma.historialEvento.createMany({
        data: Object.entries(datos.cambios).map(([campo, valor]) => ({
          solicitudId,
          cambioId: cambio.id,
          campo,
          valorAnterior: anteriores[campo],
          valorNuevo: String(valor),
          usuario: USUARIO_PRODUCCION
        }))
      });
    }
  }
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
  let cambiosCreados = 0;
  let tiposEventoCreados = 0;
  let objetosCreados = 0;
  let vehiculosCreados = 0;
  let espaciosCreados = 0;

  const datosClientes = [
    { rut: '16234871-K', nombre: 'Camila Rojas', telefono: '+56 9 8123 4567', correo: 'camila.rojas@example.com' },
    { rut: '18456239-1', nombre: 'Tomás Herrera', telefono: '+56 9 7234 5678', correo: 'tomas.herrera@example.com' },
    { rut: '19872345-2', nombre: 'Valentina Muñoz', telefono: '+56 9 6345 6789', correo: 'valentina.munoz@example.com' },
    { rut: '15678432-K', nombre: 'Diego Fuentes', telefono: '+56 9 5456 7890', correo: 'diego.fuentes@example.com' }
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

  // Van antes de las solicitudes que los usan
  const tiposEvento = ['Matrimonio', 'Seminario corporativo', 'Cumpleaños', 'Fiesta de graduación', 'Aniversario de empresa', 'Lanzamiento de producto'];
  for (const nombre of tiposEvento) {
    const existente = await prisma.tipoEvento.findUnique({ where: { nombre } });
    if (!existente) {
      await prisma.tipoEvento.create({ data: { nombre } });
      tiposEventoCreados += 1;
    }
  const datosInventario = [
    { nombre: 'Silla plegable de prueba', categoria: 'Mobiliario', precio: 1500, stock: 100, reutilizable: true, stockFueraServicio: 4 },
    { nombre: 'Mesa plegable de prueba', categoria: 'Mobiliario', precio: 4000, stock: 20, reutilizable: true, stockFueraServicio: 1 },
    { nombre: 'Micrófono inalámbrico de prueba', categoria: 'Audio', precio: 7000, stock: 6, reutilizable: true, stockFueraServicio: 0 },
    { nombre: 'Vasos desechables de prueba', categoria: 'Desechables', precio: 100, stock: 200, reutilizable: false, stockFueraServicio: 0 },
    { nombre: 'Mantel rectangular de prueba', categoria: 'Mobiliario', precio: 2200, stock: 40, reutilizable: true, stockFueraServicio: 3 },
    { nombre: 'Parlante amplificado de prueba', categoria: 'Audio', precio: 8500, stock: 6, reutilizable: true, stockFueraServicio: 1 },
    { nombre: 'Proyector portátil de prueba', categoria: 'Audiovisual', precio: 12000, stock: 3, reutilizable: true, stockFueraServicio: 0 },
    { nombre: 'Extensión eléctrica de prueba', categoria: 'Electricidad', precio: 1200, stock: 12, reutilizable: true, stockFueraServicio: 0 },
    { nombre: 'Platos desechables de prueba', categoria: 'Desechables', precio: 80, stock: 300, reutilizable: false, stockFueraServicio: 0 }
  ];
  for (const datos of datosInventario) {
    const resultado = await obtenerOCrearInventario(datos);
    if (resultado.creado) objetosCreados += 1;
  }

  const datosVehiculos = [
    { nombre: 'Furgón de carga de prueba', tipo: 'vehiculo', categoria: 'vehiculo', precio: 65000, estado: 'disponible' },
    { nombre: 'Minibús de prueba', tipo: 'vehiculo', categoria: 'vehiculo', precio: 95000, estado: 'disponible' }
  ];
  for (const datos of datosVehiculos) {
    const resultado = await obtenerOCrearRecursoOperativo(datos);
    if (resultado.creado) vehiculosCreados += 1;
  }

  const datosEspacios = [
    {
      nombre: 'Salón Norte',
      tipo: 'espacio',
      categoria: 'Sin categoría',
      ubicacion: 'Dirección de prueba 101, Concepción',
      estado: 'disponible'
    },
    {
      nombre: 'Terraza Sur',
      tipo: 'espacio',
      categoria: 'Sin categoría',
      ubicacion: 'Dirección de prueba 202, Concepción',
      estado: 'disponible'
    },
    {
      nombre: 'Patio del hotel',
      tipo: 'espacio',
      categoria: 'Sin categoría',
      ubicacion: 'Dirección de prueba 505, Concepción',
      estado: 'disponible'
    },
    {
      nombre: 'anfiteatro al aire libre',
      tipo: 'espacio',
      categoria: 'Sin categoría',
      ubicacion: 'barros arana, hualpen',
      estado: 'disponible'
    },
    {
      nombre: 'Playa del lago',
      tipo: 'espacio',
      categoria: 'Sin categoría',
      ubicacion: 'El puente diablo, iquique',
      estado: 'fuera_servicio'
    }
  ];
  for (const datos of datosEspacios) {
    const resultado = await obtenerOCrearRecursoOperativo(datos);
    if (resultado.creado) espaciosCreados += 1;
  }

  const firmasExistentes = await obtenerFirmasSolicitudes();
  const datosSolicitudes = [
    {
      clienteCorreo: 'camila.rojas@example.com',
      fecha: enDias(7),
      horaInicio: hora('19:00'),
      horaFin: hora('23:30'),
      tipoEvento: 'Matrimonio',
      cantidadPersonas: 120,
      lugar: 'Centro de Eventos Los Robles',
      requerimientosTecnicos: 'Escenario de 6 x 4 m, dos micrófonos inalámbricos y conexión trifásica.',
      estado: 'confirmado',
      fechaHabilitada: true,
      servicios: [servicios.get('catering'), servicios.get('sonido')],
      cambios: [
        { cambios: { cantidadPersonas: 140 }, motivo: 'Se sumaron invitados de último momento.', estado: 'pendiente' },
        { cambios: { horaFin: '23:59' }, motivo: 'Los novios quieren extender la fiesta.', estado: 'aprobado' }
      ]
    },
    {
      clienteCorreo: 'tomas.herrera@example.com',
      fecha: enDias(10),
      horaInicio: hora('10:00'),
      // 15:00 porque ya tiene aplicado el cambio de más abajo (antes era 14:00)
      horaFin: hora('15:00'),
      tipoEvento: 'Seminario corporativo',
      cantidadPersonas: 40,
      lugar: 'Hotel Costanera, salón B',
      requerimientosTecnicos: 'Proyector, telón y conexión a internet para presentaciones.',
      estado: 'confirmado',
      fechaHabilitada: true,
      servicios: [servicios.get('catering'), servicios.get('karaoke')],
      cambios: [
        {
          cambios: { lugar: 'Terraza del hotel', cantidadPersonas: 60 },
          motivo: 'La empresa quiere invitar a más colaboradores.',
          estado: 'rechazado'
        },
        {
          cambios: { horaFin: '15:00' },
          motivo: 'Se agrega una charla al cierre del seminario.',
          estado: 'aprobado',
          anteriores: { horaFin: '14:00' }
        }
      ]
    },
    {
      clienteCorreo: 'valentina.munoz@example.com',
      fecha: enDias(14),
      horaInicio: hora('18:00'),
      horaFin: hora('22:00'),
      tipoEvento: 'Cumpleaños',
      cantidadPersonas: 80,
      lugar: 'Casona Las Acacias',
      requerimientosTecnicos: 'Iluminación ambiental para jardín y punto eléctrico para DJ.',
      estado: 'registrada',
      fechaHabilitada: false,
      servicios: [servicios.get('catering')]
    },
    {
      clienteCorreo: 'diego.fuentes@example.com',
      fecha: enDias(7),
      horaInicio: hora('20:00'),
      horaFin: null,
      tipoEvento: 'Fiesta de graduación',
      cantidadPersonas: 60,
      lugar: 'Salón del Parque',
      requerimientosTecnicos: null,
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

    const { clienteCorreo, servicios: _servicios, cambios = [], ...datosSolicitud } = datos;
    const solicitud = await crearSolicitudConServicios(
      { ...datosSolicitud, clienteId: cliente.id },
      datos.servicios
    );
    await crearCambios(solicitud.id, cambios);
    firmasExistentes.add(firma);
    solicitudesCreadas += 1;
    cambiosCreados += cambios.length;
  }

  const eventoOperacionesDemo = await prisma.solicitud.findFirst({
    where: {
      clienteId: clientes.get('camila.rojas@example.com').id,
      tipoEvento: 'Matrimonio',
      estado: 'confirmado'
    },
    orderBy: { createdAt: 'desc' }
  });
  if (!eventoOperacionesDemo) {
    throw new Error('No se encontró el evento confirmado de prueba para agregar datos de Operaciones.');
  }
  const operacionesDemo = await crearDatosOperacionesDemo(eventoOperacionesDemo.id);

  console.log(
    `Seed completado. Clientes nuevos: ${clientesCreados}; tipos nuevos: ${tiposCreados}; ` +
      `servicios nuevos: ${serviciosCreados}; objetos nuevos: ${objetosCreados}; ` +
      `vehículos nuevos: ${vehiculosCreados}; espacios nuevos: ${espaciosCreados}; ` +
      `solicitudes nuevas: ${solicitudesCreadas}; cambios nuevos: ${cambiosCreados}; ` +
      `personal nuevo: ${operacionesDemo.personal}; asignaciones nuevas: ${operacionesDemo.asignaciones}; ` +
      `tareas nuevas: ${operacionesDemo.tareas}; pagos nuevos: ${operacionesDemo.pagos}; ` +
      `cierres nuevos: ${operacionesDemo.cierres}; solicitudes omitidas por duplicado: ${solicitudesOmitidas}.`
  );
}

main()
  .catch((error) => {
    console.error('No fue posible insertar datos de prueba:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
}
