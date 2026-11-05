import { prisma } from '../config/prisma.js';
import * as clienteService from './cliente.service.js';
import { aRespuesta as aRespuestaServicio, INCLUIR_SERVICIO } from './servicio.service.js';

// Información obligatoria para que la solicitud quede registrada.
const CAMPOS_OBLIGATORIOS = [
  { campo: 'tipoEvento', etiqueta: 'Tipo de evento' },
  { campo: 'fecha', etiqueta: 'Fecha' },
  { campo: 'horaInicio', etiqueta: 'Hora de inicio' },
  { campo: 'horaFin', etiqueta: 'Hora de término' },
  { campo: 'cantidadPersonas', etiqueta: 'Cantidad de personas' },
  { campo: 'lugar', etiqueta: 'Lugar' },
  { campo: 'requerimientosTecnicos', etiqueta: 'Requerimientos técnicos' },
  { campo: 'servicios', etiqueta: 'Servicios adicionales' }
];

const ESTADOS = ['pendiente', 'registrada', 'confirmado'];
export const INCLUIR_SOLICITUD = {
  cliente: { select: { id: true, nombre: true } },
  servicios: {
    include: {
      servicio: { include: INCLUIR_SERVICIO },
      versionServicio: true
    },
    orderBy: { id: 'asc' }
  }
};

// Prisma devuelve DATE y TIME como Date en UTC, por eso estas conversiones
export const aFecha = (texto) => (texto ? new Date(`${texto}T00:00:00Z`) : null);
export const aHora = (texto) => (texto ? new Date(`1970-01-01T${texto}:00Z`) : null);
export const textoFecha = (valor) => (valor ? valor.toISOString().slice(0, 10) : null);
export const textoHora = (valor) => (valor ? valor.toISOString().slice(11, 16) : null);

export function camposFaltantes(solicitud) {
  return CAMPOS_OBLIGATORIOS
    .filter(({ campo }) => {
      if (campo === 'servicios') {
        return (solicitud.servicios?.length || 0) === 0;
      }
      return solicitud[campo] === null || solicitud[campo] === undefined || solicitud[campo] === '';
    })
    .map(({ etiqueta }) => etiqueta);
}

// Si falta algo queda pendiente, si está todo queda registrada
function calcularEstado(datos) {
  return camposFaltantes(datos).length ? 'pendiente' : 'registrada';
}

export function aRespuesta(solicitud) {
  const servicios = (solicitud.servicios || [])
    .map(({ servicio, versionServicio }) => {
      const { versionActiva, ...datosServicio } = aRespuestaServicio(servicio);
      return { ...datosServicio, versionServicio };
    });
  const respuesta = {
    ...solicitud,
    servicios,
    fecha: textoFecha(solicitud.fecha),
    horaInicio: textoHora(solicitud.horaInicio),
    horaFin: textoHora(solicitud.horaFin)
  };
  respuesta.faltantes = camposFaltantes(respuesta);
  return respuesta;
}

function aDatos(datos, servicios = []) {
  return {
    clienteId: datos.clienteId,
    tipoEvento: datos.tipoEvento,
    fecha: aFecha(datos.fecha),
    horaInicio: aHora(datos.horaInicio),
    horaFin: aHora(datos.horaFin),
    cantidadPersonas: datos.cantidadPersonas,
    lugar: datos.lugar,
    requerimientosTecnicos: datos.requerimientosTecnicos,
    estado: calcularEstado({ ...datos, servicios })
  };
}

// El cliente de la solicitud tiene que estar registrado
async function asegurarClienteRegistrado(clienteId) {
  try {
    await clienteService.obtenerPorId(clienteId);
  } catch (error) {
    if (error.status !== 404) throw error;
    throw Object.assign(new Error('La solicitud debe estar asociada a un cliente registrado.'), {
      status: 400,
      detalles: { errores: { clienteId: 'Selecciona un cliente registrado.' } }
    });
  }
}

export async function listar({ estado, clienteId } = {}) {
  if (estado && !ESTADOS.includes(estado)) {
    throw Object.assign(new Error('Estado de solicitud inválido.'), { status: 400 });
  }
  const solicitudes = await prisma.solicitud.findMany({
    where: { estado: estado || undefined, clienteId: clienteId || undefined },
    include: INCLUIR_SOLICITUD,
    orderBy: { createdAt: 'desc' }
  });
  return solicitudes.map(aRespuesta);
}

// Para las etapas siguientes (ej. cotizaciones). Registrar la solicitud no crea la cotización.
export function listarRegistradas() {
  return listar({ estado: 'registrada' });
}

export async function obtenerPorId(id) {
  const solicitud = await prisma.solicitud.findUnique({ where: { id }, include: INCLUIR_SOLICITUD });
  if (!solicitud) throw Object.assign(new Error('Solicitud no encontrada.'), { status: 404 });
  return aRespuesta(solicitud);
}

