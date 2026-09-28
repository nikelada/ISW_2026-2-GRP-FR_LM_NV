// Datos de prueba para demostrar clientes, servicios, solicitudes y calendario.
// Uso: npm run seed (dentro de backend/). Solo inserta si no hay clientes registrados.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fecha a N días desde hoy, como DATE de PostgreSQL.
function enDias(dias) {
  const hoy = new Date();
  return new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias));
}

const hora = (texto) => new Date(`1970-01-01T${texto}:00Z`);

async function crearServicio({ tipoServicioId, nombre, descripcion, tipoPrecio, precio }) {
  return prisma.servicio.create({
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
}

function referenciaServicio(servicio) {
  return {
    servicioId: servicio.id,
    versionServicioId: servicio.versiones[0].id
  };
}

async function main() {
  if (await prisma.cliente.count()) {
    console.log('Ya existen clientes; no se insertaron datos de prueba.');
    return;
  }

  const [camila, tomas, valentina, diego] = await Promise.all([
    { nombre: 'Camila Rojas', telefono: '+56 9 8123 4567', correo: 'camila.rojas@example.com' },
    { nombre: 'Tomás Herrera', telefono: '+56 9 7234 5678', correo: 'tomas.herrera@example.com' },
    { nombre: 'Valentina Muñoz', telefono: '+56 9 6345 6789', correo: 'valentina.munoz@example.com' },
    { nombre: 'Diego Fuentes', telefono: '+56 9 5456 7890', correo: 'diego.fuentes@example.com' }
  ].map((data) => prisma.cliente.create({ data })));

  const [tipoCatering, tipoTecnico, tipoEntretenimiento] = await Promise.all([
    prisma.tipoServicio.create({ data: { nombre: 'Catering', descripcion: 'Servicios de alimentación para eventos.' } }),
    prisma.tipoServicio.create({ data: { nombre: 'Soporte técnico', descripcion: 'Servicios de sonido, iluminación y equipamiento técnico.' } }),
    prisma.tipoServicio.create({ data: { nombre: 'Entretenimiento', descripcion: 'Servicios recreativos y de animación para eventos.' } })
  ]);

  const [catering, sonido, karaoke] = await Promise.all([
    crearServicio({ tipoServicioId: tipoCatering.id, nombre: 'Catering Don Carlos', descripcion: 'Menú para eventos de 50 personas.', tipoPrecio: 'fijo', precio: 250000 }),
    crearServicio({ tipoServicioId: tipoTecnico.id, nombre: 'Amplificación básica', descripcion: 'Sistema de sonido para eventos en espacios cerrados de tamaño medio.', tipoPrecio: 'por_hora', precio: 35000 }),
    crearServicio({ tipoServicioId: tipoEntretenimiento.id, nombre: 'Sistema de karaoke', descripcion: 'Sistema de karaoke, incluye 2 micrófonos, 2 amplificadores y 1 proyector.', tipoPrecio: 'fijo', precio: 80000 })
  ]);

  await prisma.solicitud.createMany({
    data: [
      { clienteId: camila.id, fecha: enDias(7), horaInicio: hora('19:00'), horaFin: hora('23:30'), cantidadPersonas: 120, lugar: 'Centro de Eventos Los Robles', estado: 'confirmado', fechaHabilitada: true },
      { clienteId: tomas.id, fecha: enDias(10), horaInicio: hora('10:00'), horaFin: hora('14:00'), cantidadPersonas: 40, lugar: 'Hotel Costanera, salón B', estado: 'confirmado', fechaHabilitada: true },
      { clienteId: valentina.id, fecha: enDias(14), horaInicio: hora('18:00'), horaFin: hora('22:00'), cantidadPersonas: 80, lugar: 'Casona Las Acacias', estado: 'disponible_cotizar' },
      { clienteId: diego.id, fecha: enDias(7), horaInicio: hora('20:00'), cantidadPersonas: 60, lugar: 'Salón del Parque', estado: 'pendiente' }
    ]
  });

  const solicitudes = await prisma.solicitud.findMany({
    where: { clienteId: { in: [camila.id, tomas.id, valentina.id, diego.id] } },
    select: { id: true, clienteId: true }
  });
  const solicitudPorCliente = new Map(solicitudes.map((solicitud) => [solicitud.clienteId, solicitud.id]));

  await prisma.solicitudServicio.createMany({
    data: [
      { solicitudId: solicitudPorCliente.get(camila.id), ...referenciaServicio(catering) },
      { solicitudId: solicitudPorCliente.get(camila.id), ...referenciaServicio(sonido) },
      { solicitudId: solicitudPorCliente.get(tomas.id), ...referenciaServicio(catering) },
      { solicitudId: solicitudPorCliente.get(tomas.id), ...referenciaServicio(karaoke) },
      { solicitudId: solicitudPorCliente.get(valentina.id), ...referenciaServicio(catering) },
      { solicitudId: solicitudPorCliente.get(diego.id), ...referenciaServicio(karaoke) }
    ]
  });

  console.log('Datos de prueba insertados: 4 clientes, 3 servicios y 4 solicitudes.');
}

main()
  .catch((error) => {
    console.error('No fue posible insertar datos de prueba:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
