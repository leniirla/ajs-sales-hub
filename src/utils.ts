/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer, Invoice, InvoiceItem, Product, SystemSettings, Salesman, ActivityLog, AppUser } from './types';

// Standard Indonesian currency formatter
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const DEFAULT_SETTINGS: SystemSettings = {
  minQtyTier2: 100,
  discountTier2: 2500,
  minQtyTier3: 300,
  discountTier3: 5000,
  sizeSurchargeLimit: 44,
  sizeSurchargeAmount: 5000,
  packingFeePerKoli: 20000,
  ppnPercentage: 11,
  enablePpn: false,
  warehouseTerms: [
    "Barang yang sudah dibeli dengan invoice ini tidak dapat ditukar kecuali ada reject produksi dalam 7 hari.",
    "Pembayaran transfer resmi ditujukan ke Rek. Mandiri: 131-00-1122-3344 a.n PT Sentra Angkasa Jaya."
  ],
  deliveryTerms: [
    "Periksa kecocokan fisik barang dengan Surat Jalan ini sebelum menandatangani.",
    "Komplain kekurangan barang harus dilampirkan bukti unboxing kiriman video."
  ],
  companyName: "ANGKASA JAYA SHOES",
  companyAddress: "Jl. Angkasa Mekar I No.59, Cangkuang Kulon, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat 40239",
  companyPhone: "Telp: (022) 540-39423 | WA: 0812-1122-3344",
  companyLogoUrl: "",
  printMode: "custom"
};

// Cache the last-known settings (logo/company identity) in localStorage so the
// login screen / sidebar can render the real branding on first paint instead
// of flashing the default placeholder logo while the initial API fetch is
// still in flight.
const SETTINGS_CACHE_KEY = 'ajs_settings_cache_v1';

export const getCachedSettings = (): SystemSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const setCachedSettings = (settings: SystemSettings): void => {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota errors (e.g. storage full from a large base64 logo).
  }
};

export interface ProductPreset {
  name: string;
  defaultPrice: number;
}

export const PRODUCT_PRESETS: ProductPreset[] = [
  { name: 'Sepatu Sneaker Sport Alpha', defaultPrice: 135000 },
  { name: 'Casual Loafers Leather Premium', defaultPrice: 150000 },
  { name: 'Sandal Kulit Slide Adventure', defaultPrice: 110050 },
  { name: 'Flat Shoes Suede Belle', defaultPrice: 125000 },
  { name: 'Classic High Top Canvas', defaultPrice: 130000 },
  { name: 'Slip-on Breathable Comfort', defaultPrice: 120000 }
];

export const getCustomerProductPrice = (customer: Customer, productName: string, products?: Product[]): number => {
  if (customer.customPrices && customer.customPrices[productName] !== undefined) {
    return customer.customPrices[productName];
  }
  const mainList = products && products.length > 0 ? products : PRODUCT_PRESETS;
  const preset = mainList.find(p => p.name === productName);
  if (preset) {
    return preset.defaultPrice;
  }
  return customer.customBasePrice || 135000;
};

// New helper to resolve customer volumeMode logically with fallback mapping for compatibility
export const getCustomerVolumeMode = (customer: Customer): 'umum' | 'kustom' | 'tanpa_volume' => {
  if (customer.volumeMode) return customer.volumeMode;
  if (customer.enableVolumeDiscount) return 'umum';
  return 'tanpa_volume';
};

