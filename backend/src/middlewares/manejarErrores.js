// Único lugar del backend que arma una respuesta de error.
// Los controladores solo hacen: catch (error) { next(error) }
// Un servicio puede adjuntar `detalles` (p. ej. { errores }) que se agregan a la respuesta.
export function manejarErrores(error, req, res, next) {
  if (!error.status) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
  return res.status(error.status).json({ message: error.message, ...error.detalles });
}
