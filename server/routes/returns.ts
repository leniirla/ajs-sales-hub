import { Router } from 'express';
import { prisma } from '../db';
import { toJson, fromJson } from '../jsonFields';
import { requirePermission } from '../auth';
import { validateBody, returnSchema } from '../validation';
import { deleteOrError } from '../prismaErrors';
import { asyncHandler } from '../asyncHandler';

export const returnsRouter = Router();

const serialize = (r: any) => ({
  id: r.id,
  returnNumber: r.returnNumber,
  date: r.date,
  invoiceId: r.invoiceId,
  invoiceNumber: r.invoiceNumber,
  customerId: r.customerId,
  customerName: r.customerName,
  items: fromJson(r.itemsJson, []),
  totalRefundAmount: r.totalRefundAmount,
  refundType: r.refundType,
  notes: r.notes ?? undefined,
  status: r.status,
});

// Refund nominals must never be trusted from the client: recompute each item's
// refund value and the overall total server-side from returnedQuantity * unitRefundPrice,
// same formula the UI uses, instead of persisting whatever totals the client sent.
const withRecomputedTotals = (body: any) => {
  const items = (body.items || []).map((it: any) => ({
    ...it,
    totalRefundValue: it.returnedQuantity * it.unitRefundPrice,
  }));
  const totalRefundAmount = items.reduce((sum: number, it: any) => sum + it.totalRefundValue, 0);
  return { ...body, items, totalRefundAmount };
};

const toData = (body: any) => ({
  returnNumber: body.returnNumber,
  date: body.date,
  invoiceId: body.invoiceId,
  invoiceNumber: body.invoiceNumber,
  customerId: body.customerId,
  customerName: body.customerName,
  itemsJson: toJson(body.items)!,
  totalRefundAmount: body.totalRefundAmount,
  refundType: body.refundType,
  notes: body.notes ?? null,
  status: body.status,
});

returnsRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.productReturn.findMany();
  res.json(rows.map(serialize));
}));

returnsRouter.post('/', requirePermission('canProcessReturn'), validateBody(returnSchema), asyncHandler(async (req, res) => {
  const row = await prisma.productReturn.create({ data: toData(withRecomputedTotals(req.body)) });
  res.status(201).json(serialize(row));
}));

returnsRouter.put('/:id', requirePermission('canProcessReturn'), validateBody(returnSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.productReturn.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Retur tidak ditemukan (mungkin sudah terhapus).' });
    return;
  }
  const row = await prisma.productReturn.update({ where: { id: req.params.id }, data: toData(withRecomputedTotals(req.body)) });
  res.json(serialize(row));
}));

returnsRouter.delete('/:id', requirePermission('canProcessReturn'), asyncHandler(async (req, res) => {
  await deleteOrError(
    res,
    () => prisma.productReturn.delete({ where: { id: req.params.id } }),
    'Retur tidak ditemukan (mungkin sudah terhapus sebelumnya).'
  );
}));
