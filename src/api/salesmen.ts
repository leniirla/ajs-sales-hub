import { Salesman } from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const listSalesmen = (): Promise<Salesman[]> => apiGet('/salesmen');
export const createSalesman = (s: Salesman): Promise<Salesman> => apiPost('/salesmen', s);
export const updateSalesman = (s: Salesman): Promise<Salesman> => apiPut(`/salesmen/${s.id}`, s);
export const deleteSalesman = (id: string): Promise<void> => apiDelete(`/salesmen/${id}`);
