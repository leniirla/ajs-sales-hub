import { fromJson } from './jsonFields';
import type { AppUserPermissions } from '../src/types';

export const serializeUser = (u: {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
  allowedTabsJson: string | null;
  permissionsJson: string | null;
}) => ({
  id: u.id,
  username: u.username,
  name: u.name,
  role: u.role,
  createdAt: u.createdAt,
  allowedTabs: fromJson<string[] | undefined>(u.allowedTabsJson, undefined),
  permissions: fromJson<AppUserPermissions | undefined>(u.permissionsJson, undefined),
});
