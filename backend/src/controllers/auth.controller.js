import { loginUser, registerUser } from '../services/auth.service.js';

export async function login(req, res, next) {
  try {
    return res.json(await loginUser(req.body.email, req.body.password));
  } catch (error) {
    return next(error);
  }
}

export async function register(req, res, next) {
  try {
    return res.status(201).json(await registerUser(req.body));
  } catch (error) {
    return next(error);
  }
}

export function me(req, res) {
  return res.json({ user: req.user });
}
