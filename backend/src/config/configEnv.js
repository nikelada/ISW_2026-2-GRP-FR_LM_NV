import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
dotenv.config({ path: path.resolve(currentDirectory, '../../.env') });

dotenv.config();

// DATABASE_URL la lee Prisma directamente (ver prisma/schema.prisma).
export const PORT = Number(process.env.PORT || 3000);
export const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-development';
