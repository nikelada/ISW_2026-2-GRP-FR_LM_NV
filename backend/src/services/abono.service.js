import { prisma } from '../config/prisma.js';
import { fechaActual } from '../utils/fecha.js';
import { aRespuesta as aRespuestaCotizacion, INCLUIR_COTIZACION } from './cotizacion.service.js';
import { aFecha, textoFecha, textoHora } from './solicitud.service.js';
import { asegurarFechaLibre } from './calendario.service.js';

const formatoPrecio = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
// AAAA-MM-DD a dd-mm-aaaa, para los mensajes
const fechaDDMMAAAA = (fecha) => textoFecha(fecha).split('-').reverse().join('-');
const conflicto = (mensaje, detalles) => Object.assign(new Error(mensaje), { status: 409, ...(detalles && { detalles }) });
const sumar = (abonos) => abonos.reduce((suma, abono) => suma + abono.monto, 0);

const INCLUIR_CON_ABONOS = {
  ...INCLUIR_COTIZACION,
  abonos: { orderBy: [{ fecha: 'asc' }, { id: 'asc' }] }
};

// La cotización aceptada con sus abonos (RF-08): lo pagado, el 50% inicial y lo que falta
function aRespuesta({ abonos, ...cotizacion }) {
  const abonoActual = sumar(abonos);
  return {
    ...aRespuestaCotizacion(cotizacion),
    abonos: abonos.map(({ id, monto, fecha, createdAt }) => ({ id, monto, fecha: textoFecha(fecha), createdAt })),
    abonoActual,
    abonoMinimo: cotizacion.total / 2,
    saldoPendiente: cotizacion.total - abonoActual
  };
}

// Cotizaciones aceptadas por el cliente, con sus abonos
export async function listar() {
  const cotizaciones = await prisma.cotizacion.findMany({
    where: { estado: 'aceptada' },
    include: INCLUIR_CON_ABONOS,
    orderBy: { createdAt: 'desc' }
  });
  return cotizaciones.map(aRespuesta);
}

async function obtenerCotizacion(cotizacionId) {
  const cotizacion = await prisma.cotizacion.findUnique({ where: { id: cotizacionId }, include: INCLUIR_CON_ABONOS });
  if (!cotizacion) throw Object.assign(new Error('Cotización no encontrada.'), { status: 404 });
  return aRespuesta(cotizacion);
}

// RF-08 y RF-09: registra un abono de una cotización aceptada. La fecha va entre el día de la aceptación
// y hoy, y el monto no puede superar el saldo pendiente. Mientras el evento no esté confirmado, cada abono
// revisa que su fecha no haya llegado y que no choque con otro evento confirmado. Si con este abono lo
// pagado llega al 50% del total, el evento queda confirmado en la misma transacción.
export async function registrar({ cotizacionId, monto, fecha }) {
  const fechaPago = aFecha(fecha);
  const eventoConfirmado = await prisma.$transaction(async (transaction) => {
    const cotizacion = await transaction.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: { abonos: { select: { monto: true } }, solicitud: { select: { estado: true, fecha: true, horaInicio: true, horaFin: true } } }
    });
    if (!cotizacion) throw Object.assign(new Error('Cotización no encontrada.'), { status: 404 });
    if (cotizacion.estado !== 'aceptada') throw conflicto('Solo se pueden registrar abonos en cotizaciones aceptadas por el cliente.');
    if (cotizacion.solicitud.estado === 'pendiente') {
      throw conflicto('La solicitud tiene datos pendientes; complétala antes de registrar abonos.');
    }
    if (fechaPago > fechaActual()) throw conflicto('La fecha del abono no puede ser posterior a hoy.');
    if (cotizacion.aceptadaEn && fechaPago < cotizacion.aceptadaEn) {
      throw conflicto(`La fecha del abono no puede ser anterior a la aceptación de la cotización (${fechaDDMMAAAA(cotizacion.aceptadaEn)}).`);
    }

    const abonoActual = sumar(cotizacion.abonos);
    const saldoPendiente = cotizacion.total - abonoActual;
    if (monto > saldoPendiente) {
      throw conflicto(`El abono supera el saldo pendiente (${formatoPrecio.format(saldoPendiente)}).`, { saldoPendiente });
    }

    const { solicitud } = cotizacion;
    const confirmaEvento = abonoActual + monto >= cotizacion.total / 2 && solicitud.estado !== 'confirmado';
    // Mientras el evento no esté confirmado se revisa su fecha (no la del abono)
    if (solicitud.estado !== 'confirmado') {
      if (solicitud.fecha <= fechaActual()) throw conflicto('No se puede registrar el abono: la fecha del evento ya llegó o pasó.');
      // Que no choque con otro evento confirmado (RF-03)
      // FIXME: si choca, el 409 trae en conflictos la solicitud completa del otro evento (con su cliente);
      // desde abonos bastaría con su fecha y horario
      await asegurarFechaLibre({
        id: cotizacion.solicitudId,
        fecha: textoFecha(solicitud.fecha),
        horaInicio: textoHora(solicitud.horaInicio),
        horaFin: textoHora(solicitud.horaFin)
      });
    }

    await transaction.abono.create({ data: { cotizacionId, monto, fecha: fechaPago } });

    if (confirmaEvento) {
      await transaction.solicitud.update({ where: { id: cotizacion.solicitudId }, data: { estado: 'confirmado' } });
    }
    return confirmaEvento;
  });
  return { ...(await obtenerCotizacion(cotizacionId)), eventoConfirmado };
}
