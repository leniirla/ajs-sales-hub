import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// DATABASE_URL should point at a pooled Postgres connection (e.g. Neon's
// "-pooler" host) when running on a serverless platform like Vercel, since
// each cold start opens a fresh connection.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
