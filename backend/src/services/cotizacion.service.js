import { prisma } from '../config/prisma.js';
import { fechaActual } from '../utils/fecha.js';
import { INCLUIR_SERVICIO } from './servicio.service.js';
import * as solicitudService from './solicitud.service.js';
import { textoFecha, textoHora } from './solicitud.service.js';

// Con estos estados la cotización terminó sin concretarse y se puede cotizar de nuevo la solicitud
const ESTADOS_CERRADOS = ['rechazada', 'sin_respuesta'];

const formatoPrecio = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const TIPO_PRECIO_TEXTO = { fijo: 'fijo', por_hora: 'por hora' };

// "Se modificó el precio vigente del servicio Sonido ($50.000 → $60.000)."
// Si también cambió el tipo de cobro, se indica junto a cada precio: ($50.000 fijo → $15.000 por hora).
export function textoCambioDePrecio(nombre, anterior, nueva) {
  const cambiaTipo = anterior.tipoPrecio !== nueva.tipoPrecio;
  const precio = (version) => `${formatoPrecio.format(version.precio)}${cambiaTipo ? ` ${TIPO_PRECIO_TEXTO[version.tipoPrecio]}` : ''}`;
  return `Se modificó el precio vigente del servicio ${nombre} (${precio(anterior)} → ${precio(nueva)}).`;
}

export const INCLUIR_COTIZACION = {
  solicitud: {
    select: {
      id: true,
      tipoEvento: true,
      fecha: true,
      horaInicio: true,
      horaFin: true,
      // para revisar la cotización: cantidad de personas, lugar y requerimientos técnicos
      cantidadPersonas: true,
      lugar: true,
      espacio: { select: { id: true, nombre: true, ubicacion: true } },
      requerimientosTecnicos: true,
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
    // desde cuándo rige ese precio (AAAA-MM-DD)
    vigenciaDesde: textoFecha(version.vigenciaDesde),
    ...(porHora && { horas: horasEvento }),
    subtotal: porHora ? version.precio * horasEvento : version.precio
  };
}

// Solo se cotizan solicitudes registradas, con la fecha habilitada y que aún no son eventos confirmados
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
  if (!solicitud.fechaHabilitada) {
    throw Object.assign(new Error('La fecha del evento no está habilitada; revísala en Solicitudes antes de cotizar.'), {
      status: 409
    });
  }
}

// Punto de entrada de la cotización pendiente: registradas, con la fecha habilitada y sin una cotización activa.
// También vuelven aquí las que tienen una cotización con modificaciones solicitadas por Gerencia (RF-10);
// esas traen en `modificacionSolicitada` lo que pidió Gerencia, los servicios que ya tenía la cotización y
// `cambiosDePrecio`: los servicios cuyo precio vigente ya no es el que se cotizó (se calcula cada vez).
export async function listarPorCotizar() {
  const solicitudes = await prisma.solicitud.findMany({
    where: {
      estado: 'registrada',
      fechaHabilitada: true,
      OR: [
        { cotizaciones: { none: { estado: { notIn: ESTADOS_CERRADOS } } } },
        { cotizaciones: { some: { estado: 'modificaciones_solicitadas' } } }
      ]
    },
    include: {
      ...solicitudService.INCLUIR_SOLICITUD,
      cotizaciones: {
        where: { estado: 'modificaciones_solicitadas' },
        select: {
          id: true,
          motivosModificacion: true,
          comentarioModificacion: true,
          revisadoPor: true,
          revisadoEn: true,
          detalles: {
            select: {
              versionServicio: { select: { id: true, precio: true, tipoPrecio: true } },
              servicio: {
                select: {
                  id: true,
                  nombre: true,
                  versiones: {
                    where: { estado: 'activo' },
                    orderBy: { vigenciaDesde: 'desc' },
                    take: 1,
                    select: { id: true, precio: true, tipoPrecio: true }
                  }
                }
              }
            },
            orderBy: { id: 'asc' }
          }
        }
      }
    },
    orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }]
  });
  return solicitudes.map(({ cotizaciones: [conModificaciones], ...solicitud }) => ({
    ...solicitudService.aRespuesta(solicitud),
    modificacionSolicitada: conModificaciones
      ? {
        cotizacionId: conModificaciones.id,
        motivos: conModificaciones.motivosModificacion,
        comentario: conModificaciones.comentarioModificacion,
        revisadoPor: conModificaciones.revisadoPor,
        revisadoEn: conModificaciones.revisadoEn,
        servicios: conModificaciones.detalles.map(({ servicio: { id, nombre } }) => ({ id, nombre })),
        cambiosDePrecio: conModificaciones.detalles
          .filter(({ servicio, versionServicio }) => servicio.versiones[0] && servicio.versiones[0].id !== versionServicio.id)
          .map(({ servicio, versionServicio }) => textoCambioDePrecio(servicio.nombre, versionServicio, servicio.versiones[0]))
      }
      : null
  }));
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

