import { esFechaValida, esHoraValida } from './solicitud.middleware.js';

const TIPOS_RECURSO = ['equipo', 'espacio', 'vehiculo'];
const ESTADOS_RECURSO = ['disponible', 'en_uso', 'mantencion', 'fuera_servicio'];

export function validarRecurso(req, res, next) {
  const nombre = String(req.body.nombre || '').trim();
  const tipo = String(req.body.tipo || '');
  const categoria = String(req.body.categoria || '').trim();
  const estado = String(req.body.estado || 'disponible');
  if (!nombre || nombre.length > 150) {
    return res.status(400).json({ message: 'El nombre es obligatorio y no puede superar 150 caracteres.' });
  }
  if (!TIPOS_RECURSO.includes(tipo)) {
    return res.status(400).json({ message: 'Selecciona un tipo de recurso válido.' });
  }
  if (!categoria || categoria.length > 100) {
    return res.status(400).json({ message: 'La categoría es obligatoria y no puede superar 100 caracteres.' });
  }
  if (!ESTADOS_RECURSO.includes(estado)) {
    return res.status(400).json({ message: 'Selecciona un estado de recurso válido.' });
  }
  req.body = { nombre, tipo, categoria, estado };
  next();
}

export function validarConsultaRecursos(req, res, next) {
  const { fecha = '', horaInicio = '', horaFin = '' } = req.query;
  const tipo = String(req.query.tipo || '');
  const categoria = String(req.query.categoria || '').trim();
  const solicitudId = req.query.solicitudId ? Number(req.query.solicitudId) : undefined;
  if (!esFechaValida(String(fecha)) || !esHoraValida(String(horaInicio)) || !esHoraValida(String(horaFin))) {
    return res.status(400).json({ message: 'Indica fecha, hora de inicio y hora de término válidas.' });
  }
  if (String(horaFin).slice(0, 5) <= String(horaInicio).slice(0, 5)) {
    return res.status(400).json({ message: 'La hora de término debe ser posterior a la de inicio.' });
  }
  if (tipo && !TIPOS_RECURSO.includes(tipo)) {
    return res.status(400).json({ message: 'Selecciona un tipo de recurso válido.' });
  }
  if (solicitudId !== undefined && (!Number.isInteger(solicitudId) || solicitudId <= 0)) {
    return res.status(400).json({ message: 'Identificador de evento inválido.' });
  }
  req.consulta = {
    fecha: String(fecha),
    horaInicio: String(horaInicio).slice(0, 5),
    horaFin: String(horaFin).slice(0, 5),
    tipo: tipo || undefined,
    categoria: categoria || undefined,
    solicitudId
  };
  next();
}

export function validarReserva(req, res, next) {
  const recursoId = Number(req.body.recursoId);
  if (!Number.isInteger(recursoId) || recursoId <= 0) {
    return res.status(400).json({ message: 'Selecciona un recurso válido.' });
  }
  req.body = { recursoId };
  next();
}

export function validarPersonal(req, res, next) {
  const personalId = req.body.personalId ? Number(req.body.personalId) : undefined;
  const nombre = String(req.body.nombre || '').trim();
  const telefono = String(req.body.telefono || '').trim();
  const correo = String(req.body.correo || '').trim();
  const funcion = String(req.body.funcion || '').trim();
  if (personalId !== undefined && (!Number.isInteger(personalId) || personalId <= 0)) {
    return res.status(400).json({ message: 'Identificador de personal inválido.' });
  }
  if (!personalId && (!nombre || nombre.length > 150)) {
    return res.status(400).json({ message: 'Indica el nombre del personal eventual.' });
  }
  if (telefono.length > 30 || correo.length > 255 || funcion.length > 100) {
    return res.status(400).json({ message: 'Revisa la extensión de los datos del personal.' });
  }
  req.body = { personalId, nombre, telefono, correo, funcion };
  next();
}

export function validarTarea(req, res, next) {
  const titulo = String(req.body.titulo || '').trim();
  const descripcion = String(req.body.descripcion || '').trim();
  if (!titulo || titulo.length > 150 || descripcion.length > 2000) {
    return res.status(400).json({ message: 'La tarea requiere un título de hasta 150 caracteres y una descripción de hasta 2000.' });
  }
  req.body = { titulo, descripcion: descripcion || null };
  next();
}

export function validarPago(req, res, next) {
  const concepto = String(req.body.concepto || '').trim();
  const monto = Number(req.body.monto);
  if (!concepto || concepto.length > 150 || !Number.isFinite(monto) || monto <= 0) {
    return res.status(400).json({ message: 'Indica un concepto y un monto mayor que cero.' });
  }
  req.body = { concepto, monto };
  next();
}

export function validarEncuesta(req, res, next) {
  const encuestaConforme = req.body.encuestaConforme;
  const encuestaComentario = String(req.body.encuestaComentario || '').trim();
  if (typeof encuestaConforme !== 'boolean') {
    return res.status(400).json({ message: 'Indica si la evaluación del cliente fue conforme.' });
  }
  if (encuestaComentario.length > 2000) {
    return res.status(400).json({ message: 'El comentario no puede superar 2000 caracteres.' });
  }
  req.body = { encuestaConforme, encuestaComentario: encuestaComentario || null };
  next();
}
