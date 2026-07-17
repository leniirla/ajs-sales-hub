import { Router } from 'express';
import { prisma } from '../db';
import { toJson, fromJson } from '../jsonFields';
import { requirePermission } from '../auth';
import { validateBody, customerSchema } from '../validation';
import { deleteOrError } from '../prismaErrors';
import { asyncHandler } from '../asyncHandler';

export const customersRouter = Router();

const serialize = (c: any) => ({
  id: c.id,
  name: c.name,
  type: c.type,
  hasFlatPriceSizeLarge: c.hasFlatPriceSizeLarge,
  enableVolumeDiscount: c.enableVolumeDiscount ?? undefined,
  volumeMode: c.volumeMode ?? undefined,
  customBasePrice: c.customBasePrice,
  customPrices: fromJson(c.customPricesJson, undefined),
  customTier2Prices: fromJson(c.customTier2PricesJson, undefined),
  customTier3Prices: fromJson(c.customTier3PricesJson, undefined),
  customTier2MinQty: fromJson(c.customTier2MinQtyJson, undefined),
  customTier3MinQty: fromJson(c.customTier3MinQtyJson, undefined),
  customSizeSurcharges: fromJson(c.customSizeSurchargesJson, undefined),
  phone: c.phone ?? undefined,
  address: c.address ?? undefined,
  commissionRate: c.commissionRate ?? undefined,
});

const toData = (body: any) => ({
  name: body.name,
  type: body.type,
  hasFlatPriceSizeLarge: body.hasFlatPriceSizeLarge,
  enableVolumeDiscount: body.enableVolumeDiscount ?? null,
  volumeMode: body.volumeMode ?? null,
  customBasePrice: body.customBasePrice,
  customPricesJson: toJson(body.customPrices),
  customTier2PricesJson: toJson(body.customTier2Prices),
  customTier3PricesJson: toJson(body.customTier3Prices),
  customTier2MinQtyJson: toJson(body.customTier2MinQty),
  customTier3MinQtyJson: toJson(body.customTier3MinQty),
  customSizeSurchargesJson: toJson(body.customSizeSurcharges),
  phone: body.phone ?? null,
  address: body.address ?? null,
  commissionRate: body.commissionRate ?? null,
});

customersRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.customer.findMany();
  res.json(rows.map(serialize));
}));

customersRouter.post('/', requirePermission('canManageMasterData'), validateBody(customerSchema), asyncHandler(async (req, res) => {
  const row = await prisma.customer.create({ data: toData(req.body) });
  res.status(201).json(serialize(row));
}));

customersRouter.put('/:id', requirePermission('canManageMasterData'), validateBody(customerSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Pelanggan tidak ditemukan (mungkin sudah terhapus).' });
    return;
  }
  const row = await prisma.customer.update({ where: { id: req.params.id }, data: toData(req.body) });
  res.json(serialize(row));
}));

customersRouter.delete('/:id', requirePermission('canManageMasterData'), asyncHandler(async (req, res) => {
  await deleteOrError(
    res,
    () => prisma.customer.delete({ where: { id: req.params.id } }),
    'Pelanggan tidak ditemukan (mungkin sudah terhapus sebelumnya).',
    'Pelanggan tidak dapat dihapus karena masih memiliki faktur terkait.'
  );
}));
