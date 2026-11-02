const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nombre, teléfono y correo son obligatorios. Deja el body limpio para el controlador
export function validarCliente(req, res, next) {
  const nombre = String(req.body.nombre || '').trim();
  const telefono = String(req.body.telefono || '').trim();
  const correo = String(req.body.correo || '').trim().toLowerCase();

  const errores = {};
  if (!nombre) errores.nombre = 'El nombre es obligatorio.';
  else if (nombre.length > 150) errores.nombre = 'El nombre no puede superar 150 caracteres.';
  if (!telefono) errores.telefono = 'El teléfono es obligatorio.';
  else if (telefono.length > 30) errores.telefono = 'El teléfono no puede superar 30 caracteres.';
  if (!correo) errores.correo = 'El correo es obligatorio.';
  else if (!EMAIL_REGEX.test(correo) || correo.length > 255) errores.correo = 'El correo no tiene un formato válido.';

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Faltan datos obligatorios del cliente o no son válidos.', errores });
  }
  req.body = { nombre, telefono, correo };
  next();
}
