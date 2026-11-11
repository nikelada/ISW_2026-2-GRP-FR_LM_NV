// Entero positivo (número o texto con dígitos); si no, null
function idPositivo(valor) {
  if (!/^\d+$/.test(String(valor ?? '').trim())) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Para calcular una cotización: { solicitudId, servicios: [servicioId, ...] }
export function validarCalculo(req, res, next) {
  const errores = {};
  const solicitudId = idPositivo(req.body.solicitudId);
  if (!solicitudId) errores.solicitudId = 'Selecciona una solicitud válida.';

  let servicios = [];
  if (!Array.isArray(req.body.servicios) || req.body.servicios.length === 0) {
    errores.servicios = 'Selecciona al menos un servicio.';
  } else {
    servicios = req.body.servicios.map(idPositivo);
    if (servicios.includes(null)) errores.servicios = 'Hay servicios con un identificador inválido.';
    else if (new Set(servicios).size !== servicios.length) errores.servicios = 'No se puede repetir un servicio.';
  }

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa los datos de la cotización.', errores });
  }

  req.body = { solicitudId, servicios };
  next();
}
