// Entero positivo (número o texto con dígitos); si no, null
function idPositivo(valor) {
  if (!/^\d+$/.test(String(valor ?? '').trim())) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const ESTADOS_COTIZACION = [
  'pendiente_revision',
  'modificaciones_solicitadas',
  'aprobada',
  'enviada',
  'aceptada',
  'rechazada',
  'sin_respuesta'
];

// Filtros del listado: ?estado=&solicitudId= (ambos opcionales)
export function validarFiltros(req, res, next) {
  const errores = {};
  const estado = String(req.query.estado || '').trim() || undefined;
  const solicitudId = req.query.solicitudId ? idPositivo(req.query.solicitudId) : undefined;

  if (estado && !ESTADOS_COTIZACION.includes(estado)) errores.estado = 'El estado de cotización no es válido.';
  if (solicitudId === null) errores.solicitudId = 'La solicitud indicada no es válida.';

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa los filtros de búsqueda.', errores });
  }

  req.filtros = { estado, solicitudId };
  next();
}

// Para calcular o crear una cotización: { solicitudId, servicios?: [servicioId, ...] }
// Si no se manda la lista se usan los servicios de la solicitud; si se manda, no puede venir vacía.
export function validarCalculo(req, res, next) {
  const errores = {};
  const solicitudId = idPositivo(req.body.solicitudId);
  if (!solicitudId) errores.solicitudId = 'Selecciona una solicitud válida.';

  let servicios;
  if (req.body.servicios === undefined) {
    servicios = undefined;
  } else if (!Array.isArray(req.body.servicios) || req.body.servicios.length === 0) {
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
