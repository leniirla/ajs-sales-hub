import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { prisma } from '../db';
import { verifyPassword, requireAuth, SESSION_TTL_MS, type AuthedRequest } from '../auth';
import { serializeUser } from '../serializers';
import { asyncHandler } from '../asyncHandler';

export const authRouter = Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' },
  keyGenerator: (req) => {
    const username = (req.body?.username || '').toString().toLowerCase();
    return `${ipKeyGenerator(req.ip || '')}:${username}`;
  },
});

authRouter.post('/login', loginRateLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: 'Username dan password wajib diisi.' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Username atau password yang Anda masukkan salah.' });
    return;
  }
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  res.json({ token: session.token, user: serializeUser(user) });
}));

authRouter.post('/logout', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const header = req.header('authorization') || '';
  const token = header.slice(7);
  await prisma.session.deleteMany({ where: { token } });
  res.json({ ok: true });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!user) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    return;
  }
  res.json(serializeUser(user));
}));
