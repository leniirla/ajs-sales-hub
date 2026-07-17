import { Customer } from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const listCustomers = (): Promise<Customer[]> => apiGet('/customers');
export const createCustomer = (c: Customer): Promise<Customer> => apiPost('/customers', c);
export const updateCustomer = (c: Customer): Promise<Customer> => apiPut(`/customers/${c.id}`, c);
export const deleteCustomer = (id: string): Promise<void> => apiDelete(`/customers/${id}`);
