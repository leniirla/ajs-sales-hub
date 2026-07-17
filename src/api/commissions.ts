import { apiGet, apiPut } from './client';

export const getCommissionRates = (): Promise<Record<string, number>> => apiGet('/commissions/rates');
export const setCommissionRate = (key: string, value: number): Promise<Record<string, number>> =>
  apiPut(`/commissions/rates/${encodeURIComponent(key)}`, { value });

export const getCommissionPayments = (): Promise<Record<string, string>> =>
  apiGet('/commissions/payments');
export const setCommissionPayment = (key: string, value: string): Promise<Record<string, string>> =>
  apiPut(`/commissions/payments/${encodeURIComponent(key)}`, { value });
