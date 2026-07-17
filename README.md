# Faktur & Laporan Penjualan

Aplikasi internal untuk pembuatan faktur (invoice), surat jalan, retur produk, laporan penjualan, dan manajemen komisi salesman. Frontend React (Vite) + backend Express dengan Prisma (PostgreSQL).

## Fitur Utama

- **Faktur**: pembuatan & edit faktur dengan perhitungan harga otomatis (diskon volume, harga bertingkat, surcharge ukuran, PPN, ongkir, biaya packing), riwayat pembayaran/cicilan, dan opsi "bayar lunas di muka".
- **Surat Jalan**: dibuat otomatis dan tersinkron setiap kali faktur dibuat/diubah.
- **Retur Produk**: pencatatan retur dengan perhitungan nilai refund otomatis.
- **Laporan Penjualan**: rekap transaksi, riwayat pembayaran per faktur, ekspor data.
- **Manajemen Data Master**: pelanggan, produk, salesman, komisi bulanan, pengaturan sistem (pricing tier, PPN, info perusahaan).
- **Manajemen Pengguna & Hak Akses**: role-based permission per aksi (buat/edit/hapus faktur, kelola cicilan, dll), dengan Super Admin sebagai role tertinggi.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, lucide-react
- **Backend**: Express 4, Prisma 7 (adapter `@prisma/adapter-pg`), Zod (validasi input), Helmet (security headers), bcryptjs (hash password), express-rate-limit (rate limiting login)
- **Database**: PostgreSQL (mis. [Neon](https://neon.tech), Vercel Postgres, atau Postgres lokal)

## Menjalankan Secara Lokal

**Prasyarat**: Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. Salin `.env.example` menjadi `.env`, isi `DATABASE_URL` dengan connection string PostgreSQL (lokal atau cloud seperti Neon).
3. Jalankan migrasi database:
   ```
   npm run prisma:migrate
   ```
4. (Opsional) Jalankan seed data awal:
   ```
   npm run prisma:seed
   ```
5. Jalankan aplikasi (frontend + backend berjalan bersamaan):
   ```
   npm run dev
   ```
   Frontend tersedia di `http://localhost:3000`, API di `http://localhost:3001`.

## Skrip Lain

| Perintah | Keterangan |
|---|---|
| `npm run build` | Build frontend untuk produksi |
| `npm start` | Jalankan server produksi (`NODE_ENV=production`) |
| `npm run lint` | Type-check dengan TypeScript (`tsc --noEmit`) |
| `npm run prisma:generate` | Generate Prisma client |

## Deploy ke Vercel

Struktur repo ini sudah disiapkan untuk Vercel: frontend di-build sebagai static site (`vite build` → `dist/`), backend Express diekspos sebagai satu serverless function (`api/index.ts`) lewat rewrite di `vercel.json`.

1. Siapkan database PostgreSQL (mis. [Neon](https://neon.tech) — ada integrasi langsung dari dashboard Vercel). Gunakan **pooled connection string** (host `-pooler` di Neon) karena tiap cold start serverless membuka koneksi baru.
2. Di project Vercel, set environment variable:
   - `DATABASE_URL` — connection string Postgres di atas.
3. Import repo ini ke Vercel (New Project → pilih repo GitHub). Vercel akan otomatis menjalankan `npm run vercel-build` (didefinisikan di `package.json`), yang melakukan: `prisma generate` → `prisma migrate deploy` (menerapkan skema ke database) → `vite build`.
4. Setelah deploy pertama berhasil, akun `admin`/`admin` (Super Admin) otomatis ter-seed saat request pertama ke API — **segera login dan ganti password ini**.

Untuk hosting Node.js tradisional (server selalu hidup, mis. Render/Railway/VPS) tetap bisa pakai `npm start` seperti biasa — `server/index.ts` tidak berubah perilakunya di luar Vercel.

## Catatan Keamanan

Riwayat audit keamanan, temuan, dan perbaikan yang sudah dilakukan pada backend aplikasi ini didokumentasikan di [`proses.md`](./proses.md).
