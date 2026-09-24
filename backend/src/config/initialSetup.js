import User from '../entities/user.entity.js';
import { AppDataSource } from './configDb.js';
import { hashPassword } from '../helpers/password.helper.js';

const initialUsers = [
  { name: 'Ignacio Perez', email: 'admin@lumina.app', password: 'admin2026', role: 'admin' },
  { name: 'Martina Fuentealba', email: 'manager@lumina.app', password: 'manager2026', role: 'manager' },
  { name: 'Leonardo Araya', email: 'usuario@lumina.app', password: 'usuario2026', role: 'usuario' }
];

export async function seedInitialUsers() {
  const repository = AppDataSource.getRepository(User);
  await repository.update({ role: 'admin' }, { role: 'admin' });
  await repository.update({ role: 'manager' }, { role: 'manager' });
  await repository.update({ role: 'usuario' }, { role: 'usuario' });

  for (const initialUser of initialUsers) {
    const exists = await repository.findOneBy({ email: initialUser.email });
    if (!exists) {
      await repository.save(repository.create({
        ...initialUser,
        password: await hashPassword(initialUser.password)
      }));
    }
  }
}
