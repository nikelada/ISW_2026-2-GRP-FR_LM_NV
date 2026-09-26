import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/configEnv.js';
import { findUserById, publicUser } from '../services/auth.service.js';

export async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Token de autenticación requerido.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ message: 'El usuario ya no existe.' });
    req.user = publicUser(user);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}
