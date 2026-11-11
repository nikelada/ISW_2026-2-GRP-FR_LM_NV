import { prisma } from '../config/prisma.js';
import { INCLUIR_SERVICIO } from './servicio.service.js';
import * as solicitudService from './solicitud.service.js';

// Horas del evento a partir de su horario ('HH:MM'); si sobran 30 minutos o más se suma una hora.
// Ojo: un evento de menos de 30 minutos da 0 horas, por lo que sus servicios por hora quedan en $0.
// Se dejó así a propósito (no se fuerza un mínimo de 1 hora).
export function horasDelEvento(horaInicio, horaFin) {
  const [horaI, minutoI] = horaInicio.split(':').map(Number);
  const [horaF, minutoF] = horaFin.split(':').map(Number);
  const minutos = horaF * 60 + minutoF - (horaI * 60 + minutoI);
  return Math.floor(minutos / 60) + (minutos % 60 >= 30 ? 1 : 0);
}

// Solo se cotizan solicitudes con todos sus datos y que aún no son eventos confirmados
function asegurarSolicitudCotizable(solicitud) {
  if (solicitud.estado === 'pendiente') {
    throw Object.assign(new Error('La solicitud tiene datos pendientes; complétala antes de cotizar.'), {
      status: 409,
      detalles: { faltantes: solicitud.faltantes }
    });
  }
  if (solicitud.estado !== 'registrada') {
    throw Object.assign(new Error('La solicitud ya es un evento confirmado; no se puede cotizar.'), { status: 409 });
  }
}

// Servicios en el mismo orden pedido; todos deben existir, estar activos y tener precio vigente
async function obtenerServiciosCotizables(ids) {
  const servicios = await prisma.servicio.findMany({ where: { id: { in: ids } }, include: INCLUIR_SERVICIO });
  const porId = new Map(servicios.map((servicio) => [servicio.id, servicio]));

  const inexistentes = ids.filter((id) => !porId.has(id));
  if (inexistentes.length) {
    throw Object.assign(new Error('Hay servicios que no existen.'), {
      status: 404,
      detalles: { errores: { servicios: `Servicios no encontrados: ${inexistentes.join(', ')}.` } }
    });
  }

  const noDisponibles = servicios.filter((servicio) => !servicio.activo || !servicio.versiones.length);
  if (noDisponibles.length) {
    throw Object.assign(new Error('Hay servicios inactivos o sin precio vigente.'), {
      status: 409,
      detalles: { errores: { servicios: `No disponibles: ${noDisponibles.map((s) => s.nombre).join(', ')}.` } }
    });
  }

  return ids.map((id) => porId.get(id));
}

// Detalle y total de la cotización con los precios vigentes del catálogo. No guarda nada.
export async function calcular({ solicitudId, servicios: servicioIds }) {
  const solicitud = await solicitudService.obtenerPorId(solicitudId);
  asegurarSolicitudCotizable(solicitud);

  const horasEvento = horasDelEvento(solicitud.horaInicio, solicitud.horaFin);
  const servicios = await obtenerServiciosCotizables(servicioIds);

  const detalles = servicios.map((servicio) => {
    const [version] = servicio.versiones;
    const porHora = version.tipoPrecio === 'por_hora';
    return {
      servicioId: servicio.id,
      nombre: servicio.nombre,
      versionServicioId: version.id,
      tipoPrecio: version.tipoPrecio,
      precio: version.precio,
      ...(porHora && { horas: horasEvento }),
      subtotal: porHora ? version.precio * horasEvento : version.precio
    };
  });

  return {
    solicitud: {
      id: solicitud.id,
      cliente: solicitud.cliente.nombre,
      tipoEvento: solicitud.tipoEvento,
      fecha: solicitud.fecha,
      horaInicio: solicitud.horaInicio,
      horaFin: solicitud.horaFin,
      horasEvento
    },
    detalles,
    total: detalles.reduce((total, detalle) => total + detalle.subtotal, 0)
  };
}
