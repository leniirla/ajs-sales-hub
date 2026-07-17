import { ProductReturn } from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const listReturns = (): Promise<ProductReturn[]> => apiGet('/returns');
export const createReturn = (r: ProductReturn): Promise<ProductReturn> => apiPost('/returns', r);
export const updateReturn = (r: ProductReturn): Promise<ProductReturn> => apiPut(`/returns/${r.id}`, r);
export const deleteReturn = (id: string): Promise<void> => apiDelete(`/returns/${id}`);
