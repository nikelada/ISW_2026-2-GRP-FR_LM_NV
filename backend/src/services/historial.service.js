import { prisma } from '../config/prisma.js';
import * as clienteService from './cliente.service.js';
import { aRespuesta, INCLUIR_SOLICITUD } from './solicitud.service.js';

// Textos de los motivos de rechazo (mismos valores que MotivoRechazo en el schema de Prisma)
const MOTIVOS_RECHAZO = {
  precio: 'Precio',
  otra_empresa: 'Seleccionó otra empresa',
  evento_cancelado: 'Canceló el evento',
  no_respondio: 'No respondió',
  otro: 'Otro'
};

// Resultado de la cotización por solicitud: { estado, motivos?, detalle? } (aceptada, rechazada o sin_respuesta).
// Se toma la respuesta del cliente más reciente; si no la aceptó, trae los motivos (textos) y el detalle escrito.
async function resultadosDeCotizacion(solicitudIds) {
  const cotizaciones = await prisma.cotizacion.findMany({
    where: { solicitudId: { in: solicitudIds }, estado: { in: ['aceptada', 'rechazada', 'sin_respuesta'] } },
    select: { solicitudId: true, estado: true, motivosRechazo: true, detalleRechazo: true },
    orderBy: { updatedAt: 'desc' }
  });

  const resultados = new Map();
  for (const { solicitudId, estado, motivosRechazo, detalleRechazo } of cotizaciones) {
    if (resultados.has(solicitudId)) continue; // ya está la más reciente
    const motivos = motivosRechazo.map((motivo) => MOTIVOS_RECHAZO[motivo] || motivo);
    resultados.set(solicitudId, {
      estado,
      ...(motivos.length && { motivos }),
      ...(detalleRechazo && { detalle: detalleRechazo })
    });
  }
  return resultados;
}

// Todas las solicitudes y eventos del cliente, con sus cambios y lo que se aplicó
export async function historialDeCliente(clienteId) {
  const cliente = await clienteService.obtenerPorId(clienteId);
  const solicitudes = await prisma.solicitud.findMany({
    where: { clienteId },
    include: {
      ...INCLUIR_SOLICITUD,
      cambios: { orderBy: { createdAt: 'desc' } }
    },
    orderBy: { createdAt: 'desc' }
  });
  const cotizaciones = await resultadosDeCotizacion(solicitudes.map((solicitud) => solicitud.id));
  return {
    cliente,
    registros: solicitudes.map((solicitud) => ({ ...aRespuesta(solicitud), cotizacion: cotizaciones.get(solicitud.id) ?? null }))
  };
}
