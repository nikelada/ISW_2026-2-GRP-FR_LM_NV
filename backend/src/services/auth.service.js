import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/configDb.js';
import { JWT_SECRET } from '../config/configEnv.js';
import User from '../entities/user.entity.js';
import { comparePassword, hashPassword } from '../helpers/password.helper.js';

const userRepository = () => AppDataSource.getRepository(User);

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
  const user = await userRepository().findOneBy({ email: email.toLowerCase() });
  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error('Email o contraseña incorrectos.');
  }

  return { token: createToken(user), user: publicUser(user) };
}

export async function registerUser({ name, email, password, role = 'usuario' }) {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await userRepository().findOneBy({ email: normalizedEmail });
  if (existingUser) throw new Error('El email ya está registrado.');

  const user = userRepository().create({
    name,
    email: normalizedEmail,
    password: await hashPassword(password),
    role
  });
  const savedUser = await userRepository().save(user);
  return { token: createToken(savedUser), user: publicUser(savedUser) };
}

export async function findUserById(id) {
  return userRepository().findOneBy({ id });
}
