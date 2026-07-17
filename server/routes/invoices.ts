import { Router } from 'express';
import { prisma } from '../db';
import { toJson, fromJson } from '../jsonFields';
import { syncSuratJalanForInvoice, deleteSuratJalanForInvoice } from '../suratJalanSync';
import { requirePermission } from '../auth';
import { validateBody, invoiceSchema, invoiceStatusSchema } from '../validation';
import { deleteOrError } from '../prismaErrors';
import { recomputeInvoiceTotals } from '../pricing';
import { asyncHandler } from '../asyncHandler';

export const invoicesRouter = Router();

const serialize = (inv: any) => ({
  id: inv.id,
  invoiceNumber: inv.invoiceNumber,
  date: inv.date,
  customerId: inv.customerId,
  customerName: inv.customerName,
  customerType: inv.customerType,
  customerPhone: inv.customerPhone ?? undefined,
  customerAddress: inv.customerAddress ?? undefined,
  hasFlatPriceSizeLarge: inv.hasFlatPriceSizeLarge,
  items: fromJson(inv.itemsJson, []),
  wantsPacking: inv.wantsPacking,
  koliCount: inv.koliCount,
  packingFee: inv.packingFee,
  hasOngkir: inv.hasOngkir ?? undefined,
  ongkirAmount: inv.ongkirAmount ?? undefined,
  totalPairs: inv.totalPairs,
  subtotal: inv.subtotal,
  taxRate: inv.taxRate ?? undefined,
  ppnAmount: inv.ppnAmount ?? undefined,
  totalAmount: inv.totalAmount,
  dpAmount: inv.dpAmount ?? undefined,
  remainingBalance: inv.remainingBalance ?? undefined,
  notes: inv.notes ?? undefined,
  status: inv.status,
  salesmanId: inv.salesmanId ?? undefined,
  salesmanName: inv.salesmanName ?? undefined,
  commissionPerPair: inv.commissionPerPair ?? undefined,
  commissionStatus: inv.commissionStatus ?? undefined,
  paymentProofUrl: inv.paymentProofUrl ?? undefined,
  paymentProofUrls: fromJson(inv.paymentProofUrlsJson, undefined),
  payments: fromJson(inv.paymentsJson, undefined),
});

const toData = (body: any) => ({
  invoiceNumber: body.invoiceNumber,
  date: body.date,
  customerId: body.customerId,
  customerName: body.customerName,
  customerType: body.customerType,
  customerPhone: body.customerPhone ?? null,
  customerAddress: body.customerAddress ?? null,
  hasFlatPriceSizeLarge: body.hasFlatPriceSizeLarge,
  itemsJson: toJson(body.items)!,
  wantsPacking: body.wantsPacking,
  koliCount: body.koliCount,
  packingFee: body.packingFee,
  hasOngkir: body.hasOngkir ?? null,
  ongkirAmount: body.ongkirAmount ?? null,
  totalPairs: body.totalPairs,
  subtotal: body.subtotal,
  taxRate: body.taxRate ?? null,
  ppnAmount: body.ppnAmount ?? null,
  totalAmount: body.totalAmount,
  dpAmount: body.dpAmount ?? null,
  remainingBalance: body.remainingBalance ?? null,
  notes: body.notes ?? null,
  status: body.status,
  salesmanId: body.salesmanId ?? null,
  salesmanName: body.salesmanName ?? null,
  commissionPerPair: body.commissionPerPair ?? null,
  commissionStatus: body.commissionStatus ?? null,
  paymentProofUrl: body.paymentProofUrl ?? null,
  paymentProofUrlsJson: toJson(body.paymentProofUrls),
  paymentsJson: toJson(body.payments),
});

invoicesRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(rows.map(serialize));
}));

invoicesRouter.post('/', requirePermission('canCreateInvoice'), validateBody(invoiceSchema), asyncHandler(async (req, res) => {
  const recomputed = await recomputeInvoiceTotals(req.body);
  if (recomputed.ok === false) {
    res.status(400).json({ error: recomputed.error });
    return;
  }
  const row = await prisma.invoice.create({ data: toData(recomputed.data) });
  await syncSuratJalanForInvoice(row);
  res.status(201).json(serialize(row));
}));

invoicesRouter.put('/:id', requirePermission('canEditInvoice'), validateBody(invoiceSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Faktur tidak ditemukan (mungkin sudah terhapus).' });
    return;
  }
  const recomputed = await recomputeInvoiceTotals(req.body);
  if (recomputed.ok === false) {
    res.status(400).json({ error: recomputed.error });
    return;
  }
  const row = await prisma.invoice.update({ where: { id: req.params.id }, data: toData(recomputed.data) });
  await syncSuratJalanForInvoice(row);
  res.json(serialize(row));
}));

invoicesRouter.patch('/:id/status', requirePermission('canPayInvoice'), validateBody(invoiceStatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body as { status: 'paid' | 'unpaid' };
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Faktur tidak ditemukan.' });
    return;
  }
  const existingPayments = fromJson<{ amount: number }[]>(existing.paymentsJson, []);
  const totalPaid = (existing.dpAmount || 0) + existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const row = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      status,
      remainingBalance: status === 'paid' ? 0 : Math.max(0, existing.totalAmount - totalPaid),
    },
  });
  res.json(serialize(row));
}));

invoicesRouter.delete('/:id', requirePermission('canDeleteInvoice'), asyncHandler(async (req, res) => {
  await deleteSuratJalanForInvoice(req.params.id);
  await deleteOrError(
    res,
    () => prisma.invoice.delete({ where: { id: req.params.id } }),
    'Faktur tidak ditemukan (mungkin sudah terhapus sebelumnya).'
  );
}));