// El detalle se arma con lo guardado al cotizar (versión de precio y horas del evento), así las
// líneas siempre suman el total aunque después cambie el horario de la solicitud.
// Pendiente (RF-10): si el horario cambió, la cotización queda desactualizada; habrá que recalcularla
// y volver a pasarla por la revisión/aprobación de Gerencia antes de seguir el proceso.
export function aRespuesta(cotizacion) {
  const { solicitud, detalles, aceptadaEn, horasEvento: horasGuardadas, ...datos } = cotizacion;
  const horaInicio = textoHora(solicitud.horaInicio);
  const horaFin = textoHora(solicitud.horaFin);
  // Las cotizaciones creadas antes de guardar las horas no las tienen: se usa el horario actual
  const horasEvento = horasGuardadas ?? (horaInicio && horaFin ? horasDelEvento(horaInicio, horaFin) : 0);
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
      horasEvento,
      cantidadPersonas: solicitud.cantidadPersonas,
      lugar: solicitud.lugar,
      espacio: solicitud.espacio,
      requerimientosTecnicos: solicitud.requerimientosTecnicos
    },
    detalles: detalles.map(({ servicio, versionServicio }) => lineaDetalle(servicio, versionServicio, horasEvento)),
    // día en que el cliente la aceptó (AAAA-MM-DD), o null
    aceptadaEn: textoFecha(aceptadaEn)
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

// Pasa la cotización de un estado a otro solo si sigue en el estado esperado; así dos acciones
// al mismo tiempo no se pisan. Si no está en ese estado responde 409 con el mensaje indicado.
// En datos van otros campos que se guardan junto con el cambio de estado.
async function cambiarEstado(id, desde, hacia, mensaje, datos = {}) {
  const { count } = await prisma.cotizacion.updateMany({ where: { id, estado: desde }, data: { ...datos, estado: hacia } });
  if (!count) {
    await obtenerPorId(id); // 404 si no existe
    throw Object.assign(new Error(mensaje), { status: 409 });
  }
  return obtenerPorId(id);
}

// Quién de Gerencia revisó la cotización y cuándo (igual que en los cambios de eventos, RF-04)
const revision = (usuario) => ({ revisadoPor: usuario.name, revisadoEn: new Date() });

// RF-10: Gerencia aprueba una cotización que está en su revisión
export function aprobar(id, usuario) {
  return cambiarEstado(id, 'pendiente_revision', 'aprobada', 'Solo se pueden aprobar cotizaciones que están en revisión de Gerencia.', revision(usuario));
}

