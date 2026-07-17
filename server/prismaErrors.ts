import type { Response } from 'express';

/**
 * Runs a Prisma delete and maps common Prisma error codes to sensible HTTP
 * responses, instead of silently swallowing the error and always reporting
 * success (the previous `.catch(() => null)` pattern).
 */
export async function deleteOrError(
  res: Response,
  action: () => Promise<unknown>,
  notFoundMsg = 'Data tidak ditemukan (mungkin sudah terhapus sebelumnya).',
  conflictMsg = 'Data tidak dapat dihapus karena masih terkait dengan data lain.'
): Promise<void> {
  try {
    await action();
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: notFoundMsg });
      return;
    }
    if (err?.code === 'P2003') {
      res.status(409).json({ error: conflictMsg });
      return;
    }
    console.error('Gagal menghapus data:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat menghapus data.' });
  }
}
