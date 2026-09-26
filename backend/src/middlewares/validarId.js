// Revisa que :id sea un entero positivo y lo deja convertido en req.params.id.
export function validarId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Identificador inválido.' });
  req.params.id = id;
  next();
}
