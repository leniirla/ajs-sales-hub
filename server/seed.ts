import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { syncSuratJalanForInvoice } from './suratJalanSync';
import {
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_SALESMEN,
  DEFAULT_SETTINGS,
  PRODUCT_PRESETS,
} from '../src/utils';

export async function ensureSeeded(): Promise<void> {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const passwordHash = await bcrypt.hash('admin', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash,
        name: 'Super Admin Utama',
        role: 'super_admin',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      },
    });
  }

  const settingsCount = await prisma.systemSettings.count();
  if (settingsCount === 0) {
    await prisma.systemSettings.create({
      data: {
        id: 1,
        minQtyTier2: DEFAULT_SETTINGS.minQtyTier2,
        discountTier2: DEFAULT_SETTINGS.discountTier2,
        minQtyTier3: DEFAULT_SETTINGS.minQtyTier3,
        discountTier3: DEFAULT_SETTINGS.discountTier3,
        sizeSurchargeLimit: DEFAULT_SETTINGS.sizeSurchargeLimit,
        sizeSurchargeAmount: DEFAULT_SETTINGS.sizeSurchargeAmount,
        packingFeePerKoli: DEFAULT_SETTINGS.packingFeePerKoli,
        ppnPercentage: DEFAULT_SETTINGS.ppnPercentage,
        enablePpn: DEFAULT_SETTINGS.enablePpn,
        warehouseTermsJson: JSON.stringify(DEFAULT_SETTINGS.warehouseTerms ?? []),
        deliveryTermsJson: JSON.stringify(DEFAULT_SETTINGS.deliveryTerms ?? []),
        companyName: DEFAULT_SETTINGS.companyName,
        companyAddress: DEFAULT_SETTINGS.companyAddress,
        companyPhone: DEFAULT_SETTINGS.companyPhone,
        companyLogoUrl: DEFAULT_SETTINGS.companyLogoUrl,
      },
    });
  }

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({
      data: PRODUCT_PRESETS.map((p) => ({
        name: p.name,
        defaultPrice: p.defaultPrice,
      })),
    });
  }

  const customerCount = await prisma.customer.count();
  if (customerCount === 0) {
    await prisma.customer.createMany({
      data: INITIAL_CUSTOMERS.map((c) => ({
        name: c.name,
        type: c.type,
        hasFlatPriceSizeLarge: c.hasFlatPriceSizeLarge,
        enableVolumeDiscount: c.enableVolumeDiscount ?? null,
        volumeMode: c.volumeMode ?? null,
        customBasePrice: c.customBasePrice,
        phone: c.phone,
        address: c.address,
        commissionRate: c.commissionRate,
      })),
    });
  }

  const salesmanCount = await prisma.salesman.count();
  if (salesmanCount === 0) {
    await prisma.salesman.createMany({
      data: INITIAL_SALESMEN.map((s) => ({
        name: s.name,
        phone: s.phone,
        commissionPerPair: s.commissionPerPair,
      })),
    });
  }

  const invoiceCount = await prisma.invoice.count();
  if (invoiceCount === 0) {
    const seededCustomers = await prisma.customer.findMany();
    for (const inv of INITIAL_INVOICES) {
      const matchedCustomer = seededCustomers.find((c) => c.name === inv.customerName);
      const created = await prisma.invoice.create({
        data: {
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customerId: matchedCustomer?.id ?? inv.customerId,
          customerName: inv.customerName,
          customerType: inv.customerType,
          customerPhone: inv.customerPhone,
          customerAddress: inv.customerAddress,
          hasFlatPriceSizeLarge: inv.hasFlatPriceSizeLarge,
          itemsJson: JSON.stringify(inv.items),
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
          notes: inv.notes,
          status: inv.status,
        },
      });
      await syncSuratJalanForInvoice(created);

      // Seed one sample return against the 3rd demo invoice, mirroring the
      // original client-side ReturnManager demo seed.
      if (inv.invoiceNumber === 'INV/20260610/03') {
        const sampleItem = inv.items[0];
        const refundValue = 10 * sampleItem.unitPrice;
        await prisma.productReturn.create({
          data: {
            returnNumber: 'RET/20260615/01',
            date: '2026-06-15',
            invoiceId: created.id,
            invoiceNumber: created.invoiceNumber,
            customerId: created.customerId,
            customerName: created.customerName,
            itemsJson: JSON.stringify([
              {
                id: 'retitem-1',
                productName: sampleItem.productName,
                size: sampleItem.size,
                returnedQuantity: 10,
                originalQuantity: sampleItem.quantity,
                unitRefundPrice: sampleItem.unitPrice,
                reason: 'rusak_defect',
                totalRefundValue: refundValue,
              },
            ]),
            totalRefundAmount: refundValue,
            refundType: 'potong_tagihan',
            notes:
              'Daftar retur: 10 pasang jahitan sol luar retak. Dikurangkan langsung dari pinjaman faktur #03.',
            status: 'completed',
          },
        });
        await prisma.invoice.update({
          where: { id: created.id },
          data: { remainingBalance: created.totalAmount - refundValue },
        });
      }
    }
  }
}
