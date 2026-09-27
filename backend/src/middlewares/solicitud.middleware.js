const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export function esFechaValida(texto) {
  if (!FECHA_REGEX.test(texto)) return false;
  const [year, month, day] = texto.split('-').map(Number);
  const fecha = new Date(Date.UTC(year, month - 1, day));
  return fecha.getUTCFullYear() === year && fecha.getUTCMonth() === month - 1 && fecha.getUTCDate() === day;
}

export function esHoraValida(texto) {
  return HORA_REGEX.test(texto);
}

function textoOpcional(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

// Los datos del evento pueden venir incompletos (la solicitud quedará pendiente),
// pero lo que venga debe tener un formato válido y siempre debe indicarse el cliente.
// Deja el cuerpo normalizado (horas como HH:MM, vacíos como null).
export function validarSolicitud(req, res, next) {
  const errores = {};
  const clienteId = Number(req.body.clienteId);
  if (!Number.isInteger(clienteId) || clienteId <= 0) errores.clienteId = 'Selecciona un cliente registrado.';

  const fecha = textoOpcional(req.body.fecha);
  if (fecha && !esFechaValida(fecha)) errores.fecha = 'La fecha no es válida.';

  const horaInicio = textoOpcional(req.body.horaInicio);
  const horaFin = textoOpcional(req.body.horaFin);
  if (horaInicio && !esHoraValida(horaInicio)) errores.horaInicio = 'La hora de inicio no es válida.';
  if (horaFin && !esHoraValida(horaFin)) errores.horaFin = 'La hora de término no es válida.';
  if (horaInicio && horaFin && !errores.horaInicio && !errores.horaFin && horaFin.slice(0, 5) <= horaInicio.slice(0, 5)) {
    errores.horaFin = 'La hora de término debe ser posterior a la de inicio.';
  }

  const cantidadTexto = textoOpcional(req.body.cantidadPersonas);
  const cantidadPersonas = cantidadTexto === null ? null : Number(cantidadTexto);
  if (cantidadTexto !== null && (!Number.isInteger(cantidadPersonas) || cantidadPersonas <= 0)) {
    errores.cantidadPersonas = 'Debe ser un número entero mayor que cero.';
  }

  const lugar = textoOpcional(req.body.lugar);
  if (lugar && lugar.length > 255) errores.lugar = 'El lugar no puede superar 255 caracteres.';

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa los datos de la solicitud.', errores });
  }
  req.body = {
    clienteId,
    fecha,
    horaInicio: horaInicio && horaInicio.slice(0, 5),
    horaFin: horaFin && horaFin.slice(0, 5),
    cantidadPersonas,
    lugar,
    servicios: textoOpcional(req.body.servicios)
  };
  next();
}

// La interfaz puede filtrar por tipo, pero la solicitud solo necesita el servicio.
// El backend obtiene y valida su tipo a partir de la relación registrada.
export function validarServicioSeleccionado(req, res, next) {
  const servicioId = Number(req.body.servicioId);
  const errores = {};

  if (!Number.isInteger(servicioId) || servicioId <= 0) {
    errores.servicioId = 'Selecciona un servicio válido.';
  }

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa el servicio seleccionado.', errores });
  }

  req.body = { servicioId };
  next();
}
