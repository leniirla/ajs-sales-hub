import { AppUser } from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const listUsers = (): Promise<AppUser[]> => apiGet('/users');
export const createUser = (u: AppUser): Promise<AppUser> => apiPost('/users', u);
export const updateUser = (u: AppUser): Promise<AppUser> => apiPut(`/users/${u.id}`, u);
export const deleteUser = (id: string): Promise<void> => apiDelete(`/users/${id}`);
