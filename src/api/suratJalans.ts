import { SuratJalan } from '../types';
import { apiGet, apiPut } from './client';

export const listSuratJalans = (): Promise<SuratJalan[]> => apiGet('/surat-jalans');
export const updateSuratJalan = (sj: SuratJalan): Promise<SuratJalan> =>
  apiPut(`/surat-jalans/${sj.id}`, sj);
