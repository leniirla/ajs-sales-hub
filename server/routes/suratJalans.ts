import { Router } from 'express';
import { prisma } from '../db';
import { fromJson } from '../jsonFields';
import { requirePermission } from '../auth';
import { validateBody, suratJalanUpdateSchema } from '../validation';
import { asyncHandler } from '../asyncHandler';

export const suratJalansRouter = Router();

const serialize = (sj: any) => ({
  id: sj.id,
  suratJalanNumber: sj.suratJalanNumber,
  invoiceId: sj.invoiceId,
  invoiceNumber: sj.invoiceNumber,
  date: sj.date,
  customerId: sj.customerId,
  customerName: sj.customerName,
  customerPhone: sj.customerPhone ?? undefined,
  customerAddress: sj.customerAddress ?? undefined,
  items: fromJson(sj.itemsJson, []),
  koliCount: sj.koliCount,
  driverName: sj.driverName ?? undefined,
  vehicleNumber: sj.vehicleNumber ?? undefined,
  status: sj.status,
  notes: sj.notes ?? undefined,
});

suratJalansRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.suratJalan.findMany();
  res.json(rows.map(serialize));
}));

suratJalansRouter.put('/:id', requirePermission('canManageSuratJalan'), validateBody(suratJalanUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.suratJalan.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Surat jalan tidak ditemukan (mungkin sudah terhapus).' });
    return;
  }
  const { driverName, vehicleNumber, status, notes } = req.body;
  const row = await prisma.suratJalan.update({
    where: { id: req.params.id },
    data: { driverName, vehicleNumber, status, notes },
  });
  res.json(serialize(row));
}));
