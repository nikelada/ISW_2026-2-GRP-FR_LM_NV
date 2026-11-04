import { esFechaValida, esHoraValida } from './solicitud.middleware.js';

// Campos del evento que se pueden pedir cambiar
const VALIDADORES = {
  tipoEvento: (v) => (v.length <= 100 ? null : 'El tipo de evento no puede superar 100 caracteres.'),
  fecha: (v) => (esFechaValida(v) ? null : 'La fecha no es válida.'),
  horaInicio: (v) => (esHoraValida(v) ? null : 'La hora de inicio no es válida.'),
  horaFin: (v) => (esHoraValida(v) ? null : 'La hora de término no es válida.'),
  cantidadPersonas: (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? null : 'Debe ser un número entero mayor que cero.'),
  lugar: (v) => (v.length <= 255 ? null : 'El lugar no puede superar 255 caracteres.'),
  requerimientosTecnicos: (v) => (v.length <= 2000 ? null : 'Los requerimientos técnicos no pueden superar 2000 caracteres.')
};

function normalizar(campo, texto) {
  if (campo === 'cantidadPersonas') return Number(texto);
  if (campo === 'horaInicio' || campo === 'horaFin') return texto.slice(0, 5);
  return texto;
}

// body: { solicitudId, cambios: { campo: valorNuevo }, motivo }
export function validarSolicitudCambio(req, res, next) {
  const solicitudId = Number(req.body.solicitudId);
  const entrada = req.body.cambios;
  const motivo = String(req.body.motivo ?? '').trim();
  if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
    return res.status(400).json({ message: 'Selecciona el evento que se quiere modificar.' });
  }
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return res.status(400).json({ message: 'Indica los datos que el cliente quiere cambiar.' });
  }

  const cambios = {};
  const errores = {};
  for (const [campo, valor] of Object.entries(entrada)) {
    if (!(campo in VALIDADORES)) return res.status(400).json({ message: `El dato «${campo}» no se puede modificar.` });
    const texto = String(valor ?? '').trim();
    if (!texto) {
      errores[campo] = 'Indica el nuevo valor.';
      continue;
    }
    const error = VALIDADORES[campo](texto);
    if (error) errores[campo] = error;
    else cambios[campo] = normalizar(campo, texto);
  }
  if (!motivo) errores.motivo = 'Indica el motivo del cambio.';
  else if (motivo.length > 1000) errores.motivo = 'El motivo no puede superar 1000 caracteres.';
  if (Object.keys(errores).length) return res.status(400).json({ message: 'Revisa los datos del cambio.', errores });
  if (!Object.keys(cambios).length) return res.status(400).json({ message: 'Indica al menos un dato a cambiar.' });

  req.body = { solicitudId, cambios, motivo };
  next();
}

// Aprobar o rechazar, más los factores que marcó gerencia
export function validarRevision(req, res, next) {
  const { decision } = req.body;
  if (!['aprobar', 'rechazar'].includes(decision)) {
    return res.status(400).json({ message: 'La decisión debe ser aprobar o rechazar.' });
  }
  req.body = {
    decision,
    revisionRecursos: req.body.revisionRecursos === true,
    revisionAnticipacion: req.body.revisionAnticipacion === true,
    revisionCosto: req.body.revisionCosto === true,
    revisionOtrosEventos: req.body.revisionOtrosEventos === true
  };
  next();
}
