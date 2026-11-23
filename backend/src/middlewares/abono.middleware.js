import { esFechaValida } from './solicitud.middleware.js';

// Entero positivo (número o texto con dígitos); si no, null
function enteroPositivo(valor) {
  if (!/^\d+$/.test(String(valor ?? '').trim())) return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

// Para registrar un abono (RF-08): { cotizacionId, monto, fecha: 'AAAA-MM-DD' }, todos obligatorios.
// Los límites que dependen de la cotización (saldo y fechas) los revisa el servicio.
export function validarAbono(req, res, next) {
  const errores = {};
  const cotizacionId = enteroPositivo(req.body.cotizacionId);
  const monto = enteroPositivo(req.body.monto);
  const fecha = String(req.body.fecha ?? '').trim();

  if (!cotizacionId) errores.cotizacionId = 'Selecciona una cotización válida.';
  if (!monto) errores.monto = 'El monto debe ser un número entero mayor que 0.';
  if (!fecha) errores.fecha = 'La fecha del abono es obligatoria.';
  else if (!esFechaValida(fecha)) errores.fecha = 'La fecha no es válida.';

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa los datos del abono.', errores });
  }

  req.body = { cotizacionId, monto, fecha };
  next();
}
