import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { ensureSeeded } from './seed';
import { requireAuth, requireSuperAdmin } from './auth';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { customersRouter } from './routes/customers';
import { productsRouter } from './routes/products';
import { salesmenRouter } from './routes/salesmen';
import { invoicesRouter } from './routes/invoices';
import { suratJalansRouter } from './routes/suratJalans';
import { returnsRouter } from './routes/returns';
import { settingsRouter } from './routes/settings';
import { activityLogsRouter } from './routes/activityLogs';
import { commissionsRouter } from './routes/commissions';
import { importLegacyRouter } from './routes/importLegacy';

export const app = express();

// CSP disabled: the SPA is served as a static build and hasn't been audited
// against a strict policy yet. Other headers (X-Frame-Options, X-Content-Type-Options,
// etc.) still apply.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '20mb' }));

// On serverless platforms (Vercel) this module is re-evaluated on every cold
// start, so ensureSeeded's idempotent "create if missing" checks need to run
// at least once per warm instance before any route touches the database.
// Memoized so warm invocations after the first don't re-run it per request.
let seededOnce: Promise<void> | null = null;
app.use((_req, res, next) => {
  if (!seededOnce) {
    seededOnce = ensureSeeded().catch((err) => {
      seededOnce = null;
      throw err;
    });
  }
  seededOnce.then(() => next()).catch(next);
});

app.use('/api/auth', authRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/customers', requireAuth, customersRouter);
app.use('/api/products', requireAuth, productsRouter);
app.use('/api/salesmen', requireAuth, salesmenRouter);
app.use('/api/invoices', requireAuth, invoicesRouter);
app.use('/api/surat-jalans', requireAuth, suratJalansRouter);
app.use('/api/returns', requireAuth, returnsRouter);
// GET is intentionally public here (not requireAuth) — the login page and the
// app's pre-auth bootstrap need company branding (logo/name) before a session
// exists. The PUT route guards itself with requireAuth + requirePermission.
app.use('/api/settings', settingsRouter);
app.use('/api/activity-logs', requireAuth, activityLogsRouter);
app.use('/api/commissions', requireAuth, commissionsRouter);
app.use('/api/import-legacy', requireAuth, requireSuperAdmin, importLegacyRouter);

// Only relevant when this app is served by a traditional always-on Node
// process (e.g. `npm start` on Render/Railway/a VPS). On Vercel the frontend
// build is served directly by the platform's static hosting — requests never
// reach this Express app — so this block is simply inert there.
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Final safety net: every async route handler is wrapped with asyncHandler,
// which forwards rejected promises here via next(err) instead of letting
// them crash the whole process as an unhandled rejection (confirmed:
// PUT /api/invoices/:id with a non-existent id used to take the entire
// API down for every user).
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled route error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});
