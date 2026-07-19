import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI commands (migrate/generate/studio) need a direct, non-pooled
    // connection: `migrate` acquires a session-scoped Postgres advisory lock,
    // which is unreliable through a PgBouncer transaction-pooled endpoint
    // (e.g. Neon's "-pooler" host) and can time out with error P1002.
    // The running app itself still connects via the pooled DATABASE_URL
    // through the driver adapter in server/db.ts — this only affects CLI use.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
