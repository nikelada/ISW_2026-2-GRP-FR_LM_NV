import { esFechaValida, esHoraValida } from './validarSolicitud.js';

// Rango de fechas que se muestra en el calendario (?desde=AAAA-MM-DD&hasta=AAAA-MM-DD).
export function validarRango(req, res, next) {
  const desde = String(req.query.desde || '');
  const hasta = String(req.query.hasta || '');
  if (!esFechaValida(desde) || !esFechaValida(hasta) || hasta < desde) {
    return res.status(400).json({ message: 'Indica un rango de fechas válido (desde y hasta, formato AAAA-MM-DD).' });
  }
  req.consulta = { desde, hasta };
  next();
}

// Consulta de disponibilidad (?fecha=&horaInicio=&horaFin=&excluirId=).
export function validarConsultaDisponibilidad(req, res, next) {
  const fecha = String(req.query.fecha || '');
  const horaInicio = String(req.query.horaInicio || '');
  const horaFin = String(req.query.horaFin || '');
  if (!esFechaValida(fecha) || !esHoraValida(horaInicio) || !esHoraValida(horaFin)) {
    return res.status(400).json({ message: 'Indica una fecha, hora de inicio y hora de término válidas.' });
  }
  if (horaFin.slice(0, 5) <= horaInicio.slice(0, 5)) {
    return res.status(400).json({ message: 'La hora de término debe ser posterior a la de inicio.' });
  }
  const excluirId = req.query.excluirId ? Number(req.query.excluirId) : undefined;
  if (excluirId !== undefined && (!Number.isInteger(excluirId) || excluirId <= 0)) {
    return res.status(400).json({ message: 'Identificador inválido.' });
  }
  req.consulta = { fecha, horaInicio: horaInicio.slice(0, 5), horaFin: horaFin.slice(0, 5), excluirId };
  next();
}
