import { EntitySchema } from 'typeorm';

export const User = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: { primary: true, type: 'int', generated: 'increment' },
    name: { type: 'varchar', length: 150 },
    email: { type: 'varchar', length: 255, unique: true },
    password: { type: 'varchar', length: 255 },
    role: { type: 'varchar', length: 30, default: 'usuario' },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true }
  }
});

export default User;
