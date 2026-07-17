import path from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';

const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/^file:/, '')
  : path.resolve(process.cwd(), 'prisma', 'dev.db');

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath)}`,
});

export const prisma = new PrismaClient({ adapter });
