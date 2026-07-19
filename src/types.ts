/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Customer {
  id: string;
  name: string;
  type: 'umum' | 'khusus';
  hasFlatPriceSizeLarge: boolean; // true = harga tetap sama walau size besar, false = size 44+ tambah 5000
  enableVolumeDiscount?: boolean; // Keep for backwards compatibility
  volumeMode?: 'umum' | 'kustom' | 'tanpa_volume'; // 'umum' = Aturan Umum Sepatu, 'kustom' = Kustom Sendiri, 'tanpa_volume' = Kunci Harga Normal
  customBasePrice: number; // default fallback if specific shoe price not set
  customPrices?: Record<string, number>; // key: productName, value: custom base price for Normal (<100)
  customTier2Prices?: Record<string, number>; // key: productName, value: custom price for Tier 2 (>100)
  customTier3Prices?: Record<string, number>; // key: productName, value: custom price for Tier 3 (>300)
  customTier2MinQty?: Record<string, number>; // key: productName, value: custom threshold quantity for Tier 2
  customTier3MinQty?: Record<string, number>; // key: productName, value: custom threshold quantity for Tier 3
  customSizeSurcharges?: Record<string, number>; // key: productName, value: custom size surcharge (Rp)
  phone?: string;
  address?: string;
  commissionRate?: number; // default commission per pair for this customer
}

export interface Product {
  id: string;
  name: string;
  defaultPrice: number;
  priceTier2?: number; // Price/pasang for > 100 psg
  priceTier3?: number; // Price/pasang for > 300 psg
  customSurchargeLimit?: number; // custom limit for size surcharge (e.g. 44)
  customSurchargeAmount?: number; // custom surcharge nominal value
  customSurcharges?: { size: number; amount: number }[]; // custom multiple size surcharges
}

export interface InvoiceItem {
  id: string;
  productName: string;
  size: number;
  quantity: number; // jumlah pasang
  basePrice: number; // harga dasar per pasang sebelum diskon volume atau tambahan size
  sizeSurcharge: number; // tambahan harga size besar (5000 jika size >= 44 dan !hasFlatPriceSizeLarge)
  negotiatedBasePrice: number; // harga setelah diskon volume (misal jadi 132500 atau 130000)
  unitPrice: number; // negotiatedBasePrice + sizeSurcharge
  totalPrice: number; // unitPrice * quantity
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerType: 'umum' | 'khusus';
  customerPhone?: string;
  customerAddress?: string;
  hasFlatPriceSizeLarge: boolean;
  items: InvoiceItem[];
  wantsPacking: boolean;
  koliCount: number;
  packingFee: number; // koliCount * packingFeePerKoli
  hasOngkir?: boolean; // New: Has shipping fee
  ongkirAmount?: number; // New: Shipping fee amount (Rp)
  totalPairs: number; // total pasang sepatu
  subtotal: number; // total sebelum packing fee
  taxRate?: number; // PPN percentage rate used (e.g. 11)
  ppnAmount?: number; // total PPN fee calculated
  totalAmount: number; // subtotal + packingFee + PPN
  dpAmount?: number; // Down Payment (Uang Muka)
  dpProofs?: PaymentProof[]; // Bukti pembayaran khusus untuk Uang Muka (DP)
  remainingBalance?: number; // Sisa Pembayaran
  notes?: string;
  status: 'paid' | 'unpaid';
  salesmanId?: string;       // ID Salesman / Agen Komisi
  salesmanName?: string;     // Nama Salesman / Agen Komisi
  commissionPerPair?: number; // Nominal komisi per pasang untuk faktur ini
  commissionStatus?: 'paid' | 'unpaid'; // Status pembayaran komisi
  paymentProofUrl?: string; // Base64 image string of transaction proof
  paymentProofUrls?: (string | PaymentProof)[]; // Multiple proof images support
  payments?: InvoicePayment[]; // History of multiple payments/installments
}

