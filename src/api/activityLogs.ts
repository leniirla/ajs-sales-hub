import { ActivityLog } from '../types';
import { apiGet, apiPost, apiDelete } from './client';

export const listActivityLogs = (): Promise<ActivityLog[]> => apiGet('/activity-logs');

export const addActivityLogEntry = (
  actionType: ActivityLog['actionType'],
  category: ActivityLog['category'],
  description: string,
  details?: string,
  username?: string
): Promise<ActivityLog[]> =>
  apiPost('/activity-logs', { actionType, category, description, details, username });

export const clearActivityLogsRemote = (): Promise<void> => apiDelete('/activity-logs');
