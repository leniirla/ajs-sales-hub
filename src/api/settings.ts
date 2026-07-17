import { SystemSettings } from '../types';
import { apiGet, apiPut } from './client';

export const getSettings = (): Promise<SystemSettings> => apiGet('/settings');
export const saveSettings = (s: SystemSettings): Promise<SystemSettings> => apiPut('/settings', s);
