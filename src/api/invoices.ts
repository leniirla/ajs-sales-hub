import { Invoice } from '../types';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';

export const listInvoices = (): Promise<Invoice[]> => apiGet('/invoices');
export const createInvoice = (inv: Invoice): Promise<Invoice> => apiPost('/invoices', inv);
export const updateInvoice = (inv: Invoice): Promise<Invoice> => apiPut(`/invoices/${inv.id}`, inv);
export const setInvoiceStatus = (id: string, status: 'paid' | 'unpaid'): Promise<Invoice> =>
  apiPatch(`/invoices/${id}/status`, { status });
export const deleteInvoice = (id: string): Promise<void> => apiDelete(`/invoices/${id}`);
