import { prisma } from './db';
import { fromJson } from './jsonFields';
import { calculateFullInvoice, DEFAULT_SETTINGS } from '../src/utils';
import type { Customer, Product, SystemSettings, Invoice, InvoiceItem } from '../src/types';

/**
 * Financial totals (item pricing, subtotal, packing fee, PPN, grand total) must
 * never be trusted from the client — the client only supplies which products/
 * sizes/quantities were ordered. This recomputes the authoritative numbers
 * server-side from the customer's real pricing rules, exactly like the UI does,
 * so a client can't submit a faktur with mismatched/deflated totals.
 */

const deserializeCustomer = (c: any): Customer => ({
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

const deserializeProduct = (p: any): Product => ({
  id: p.id,
  name: p.name,
  defaultPrice: p.defaultPrice,
  priceTier2: p.priceTier2 ?? undefined,
  priceTier3: p.priceTier3 ?? undefined,
  customSurchargeLimit: p.customSurchargeLimit ?? undefined,
  customSurchargeAmount: p.customSurchargeAmount ?? undefined,
  customSurcharges: fromJson(p.customSurchargesJson, undefined),
});

const deserializeSettings = (s: any): SystemSettings => ({
  minQtyTier2: s.minQtyTier2,
  discountTier2: s.discountTier2,
  minQtyTier3: s.minQtyTier3,
  discountTier3: s.discountTier3,
  sizeSurchargeLimit: s.sizeSurchargeLimit,
  sizeSurchargeAmount: s.sizeSurchargeAmount,
  packingFeePerKoli: s.packingFeePerKoli,
  ppnPercentage: s.ppnPercentage,
  enablePpn: s.enablePpn,
  warehouseTerms: fromJson(s.warehouseTermsJson, [] as string[]),
  deliveryTerms: fromJson(s.deliveryTermsJson, [] as string[]),
  companyName: s.companyName ?? undefined,
  companyAddress: s.companyAddress ?? undefined,
  companyPhone: s.companyPhone ?? undefined,
  companyLogoUrl: s.companyLogoUrl ?? undefined,
});

export async function recomputeInvoiceTotals(
  body: any
): Promise<{ ok: true; data: Invoice } | { ok: false; error: string }> {
  const customerRow = await prisma.customer.findUnique({ where: { id: body.customerId } });
  if (!customerRow) {
    return { ok: false, error: 'Pelanggan tidak ditemukan.' };
  }
  const customer = deserializeCustomer(customerRow);

  const productRows = await prisma.product.findMany();
  const products = productRows.map(deserializeProduct);

  const settingsRow = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  const settings = settingsRow ? deserializeSettings(settingsRow) : DEFAULT_SETTINGS;

  const draftItems: Omit<InvoiceItem, 'negotiatedBasePrice' | 'unitPrice' | 'totalPrice' | 'sizeSurcharge'>[] = (
    body.items || []
  ).map((it: any) => ({
    id: it.id,
    productName: it.productName,
    size: it.size,
    quantity: it.quantity,
    basePrice: it.basePrice,
  }));

  const draft: Omit<Invoice, 'items' | 'totalPairs' | 'subtotal' | 'packingFee' | 'totalAmount'> = {
    id: body.id,
    invoiceNumber: body.invoiceNumber,
    date: body.date,
    customerId: customer.id,
    customerName: customer.name,
    customerType: customer.type,
    hasFlatPriceSizeLarge: customer.hasFlatPriceSizeLarge,
    wantsPacking: body.wantsPacking,
    koliCount: body.wantsPacking ? body.koliCount : 0,
    dpAmount: body.dpAmount || 0,
    hasOngkir: body.hasOngkir,
    ongkirAmount: body.hasOngkir ? body.ongkirAmount : 0,
    paymentProofUrl: body.paymentProofUrl,
    paymentProofUrls: body.paymentProofUrls,
    payments: body.payments,
    notes: body.notes,
    status: body.status,
    salesmanId: body.salesmanId,
    salesmanName: body.salesmanName,
    commissionPerPair: body.commissionPerPair,
    commissionStatus: body.commissionStatus,
  };

  const computed = calculateFullInvoice(draft, draftItems, customer, products, settings);

  // Sisa tagihan harus konsisten dengan status + cicilan yang tercatat, bukan
  // dipercaya mentah dari client (menutup celah "faktur diklaim Lunas tapi
  // sisa tagihan masih ada" dari sisi server juga).
  const totalPaidFromPayments = (computed.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = computed.status === 'paid' ? computed.totalAmount : (computed.dpAmount || 0) + totalPaidFromPayments;
  computed.remainingBalance = computed.status === 'paid' ? 0 : Math.max(0, computed.totalAmount - totalPaid);

  return { ok: true, data: computed };
}
