export function validarInventario(req, res, next) {
  const nombre = String(req.body.nombre || '').trim();
  const categoria = String(req.body.categoria || '').trim();
  const precioTexto = String(req.body.precio ?? '').trim();
  const stockTexto = String(req.body.stock ?? '').trim();
  const precio = Number(req.body.precio);
  const stock = Number(req.body.stock);
  const reutilizable = req.body.reutilizable === true;
  const stockFueraServicio = Number(req.body.stockFueraServicio ?? 0);
  const errores = {};

  if (!nombre) errores.nombre = 'El nombre es obligatorio.';
  else if (nombre.length > 150) errores.nombre = 'El nombre no puede superar 150 caracteres.';
  if (!categoria) errores.categoria = 'El tipo de objeto es obligatorio.';
  else if (categoria.length > 100) errores.categoria = 'El tipo de objeto no puede superar 100 caracteres.';
  if (!precioTexto || !Number.isFinite(precio) || precio < 0 || Math.round(precio * 100) !== precio * 100) {
    errores.precio = 'El precio debe ser un número mayor o igual a 0, con hasta 2 decimales.';
  }
  if (!stockTexto || !Number.isInteger(stock) || stock < 0) errores.stock = 'El stock debe ser un entero mayor o igual a 0.';
  if (!Number.isInteger(stockFueraServicio) || stockFueraServicio < 0 || stockFueraServicio > stock) {
    errores.stockFueraServicio = 'La cantidad fuera de servicio debe estar entre 0 y el stock.';
  }
  if (!reutilizable && stockFueraServicio !== 0) {
    errores.stockFueraServicio = 'Solo los objetos reutilizables tienen unidades fuera de servicio.';
  }

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Los datos del inventario no son válidos.', errores });
  }
  req.body = { nombre, categoria, precio, stock, reutilizable, stockFueraServicio };
  next();
}

export function validarConsultaDisponibilidad(req, res, next) {
  const solicitudId = Number(req.query.solicitudId);
  if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
    return res.status(400).json({ message: 'Indica un evento válido para consultar disponibilidad.' });
  }
  req.consulta = { solicitudId };
  next();
}

export function validarReservaInventario(req, res, next) {
  const solicitudId = Number(req.body.solicitudId);
  const cantidad = Number(req.body.cantidad);
  if (!Number.isInteger(solicitudId) || solicitudId <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ message: 'Indica un evento y una cantidad válida para reservar.' });
  }
  req.reserva = { solicitudId, cantidad };
  next();
}

export function validarReservaVehiculo(req, res, next) {
  const solicitudId = Number(req.body.solicitudId);
  if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
    return res.status(400).json({ message: 'Indica un evento válido para reservar el vehículo.' });
  }
  req.reserva = { solicitudId };
  next();
}

export function validarVehiculo(req, res, next) {
  const nombre = String(req.body.nombre || '').trim();
  const precioTexto = String(req.body.precio ?? '').trim();
  const precio = Number(req.body.precio);
  const estado = String(req.body.estado || 'disponible');
  if (!nombre || nombre.length > 150) {
    return res.status(400).json({ message: 'El nombre del vehículo es obligatorio y no puede superar 150 caracteres.' });
  }
  if (!precioTexto || !Number.isFinite(precio) || precio < 0 || Math.round(precio * 100) !== precio * 100) {
    return res.status(400).json({ message: 'La tarifa debe ser un número mayor o igual a 0, con hasta 2 decimales.' });
  }
  if (!['disponible', 'fuera_servicio'].includes(estado)) {
    return res.status(400).json({ message: 'Elige un estado válido para el vehículo.' });
  }
  req.body = { nombre, categoria: 'vehiculo', tipo: 'vehiculo', precio, estado };
  next();
}