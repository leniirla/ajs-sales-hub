import { AppUser } from '../types';
import { apiGet, apiPost, setAuthToken, clearAuthToken, getAuthToken } from './client';

export const login = async (username: string, password: string): Promise<AppUser | null> => {
  try {
    const { token, user } = await apiPost<{ token: string; user: AppUser }>('/auth/login', {
      username,
      password,
    });
    setAuthToken(token);
    return user;
  } catch {
    return null;
  }
};

export const logout = async (): Promise<void> => {
  if (getAuthToken()) {
    await apiPost('/auth/logout').catch(() => null);
  }
  clearAuthToken();
};

export const fetchCurrentUser = (): Promise<AppUser> => apiGet<AppUser>('/auth/me');
