import { prisma } from '../config/prisma.js';
import * as clienteService from './cliente.service.js';
import { aRespuesta, INCLUIR_SOLICITUD } from './solicitud.service.js';

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
  return { cliente, registros: solicitudes.map(aRespuesta) };
}
