// Limpia el nombre y deja la primera letra en mayúscula
export function validarTipoEvento(req, res, next) {
  const nombre = String(req.body.nombre ?? '').trim().replace(/\s+/g, ' ');
  let error = null;
  if (!nombre) error = 'Escribe el nombre del tipo de evento.';
  else if (nombre.length < 3) error = 'El nombre debe tener al menos 3 caracteres.';
  else if (nombre.length > 100) error = 'El nombre no puede superar 100 caracteres.';
  else if (!/\p{L}/u.test(nombre)) error = 'El nombre debe incluir letras.';
  if (error) return res.status(400).json({ message: 'Revisa el tipo de evento.', errores: { nombre: error } });

  req.body = { nombre: nombre[0].toUpperCase() + nombre.slice(1) };
  next();
}
