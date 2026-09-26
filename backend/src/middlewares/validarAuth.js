// Revisa la FORMA de los datos de autenticación antes de llegar al controlador.
export function validarLogin(req, res, next) {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
  req.body = { email, password };
  next();
}

export function validarRegistro(req, res, next) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  const role = String(req.body.role || 'usuario').trim();
  if (name.length < 2 || !email || password.length < 8) {
    return res.status(400).json({ message: 'Nombre, email y una contraseña de al menos 8 caracteres son requeridos.' });
  }
  if (!['admin', 'manager', 'usuario'].includes(role)) {
    return res.status(400).json({ message: 'Tipo de usuario inválido.' });
  }
  req.body = { name, email, password, role };
  next();
}