export interface InvoicePayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
  method?: string; // Metode pembayaran (Cash/Tunai, Transfer Bank, QRIS, dll)
  type?: 'installment' | 'settlement'; // 'settlement' = payment recorded when marking invoice Lunas
  proofs?: PaymentProof[]; // Bukti pembayaran khusus untuk cicilan/pembayaran ini
}

export interface PaymentProof {
  url: string;
  description?: string;
  createdAt?: string;
}

export interface Salesman {
  id: string;
  name: string;
  phone?: string;
  commissionPerPair: number; // default nominal komisi per pasang
}

export interface SystemSettings {
  minQtyTier2: number;       // default 100
  discountTier2: number;     // default 2500
  minQtyTier3: number;       // default 300
  discountTier3: number;     // default 5000
  sizeSurchargeLimit: number; // default 44
  sizeSurchargeAmount: number; // default 5000
  packingFeePerKoli: number;   // default 20000
  ppnPercentage: number;       // default 11
  enablePpn: boolean;          // default false
  warehouseTerms?: string[];    // New: Custom terms and conditions list
  deliveryTerms?: string[];     // New: Custom terms for delivery note (surat jalan)
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyLogoUrl?: string;
  printMode?: 'custom' | 'browser'; // 'custom' = ekspor PDF kustom (html2canvas+jsPDF, default), 'browser' = dialog print bawaan browser (Ctrl/Win+P)
}

export interface ProductReturnItem {
  id: string;
  productName: string;
  size: number;
  returnedQuantity: number; // Qty returned (pairs)
  originalQuantity: number;  // Original invoice Qty
  unitRefundPrice: number;   // Refund price per pair (equals negotiated unit Price)
  reason: 'rusak_defect' | 'salah_ukuran' | 'salah_model' | 'kelebihan_kirim' | 'lainnya';
  customReasonText?: string; // If other reason is specified
  totalRefundValue: number;  // returnedQuantity * unitRefundPrice
}

export interface ProductReturn {
  id: string;
  returnNumber: string;      // e.g. RET/20260620/01
  date: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: ProductReturnItem[];
  totalRefundAmount: number; // sum of totalRefundValue
  refundType: 'potong_tagihan' | 'tunai_kredit'; // potong_tagihan: deduct from invoice remaining balance, tunai_kredit: manual cash/credit
  notes?: string;
  status: 'completed' | 'pending';
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO string or YYYY-MM-DD HH:mm:ss
  actionType: 'create' | 'update' | 'delete' | 'payment' | 'other';
  category: 'invoice' | 'customer' | 'product' | 'salesman' | 'return' | 'commission' | 'settings' | 'user';
  description: string;
  details?: string;
  username?: string; // Who performed the action
}

export interface AppUserPermissions {
  canCreateInvoice: boolean;
  canEditInvoice: boolean;
  canDeleteInvoice: boolean;
  canPayInvoice: boolean;
  canProcessReturn: boolean;
  canManageMasterData: boolean;
  canManageSalesman: boolean;
  canPayCommission: boolean;
  canEditCommissionRate: boolean;
  canManageSuratJalan: boolean; // Manage delivery notes (SJ)
  canManagePaymentProof: boolean; // Upload/delete payment proofs
  canManageInstallments: boolean; // Add/delete installments payment history
  canEditSettings: boolean; // Change rule settings & company identity
  canClearLogs: boolean; // Clear action logs
}

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'super_admin' | 'director' | 'admin' | 'operator' | 'finance';
  createdAt: string;
  allowedTabs?: string[]; // Tab IDs this user has permission to see and access
  permissions?: AppUserPermissions; // Action permissions
}

export interface SuratJalan {
  id: string;
  suratJalanNumber: string; // e.g. SJ/20260630/01
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: {
    id: string;
    productName: string;
    size: number;
    quantity: number;
  }[];
  koliCount: number;
  driverName?: string;
  vehicleNumber?: string;
  status: 'draft' | 'kirim' | 'selesai'; // draft, dikirim, selesai
  notes?: string;
}



