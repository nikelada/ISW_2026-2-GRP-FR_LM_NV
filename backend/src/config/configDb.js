import { DataSource } from 'typeorm';
import User from '../entities/user.entity.js';
import { DATABASE, DB_HOST, DB_PASSWORD, DB_PORT, DB_USERNAME } from './configEnv.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DATABASE,
  entities: [User],
  synchronize: true,
  logging: false
});

export async function connectDB() {
  await AppDataSource.initialize();
  console.log('Conexión exitosa a PostgreSQL');
}
