import { prisma } from './prisma.js';
import { hashPassword } from '../services/auth.service.js';

const initialUsers = [
  { name: 'Ignacio Perez', email: 'admin@nes.cl', password: 'admin2026', role: 'admin' },
  { name: 'Martina Fuentealba', email: 'manager@nes.cl', password: 'manager2026', role: 'manager' },
  { name: 'Leonardo Araya', email: 'usuario@nes.cl', password: 'usuario2026', role: 'usuario' }
];

export async function seedInitialUsers() {
  for (const initialUser of initialUsers) {
    const exists = await prisma.user.findUnique({ where: { email: initialUser.email } });
    if (!exists) {
      await prisma.user.create({
        data: { ...initialUser, password: await hashPassword(initialUser.password) }
      });
    }
  }
}