// RF-06 y RF-10: cuando Gerencia aprueba un precio nuevo de un servicio, las cotizaciones en revisión o
// aprobadas que lo incluyen vuelven a Producción y Comercial ("modificaciones solicitadas", motivo
// "precio desactualizado") con un comentario automático; al reenviarlas se recalculan con los precios
// vigentes. Las aceptadas, rechazadas o sin respuesta no se tocan, y las que ya tenían modificaciones
// solicitadas tampoco (ven el cambio en `cambiosDePrecio`). Se llama dentro de la transacción que aprueba
// el precio y devuelve cuántas cotizaciones volvieron a Producción y Comercial.
export async function devolverPorCambioDePrecio(transaction, { servicioId, nombre, anterior, nueva, usuario }) {
  const { count } = await transaction.cotizacion.updateMany({
    where: { estado: { in: ['pendiente_revision', 'aprobada'] }, detalles: { some: { servicioId } } },
    data: {
      estado: 'modificaciones_solicitadas',
      motivosModificacion: { set: ['precio_desactualizado'] },
      comentarioModificacion: textoCambioDePrecio(nombre, anterior, nueva),
      ...revision(usuario)
    }
  });
  return count;
}

// RF-10: Gerencia solicita modificaciones a Producción y Comercial, con uno o más motivos y un comentario.
// La cotización vuelve a "Cotización pendiente" para corregirla y reenviarla.
export function solicitarModificaciones(id, { motivos, comentario }, usuario) {
  return cambiarEstado(
    id,
    'pendiente_revision',
    'modificaciones_solicitadas',
    'Solo se pueden solicitar modificaciones de cotizaciones que están en revisión de Gerencia.',
    { motivosModificacion: motivos, comentarioModificacion: comentario, ...revision(usuario) }
  );
}

// RF-10: Producción y Comercial registra que el cliente no aceptó una cotización aprobada, con los motivos
// y un detalle opcional. Con "no_respondio" queda "sin respuesta"; con los demás, "rechazada". En ambos casos
// la solicitud vuelve a "Cotización pendiente" y la fecha sigue disponible.
export function rechazar(id, { motivos, detalle }) {
  const estado = motivos.includes('no_respondio') ? 'sin_respuesta' : 'rechazada';
  return cambiarEstado(id, 'aprobada', estado, 'Solo se pueden rechazar cotizaciones aprobadas por Gerencia.', {
    motivosRechazo: motivos,
    detalleRechazo: detalle
  });
}

// RF-10: Producción y Comercial registra que el cliente aceptó una cotización aprobada por Gerencia.
// Se guarda el día de la aceptación: los abonos no pueden tener una fecha anterior.
export function aceptar(id) {
  return cambiarEstado(id, 'aprobada', 'aceptada', 'Solo se pueden aceptar cotizaciones aprobadas por Gerencia.', {
    aceptadaEn: fechaActual()
  });
}

// Recalcula en el servidor y guarda la cotización pendiente de revisión por Gerencia.
// Una solicitud no puede tener dos cotizaciones activas (solo se recotiza tras rechazo o sin respuesta).
// Si su cotización tiene modificaciones solicitadas por Gerencia, se actualiza esa misma cotización
// (servicios, precios vigentes, total y horas) y vuelve a revisión; lo que pidió Gerencia se conserva.
export async function crear(datos) {
  const calculo = await calcular(datos);
  const data = {
    total: calculo.total,
    horasEvento: calculo.solicitud.horasEvento,
    detalles: {
      create: calculo.detalles.map(({ servicioId, versionServicioId }) => ({ servicioId, versionServicioId }))
    }
  };

  const guardada = await prisma.$transaction(async (transaction) => {
    const activa = await transaction.cotizacion.findFirst({
      where: { solicitudId: datos.solicitudId, estado: { notIn: ESTADOS_CERRADOS } },
      select: { id: true, estado: true }
    });

    if (activa?.estado === 'modificaciones_solicitadas') {
      await transaction.detalleCotizacion.deleteMany({ where: { cotizacionId: activa.id } });
      return transaction.cotizacion.update({
        where: { id: activa.id },
        data: { ...data, estado: 'pendiente_revision' },
        include: INCLUIR_COTIZACION
      });
    }
    if (activa) {
      throw Object.assign(new Error('La solicitud ya tiene una cotización activa.'), {
        status: 409,
        detalles: { cotizacionActiva: activa }
      });
    }

    return transaction.cotizacion.create({
      data: { ...data, solicitudId: datos.solicitudId },
      include: INCLUIR_COTIZACION
    });
  });

  return aRespuesta(guardada);
}
