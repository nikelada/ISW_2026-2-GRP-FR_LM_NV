// Acá se arman todas las respuestas de error; los controladores solo hacen next(error).
// Si el servicio manda `detalles` (ej. errores por campo) se agregan a la respuesta.
export function manejarErrores(error, req, res, next) {
  if (!error.status) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
  return res.status(error.status).json({ message: error.message, ...error.detalles });
}