export async function crear(datos) {
  await asegurarClienteRegistrado(datos.clienteId);
  const creada = await prisma.solicitud.create({ data: aDatos(datos), include: INCLUIR_SOLICITUD });
  return aRespuesta(creada);
}

// Se puede completar o corregir mientras no esté confirmado (el estado se vuelve a calcular)
export async function actualizar(id, datos) {
  const actual = await obtenerPorId(id);
  if (actual.estado === 'confirmado') {
    throw Object.assign(new Error('El evento ya está confirmado; sus datos no se pueden editar desde la solicitud.'), { status: 409 });
  }
  if (datos.clienteId !== actual.clienteId) await asegurarClienteRegistrado(datos.clienteId);

  const data = aDatos(datos, actual.servicios);
  // Si cambió la fecha u hora hay que volver a revisar la disponibilidad
  if (datos.fecha !== actual.fecha || datos.horaInicio !== actual.horaInicio || datos.horaFin !== actual.horaFin) {
    data.fechaHabilitada = false;
  }
  const actualizada = await prisma.solicitud.update({ where: { id }, data, include: INCLUIR_SOLICITUD });
  return aRespuesta(actualizada);
}

// Asocia un servicio del catálogo sin calcular valores; ese cálculo pertenece
// al proceso posterior de cotización.
export async function agregarServicio(solicitudId, { servicioId }) {
  const solicitud = await obtenerPorId(solicitudId);
  if (solicitud.estado === 'confirmado') {
    throw Object.assign(new Error('El evento ya está confirmado; no se pueden agregar servicios a la solicitud.'), {
      status: 409
    });
  }

  const servicio = await prisma.servicio.findUnique({
    where: { id: servicioId },
    include: INCLUIR_SERVICIO
  });
  if (!servicio) {
    throw Object.assign(new Error('Servicio no encontrado.'), { status: 404 });
  }
  if (!servicio.activo) {
    throw Object.assign(new Error('El servicio seleccionado está inactivo.'), { status: 409 });
  }
  if (!servicio.tipoServicio.activo) {
    throw Object.assign(new Error('El tipo del servicio seleccionado está inactivo.'), { status: 409 });
  }
  const [versionActiva] = servicio.versiones;
  if (!versionActiva) {
    throw Object.assign(new Error('El servicio seleccionado no tiene una versión de precio activa.'), { status: 409 });
  }

  const existente = solicitud.servicios.some((seleccionado) => seleccionado.id === servicioId);
  if (existente) {
    throw Object.assign(new Error('El servicio ya está agregado a la solicitud.'), { status: 409 });
  }

  const actualizada = await prisma.$transaction(async (transaction) => {
    await transaction.solicitudServicio.create({
      data: { solicitudId, servicioId, versionServicioId: versionActiva.id }
    });

    const solicitudConServicio = await transaction.solicitud.findUnique({
      where: { id: solicitudId },
      include: INCLUIR_SOLICITUD
    });
    const estado = calcularEstado(solicitudConServicio);

    if (estado !== solicitudConServicio.estado) {
      return transaction.solicitud.update({
        where: { id: solicitudId },
        data: { estado },
        include: INCLUIR_SOLICITUD
      });
    }

    return solicitudConServicio;
  });

  return aRespuesta(actualizada);
}

export async function quitarServicio(solicitudId, servicioId) {
  const solicitud = await obtenerPorId(solicitudId);
  if (solicitud.estado === 'confirmado') {
    throw Object.assign(new Error('El evento ya está confirmado; no se pueden quitar servicios de la solicitud.'), {
      status: 409
    });
  }

  const servicioIdNumerico = Number(servicioId);
  if (!Number.isInteger(servicioIdNumerico) || servicioIdNumerico <= 0) {
    throw Object.assign(new Error('Identificador de servicio inválido.'), { status: 400 });
  }

  const existente = await prisma.solicitudServicio.findUnique({
    where: { solicitudId_servicioId: { solicitudId, servicioId: servicioIdNumerico } }
  });
  if (!existente) {
    throw Object.assign(new Error('El servicio no está agregado a la solicitud.'), { status: 404 });
  }

  const actualizada = await prisma.$transaction(async (transaction) => {
    await transaction.solicitudServicio.delete({ where: { id: existente.id } });

    const solicitudConServicios = await transaction.solicitud.findUnique({
      where: { id: solicitudId },
      include: INCLUIR_SOLICITUD
    });
    const estado = calcularEstado(solicitudConServicios);

    if (estado !== solicitudConServicios.estado) {
      return transaction.solicitud.update({
        where: { id: solicitudId },
        data: { estado },
        include: INCLUIR_SOLICITUD
      });
    }

    return solicitudConServicios;
  });

  return aRespuesta(actualizada);
}
