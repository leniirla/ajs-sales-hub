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

async function main() {
  await ensureSeeded();

  const app = express();
  // CSP disabled: the SPA is served as a static build and hasn't been audited
  // against a strict policy yet. Other headers (X-Frame-Options, X-Content-Type-Options,
  // etc.) still apply.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
  app.use(express.json({ limit: '20mb' }));

  app.use('/api/auth', authRouter);
  app.use('/api/users', requireAuth, usersRouter);
  app.use('/api/customers', requireAuth, customersRouter);
  app.use('/api/products', requireAuth, productsRouter);
  app.use('/api/salesmen', requireAuth, salesmenRouter);
  app.use('/api/invoices', requireAuth, invoicesRouter);
  app.use('/api/surat-jalans', requireAuth, suratJalansRouter);
  app.use('/api/returns', requireAuth, returnsRouter);
  app.use('/api/settings', requireAuth, settingsRouter);
  app.use('/api/activity-logs', requireAuth, activityLogsRouter);
  app.use('/api/commissions', requireAuth, commissionsRouter);
  app.use('/api/import-legacy', requireAuth, requireSuperAdmin, importLegacyRouter);

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

  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => {
    console.log(`API server ready on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('Gagal menjalankan server:', err);
  process.exit(1);
});