// Pricing calculation rules
export const calculateInvoiceItem = (
  item: Omit<InvoiceItem, 'negotiatedBasePrice' | 'unitPrice' | 'totalPrice' | 'sizeSurcharge'>,
  totalPairsInInvoice: number,
  customer: Customer,
  products?: Product[],
  settings?: SystemSettings
): InvoiceItem => {
  const s = settings || DEFAULT_SETTINGS;
  const mainList = products && products.length > 0 ? products : PRODUCT_PRESETS;
  const product = mainList.find(p => p.name === item.productName) as Product | undefined;

  // Determine actual baseline price for this specific shoe style for this customer (representing Tier 1/Normal price)
  const basePrice = getCustomerProductPrice(customer, item.productName, products);

  const mode = getCustomerVolumeMode(customer);
  let negotiatedBasePrice = basePrice;

  if (mode === 'umum') {
    // Follow "Aturan Umum Sepatu" (General Shoe presets with Tier 2 & Tier 3 prices)
    if (totalPairsInInvoice > s.minQtyTier3) {
      // Tier 3 Default
      const stdPrice = product?.defaultPrice ?? 135000;
      const stdTier3 = product?.priceTier3 ?? (stdPrice - s.discountTier3);
      const discountAmount = Math.max(0, stdPrice - stdTier3);
      negotiatedBasePrice = Math.max(0, basePrice - discountAmount);
    } else if (totalPairsInInvoice > s.minQtyTier2) {
      // Tier 2 Default
      const stdPrice = product?.defaultPrice ?? 135005; // Fallback or matching product
      const stdTier2 = product?.priceTier2 ?? (stdPrice - s.discountTier2);
      const discountAmount = Math.max(0, stdPrice - stdTier2);
      negotiatedBasePrice = Math.max(0, basePrice - discountAmount);
    } else {
      // Normal
      negotiatedBasePrice = basePrice;
    }
  } else if (mode === 'kustom') {
    // Follow "Kustom Sendiri" per Customer with dynamic threshold quantities
    const t2Threshold = customer.customTier2MinQty?.[item.productName] !== undefined 
      ? customer.customTier2MinQty[item.productName] 
      : s.minQtyTier2;
    const t3Threshold = customer.customTier3MinQty?.[item.productName] !== undefined 
      ? customer.customTier3MinQty[item.productName] 
      : s.minQtyTier3;

    if (totalPairsInInvoice > t3Threshold) {
      const fallbackTier3 = product?.priceTier3 ?? ((product?.defaultPrice ?? 135000) - s.discountTier3);
      negotiatedBasePrice = (customer.customTier3Prices && customer.customTier3Prices[item.productName] !== undefined)
        ? customer.customTier3Prices[item.productName]
        : fallbackTier3;
    } else if (totalPairsInInvoice > t2Threshold) {
      const fallbackTier2 = product?.priceTier2 ?? ((product?.defaultPrice ?? 135000) - s.discountTier2);
      negotiatedBasePrice = (customer.customTier2Prices && customer.customTier2Prices[item.productName] !== undefined)
        ? customer.customTier2Prices[item.productName]
        : fallbackTier2;
    } else {
      negotiatedBasePrice = basePrice;
    }
  } else {
    // "tanpa_volume" (Kunci Harga Normal / Tanpa Volume)
    negotiatedBasePrice = basePrice;
  }

  // Size limit and surcharge amount
  let sizeSurcharge = 0;
  if (!customer.hasFlatPriceSizeLarge) {
    const limit = (product && product.customSurchargeLimit !== undefined && product.customSurchargeLimit > 0)
      ? product.customSurchargeLimit
      : s.sizeSurchargeLimit;

    if (item.size >= limit) {
      if (customer.customSizeSurcharges && customer.customSizeSurcharges[item.productName] !== undefined) {
        sizeSurcharge = customer.customSizeSurcharges[item.productName];
      } else if (product && product.customSurcharges && product.customSurcharges.length > 0) {
        const matchingRules = product.customSurcharges.filter(r => item.size >= r.size);
        if (matchingRules.length > 0) {
          sizeSurcharge = Math.max(...matchingRules.map(r => r.amount));
        }
      } else if (product && product.customSurchargeLimit !== undefined && product.customSurchargeLimit > 0) {
        sizeSurcharge = product.customSurchargeAmount ?? s.sizeSurchargeAmount;
      } else {
        sizeSurcharge = s.sizeSurchargeAmount;
      }
    }
  }

  const unitPrice = negotiatedBasePrice + sizeSurcharge;
  const totalPrice = unitPrice * item.quantity;

  return {
    ...item,
    basePrice,
    sizeSurcharge,
    negotiatedBasePrice,
    unitPrice,
    totalPrice,
  };
};

