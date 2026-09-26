import { prisma } from '../config/prisma.js';
import * as clienteService from './cliente.service.js';

// Información obligatoria para que la solicitud pueda pasar a cotización.
const CAMPOS_PARA_COTIZAR = [
  { campo: 'fecha', etiqueta: 'Fecha' },
  { campo: 'horaInicio', etiqueta: 'Hora de inicio' },
  { campo: 'horaFin', etiqueta: 'Hora de término' },
  { campo: 'cantidadPersonas', etiqueta: 'Cantidad de personas' },
  { campo: 'lugar', etiqueta: 'Lugar' },
  { campo: 'servicios', etiqueta: 'Servicios necesarios' }
];

const ESTADOS = ['pendiente', 'disponible_cotizar', 'confirmado'];
const INCLUIR_CLIENTE = { cliente: { select: { id: true, nombre: true } } };

// Prisma representa DATE y TIME de PostgreSQL como Date en UTC.
export const aFecha = (texto) => (texto ? new Date(`${texto}T00:00:00Z`) : null);
export const aHora = (texto) => (texto ? new Date(`1970-01-01T${texto}:00Z`) : null);
const textoFecha = (valor) => (valor ? valor.toISOString().slice(0, 10) : null);
const textoHora = (valor) => (valor ? valor.toISOString().slice(11, 16) : null);

export function camposFaltantes(solicitud) {
  return CAMPOS_PARA_COTIZAR
    .filter(({ campo }) => solicitud[campo] === null || solicitud[campo] === undefined || solicitud[campo] === '')
    .map(({ etiqueta }) => etiqueta);
}

// Si falta algún dato queda pendiente; cuando se completa, queda disponible para cotizar.
function calcularEstado(datos) {
  return camposFaltantes(datos).length ? 'pendiente' : 'disponible_cotizar';
}

export function aRespuesta(solicitud) {
  const respuesta = {
    ...solicitud,
    fecha: textoFecha(solicitud.fecha),
    horaInicio: textoHora(solicitud.horaInicio),
    horaFin: textoHora(solicitud.horaFin)
  };
  respuesta.faltantes = camposFaltantes(respuesta);
  return respuesta;
}

function aDatos(datos) {
  return {
    clienteId: datos.clienteId,
    fecha: aFecha(datos.fecha),
    horaInicio: aHora(datos.horaInicio),
    horaFin: aHora(datos.horaFin),
    cantidadPersonas: datos.cantidadPersonas,
    lugar: datos.lugar,
    servicios: datos.servicios,
    estado: calcularEstado(datos)
  };
}

// La solicitud debe estar asociada a un cliente registrado.
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
    include: INCLUIR_CLIENTE,
    orderBy: { createdAt: 'desc' }
  });
  return solicitudes.map(aRespuesta);
}

/**
 * Punto de integración con el módulo de cotizaciones: solicitudes con toda
 * la información obligatoria, disponibles para cotizar.
 */
export function listarParaCotizar() {
  return listar({ estado: 'disponible_cotizar' });
}

export async function obtenerPorId(id) {
  const solicitud = await prisma.solicitud.findUnique({ where: { id }, include: INCLUIR_CLIENTE });
  if (!solicitud) throw Object.assign(new Error('Solicitud no encontrada.'), { status: 404 });
  return aRespuesta(solicitud);
}

export async function crear(datos) {
  await asegurarClienteRegistrado(datos.clienteId);
  const creada = await prisma.solicitud.create({ data: aDatos(datos), include: INCLUIR_CLIENTE });
  return aRespuesta(creada);
}

// Permite completar o corregir los datos mientras el evento no esté confirmado; el estado se recalcula.
export async function actualizar(id, datos) {
  const actual = await obtenerPorId(id);
  if (actual.estado === 'confirmado') {
    throw Object.assign(new Error('El evento ya está confirmado; sus datos no se pueden editar desde la solicitud.'), { status: 409 });
  }
  if (datos.clienteId !== actual.clienteId) await asegurarClienteRegistrado(datos.clienteId);

  const data = aDatos(datos);
  // Si cambia la fecha o el horario, la disponibilidad debe revisarse de nuevo.
  if (datos.fecha !== actual.fecha || datos.horaInicio !== actual.horaInicio || datos.horaFin !== actual.horaFin) {
    data.fechaHabilitada = false;
  }
  const actualizada = await prisma.solicitud.update({ where: { id }, data, include: INCLUIR_CLIENTE });
  return aRespuesta(actualizada);
}
