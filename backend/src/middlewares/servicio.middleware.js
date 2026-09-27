const TIPOS_PRECIO = ['fijo', 'por_hora'];
const PRECIO_MAXIMO = 1000000000;
const MENSAJE_PRECIO = 'El precio debe ser un entero entre 1 y 1.000.000.000.';

function precioEnteroPositivo(valor) {
  const texto = String(valor ?? '').trim();
  if (!/^\d+$/.test(texto)) return null;
  const precio = Number(texto);
  return Number.isSafeInteger(precio) && precio > 0 && precio <= PRECIO_MAXIMO ? precio : null;
}

function textoOpcional(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

function datosBase(req) {
  return {
    tipoServicioId: Number(req.body.tipoServicioId),
    nombre: String(req.body.nombre || '').trim(),
    descripcion: textoOpcional(req.body.descripcion),
    activo: req.body.activo === undefined ? true : req.body.activo
  };
}

function validarBase(datos) {
  const errores = {};
  if (!Number.isInteger(datos.tipoServicioId) || datos.tipoServicioId <= 0) {
    errores.tipoServicioId = 'Selecciona un tipo de servicio válido.';
  }
  if (!datos.nombre) errores.nombre = 'El nombre es obligatorio.';
  else if (datos.nombre.length > 150) errores.nombre = 'El nombre no puede superar 150 caracteres.';
  if (!datos.descripcion) errores.descripcion = 'La descripción es obligatoria.';
  else if (datos.descripcion.length > 1000) {
    errores.descripcion = 'La descripción no puede superar 1000 caracteres.';
  }
  if (typeof datos.activo !== 'boolean') errores.activo = 'El estado activo debe ser verdadero o falso.';
  return errores;
}

// Al registrar un servicio se crea inmediatamente su primera versión vigente.
export function validarServicio(req, res, next) {
  const datos = datosBase(req);
  const tipoPrecio = String(req.body.tipoPrecio || '').trim();
  const precio = precioEnteroPositivo(req.body.precio);
  const errores = validarBase(datos);

  if (!TIPOS_PRECIO.includes(tipoPrecio)) errores.tipoPrecio = 'El tipo de precio debe ser fijo o por_hora.';
  if (precio === null) errores.precio = MENSAJE_PRECIO;

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa los datos del servicio.', errores });
  }

  req.body = { ...datos, tipoPrecio, precio };
  next();
}

// Los cambios de precio y modalidad se tramitan mediante CambioServicio.
export function validarActualizacionServicio(req, res, next) {
  if (Object.hasOwn(req.body, 'precio') || Object.hasOwn(req.body, 'tipoPrecio')) {
    return res.status(409).json({
      message: 'Los cambios de precio o tipo de precio requieren aprobación de Gerencia.'
    });
  }

  const datos = datosBase(req);
  const errores = validarBase(datos);
  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa los datos del servicio.', errores });
  }

  req.body = datos;
  next();
}

// Se permite proponer uno o ambos valores; el servicio completa el valor que
// falte usando la versión vigente.
export function validarCambioServicio(req, res, next) {
  const incluyePrecio = Object.hasOwn(req.body, 'precio');
  const incluyeTipoPrecio = Object.hasOwn(req.body, 'tipoPrecio');
  const errores = {};
  const datos = {};

  if (!incluyePrecio && !incluyeTipoPrecio) {
    return res.status(400).json({ message: 'Indica un nuevo precio o tipo de precio.' });
  }

  if (incluyePrecio) {
    const precio = precioEnteroPositivo(req.body.precio);
    if (precio === null) errores.precio = MENSAJE_PRECIO;
    else datos.precio = precio;
  }

  if (incluyeTipoPrecio) {
    const tipoPrecio = String(req.body.tipoPrecio || '').trim();
    if (!TIPOS_PRECIO.includes(tipoPrecio)) errores.tipoPrecio = 'El tipo de precio debe ser fijo o por_hora.';
    else datos.tipoPrecio = tipoPrecio;
  }

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Revisa los datos del cambio.', errores });
  }

  req.body = datos;
  next();
}
