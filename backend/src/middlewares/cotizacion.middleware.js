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

// Mismos valores que el enum MotivoModificacion del schema de Prisma
const MOTIVOS_MODIFICACION = ['servicio_no_disponible', 'precio_desactualizado', 'otro'];
const MAXIMO_COMENTARIO = 1000;

// RF-10: Gerencia solicita modificaciones con { motivos: [...], comentario }.
// Al menos un motivo (sin repetir) y un comentario obligatorio de hasta 1000 caracteres.
export function validarSolicitudModificaciones(req, res, next) {
  const errores = {};
  const { motivos } = req.body;
  const comentario = String(req.body.comentario ?? '').trim();

  if (!Array.isArray(motivos) || !motivos.length) errores.motivos = 'Selecciona al menos un motivo.';
  else if (motivos.some((motivo) => !MOTIVOS_MODIFICACION.includes(motivo))) errores.motivos = 'Hay motivos que no son válidos.';
  else if (new Set(motivos).size !== motivos.length) errores.motivos = 'No se puede repetir un motivo.';

  if (!comentario) errores.comentario = 'Escribe un comentario para Producción y Comercial.';
  else if (comentario.length > MAXIMO_COMENTARIO) errores.comentario = `El comentario no puede superar ${MAXIMO_COMENTARIO} caracteres.`;

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa la solicitud de modificaciones.', errores });
  }

  req.body = { motivos, comentario };
  next();
}
