export function validarInventario(req, res, next) {
  const nombre = String(req.body.nombre || '').trim();
  const precioTexto = String(req.body.precio ?? '').trim();
  const stockTexto = String(req.body.stock ?? '').trim();
  const precio = Number(req.body.precio);
  const stock = Number(req.body.stock);
  const errores = {};

  if (!nombre) errores.nombre = 'El nombre es obligatorio.';
  else if (nombre.length > 150) errores.nombre = 'El nombre no puede superar 150 caracteres.';
  if (!precioTexto || !Number.isFinite(precio) || precio < 0 || Math.round(precio * 100) !== precio * 100) {
    errores.precio = 'El precio debe ser un número mayor o igual a 0, con hasta 2 decimales.';
  }
  if (!stockTexto || !Number.isInteger(stock) || stock < 0) errores.stock = 'El stock debe ser un entero mayor o igual a 0.';

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Los datos del inventario no son válidos.', errores });
  }
  req.body = { nombre, precio, stock };
  next();
}