export const calculateFullInvoice = (
  draft: Omit<Invoice, 'items' | 'totalPairs' | 'subtotal' | 'packingFee' | 'totalAmount'>,
  draftItems: Omit<InvoiceItem, 'negotiatedBasePrice' | 'unitPrice' | 'totalPrice' | 'sizeSurcharge'>[],
  customer: Customer,
  products?: Product[],
  settings?: SystemSettings
): Invoice => {
  const s = settings || DEFAULT_SETTINGS;
  // Calculate total pairs first to determine potential volume discounts
  const totalPairs = draftItems.reduce((sum, item) => sum + item.quantity, 0);

  // Compute each item using calculated volume discounts and size rules
  const computedItems = draftItems.map(item => {
    // Determine the total quantity of this SPECIFIC shoe style in the invoice draft
    const productTotalPairs = draftItems
      .filter(i => i.productName === item.productName)
      .reduce((sum, i) => sum + i.quantity, 0);

    return calculateInvoiceItem(item, productTotalPairs, customer, products, s);
  });

  const subtotal = computedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  
  const packingFee = draft.wantsPacking ? draft.koliCount * 20000 : 0;
  
  // Custom PPN tax calculation
  const taxRate = s.enablePpn ? s.ppnPercentage : 0;
  const ppnAmount = s.enablePpn ? Math.round((subtotal + packingFee) * (taxRate / 100)) : 0;
  const ongkirAmount = draft.hasOngkir ? (draft.ongkirAmount || 0) : 0;
  const totalAmount = subtotal + packingFee + ppnAmount + ongkirAmount;
  
  const dpAmount = draft.dpAmount || 0;
  const remainingBalance = draft.status === 'paid' ? 0 : totalAmount - dpAmount;

  return {
    ...draft,
    items: computedItems,
    customerName: customer.name,
    customerType: customer.type,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    hasFlatPriceSizeLarge: customer.hasFlatPriceSizeLarge,
    totalPairs,
    subtotal,
    packingFee,
    hasOngkir: draft.hasOngkir,
    ongkirAmount,
    taxRate,
    ppnAmount,
    totalAmount,
    dpAmount,
    remainingBalance,
  };
};

// Initial database seeding for beautiful display out-of-the-box
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Toko Sahabat Sepatu',
    type: 'khusus', // Pelanggan khusus (diskon grosir otomatis)
    hasFlatPriceSizeLarge: false, // Bayar tambahan Rp 5,000 untuk size >= 44
    enableVolumeDiscount: true,
    customBasePrice: 135000,
    phone: '0812-3456-7890',
    address: 'Jl. Raya Cibaduyut No. 45, Bandung',
    commissionRate: 2000,
  },
  {
    id: 'cust-2',
    name: 'Bapak Ahmad Jaelani',
    type: 'umum', // Pelanggan normal (harga normal fixed)
    hasFlatPriceSizeLarge: true, // Harga tetap sama walau size besar (gratis tambahan size)
    enableVolumeDiscount: false,
    customBasePrice: 135000,
    phone: '0857-9876-5432',
    address: 'Pasar Grosir Tanah Abang Blok B, Jakarta',
    commissionRate: 2000,
  },
  {
    id: 'cust-3',
    name: 'Grosir Sinar Jaya',
    type: 'khusus', // Pelanggan khusus
    hasFlatPriceSizeLarge: true, // Bebas biaya tambahan size besar dan dapat grosir volume
    enableVolumeDiscount: true,
    customBasePrice: 135000,
    phone: '0899-2233-4455',
    address: 'Jl. Malioboro No. 12, Yogyakarta',
    commissionRate: 2000,
  },
  {
    id: 'cust-4',
    name: 'Toko Langkah Pratama',
    type: 'umum', // Pelanggan normal
    hasFlatPriceSizeLarge: false, // Bayar sisa size >= 44
    enableVolumeDiscount: false,
    customBasePrice: 135000,
    phone: '0813-4455-6677',
    address: 'Kawasan ITC Mangga Dua Lt. 2, Jakarta',
    commissionRate: 2000,
  }
];

