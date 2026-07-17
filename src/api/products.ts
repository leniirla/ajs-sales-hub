import { Product } from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const listProducts = (): Promise<Product[]> => apiGet('/products');
export const createProduct = (p: Product): Promise<Product> => apiPost('/products', p);
export const updateProduct = (p: Product): Promise<Product> => apiPut(`/products/${p.id}`, p);
export const deleteProduct = (id: string): Promise<void> => apiDelete(`/products/${id}`);
