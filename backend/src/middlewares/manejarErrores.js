// Único lugar del backend que arma una respuesta de error.
// Los controladores solo hacen: catch (error) { next(error) }
export function manejarErrores(error, req, res, next) {
  if (!error.status) console.error(error);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Error interno del servidor.' });
}