// Seeded invoices to generate a beautiful, authentic sales history
export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV/20260601/01',
    date: '2026-06-01',
    customerId: 'cust-1',
    customerName: 'Toko Sahabat Sepatu',
    customerType: 'khusus',
    customerPhone: '0812-3456-7890',
    customerAddress: 'Jl. Raya Cibaduyut No. 45, Bandung',
    hasFlatPriceSizeLarge: false,
    wantsPacking: true,
    koliCount: 3,
    packingFee: 60000,
    totalPairs: 120, // > 100 pasang -> base price becomes 132500
    items: [
      {
        id: 'item-1',
        productName: 'Sepatu Sneaker Sport Alpha',
        size: 42,
        quantity: 80,
        basePrice: 135000,
        negotiatedBasePrice: 132500,
        sizeSurcharge: 0,
        unitPrice: 132500,
        totalPrice: 10600000,
      },
      {
        id: 'item-2',
        productName: 'Sepatu Sneaker Sport Alpha',
        size: 45, // Size >= 44 -> surcharge active (since guest hasFlatPriceSizeLarge = false)
        quantity: 40,
        basePrice: 135000,
        negotiatedBasePrice: 132500,
        sizeSurcharge: 5000,
        unitPrice: 137500,
        totalPrice: 5500000,
      }
    ],
    subtotal: 16100000,
    totalAmount: 16160000,
    notes: 'Kirim via Ekspedisi Dakota. Packing kayu aman.',
    status: 'paid'
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV/20260605/02',
    date: '2026-06-05',
    customerId: 'cust-2',
    customerName: 'Bapak Ahmad Jaelani',
    customerType: 'umum',
    customerPhone: '0857-9876-5432',
    customerAddress: 'Pasar Grosir Tanah Abang Blok B, Jakarta',
    hasFlatPriceSizeLarge: true, // Fixed price regardless of size
    wantsPacking: false,
    koliCount: 0,
    packingFee: 0,
    totalPairs: 40,
    items: [
      {
        id: 'item-3',
        productName: 'Casual Loafers Leather Premium',
        size: 46, // 46 is >= 44, but surcharge is 0 because customer.hasFlatPriceSizeLarge is true
        quantity: 40,
        basePrice: 135000,
        negotiatedBasePrice: 135000,
        sizeSurcharge: 0,
        unitPrice: 135000,
        totalPrice: 5400000,
      }
    ],
    subtotal: 5400000,
    totalAmount: 5400000,
    notes: 'Ambil di gudang sendiri.',
    status: 'paid'
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV/20260610/03',
    date: '2026-06-10',
    customerId: 'cust-3',
    customerName: 'Grosir Sinar Jaya',
    customerType: 'khusus',
    customerPhone: '0899-2233-4455',
    customerAddress: 'Jl. Malioboro No. 12, Yogyakarta',
    hasFlatPriceSizeLarge: true, // Flat size price & volume eligible
    wantsPacking: true,
    koliCount: 10,
    packingFee: 200000,
    totalPairs: 400, // > 350 pasang -> base price becomes 130000
    items: [
      {
        id: 'item-4',
        productName: 'Sandal Kulit Slide Adventure',
        size: 43,
        quantity: 200,
        basePrice: 135000,
        negotiatedBasePrice: 130000,
        sizeSurcharge: 0,
        unitPrice: 130000,
        totalPrice: 26000000,
      },
      {
        id: 'item-5',
        productName: 'Sandal Kulit Slide Adventure',
        size: 45, // size >= 44, but guest doesn't pay extra (hasFlatPriceSizeLarge = true)
        quantity: 200,
        basePrice: 135000,
        negotiatedBasePrice: 130000,
        sizeSurcharge: 0,
        unitPrice: 130000,
        totalPrice: 26000000,
      }
    ],
    subtotal: 52000000,
    totalAmount: 52200000,
    notes: 'Dapatkan diskon term 30 hari.',
    status: 'unpaid'
  }
];

// Helper to export any array of data to real Excel worksheet
export const exportToExcel = (fileName: string, sheets: { name: string; data: any[] }[]) => {
  try {
    // Import dynamically or use globally if sheetJS is included
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new();

      sheets.forEach((sheet) => {
        const ws = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });

      XLSX.writeFile(wb, `${fileName}.xlsx`);
    });
  } catch (err) {
    console.error('Error exporting to excel', err);
  }
};

export const INITIAL_SALESMEN: Salesman[] = [
  { id: 'sales-1', name: 'Budi Santoso', phone: '0811-2222-3333', commissionPerPair: 2000 },
  { id: 'sales-2', name: 'Siti Rahma', phone: '0812-4444-5555', commissionPerPair: 2500 }
];

export const getActivityLogs = (): ActivityLog[] => {
  try {
    const saved = localStorage.getItem('invoice_db_activity_logs');
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Error loading activity logs', err);
    return [];
  }
};

export const addActivityLog = (
  actionType: ActivityLog['actionType'],
  category: ActivityLog['category'],
  description: string,
  details?: string,
  username?: string
): ActivityLog[] => {
  try {
    const logs = getActivityLogs();
    const newLog: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actionType,
      category,
      description,
      details,
      username
    };
    const updated = [newLog, ...logs].slice(0, 1000); // Keep last 1000 logs
    localStorage.setItem('invoice_db_activity_logs', JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error adding activity log', err);
    return [];
  }
};

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'admin',
    name: 'Super Admin Utama',
    role: 'super_admin',
    createdAt: '2026-06-30 00:00:00'
  }
];

export const clearActivityLogs = (): void => {
  localStorage.removeItem('invoice_db_activity_logs');
};

export const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success'): void => {
  const event = new CustomEvent('app-notify', { detail: { message, type } });
  window.dispatchEvent(event);
};

export const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void): void => {
  const event = new CustomEvent('app-confirm', { detail: { message, onConfirm, onCancel } });
  window.dispatchEvent(event);
};

