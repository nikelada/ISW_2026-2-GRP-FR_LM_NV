import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { JWT_SECRET } from '../config/configEnv.js';

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '5h' }
  );
}

export async function loginUser(email, password) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await comparePassword(password, user.password))) {
    throw httpError(401, 'Email o contraseña incorrectos.');
  }

  return { token: createToken(user), user: publicUser(user) };
}

export async function registerUser({ name, email, password, role = 'usuario' }) {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) throw httpError(409, 'El email ya está registrado.');

  const savedUser = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: await hashPassword(password),
      role
    }
  });
  return { token: createToken(savedUser), user: publicUser(savedUser) };
}

export async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}
