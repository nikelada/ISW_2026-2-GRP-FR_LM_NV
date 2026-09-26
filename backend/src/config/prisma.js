import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function connectDB() {
  await prisma.$connect();
  console.log('Conexión exitosa a PostgreSQL');
}
