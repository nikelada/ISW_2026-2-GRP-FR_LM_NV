const TIPOS_PRECIO = ['fijo', 'por_hora'];

function textoOpcional(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

// El servicio siempre debe quedar asociado a un tipo existente; el servicio
// valida esa existencia antes de escribir en la base de datos.
export function validarServicio(req, res, next) {
  const tipoServicioId = Number(req.body.tipoServicioId);
  const nombre = String(req.body.nombre || '').trim();
  const descripcion = textoOpcional(req.body.descripcion);
  const tipoPrecio = String(req.body.tipoPrecio || '').trim();
  const precio = Number(req.body.precio);
  const activo = req.body.activo === undefined ? true : req.body.activo;
  const errores = {};

  if (!Number.isInteger(tipoServicioId) || tipoServicioId <= 0) {
    errores.tipoServicioId = 'Selecciona un tipo de servicio válido.';
  }
  if (!nombre) errores.nombre = 'El nombre es obligatorio.';
  else if (nombre.length > 150) errores.nombre = 'El nombre no puede superar 150 caracteres.';
  if (descripcion && descripcion.length > 1000) errores.descripcion = 'La descripción no puede superar 1000 caracteres.';
  if (!TIPOS_PRECIO.includes(tipoPrecio)) errores.tipoPrecio = 'El tipo de precio debe ser fijo o por_hora.';
  if (!Number.isInteger(precio) || precio <= 0) errores.precio = 'El precio debe ser un entero mayor que cero.';
  if (typeof activo !== 'boolean') errores.activo = 'El estado activo debe ser verdadero o falso.';

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa los datos del servicio.', errores });
  }

  req.body = { tipoServicioId, nombre, descripcion, tipoPrecio, precio, activo };
  next();
}
