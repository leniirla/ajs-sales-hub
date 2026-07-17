import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../db';
import { hashPassword } from '../auth';
import { toJson } from '../jsonFields';
import { syncSuratJalanForInvoice } from '../suratJalanSync';

const backupPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(process.cwd(), 'legacy-data-backup-2026-07-16.json');

async function main() {
  const raw = fs.readFileSync(backupPath, 'utf8');
  const body = JSON.parse(raw);
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

  console.log('Wiping existing database...');
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.suratJalan.deleteMany(),
    prisma.productReturn.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.commissionMonthlyRate.deleteMany(),
    prisma.commissionMonthlyPayment.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.product.deleteMany(),
    prisma.salesman.deleteMany(),
    prisma.systemSettings.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('Importing backup data...');
  // Default interactive-transaction timeout (5s) is tuned for local SQLite;
  // this script does hundreds of sequential inserts over the network to a
  // remote Postgres instance, which needs much more headroom.
  await prisma.$transaction(async (tx) => {
    for (const c of customers) {
      await tx.customer.create({
        data: {
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
      });
    }

    for (const p of products) {
      await tx.product.create({
        data: {
          id: p.id,
          name: p.name,
          defaultPrice: p.defaultPrice,
          priceTier2: p.priceTier2 ?? null,
          priceTier3: p.priceTier3 ?? null,
          customSurchargeLimit: p.customSurchargeLimit ?? null,
          customSurchargeAmount: p.customSurchargeAmount ?? null,
          customSurchargesJson: toJson(p.customSurcharges),
        },
      });
    }

    for (const s of salesmen) {
      await tx.salesman.create({
        data: { id: s.id, name: s.name, phone: s.phone ?? null, commissionPerPair: s.commissionPerPair },
      });
    }

    if (settings) {
      await tx.systemSettings.create({
        data: {
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
      });
    }

    for (const u of users) {
      const passwordHash = await hashPassword(u.password || 'ganti-password-ini');
      await tx.user.create({
        data: {
          id: u.id,
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
      await tx.invoice.create({
        data: {
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
      });
    }

    for (const sj of suratJalans) {
      await tx.suratJalan.create({
        data: {
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
      });
    }

    for (const r of returns) {
      await tx.productReturn.create({
        data: {
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
      });
    }

    for (const log of activityLogs) {
      await tx.activityLog.create({
        data: {
          id: log.id,
          timestamp: log.timestamp,
          actionType: log.actionType,
          category: log.category,
          description: log.description,
          details: log.details ?? null,
          username: log.username ?? null,
        },
      });
    }

    for (const [key, value] of Object.entries(monthlyRates)) {
      await tx.commissionMonthlyRate.create({ data: { key, value: value as number } });
    }

    for (const [key, value] of Object.entries(monthlyPayments)) {
      await tx.commissionMonthlyPayment.create({ data: { key, value: value as string } });
    }
  }, { timeout: 120_000 });

  console.log('Syncing surat jalan records...');
  const allInvoices = await prisma.invoice.findMany();
  for (const inv of allInvoices) {
    await syncSuratJalanForInvoice(inv);
  }

  console.log('Restore complete.');
}

main()
  .catch((err) => {
    console.error('Gagal me-restore backup:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
