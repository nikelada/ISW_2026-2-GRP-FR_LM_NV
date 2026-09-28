function textoOpcional(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

// Normaliza y valida los datos del catálogo de tipos de servicio.
export function validarTipoServicio(req, res, next) {
  const nombre = String(req.body.nombre || '').trim();
  const descripcion = textoOpcional(req.body.descripcion);
  const activo = req.body.activo === undefined ? true : req.body.activo;
  const errores = {};

  if (!nombre) errores.nombre = 'El nombre es obligatorio.';
  else if (nombre.length > 100) errores.nombre = 'El nombre no puede superar 100 caracteres.';
  if (descripcion && descripcion.length > 1000) errores.descripcion = 'La descripción no puede superar 1000 caracteres.';
  if (typeof activo !== 'boolean') errores.activo = 'El estado activo debe ser verdadero o falso.';

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa los datos del tipo de servicio.', errores });
  }

  req.body = { nombre, descripcion, activo };
  next();
}
