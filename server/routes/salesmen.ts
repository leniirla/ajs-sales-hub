import { Router } from 'express';
import { prisma } from '../db';
import { requirePermission } from '../auth';
import { validateBody, salesmanSchema } from '../validation';
import { deleteOrError } from '../prismaErrors';
import { asyncHandler } from '../asyncHandler';

export const salesmenRouter = Router();

const serialize = (s: any) => ({
  id: s.id,
  name: s.name,
  phone: s.phone ?? undefined,
  commissionPerPair: s.commissionPerPair,
});

salesmenRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.salesman.findMany();
  res.json(rows.map(serialize));
}));

salesmenRouter.post('/', requirePermission('canManageSalesman'), validateBody(salesmanSchema), asyncHandler(async (req, res) => {
  const { name, phone, commissionPerPair } = req.body;
  const row = await prisma.salesman.create({ data: { name, phone: phone ?? null, commissionPerPair } });
  res.status(201).json(serialize(row));
}));

salesmenRouter.put('/:id', requirePermission('canManageSalesman'), validateBody(salesmanSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.salesman.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Salesman tidak ditemukan (mungkin sudah terhapus).' });
    return;
  }
  const { name, phone, commissionPerPair } = req.body;
  const row = await prisma.salesman.update({
    where: { id: req.params.id },
    data: { name, phone: phone ?? null, commissionPerPair },
  });

  if (name) {
    const invoices = await prisma.invoice.findMany({ where: { salesmanId: req.params.id } });
    for (const inv of invoices) {
      if (inv.salesmanName !== name) {
        await prisma.invoice.update({ where: { id: inv.id }, data: { salesmanName: name } });
      }
    }
  }

  res.json(serialize(row));
}));

salesmenRouter.delete('/:id', requirePermission('canManageSalesman'), asyncHandler(async (req, res) => {
  await deleteOrError(
    res,
    () => prisma.salesman.delete({ where: { id: req.params.id } }),
    'Salesman tidak ditemukan (mungkin sudah terhapus sebelumnya).',
    'Salesman tidak dapat dihapus karena masih terkait dengan faktur lain.'
  );
}));
