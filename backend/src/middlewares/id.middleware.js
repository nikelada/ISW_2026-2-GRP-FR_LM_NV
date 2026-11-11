// :id tiene que ser un entero positivo; lo deja convertido a número
export function validarId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Identificador inválido.' });
  req.params.id = id;
  next();
}
