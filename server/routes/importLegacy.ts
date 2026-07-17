import { Router } from 'express';
import { prisma } from '../db';
import { hashPassword } from '../auth';
import { toJson } from '../jsonFields';
import { syncSuratJalanForInvoice } from '../suratJalanSync';
import { validateBody, legacyImportSchema } from '../validation';
import { asyncHandler } from '../asyncHandler';

export const importLegacyRouter = Router();

/**
 * One-time import of a browser's `invoice_db_*` localStorage snapshot into
 * the database, preserving original ids so cross-entity references
 * (customerId, salesmanId, invoiceId, ...) stay intact.
 */
importLegacyRouter.post('/', validateBody(legacyImportSchema), asyncHandler(async (req, res) => {
  const body = req.body || {};
  const {
    customers = [],
    products = [],
    salesmen = [],
    invoices = [],
    suratJalans = [],
    returns = [],
    settings,
    users = [],
    activityLogs = [],
    monthlyPayments = {},
    monthlyRates = {},
  } = body;

  await prisma.$transaction(async (tx) => {
    for (const c of customers) {
      await tx.customer.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          name: c.name,
          type: c.type,
          hasFlatPriceSizeLarge: c.hasFlatPriceSizeLarge,
          enableVolumeDiscount: c.enableVolumeDiscount ?? null,
          volumeMode: c.volumeMode ?? null,
          customBasePrice: c.customBasePrice,
          customPricesJson: toJson(c.customPrices),
          customTier2PricesJson: toJson(c.customTier2Prices),
          customTier3PricesJson: toJson(c.customTier3Prices),
          customTier2MinQtyJson: toJson(c.customTier2MinQty),
          customTier3MinQtyJson: toJson(c.customTier3MinQty),
          customSizeSurchargesJson: toJson(c.customSizeSurcharges),
          phone: c.phone ?? null,
          address: c.address ?? null,
          commissionRate: c.commissionRate ?? null,
        },
        update: {},
      });
    }

    for (const p of products) {
      await tx.product.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          name: p.name,
          defaultPrice: p.defaultPrice,
          priceTier2: p.priceTier2 ?? null,
          priceTier3: p.priceTier3 ?? null,
          customSurchargeLimit: p.customSurchargeLimit ?? null,
          customSurchargeAmount: p.customSurchargeAmount ?? null,
          customSurchargesJson: toJson(p.customSurcharges),
        },
        update: {},
      });
    }

    for (const s of salesmen) {
      await tx.salesman.upsert({
        where: { id: s.id },
        create: { id: s.id, name: s.name, phone: s.phone ?? null, commissionPerPair: s.commissionPerPair },
        update: {},
      });
    }

    if (settings) {
      await tx.systemSettings.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          minQtyTier2: settings.minQtyTier2,
          discountTier2: settings.discountTier2,
          minQtyTier3: settings.minQtyTier3,
          discountTier3: settings.discountTier3,
          sizeSurchargeLimit: settings.sizeSurchargeLimit,
          sizeSurchargeAmount: settings.sizeSurchargeAmount,
          packingFeePerKoli: settings.packingFeePerKoli,
          ppnPercentage: settings.ppnPercentage,
          enablePpn: settings.enablePpn,
          warehouseTermsJson: toJson(settings.warehouseTerms),
          deliveryTermsJson: toJson(settings.deliveryTerms),
          companyName: settings.companyName ?? null,
          companyAddress: settings.companyAddress ?? null,
          companyPhone: settings.companyPhone ?? null,
          companyLogoUrl: settings.companyLogoUrl ?? null,
        },
        update: {},
      });
    }

    for (const u of users) {
      const existing = await tx.user.findUnique({ where: { username: u.username.toLowerCase() } });
      if (existing) continue;
      const passwordHash = await hashPassword(u.password || 'ganti-password-ini');
      await tx.user.create({
        data: {
          username: u.username.toLowerCase(),
          passwordHash,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
          allowedTabsJson: toJson(u.allowedTabs),
          permissionsJson: toJson(u.permissions),
        },
      });
    }

    for (const inv of invoices) {
      await tx.invoice.upsert({
        where: { id: inv.id },
        create: {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customerId: inv.customerId,
          customerName: inv.customerName,
          customerType: inv.customerType,
          customerPhone: inv.customerPhone ?? null,
          customerAddress: inv.customerAddress ?? null,
          hasFlatPriceSizeLarge: inv.hasFlatPriceSizeLarge,
          itemsJson: toJson(inv.items)!,
          wantsPacking: inv.wantsPacking,
          koliCount: inv.koliCount,
          packingFee: inv.packingFee,
          hasOngkir: inv.hasOngkir ?? null,
          ongkirAmount: inv.ongkirAmount ?? null,
          totalPairs: inv.totalPairs,
          subtotal: inv.subtotal,
          taxRate: inv.taxRate ?? null,
          ppnAmount: inv.ppnAmount ?? null,
          totalAmount: inv.totalAmount,
          dpAmount: inv.dpAmount ?? null,
          remainingBalance: inv.remainingBalance ?? null,
          notes: inv.notes ?? null,
          status: inv.status,
          salesmanId: inv.salesmanId ?? null,
          salesmanName: inv.salesmanName ?? null,
          commissionPerPair: inv.commissionPerPair ?? null,
          commissionStatus: inv.commissionStatus ?? null,
          paymentProofUrl: inv.paymentProofUrl ?? null,
          paymentProofUrlsJson: toJson(inv.paymentProofUrls),
          paymentsJson: toJson(inv.payments),
        },
        update: {},
      });
    }

    for (const sj of suratJalans) {
      await tx.suratJalan.upsert({
        where: { id: sj.id },
        create: {
          id: sj.id,
          suratJalanNumber: sj.suratJalanNumber,
          invoiceId: sj.invoiceId,
          invoiceNumber: sj.invoiceNumber,
          date: sj.date,
          customerId: sj.customerId,
          customerName: sj.customerName,
          customerPhone: sj.customerPhone ?? null,
          customerAddress: sj.customerAddress ?? null,
          itemsJson: toJson(sj.items)!,
          koliCount: sj.koliCount,
          driverName: sj.driverName ?? null,
          vehicleNumber: sj.vehicleNumber ?? null,
          status: sj.status,
          notes: sj.notes ?? null,
        },
        update: {},
      });
    }

    for (const r of returns) {
      await tx.productReturn.upsert({
        where: { id: r.id },
        create: {
          id: r.id,
          returnNumber: r.returnNumber,
          date: r.date,
          invoiceId: r.invoiceId,
          invoiceNumber: r.invoiceNumber,
          customerId: r.customerId,
          customerName: r.customerName,
          itemsJson: toJson(r.items)!,
          totalRefundAmount: r.totalRefundAmount,
          refundType: r.refundType,
          notes: r.notes ?? null,
          status: r.status,
        },
        update: {},
      });
    }

    for (const log of activityLogs) {
      await tx.activityLog.upsert({
        where: { id: log.id },
        create: {
          id: log.id,
          timestamp: log.timestamp,
          actionType: log.actionType,
          category: log.category,
          description: log.description,
          details: log.details ?? null,
          username: log.username ?? null,
        },
        update: {},
      });
    }

    for (const [key, value] of Object.entries(monthlyRates)) {
      await tx.commissionMonthlyRate.upsert({
        where: { key },
        create: { key, value: value as number },
        update: {},
      });
    }

    for (const [key, value] of Object.entries(monthlyPayments)) {
      await tx.commissionMonthlyPayment.upsert({
        where: { key },
        create: { key, value: value as string },
        update: {},
      });
    }
  });

  // Ensure every imported invoice has a matching Surat Jalan (derived, not stored client-side).
  const allInvoices = await prisma.invoice.findMany();
  for (const inv of allInvoices) {
    await syncSuratJalanForInvoice(inv);
  }

  res.json({ ok: true });
}));
