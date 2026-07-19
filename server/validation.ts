import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

/** Validates req.body against `schema`; on success replaces req.body with the parsed (typed) data. */
export function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Data yang dikirim tidak valid.', details: result.error.flatten() });
      return;
    }
    req.body = result.data;
    next();
  };
}

const optionalString = z.string().optional();
const optionalNumber = z.number().optional();

export const customerSchema = z.object({
  name: z.string().min(1, 'Nama pelanggan wajib diisi.'),
  type: z.string().min(1),
  hasFlatPriceSizeLarge: z.boolean(),
  enableVolumeDiscount: z.boolean().optional(),
  volumeMode: optionalString,
  customBasePrice: z.number(),
  customPrices: z.any().optional(),
  customTier2Prices: z.any().optional(),
  customTier3Prices: z.any().optional(),
  customTier2MinQty: z.any().optional(),
  customTier3MinQty: z.any().optional(),
  customSizeSurcharges: z.any().optional(),
  phone: optionalString,
  address: optionalString,
  commissionRate: optionalNumber,
});

export const productSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi.'),
  defaultPrice: z.number(),
  priceTier2: optionalNumber,
  priceTier3: optionalNumber,
  customSurchargeLimit: optionalNumber,
  customSurchargeAmount: optionalNumber,
  customSurcharges: z.any().optional(),
});

export const salesmanSchema = z.object({
  name: z.string().min(1, 'Nama salesman wajib diisi.'),
  phone: optionalString,
  commissionPerPair: z.number(),
});

const invoiceItemSchema = z.object({
  id: z.string(),
  productName: z.string().min(1),
  size: z.number(),
  quantity: z.number(),
  basePrice: z.number(),
  sizeSurcharge: z.number(),
  negotiatedBasePrice: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
});

const invoicePaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  date: z.string(),
  note: optionalString,
  method: optionalString,
  type: z.enum(['installment', 'settlement']).optional(),
});

const paymentProofSchema = z.union([
  z.string(),
  z.object({
    url: z.string(),
    description: optionalString,
    createdAt: optionalString,
  }),
]);

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  date: z.string().min(1),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  customerType: z.string().min(1),
  customerPhone: optionalString,
  customerAddress: optionalString,
  hasFlatPriceSizeLarge: z.boolean(),
  items: z.array(invoiceItemSchema).min(1, 'Faktur harus memiliki minimal 1 item barang.'),
  wantsPacking: z.boolean(),
  koliCount: z.number(),
  packingFee: z.number(),
  hasOngkir: z.boolean().optional(),
  ongkirAmount: optionalNumber,
  totalPairs: z.number(),
  subtotal: z.number(),
  taxRate: optionalNumber,
  ppnAmount: optionalNumber,
  totalAmount: z.number(),
  dpAmount: optionalNumber,
  remainingBalance: optionalNumber,
  notes: optionalString,
  status: z.enum(['paid', 'unpaid']),
  salesmanId: optionalString,
  salesmanName: optionalString,
  commissionPerPair: optionalNumber,
  commissionStatus: z.enum(['paid', 'unpaid']).optional(),
  paymentProofUrl: optionalString,
  paymentProofUrls: z.array(paymentProofSchema).optional(),
  payments: z.array(invoicePaymentSchema).optional(),
});

export const invoiceStatusSchema = z.object({
  status: z.enum(['paid', 'unpaid']),
});

const returnItemSchema = z.object({
  id: z.string(),
  productName: z.string().min(1),
  size: z.number(),
  returnedQuantity: z.number(),
  originalQuantity: z.number(),
  unitRefundPrice: z.number(),
  reason: z.enum(['rusak_defect', 'salah_ukuran', 'salah_model', 'kelebihan_kirim', 'lainnya']),
  customReasonText: optionalString,
  totalRefundValue: z.number(),
});

export const returnSchema = z.object({
  returnNumber: z.string().min(1),
  date: z.string().min(1),
  invoiceId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  items: z.array(returnItemSchema).min(1, 'Retur harus memiliki minimal 1 item barang.'),
  totalRefundAmount: z.number(),
  refundType: z.enum(['potong_tagihan', 'tunai_kredit']),
  notes: optionalString,
  status: z.enum(['completed', 'pending']),
});

export const settingsSchema = z.object({
  minQtyTier2: z.number(),
  discountTier2: z.number(),
  minQtyTier3: z.number(),
  discountTier3: z.number(),
  sizeSurchargeLimit: z.number(),
  sizeSurchargeAmount: z.number(),
  packingFeePerKoli: z.number(),
  ppnPercentage: z.number(),
  enablePpn: z.boolean(),
  warehouseTerms: z.array(z.string()).optional(),
  deliveryTerms: z.array(z.string()).optional(),
  companyName: optionalString,
  companyAddress: optionalString,
  companyPhone: optionalString,
  companyLogoUrl: optionalString,
  printMode: optionalString,
});

export const suratJalanUpdateSchema = z.object({
  driverName: optionalString,
  vehicleNumber: optionalString,
  status: z.string().min(1),
  notes: optionalString,
});

export const activityLogSchema = z.object({
  actionType: z.enum(['create', 'update', 'delete', 'payment', 'other']),
  category: z.string().min(1),
  description: z.string().min(1),
  details: optionalString,
  // Note: no `username` field — identity is always taken from the verified
  // session server-side (see activityLogs.ts), never trusted from the client.
});

export const commissionRateSchema = z.object({
  value: z.number(),
});

export const commissionPaymentSchema = z.object({
  value: z.string(),
});

const userRoleSchema = z.enum(['super_admin', 'director', 'admin', 'operator', 'finance']);

export const userCreateSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  name: z.string().min(1),
  role: userRoleSchema,
  allowedTabs: z.array(z.string()).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  createdAt: optionalString,
});

export const userUpdateSchema = z.object({
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  allowedTabs: z.array(z.string()).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

// Legacy one-time import: deliberately lenient (`.passthrough()`), since it mirrors
// a full localStorage snapshot — we only guard against missing IDs/keys that would
// otherwise crash the transaction, not the full business shape of every entity.
const legacyEntitySchema = z.object({ id: z.string() }).passthrough();
const legacyUserSchema = z.object({ username: z.string().min(1), name: z.string().min(1), role: z.string().min(1) }).passthrough();

export const legacyImportSchema = z.object({
  customers: z.array(legacyEntitySchema).optional(),
  products: z.array(legacyEntitySchema).optional(),
  salesmen: z.array(legacyEntitySchema).optional(),
  invoices: z.array(legacyEntitySchema).optional(),
  suratJalans: z.array(legacyEntitySchema).optional(),
  returns: z.array(legacyEntitySchema).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  users: z.array(legacyUserSchema).optional(),
  activityLogs: z.array(legacyEntitySchema).optional(),
  monthlyPayments: z.record(z.string(), z.any()).optional(),
  monthlyRates: z.record(z.string(), z.any()).optional(),
});
