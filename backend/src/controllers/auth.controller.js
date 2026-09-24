import { loginUser, registerUser } from '../services/auth.service.js';

export async function login(req, res) {
  try {
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    return res.json(await loginUser(email, password));
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
}

export async function register(req, res) {
  try {
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
    return res.status(201).json(await registerUser({ name, email, password, role }));
  } catch (error) {
    return res.status(409).json({ message: error.message });
  }
}
