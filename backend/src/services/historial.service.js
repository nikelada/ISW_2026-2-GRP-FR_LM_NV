import { prisma } from '../config/prisma.js';
import * as clienteService from './cliente.service.js';
import { aRespuesta, INCLUIR_SOLICITUD } from './solicitud.service.js';

// Resultado de la cotización por solicitud: { estado, detalle } (aceptada, rechazada o sin_respuesta)
async function resultadosDeCotizacion(_solicitudIds) {
  return new Map();
}

// Todas las solicitudes y eventos del cliente, con sus cambios y lo que se aplicó
export async function historialDeCliente(clienteId) {
  const cliente = await clienteService.obtenerPorId(clienteId);
  const solicitudes = await prisma.solicitud.findMany({
    where: { clienteId },
    include: {
      ...INCLUIR_SOLICITUD,
      cambios: { orderBy: { createdAt: 'desc' } },
      historial: { orderBy: { createdAt: 'desc' } }
    },
    orderBy: { createdAt: 'desc' }
  });
  const cotizaciones = await resultadosDeCotizacion(solicitudes.map((solicitud) => solicitud.id));
  return {
    cliente,
    registros: solicitudes.map((solicitud) => ({ ...aRespuesta(solicitud), cotizacion: cotizaciones.get(solicitud.id) ?? null }))
  };
}
