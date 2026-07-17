import { Router } from 'express';
import { prisma } from '../db';
import { hashPassword, requireSuperAdmin, validatePasswordStrength, type AuthedRequest } from '../auth';
import { toJson } from '../jsonFields';
import { serializeUser } from '../serializers';
import { validateBody, userCreateSchema, userUpdateSchema } from '../validation';
import { deleteOrError } from '../prismaErrors';
import { asyncHandler } from '../asyncHandler';

export const usersRouter = Router();

usersRouter.get('/', asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json(users.map(serializeUser));
}));

usersRouter.post('/', requireSuperAdmin, validateBody(userCreateSchema), asyncHandler(async (req, res) => {
  const { username, password, name, role, allowedTabs, permissions, createdAt } = req.body;
  if (!username || !password || !name || !role) {
    res.status(400).json({ error: 'Data pengguna tidak lengkap.' });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: 'Username sudah digunakan oleh akun lain.' });
    return;
  }
  const passwordError = validatePasswordStrength(password, username);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      passwordHash,
      name,
      role,
      allowedTabsJson: toJson(allowedTabs),
      permissionsJson: toJson(permissions),
      createdAt: createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
    },
  });
  res.status(201).json(serializeUser(user));
}));

usersRouter.put('/:id', validateBody(userUpdateSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;
  let { username, password, name, role, allowedTabs, permissions } = req.body;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    return;
  }

  const isSuperAdmin = req.authUser?.role === 'super_admin';
  const isSelf = req.authUser?.id === id;
  if (!isSuperAdmin) {
    if (!isSelf) {
      res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengubah pengguna lain.' });
      return;
    }
    // Non-admins editing themselves may only change their own password.
    username = undefined;
    name = undefined;
    role = undefined;
    allowedTabs = undefined;
    permissions = undefined;
  }

  if (username && username.toLowerCase() !== existing.username) {
    const dup = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (dup) {
      res.status(409).json({ error: 'Username sudah digunakan oleh akun lain.' });
      return;
    }
  }
  if (password) {
    const passwordError = validatePasswordStrength(password, username || existing.username);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }
  }
  const user = await prisma.user.update({
    where: { id },
    data: {
      username: username ? username.toLowerCase() : undefined,
      name,
      role,
      allowedTabsJson: allowedTabs !== undefined ? toJson(allowedTabs) : undefined,
      permissionsJson: permissions !== undefined ? toJson(permissions) : undefined,
      passwordHash: password ? await hashPassword(password) : undefined,
    },
  });
  res.json(serializeUser(user));
}));

usersRouter.delete('/:id', requireSuperAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.username === 'admin') {
    res.status(403).json({ error: 'Super Admin utama tidak dapat dihapus.' });
    return;
  }
  await prisma.session.deleteMany({ where: { userId: id } });
  await deleteOrError(
    res,
    () => prisma.user.delete({ where: { id } }),
    'Pengguna tidak ditemukan (mungkin sudah terhapus sebelumnya).'
  );
}));
