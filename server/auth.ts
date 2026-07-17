import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from './db';
import { fromJson } from './jsonFields';

export interface AuthedRequest extends Request {
  authUser?: { id: string; username: string; role: string; permissions: Record<string, boolean> };
}

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 10);

export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Validasi kekuatan password minimal saat create/update user.
 * Mengembalikan pesan error (string) jika tidak valid, atau null jika valid.
 */
export function validatePasswordStrength(password: string, username?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (username && password.toLowerCase() === username.toLowerCase()) {
    return 'Password tidak boleh sama dengan username.';
  }
  return null;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Tidak ada sesi login.' });
    return;
  }
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session) {
    res.status(401).json({ error: 'Sesi login tidak valid atau sudah berakhir.' });
    return;
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => null);
    res.status(401).json({ error: 'Sesi login sudah kedaluwarsa, silakan login kembali.' });
    return;
  }
  req.authUser = {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    permissions: fromJson<Record<string, boolean>>(session.user.permissionsJson, {}) || {},
  };
  next();
}

/**
 * Server-side authorization gate. `super_admin` always passes; everyone else
 * must have the given permission key set to true in their stored permissions.
 */
export function requirePermission(permissionKey: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const authUser = req.authUser;
    if (!authUser) {
      res.status(401).json({ error: 'Tidak ada sesi login.' });
      return;
    }
    if (authUser.role === 'super_admin') {
      next();
      return;
    }
    if (!authUser.permissions?.[permissionKey]) {
      res.status(403).json({ error: 'Anda tidak memiliki izin untuk melakukan aksi ini.' });
      return;
    }
    next();
  };
}

export function requireSuperAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Tidak ada sesi login.' });
    return;
  }
  if (req.authUser.role !== 'super_admin') {
    res.status(403).json({ error: 'Hanya Super Admin yang dapat melakukan aksi ini.' });
    return;
  }
  next();
}
