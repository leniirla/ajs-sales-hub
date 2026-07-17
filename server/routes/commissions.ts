import { Router } from 'express';
import { prisma } from '../db';
import { requirePermission } from '../auth';
import { validateBody, commissionRateSchema, commissionPaymentSchema } from '../validation';
import { asyncHandler } from '../asyncHandler';

export const commissionsRouter = Router();

commissionsRouter.get('/rates', asyncHandler(async (_req, res) => {
  const rows = await prisma.commissionMonthlyRate.findMany();
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });
  res.json(map);
}));

commissionsRouter.put('/rates/:key', requirePermission('canEditCommissionRate'), validateBody(commissionRateSchema), asyncHandler(async (req, res) => {
  const { value } = req.body;
  const row = await prisma.commissionMonthlyRate.upsert({
    where: { key: req.params.key },
    create: { key: req.params.key, value },
    update: { value },
  });
  res.json({ [row.key]: row.value });
}));

commissionsRouter.get('/payments', asyncHandler(async (_req, res) => {
  const rows = await prisma.commissionMonthlyPayment.findMany();
  const map: Record<string, string> = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });
  res.json(map);
}));

commissionsRouter.put('/payments/:key', requirePermission('canPayCommission'), validateBody(commissionPaymentSchema), asyncHandler(async (req, res) => {
  const { value } = req.body;
  const row = await prisma.commissionMonthlyPayment.upsert({
    where: { key: req.params.key },
    create: { key: req.params.key, value },
    update: { value },
  });
  res.json({ [row.key]: row.value });
}));
