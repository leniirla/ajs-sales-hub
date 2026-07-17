import { Router } from 'express';
import { prisma } from '../db';
import { toJson, fromJson } from '../jsonFields';
import { requirePermission } from '../auth';
import { validateBody, productSchema } from '../validation';
import { deleteOrError } from '../prismaErrors';
import { asyncHandler } from '../asyncHandler';

export const productsRouter = Router();

const serialize = (p: any) => ({
  id: p.id,
  name: p.name,
  defaultPrice: p.defaultPrice,
  priceTier2: p.priceTier2 ?? undefined,
  priceTier3: p.priceTier3 ?? undefined,
  customSurchargeLimit: p.customSurchargeLimit ?? undefined,
  customSurchargeAmount: p.customSurchargeAmount ?? undefined,
  customSurcharges: fromJson(p.customSurchargesJson, undefined),
});

const toData = (body: any) => ({
  name: body.name,
  defaultPrice: body.defaultPrice,
  priceTier2: body.priceTier2 ?? null,
  priceTier3: body.priceTier3 ?? null,
  customSurchargeLimit: body.customSurchargeLimit ?? null,
  customSurchargeAmount: body.customSurchargeAmount ?? null,
  customSurchargesJson: toJson(body.customSurcharges),
});

productsRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.product.findMany();
  res.json(rows.map(serialize));
}));

productsRouter.post('/', requirePermission('canManageMasterData'), validateBody(productSchema), asyncHandler(async (req, res) => {
  const row = await prisma.product.create({ data: toData(req.body) });
  res.status(201).json(serialize(row));
}));

productsRouter.put('/:id', requirePermission('canManageMasterData'), validateBody(productSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Produk tidak ditemukan (mungkin sudah terhapus).' });
    return;
  }
  const row = await prisma.product.update({ where: { id: req.params.id }, data: toData(req.body) });
  res.json(serialize(row));
}));

productsRouter.delete('/:id', requirePermission('canManageMasterData'), asyncHandler(async (req, res) => {
  await deleteOrError(
    res,
    () => prisma.product.delete({ where: { id: req.params.id } }),
    'Produk tidak ditemukan (mungkin sudah terhapus sebelumnya).',
    'Produk tidak dapat dihapus karena masih dipakai di faktur terkait.'
  );
}));
