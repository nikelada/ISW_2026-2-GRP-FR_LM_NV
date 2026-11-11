import { prisma } from '../config/prisma.js';
import { INCLUIR_SERVICIO } from './servicio.service.js';
import * as solicitudService from './solicitud.service.js';
import { textoFecha, textoHora } from './solicitud.service.js';

// Con estos estados la cotización terminó sin concretarse y se puede cotizar de nuevo la solicitud
const ESTADOS_CERRADOS = ['rechazada', 'sin_respuesta'];

const INCLUIR_COTIZACION = {
  solicitud: {
    select: {
      id: true,
      tipoEvento: true,
      fecha: true,
      horaInicio: true,
      horaFin: true,
      cliente: { select: { id: true, nombre: true } }
    }
  },
  detalles: {
    include: { servicio: { select: { id: true, nombre: true } }, versionServicio: true },
    orderBy: { id: 'asc' }
  }
};

// Horas del evento a partir de su horario ('HH:MM'); si sobran 30 minutos o más se suma una hora.
// Ojo: un evento de menos de 30 minutos da 0 horas, por lo que sus servicios por hora quedan en $0.
// Se dejó así a propósito (no se fuerza un mínimo de 1 hora).
export function horasDelEvento(horaInicio, horaFin) {
  const [horaI, minutoI] = horaInicio.split(':').map(Number);
  const [horaF, minutoF] = horaFin.split(':').map(Number);
  const minutos = horaF * 60 + minutoF - (horaI * 60 + minutoI);
  return Math.floor(minutos / 60) + (minutos % 60 >= 30 ? 1 : 0);
}

// Una línea del detalle: fijo = precio; por hora = precio × horas del evento
function lineaDetalle(servicio, version, horasEvento) {
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
// Sin lista de servicios se usan los que tiene la solicitud (RF-02), pero con su precio vigente.
export async function calcular({ solicitudId, servicios: servicioIds }) {
  const solicitud = await solicitudService.obtenerPorId(solicitudId);
  asegurarSolicitudCotizable(solicitud);

  const ids = servicioIds ?? solicitud.servicios.map((servicio) => servicio.id);
  if (!ids.length) {
    throw Object.assign(new Error('La solicitud no tiene servicios; indica los servicios a cotizar.'), {
      status: 400,
      detalles: { errores: { servicios: 'Selecciona al menos un servicio.' } }
    });
  }

  const horasEvento = horasDelEvento(solicitud.horaInicio, solicitud.horaFin);
  const servicios = await obtenerServiciosCotizables(ids);
  const detalles = servicios.map((servicio) => lineaDetalle(servicio, servicio.versiones[0], horasEvento));

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

// El detalle se arma con la versión de precio guardada y el horario actual de la solicitud.
// Pendiente: las horas no se guardan en la cotización. Si a futuro se modifica el horario de la
// solicitud, hay que recalcular las horas y el total de su cotización, y esa cotización tendrá que
// volver a confirmarse (pasar otra vez por su revisión/aprobación) antes de seguir el proceso.
function aRespuesta(cotizacion) {
  const { solicitud, detalles, ...datos } = cotizacion;
  const horaInicio = textoHora(solicitud.horaInicio);
  const horaFin = textoHora(solicitud.horaFin);
  const horasEvento = horaInicio && horaFin ? horasDelEvento(horaInicio, horaFin) : 0;
  return {
    ...datos,
    solicitud: {
      id: solicitud.id,
      clienteId: solicitud.cliente.id,
      cliente: solicitud.cliente.nombre,
      tipoEvento: solicitud.tipoEvento,
      fecha: textoFecha(solicitud.fecha),
      horaInicio,
      horaFin,
      horasEvento
    },
    detalles: detalles.map(({ servicio, versionServicio }) => lineaDetalle(servicio, versionServicio, horasEvento))
  };
}

export async function listar({ estado, solicitudId } = {}) {
  const cotizaciones = await prisma.cotizacion.findMany({
    where: { estado, solicitudId },
    include: INCLUIR_COTIZACION,
    orderBy: { createdAt: 'desc' }
  });
  return cotizaciones.map(aRespuesta);
}

export async function obtenerPorId(id) {
  const cotizacion = await prisma.cotizacion.findUnique({ where: { id }, include: INCLUIR_COTIZACION });
  if (!cotizacion) throw Object.assign(new Error('Cotización no encontrada.'), { status: 404 });
  return aRespuesta(cotizacion);
}

// Recalcula en el servidor y guarda la cotización pendiente de revisión por Gerencia.
// Una solicitud no puede tener dos cotizaciones activas (solo se recotiza tras rechazo o sin respuesta).
export async function crear(datos) {
  const calculo = await calcular(datos);

  const creada = await prisma.$transaction(async (transaction) => {
    const activa = await transaction.cotizacion.findFirst({
      where: { solicitudId: datos.solicitudId, estado: { notIn: ESTADOS_CERRADOS } },
      select: { id: true, estado: true }
    });
    if (activa) {
      throw Object.assign(new Error('La solicitud ya tiene una cotización activa.'), {
        status: 409,
        detalles: { cotizacionActiva: activa }
      });
    }

    return transaction.cotizacion.create({
      data: {
        solicitudId: datos.solicitudId,
        total: calculo.total,
        detalles: {
          create: calculo.detalles.map(({ servicioId, versionServicioId }) => ({ servicioId, versionServicioId }))
        }
      },
      include: INCLUIR_COTIZACION
    });
  });

  return aRespuesta(creada);
}
