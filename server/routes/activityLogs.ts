import { Router } from 'express';
import { prisma } from '../db';
import type { AuthedRequest } from '../auth';
import { requirePermission } from '../auth';
import { validateBody, activityLogSchema } from '../validation';
import { asyncHandler } from '../asyncHandler';

export const activityLogsRouter = Router();

const MAX_LOGS = 1000;

const serialize = (l: any) => ({
  id: l.id,
  timestamp: l.timestamp,
  actionType: l.actionType,
  category: l.category,
  description: l.description,
  details: l.details ?? undefined,
  username: l.username ?? undefined,
});

activityLogsRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.activityLog.findMany({ orderBy: { timestamp: 'desc' }, take: MAX_LOGS });
  res.json(rows.map(serialize));
}));

activityLogsRouter.post('/', validateBody(activityLogSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { actionType, category, description, details } = req.body;
  const created = await prisma.activityLog.create({
    data: {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actionType,
      category,
      description,
      details,
      // Identity always comes from the verified session, never from the request
      // body — otherwise any logged-in user could forge log entries under another
      // user's name (or hide their own actions).
      username: req.authUser?.username,
    },
  });

  const toKeep = await prisma.activityLog.findMany({
    orderBy: { timestamp: 'desc' },
    skip: MAX_LOGS,
    select: { id: true },
  });
  if (toKeep.length > 0) {
    await prisma.activityLog.deleteMany({ where: { id: { in: toKeep.map((r) => r.id) } } });
  }

  const rows = await prisma.activityLog.findMany({ orderBy: { timestamp: 'desc' }, take: MAX_LOGS });
  res.status(201).json(rows.map(serialize));
  void created;
}));

activityLogsRouter.delete('/', requirePermission('canClearLogs'), asyncHandler(async (_req, res) => {
  await prisma.activityLog.deleteMany({});
  res.json({ ok: true });
}));
