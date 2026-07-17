const TOKEN_KEY = 'invoice_auth_token';

export const getAuthToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setAuthToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearAuthToken = (): void => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Permintaan gagal (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    if (res.status === 401) {
      clearAuthToken();
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>(path, { method: 'GET' });

export const apiPost = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });

export const apiPut = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined });

export const apiPatch = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined });

export const apiDelete = <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' });
