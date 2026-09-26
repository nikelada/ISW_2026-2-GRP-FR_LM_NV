// Datos de prueba para demostrar clientes, solicitudes y calendario.
// Uso: npm run seed (dentro de backend/). Solo inserta si no hay clientes registrados.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fecha a N días desde hoy, como DATE de PostgreSQL.
function enDias(dias) {
  const hoy = new Date();
  return new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias));
}

const hora = (texto) => new Date(`1970-01-01T${texto}:00Z`);

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

  await prisma.solicitud.createMany({
    data: [
      // Eventos con fecha ya confirmada (representan el resultado del proceso de confirmación).
      {
        clienteId: camila.id, fecha: enDias(7), horaInicio: hora('19:00'), horaFin: hora('23:30'), cantidadPersonas: 120,
        lugar: 'Centro de Eventos Los Robles', servicios: 'Banquetería, sonido e iluminación', estado: 'confirmado', fechaHabilitada: true
      },
      {
        clienteId: tomas.id, fecha: enDias(10), horaInicio: hora('10:00'), horaFin: hora('14:00'), cantidadPersonas: 40,
        lugar: 'Hotel Costanera, salón B', servicios: 'Coffee break y proyector', estado: 'confirmado', fechaHabilitada: true
      },
      // Solicitud completa: disponible para cotizar.
      {
        clienteId: valentina.id, fecha: enDias(14), horaInicio: hora('18:00'), horaFin: hora('22:00'), cantidadPersonas: 80,
        lugar: 'Casona Las Acacias', servicios: 'Banquetería y DJ', estado: 'disponible_cotizar'
      },
      // Solicitud incompleta, el mismo día que el evento confirmado de Camila Rojas.
      {
        clienteId: diego.id, fecha: enDias(7), horaInicio: hora('20:00'), servicios: 'Decoración y música en vivo', estado: 'pendiente'
      }
    ]
  });

  console.log('Datos de prueba insertados: 4 clientes y 4 solicitudes.');
}

main()
  .catch((error) => {
    console.error('No fue posible insertar los datos de prueba:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
