import { apiPost } from './client';

const LEGACY_KEYS = {
  customers: 'invoice_db_customers',
  invoices: 'invoice_db_invoices',
  products: 'invoice_db_products',
  settings: 'invoice_db_settings',
  salesmen: 'invoice_db_salesmen',
  users: 'invoice_db_users',
  suratJalans: 'invoice_db_surat_jalans',
  returns: 'invoice_db_returns',
  activityLogs: 'invoice_db_activity_logs',
  monthlyPayments: 'invoice_db_monthly_payments',
  monthlyRates: 'invoice_db_monthly_rates',
} as const;

export const hasLegacyLocalStorageData = (): boolean =>
  Object.values(LEGACY_KEYS).some((key) => localStorage.getItem(key) !== null);

const readJson = (key: string) => {
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

export const importLegacyLocalStorageData = async (): Promise<void> => {
  const payload = {
    customers: readJson(LEGACY_KEYS.customers) || [],
    invoices: readJson(LEGACY_KEYS.invoices) || [],
    products: readJson(LEGACY_KEYS.products) || [],
    settings: readJson(LEGACY_KEYS.settings),
    salesmen: readJson(LEGACY_KEYS.salesmen) || [],
    users: readJson(LEGACY_KEYS.users) || [],
    suratJalans: readJson(LEGACY_KEYS.suratJalans) || [],
    returns: readJson(LEGACY_KEYS.returns) || [],
    activityLogs: readJson(LEGACY_KEYS.activityLogs) || [],
    monthlyPayments: readJson(LEGACY_KEYS.monthlyPayments) || {},
    monthlyRates: readJson(LEGACY_KEYS.monthlyRates) || {},
  };
  await apiPost('/import-legacy', payload);
};

export const clearLegacyLocalStorageData = (): void => {
  Object.values(LEGACY_KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('invoice_db_current_user');
};
