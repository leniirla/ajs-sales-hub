# Proses & Catatan Kerja

Dokumen ini berisi catatan perjalanan kerja, temuan masalah, dan rencana perbaikan bertahap untuk aplikasi Faktur & Laporan Penjualan. Update status di setiap item seiring pengerjaan.

---

## 1. Riwayat Perjalanan

### 2026-07-16 — Migrasi data legacy (localStorage) ke database
- Sumber data: `legacy-data-backup-2026-07-16.json` (hasil export localStorage browser).
- Isi backup: 17 customers, 24 invoices, 7 products, 3 salesmen, 4 users, 24 surat jalan, 0 returns, 201 activity logs, 7 monthly commission rates, 1 settings.
- Backup database lama sebelum ditimpa disimpan di `prisma/dev.db.bak-20260716185819` (boleh dihapus kalau sudah yakin tidak diperlukan lagi).
- Dibuat script sekali-pakai `server/scripts/restoreLegacyBackup.ts` yang:
  1. Menghapus seluruh isi tabel di database (`prisma/dev.db`).
  2. Mengimpor ulang semua data dari file backup JSON, mempertahankan ID asli agar relasi (customerId, invoiceId, dst.) tetap konsisten.
  3. Menjalankan ulang sinkronisasi Surat Jalan untuk tiap invoice.
- Hasil verifikasi setelah restore: jumlah baris di tiap tabel cocok 1:1 dengan file backup.
- Dev server (`npm run dev`) dijalankan ulang, login dicoba (`admin` / `admin`), dan data customers/invoices dikonfirmasi tampil lewat API.

### 2026-07-16 — Audit keamanan & kekurangan aplikasi (manual review, tanpa git)
- Folder proyek bukan git repo sehingga skill `/security-review` otomatis tidak bisa dipakai; dilakukan review manual dengan membaca seluruh `server/routes/*.ts`, `server/auth.ts`, `server/index.ts`.
- Temuan utama dibuktikan langsung dengan request nyata ke API (bukan cuma dugaan dari baca kode):
  - Login sebagai user `yudi` (role *director*, semua permission di UI = `false`) berhasil:
    - Membuat user baru dengan role `super_admin` lewat `POST /api/users`.
    - Menghapus data customer lewat `DELETE /api/customers/:id`.
  - Setelah pembuktian, artefak uji coba (`hacker_by_yudi`, customer yang terhapus) **sudah dibersihkan/dipulihkan** — data kembali ke kondisi normal (17 customers, 4 users).

### 2026-07-16 — Tahap 1: Tutup privilege escalation di manajemen user & import-legacy
- Ditambahkan `requirePermission(key)` dan `requireSuperAdmin` middleware di `server/auth.ts`. `requireAuth` sekarang juga menyimpan `role` + `permissions` user ke `req.authUser` (dibaca dari `permissionsJson`, sama seperti yang dipakai UI) supaya bisa dicek di server.
- `server/routes/users.ts`:
  - `POST /` (create user) → sekarang wajib `requireSuperAdmin`.
  - `PUT /:id` → non-super_admin hanya boleh update dirinya sendiri, dan hanya field password (username/name/role/allowedTabs/permissions diabaikan kalau bukan super_admin atau bukan diri sendiri). Update ke user lain ditolak 403.
  - `DELETE /:id` → sekarang wajib `requireSuperAdmin`.
- `server/index.ts`: route `/api/import-legacy` sekarang dipasangi `requireSuperAdmin` (sebelumnya cuma `requireAuth`).
- Verifikasi manual dengan request nyata ke server dev yang jalan (`localhost:3001`):
  - Login sebagai `yudi` (role *director*) → `POST /api/users` bikin akun `super_admin` → **ditolak 403** (`"Hanya Super Admin yang dapat melakukan aksi ini."`). Sebelumnya ini berhasil (lihat temuan 2026-07-16 di atas).
  - `yudi` coba `PUT /api/users/user-admin` untuk ganti role admin lain → **ditolak 403**.
  - `yudi` ganti password akun sendiri lewat `PUT /api/users/:ownId` → **berhasil** (masih bisa self-service).
  - `yudi` panggil `POST /api/import-legacy` → **ditolak 403**.
  - `admin` (super_admin) tetap bisa create/delete user normal → dicoba buat user tes lalu dihapus lagi, kembali ke 4 user semula.
  - `npx tsc --noEmit` lewat tanpa error.
- **Belum dikerjakan** (masih di backlog Tahap 2 ke bawah): route lain (customers, products, salesmen, invoices, returns, settings, activity-logs, surat-jalan) masih belum ada pengecekan permission di server — dibuktikan `DELETE /api/customers/:id` masih 200 untuk `yudi`. Session masih belum ada TTL. Rate limiting login belum ada.

### 2026-07-16 — Tahap 2: Perluas RBAC ke seluruh route mutasi (customers, products, salesmen, invoices, returns, settings, activity-logs, surat-jalan, commissions)
- Dipasang `requirePermission(key)` di semua route mutasi (POST/PUT/PATCH/DELETE) yang sebelumnya hanya dilindungi `requireAuth`:
  - `customers.ts`, `products.ts` → `canManageMasterData`.
  - `salesmen.ts` → `canManageSalesman`.
  - `invoices.ts` → POST `canCreateInvoice`, PUT `canEditInvoice`, PATCH `/status` `canPayInvoice`, DELETE `canDeleteInvoice`.
  - `returns.ts` → `canProcessReturn`.
  - `settings.ts` → PUT `canEditSettings`.
  - `suratJalans.ts` → PUT `canManageSuratJalan`.
  - `activityLogs.ts` → DELETE (clear logs) `canClearLogs` (POST log-write tetap terbuka untuk semua user login, karena itu aksi pencatatan otomatis, bukan aksi berbahaya).
  - `commissions.ts` → PUT `/rates/:key` `canEditCommissionRate`, PUT `/payments/:key` `canPayCommission`.
- Semua route GET (read) tetap hanya `requireAuth`, tidak dibatasi permission (sesuai desain awal: semua user login boleh lihat data, hanya aksi tulis yang dibatasi).
- `npx tsc --noEmit` (dijalankan via `node ./node_modules/typescript/bin/tsc --noEmit` karena path folder mengandung `&` yang bikin shim `.bin` gagal) → lewat tanpa error.
- Verifikasi manual dengan dev server yang dijalankan ulang (proses lama di port 3001 dimatikan dulu supaya kode baru terpakai):
  - Login sebagai `yudi` (director, semua permission `false`) → `DELETE /api/customers/:id`, `POST /api/invoices`, `PUT /api/settings`, `DELETE /api/activity-logs` **semua ditolak 403**. Sebelumnya `DELETE /api/customers/:id` ini terbukti berhasil (200) — sekarang tertutup.
  - Data customers tetap 17 (tidak ada yang terhapus) setelah percobaan delete oleh `yudi`.
  - Login sebagai `admin` (super_admin) → `GET /api/customers` dan `PUT /api/settings` tetap **200**, tidak ada regresi untuk role yang berhak.
- **Belum dikerjakan**: session TTL, rate limiting login, validasi kekuatan password (Tahap 3); helmet, validasi skema input, error handling silent-catch (Tahap 4); bersih-bersih file backup JSON berisi password plaintext (Tahap 5).

### 2026-07-16 — Tahap 3: Perkuat sesi & login (session TTL, rate limiting, validasi password)
- **Session TTL**: tambah kolom `Session.expiresAt` (migration `20260716123112_add_session_expiry`, memaksa semua sesi lama terhapus/re-login karena tidak ada default yang masuk akal untuk sesi pra-TTL). `server/auth.ts` menambah `SESSION_TTL_MS` (30 hari) dan `requireAuth` sekarang cek + hapus sesi kedaluwarsa.
- **Rate limiting login**: paket `express-rate-limit` dipasang (`npm install express-rate-limit`), `POST /api/auth/login` dibatasi 10 percobaan/15 menit per IP+username (`server/routes/auth.ts`).
- **Validasi kekuatan password**: `validatePasswordStrength()` baru di `server/auth.ts` (min 8 karakter, tidak boleh sama dengan username), dipasang di `POST /api/users` dan `PUT /api/users/:id`.
- `node ./node_modules/typescript/bin/tsc --noEmit` lewat tanpa error (perintah biasa `npx tsc` gagal karena nama folder proyek mengandung `&` yang bikin shim `.bin` salah parse path — workaround: panggil `node_modules/typescript/bin/tsc` langsung lewat `node`, atau `node node_modules/prisma/build/index.js` untuk CLI Prisma).
- Verifikasi manual dengan dev server (`npm run dev:server`) yang di-restart setelah tiap perubahan:
  - Login `admin` → cek langsung ke `prisma/dev.db` (`better-sqlite3`) → kolom `expiresAt` terisi ~30 hari ke depan.
  - Paksa `expiresAt` sebuah sesi ke masa lalu via query DB → request pakai token itu → **401**, baris sesi otomatis terhapus.
  - 10x percobaan login `admin` dengan password salah → semua **401**; percobaan ke-11+ → **429** (rate limited).
  - Buat user baru dengan password `"123"` → **400** (kurang dari 8 karakter); password sama dengan username → **400**; password kuat → berhasil, user tes dihapus lagi setelah verifikasi (jumlah user kembali ke 4).
- **Belum dikerjakan**: helmet, validasi skema input (zod), perbaiki `.catch(() => null)` yang menelan error (Tahap 4); bersih-bersih file backup JSON berisi password plaintext (Tahap 5).

### 2026-07-17 — Tahap 4 & 5: Pengerasan umum + bersih-bersih data sensitif (selesai semua)
- **Helmet**: dipasang di `server/index.ts` sebelum `express.json()` dan semua router — `app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }))`. CSP sengaja dimatikan karena build SPA belum diaudit terhadap policy ketat (berisiko memblokir asset/inline script Vite tanpa testing menyeluruh); header lain (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, dll) tetap aktif. Diverifikasi lewat `curl -i` ke endpoint login — header-header tersebut muncul di response.
- **Validasi skema input (zod)**: paket `zod` dipasang. Dibuat `server/validation.ts` berisi skema untuk setiap entity (customer, product, salesman, invoice + status, return, settings, surat jalan update, activity log, commission rate/payment, user create/update, dan skema longgar untuk `import-legacy`) plus middleware `validateBody(schema)`. Dipasang di **semua** handler POST/PUT/PATCH yang sebelumnya menerima `req.body` tanpa validasi apa pun:
  - `customers.ts`, `products.ts`, `salesmen.ts` → POST + PUT.
  - `invoices.ts` → POST + PUT (`invoiceSchema`), PATCH `/status` (`invoiceStatusSchema`, sekarang menolak nilai selain `paid`/`unpaid`).
  - `returns.ts` → POST + PUT.
  - `settings.ts` → PUT.
  - `suratJalans.ts` → PUT.
  - `activityLogs.ts` → POST.
  - `commissions.ts` → PUT `/rates/:key` dan PUT `/payments/:key`.
  - `users.ts` → POST (`userCreateSchema`, menambah validasi enum `role`) dan PUT (`userUpdateSchema`, semua field opsional karena route ini juga dipakai untuk update partial oleh non-admin).
  - `importLegacy.ts` → skema longgar (`.passthrough()` di tiap entity) karena route ini memang mencerminkan snapshot localStorage penuh; validasi hanya menjaga field kunci (`id`/`username`) tidak kosong supaya transaksi tidak crash, bukan memvalidasi seluruh bentuk bisnis tiap entity.
  - Body yang tidak valid sekarang dibalas `400` dengan pesan `"Data yang dikirim tidak valid."` plus detail field yang salah (`error.flatten()`), bukan diteruskan mentah-mentah ke Prisma (yang sebelumnya bisa membuahkan crash 500 tak terduga).
- **Perbaiki `.catch(() => null)` yang menelan error**: dibuat helper `deleteOrError()` di `server/prismaErrors.ts` yang memetakan kode error Prisma ke response yang sesuai — `P2025` (record tidak ditemukan) → `404`, `P2003` (FK constraint) → `409` dengan pesan yang menjelaskan data masih terkait data lain, error lain → `500` (dicatat ke `console.error` juga, tidak lagi didiamkan). Dipasang menggantikan pola lama di 6 lokasi: `customers.ts`, `products.ts`, `salesmen.ts`, `invoices.ts`, `returns.ts`, `users.ts` (route delete). Pola `.catch(() => null)` di `server/auth.ts:46` (pembersihan sesi kedaluwarsa, best-effort) sengaja **tidak** diubah karena bukan aksi yang perlu dilaporkan ke client.
- **Bersih-bersih data sensitif (Tahap 5)**: `legacy-data-backup-2026-07-16.json` (berisi password plaintext di beberapa field, termasuk kredensial akun `admin` yang masih aktif) dan `prisma/dev.db.bak-20260716185819` **dipindahkan keluar dari folder proyek** ke `../secure-backups-faktur/` (satu level di atas root proyek) — bukan dihapus, supaya tetap bisa diakses manual kalau suatu saat diperlukan, tapi tidak lagi tersebar di dalam folder yang bisa ikut ter-share/ter-commit. `.gitignore` ditambah pola `legacy-data-backup-*.json` dan `prisma/*.db.bak-*` untuk jaga-jaga kalau proyek ini di-`git init` di kemudian hari sebelum sempat dibersihkan lagi.
- **Verifikasi manual** (dev server `tsx watch` yang sudah berjalan otomatis memuat ulang kode baru):
  - `node ./node_modules/typescript/bin/tsc --noEmit` → lewat tanpa error.
  - Header helmet muncul di response `POST /api/auth/login` (`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, dst.).
  - `POST /api/customers` dengan body tanpa `name` → **400** dengan detail field yang hilang; dengan body valid → **201** berhasil dibuat.
  - Data customer & invoice **asli** (bukan data uji) di-`GET` lalu di-`PUT` kembali apa adanya → tetap **200**, membuktikan skema zod tidak menolak bentuk data produksi yang sudah ada (tidak ada regresi).
  - `PATCH /api/invoices/:id/status` dengan `{"status":"whoops"}` → **400**, ditolak karena bukan `paid`/`unpaid` (sebelumnya nilai apa pun diterima mentah-mentah).
  - `DELETE /api/customers/:id` dua kali berturut-turut pada id yang sama → panggilan pertama **200** (`{ok:true}`), panggilan kedua **404** dengan pesan "tidak ditemukan" (sebelumnya: kedua panggilan sama-sama membalas `200` palsu karena error didiamkan). Customer uji dihapus lagi setelah verifikasi, tidak ada sisa data tes.
- **Status backlog**: kelima tahap di rencana pengerjaan (§3) sudah selesai semua. Tidak ada temuan baru yang belum ditindaklanjuti per hari ini.

### 2026-07-17 — Temuan tambahan: `GET /api/settings` bisa diakses tanpa login sama sekali
- Saat diminta cek ulang apakah masih ada temuan tersisa, ditemukan (dan dibuktikan langsung lewat `curl` tanpa header `Authorization` sama sekali) bahwa `GET /api/settings` membalas **200** dengan data lengkap (pricing tier, diskon, nama/alamat/telepon/logo perusahaan) — satu-satunya endpoint GET di seluruh API yang tidak menuntut sesi login, sementara `GET /api/customers`, `/api/invoices`, `/api/users` semuanya benar membalas 401 tanpa token.
- Penyebab: di `server/index.ts`, semua router lain dipasang sebagai `app.use('/api/x', requireAuth, xRouter)`, tapi settings dipasang tanpa `requireAuth` di level mount (`app.use('/api/settings', settingsRouter)`) — proteksi `requireAuth` cuma nempel inline di handler `PUT`, jadi `GET` kebobolan.
- Diperbaiki: `server/index.ts` sekarang `app.use('/api/settings', requireAuth, settingsRouter)`, dan `requireAuth` inline yang jadi redundan di `settingsRouter.put('/', ...)` (`server/routes/settings.ts`) dihapus (importnya juga dibersihkan, tinggal `requirePermission('canEditSettings')`).
- Diverifikasi: `GET /api/settings` tanpa token → sekarang **401**; dengan token valid → tetap **200**; `PUT /api/settings` oleh user berhak → tetap berfungsi normal.
- **Catatan**: ini menunjukkan proses audit di Tahap 1-2 sebelumnya cukup fokus pada endpoint mutasi (POST/PUT/PATCH/DELETE) dan kurang menyisir kelengkapan `requireAuth` di level *mounting* untuk semua endpoint GET satu per satu. Sudah dicek ulang manual bahwa semua router lain (`users`, `customers`, `products`, `salesmen`, `invoices`, `surat-jalans`, `returns`, `activity-logs`, `commissions`, `import-legacy`) memang benar dipasangi `requireAuth` di `server/index.ts` — settings adalah satu-satunya pengecualian yang lolos sebelumnya.

### 2026-07-17 — Temuan tambahan #2: `POST /api/activity-logs` menerima `username` dari client — bisa dipalsukan
- Diminta cek ulang sekali lagi apakah masih ada temuan tersisa; kali ini disisir bagian *integritas data* (bukan cuma access control), dan ditemukan `server/routes/activityLogs.ts` menulis `username: req.body.username` — field identitas pelaku aksi diambil mentah dari body request, bukan dari sesi login yang sudah diverifikasi (`req.authUser`).
- **Dibuktikan langsung**: login sebagai `admin`, lalu `POST /api/activity-logs` dengan `{"username":"yudi", ...}` di body → entri log tersimpan dengan `username: "yudi"`, padahal yang benar-benar melakukan aksi adalah `admin`. Artinya siapa pun yang login (role apa pun, endpoint ini memang sengaja terbuka untuk semua user login) bisa memalsukan log aktivitas atas nama user lain — bisa dipakai untuk memfitnah user lain atau menyembunyikan jejak aksi sendiri di balik nama orang lain. Ini soal integritas audit trail, bukan cuma soal siapa yang boleh akses.
- Diperbaiki: `server/routes/activityLogs.ts` sekarang selalu memakai `req.authUser?.username` (identitas dari sesi login terverifikasi), field `username` dihapus total dari `activityLogSchema` di `server/validation.ts` supaya tidak ada jalan lagi buat client mengirim/mempengaruhi field ini.
- Diverifikasi ulang: login sebagai `admin`, kirim body dengan `username: "yudi"` lagi → entri log yang tersimpan sekarang benar `username: "admin"` (identitas asli, klaim di body diabaikan sepenuhnya). Dua entri log uji coba selama pembuktian bug ini sudah dihapus lagi dari database.

### 2026-07-17 — Temuan tambahan #3: Server mempercayai total finansial faktur/retur dari client — bisa dipalsukan (fraud)

- Diminta cek ulang sekali lagi apakah masih ada temuan tersisa; kali ini disisir integritas *angka finansial*, bukan cuma access control/audit trail. Ditemukan `POST/PUT /api/invoices` dan `POST/PUT /api/returns` menyimpan `totalAmount`/`subtotal`/`totalPrice`/`totalRefundAmount` dkk **persis seperti yang dikirim client**, tanpa dihitung ulang dari harga produk/pelanggan yang sebenarnya di database. Skema `zod` (`validateBody`) cuma memastikan field-nya bertipe angka, tidak memvalidasi bahwa angkanya *benar* secara matematis.
- **Dibuktikan langsung**: login sebagai `admin`, kirim `POST /api/invoices` dengan 1 item (1000 pasang produk seharga tier normal Rp 130.000/pasang) tapi klaim `totalPrice`/`subtotal`/`totalAmount` = **Rp 1**. Sebelum perbaikan, server menyimpan mentah-mentah apa adanya (faktur senilai Rp 130 juta tercatat cuma Rp 1) — celah fraud langsung: user internal bisa membuat faktur nyata (barang benar-benar dikirim lewat Surat Jalan yang otomatis tersinkron) tapi tercatat nyaris gratis di laporan keuangan, atau sebaliknya menaikkan piutang pelanggan secara curang. Pola sama juga berlaku untuk retur (`totalRefundValue`/`totalRefundAmount` bisa dipalsukan untuk klaim refund lebih besar dari seharusnya).
- **Akar masalah**: perhitungan harga (`calculateFullInvoice` di `src/utils.ts` — termasuk diskon volume, harga bertingkat, surcharge ukuran, PPN, ongkir, packing fee) sebelumnya **hanya jalan di client** (`InvoiceForm.tsx`). Server tidak punya salinan logika ini sama sekali, jadi tidak bisa memverifikasi apa pun yang dikirim.
- **Diperbaiki**:
  - `server/pricing.ts` (baru): `recomputeInvoiceTotals(body)` — mengambil data customer & product & settings **dari database** (bukan dari body request), lalu memanggil ulang `calculateFullInvoice` yang sama persis dipakai UI, menghasilkan total yang otoritatif. Juga memaksa `remainingBalance` konsisten dengan `status` + jumlah cicilan tercatat (menutup celah "faktur diklaim Lunas tapi sisa tagihan masih ada" dari sisi server juga, bukan cuma UI).
  - `server/routes/invoices.ts` → `POST /` dan `PUT /:id` sekarang memanggil `recomputeInvoiceTotals()` dan memakai hasilnya (`recomputed.data`) untuk disimpan, mengabaikan total mentah dari client sepenuhnya. Kalau customer tidak ditemukan, dibalas `400`.
  - `server/routes/returns.ts` → ditambah `withRecomputedTotals(body)` yang menghitung ulang `totalRefundValue` tiap item (`returnedQuantity * unitRefundPrice`) dan `totalRefundAmount` (jumlah semua item) dari data yang sama-sama dikirim client tapi tidak bisa "dibohongi" totalnya secara terpisah, dipasang di `POST /` dan `PUT /:id`.
  - `PATCH /api/invoices/:id/status` juga diperbaiki agar `remainingBalance` dihitung dari `dpAmount` + jumlah `payments` yang benar-benar tersimpan di DB, bukan cuma diasumsikan nol/lunas.
- **Diverifikasi ulang lewat exploit yang sama**: `POST /api/invoices` dengan item 1000 pasang @ harga tier sebenarnya tapi klaim `totalAmount: 1` → server sekarang membalas **201** dengan `totalAmount` yang **dihitung ulang** = `130.000.000` (bukan `1`), item `unitPrice`/`totalPrice` juga dikoreksi ke harga tier yang benar. Diulang juga lewat `PUT /:id` (edit) dengan hasil sama — total tetap dikoreksi ke angka sebenarnya. Retur: klaim `totalRefundAmount: 1` untuk retur 100 pasang @ Rp 130.000 → server membalas `totalRefundAmount: 13.000.000` (dikoreksi). Regresi dicek dengan invoice normal (item wajar + DP) → tersimpan sesuai perhitungan tier yang benar, `remainingBalance` konsisten (`totalAmount - dpAmount`). Semua data uji coba (2 invoice tes, 1 retur tes) sudah dihapus lagi dari database setelah verifikasi.
- **Catatan**: field lain yang murni administratif (nomor faktur, tanggal, catatan, status pengiriman) tetap dipercaya dari client seperti sebelumnya — hanya angka finansial yang berasal dari kalkulasi harga yang sekarang dipaksa dihitung ulang di server.

### 2026-07-17 — Temuan tambahan #4: Request tunggal ke `PUT /api/invoices/:id` (atau route PUT/DELETE lain) dengan id yang tidak ada bisa mematikan seluruh server

- Diminta menyisir area lain di luar access control/integritas data — kali ini ketahanan server (DoS) & error handling. Ditemukan hampir semua handler route (`server/routes/*.ts`) adalah fungsi `async` biasa yang dipasang langsung ke Express **tanpa `try/catch`** dan tanpa pembungkus apa pun. Express 4 (versi yang dipakai di `package.json`) **tidak** menangkap promise yang reject di dalam handler seperti itu — begitu Prisma melempar error (mis. `update()` ke id yang tidak ada → kode `P2025`), itu jadi *unhandled promise rejection* di level Node, dan perilaku default Node adalah **mematikan seluruh proses**.
- **Dibuktikan langsung**: server dicek hidup (`GET /api/auth/me` → 401, artinya proses jalan), lalu dikirim satu request `PUT /api/invoices/does-not-exist-id` dengan body faktur valid tapi id yang tidak ada di database → request **tidak pernah dapat respons** (curl timeout, `HTTP 000`), dan log server menunjukkan proses Node benar-benar keluar (`PrismaClientKnownRequestError ... code: 'P2025'` diikuti crash, bukan 404 terkontrol). Dicek ulang `GET /api/auth/me` setelahnya → **tidak ada respons sama sekali** (server mati total, bukan cuma request itu yang gagal). Artinya **siapa pun yang login** dengan permission edit apa pun (`canEditInvoice`, `canManageMasterData`, dll — bukan cuma admin) bisa mematikan aplikasi untuk **semua pengguna** sekaligus, cukup dengan satu request salah (bahkan bisa tidak sengaja, misalnya submit form dari tab lama setelah data yang diedit sudah dihapus orang lain).
- **Akar masalah**: pola `async (req, res) => { ... await prisma.x.update(...) ... }` dipasang langsung tanpa pembungkus penangkap error di seluruh `server/routes/*.ts`, dan tidak ada middleware error-handling 4-argumen di `server/index.ts` sebagai jaring pengaman.
- **Diperbaiki**:
  - `server/asyncHandler.ts` (baru): wrapper `asyncHandler(fn)` yang menangkap promise reject dari handler dan meneruskannya ke `next(err)`, dipasang ke **semua** handler async di `auth.ts`, `customers.ts`, `products.ts`, `salesmen.ts`, `invoices.ts`, `returns.ts`, `settings.ts`, `suratJalans.ts`, `activityLogs.ts`, `commissions.ts`, `users.ts`, `importLegacy.ts`.
  - `server/index.ts`: ditambah middleware error-handling 4-argumen di akhir (setelah semua route) sebagai jaring pengaman terakhir — mencatat error ke `console.error` lalu membalas `500` generik, bukan membiarkan proses mati.
  - Tambahan: `PUT /:id` di `invoices.ts`, `returns.ts`, `customers.ts`, `products.ts`, `salesmen.ts`, `suratJalans.ts` sekarang mengecek dulu record-nya ada (`findUnique`) sebelum `update()`, jadi id yang tidak ada dibalas `404` yang jelas alih-alih mengandalkan Prisma melempar error dulu.
- **Diverifikasi ulang**: exploit yang sama (`PUT /api/invoices/does-not-exist-id`) sekarang dibalas **404** (`"Faktur tidak ditemukan (mungkin sudah terhapus)."`) dan server **tetap hidup** setelahnya (`GET /api/auth/me` kembali membalas 401 seperti biasa, bukan 000/timeout). Diulang untuk `customers`, `products`, `salesmen`, `returns`, `surat-jalans` dengan id palsu — semuanya sekarang **404** terkontrol, server tetap hidup di setiap percobaan. Regresi dicek: `GET /api/customers`, `GET /api/invoices`, dan `PUT /api/settings` dengan data asli (roundtrip fetch-lalu-simpan-ulang) semuanya tetap **200**, tidak ada perubahan perilaku untuk request yang valid.
- **Catatan**: ini murni soal ketahanan proses server (availability), bukan kebocoran data — pesan error yang dibalas ke client tetap generik (tidak ada stack trace/detail internal Prisma yang bocor, baik sebelum maupun sesudah perbaikan ini).

---

## 2. Daftar Temuan (Backlog Perbaikan)

Diurutkan dari yang paling kritis. Checklist bisa dicentang manual saat sudah dikerjakan.

### 🔴 Kritis — Broken Access Control / Privilege Escalation

- [x] **Tidak ada pengecekan role/permission di server.** *(Selesai — 2026-07-16)*
  Sistem permission (`canCreateInvoice`, `canDeleteInvoice`, `canManageMasterData`, dst.) yang tersimpan di `permissionsJson` user **dulu hanya dipakai untuk sembunyikan tombol di UI (client)**. Semua route Express (`server/index.ts`) hanya memakai `requireAuth` (cek "apakah login"), bukan "apakah berhak". Efeknya: siapa pun yang berhasil login — role apa pun — punya akses API setara admin penuh.
  - File terkait: `server/index.ts`, `server/auth.ts`, seluruh `server/routes/*.ts`.
  - Tahap 1 (2026-07-16): middleware `requirePermission(permissionKey)` + `requireSuperAdmin` dibuat di `server/auth.ts`, dipasang di `users.ts` dan `import-legacy`.
  - Tahap 2 (2026-07-16): `requirePermission` dipasang di seluruh route mutasi sisanya — customers, products, salesmen, invoices, returns, settings, activity-logs (clear), surat-jalan, commissions. Dibuktikan `DELETE /api/customers/:id` oleh user tanpa permission sekarang **403** (sebelumnya 200). Detail di §1.

- [x] **`POST /api/users` tidak membatasi siapa yang boleh membuat user & role apa yang boleh diberikan.** *(Selesai — 2026-07-16)*
  Dibuktikan: user role *director* berhasil membuat akun baru dengan role `super_admin`.
  - File: `server/routes/users.ts` baris ~14.
  - Diperbaiki: endpoint sekarang wajib `requireSuperAdmin`. Diverifikasi ulang: `yudi` (director) ditolak 403 saat mencoba lagi.

- [x] **`PUT /api/users/:id` tidak mengecek kepemilikan akun.** *(Selesai — 2026-07-16)*
  Semua user (bukan cuma admin) bisa mengganti password/role/username milik user lain, termasuk admin lain → bisa dipakai untuk account takeover.
  - File: `server/routes/users.ts` baris ~40.
  - Diperbaiki: non-super_admin hanya bisa update dirinya sendiri, dan hanya field password (field lain diabaikan). Update ke user lain ditolak 403. Super_admin masih bebas mengubah siapa saja.

- [x] **`server/routes/importLegacy.ts` bisa dipanggil siapa saja yang login.** *(Selesai — 2026-07-16)*
  Endpoint ini mass-upsert ke hampir semua tabel inti (customers, invoices, settings, users, dll). Saat ini hanya untuk migrasi satu kali, tapi tetap aktif dan tidak dibatasi role.
  - Diperbaiki: route `/api/import-legacy` di `server/index.ts` sekarang dipasangi `requireSuperAdmin`. Diverifikasi: `yudi` ditolak 403.

- [x] **`GET /api/settings` bisa diakses tanpa login sama sekali (tanpa token apa pun).** *(Selesai — 2026-07-17)*
  Dibuktikan lewat `curl` tanpa header `Authorization` → **200** dengan data pricing tier, diskon, dan info perusahaan (satu-satunya endpoint GET yang bocor seperti ini; endpoint GET lain semua sudah benar 401 tanpa token).
  - File: `server/index.ts` baris ~38 (mount `/api/settings` tidak diberi `requireAuth`, berbeda dari semua router lain).
  - Diperbaiki: `app.use('/api/settings', requireAuth, settingsRouter)`; `requireAuth` inline yang jadi redundan di handler PUT (`server/routes/settings.ts`) dihapus. Diverifikasi: tanpa token → 401, dengan token → 200, PUT tetap berfungsi.

- [x] **`POST /api/activity-logs` mempercayai `username` dari body request — bisa dipalsukan.** *(Selesai — 2026-07-17)*
  Dibuktikan: login sebagai `admin`, kirim `{"username":"yudi",...}` → log tersimpan atas nama `yudi` padahal pelaku sebenarnya `admin`. Merusak integritas audit trail (bisa dipakai memfitnah user lain / menyembunyikan jejak sendiri).
  - File: `server/routes/activityLogs.ts` baris ~35, `server/validation.ts` (`activityLogSchema`).
  - Diperbaiki: `username` sekarang selalu diambil dari `req.authUser?.username` (sesi terverifikasi), field `username` dihapus dari skema validasi supaya client tidak bisa mengirimkannya sama sekali. Diverifikasi: klaim `username` di body sekarang diabaikan total, log tersimpan dengan identitas asli.

- [x] **Server mempercayai total finansial faktur/retur dari client — bisa dipalsukan (fraud langsung).** *(Selesai — 2026-07-17)*
  Dibuktikan: kirim faktur berisi 1000 pasang produk (nilai sebenarnya Rp 130.000.000) tapi klaim `totalAmount: 1` → server sebelumnya menyimpan `Rp 1` mentah-mentah. Faktur nyata (barang benar terkirim via Surat Jalan otomatis) bisa tercatat nyaris gratis di laporan keuangan — ini bukan cuma soal akses, tapi soal integritas angka uang itu sendiri.
  - File: `server/pricing.ts` (baru, `recomputeInvoiceTotals`), `server/routes/invoices.ts` (POST/PUT/PATCH `/status`), `server/routes/returns.ts` (`withRecomputedTotals`, POST/PUT).
  - Diperbaiki: server sekarang menghitung ulang semua total dari data customer/product/settings **di database** (logika sama dengan `calculateFullInvoice` di client), lalu memakai hasil hitungan itu — bukan angka dari body request — untuk disimpan. Retur: `totalRefundValue`/`totalRefundAmount` dihitung ulang dari `returnedQuantity * unitRefundPrice`.
  - Diverifikasi: exploit yang sama (klaim `totalAmount: 1`) sekarang dibalas `201` tapi dengan `totalAmount` **terkoreksi** ke `130.000.000` (harga sebenarnya), begitu juga untuk retur. Invoice normal (tanpa manipulasi) tetap tersimpan sesuai perhitungan tier yang benar — tidak ada regresi.

- [x] **Satu request `PUT`/`DELETE` dengan id yang tidak ada bisa mematikan seluruh server (DoS untuk semua pengguna).** *(Selesai — 2026-07-17)*
  Dibuktikan: `PUT /api/invoices/does-not-exist-id` dengan body valid tapi id palsu → seluruh proses Node **mati total** (bukan cuma request itu gagal — dibuktikan `GET /api/auth/me` tidak merespons sama sekali setelahnya). Penyebab: handler `async` di Express 4 tidak otomatis menangkap promise reject, jadi error Prisma (`P2025`, record tidak ditemukan) jadi *unhandled rejection* yang mematikan proses. Bisa dipicu siapa pun yang login dengan permission edit apa pun, bahkan tidak sengaja (submit form basi setelah data dihapus orang lain).
  - File: `server/asyncHandler.ts` (baru), dipasang ke semua handler async di seluruh `server/routes/*.ts`; `server/index.ts` (middleware error-handling 4-argumen sebagai jaring pengaman terakhir).
  - Diperbaiki: semua route sekarang dibungkus `asyncHandler()` yang meneruskan error ke `next()` alih-alih membiarkan proses crash; route `PUT /:id` yang rawan (invoices, returns, customers, products, salesmen, surat-jalans) juga ditambah pengecekan `findUnique` dulu supaya id yang tidak ada dibalas `404` yang jelas.
  - Diverifikasi: exploit yang sama sekarang dibalas `404` terkontrol dan server **tetap hidup** setelahnya (dicoba ulang untuk 5 route berbeda, semuanya konsisten). Request valid (`GET`/`PUT` dengan data asli) tidak ada regresi.

### 🟠 Tinggi — Manajemen Sesi & Autentikasi

- [x] **Token sesi tidak pernah kedaluwarsa.** *(Selesai — 2026-07-16)*
  Model `Session` di `prisma/schema.prisma` tidak punya kolom `expiresAt`, dan `requireAuth` (`server/auth.ts`) tidak mengecek umur token. Sekali login, token berlaku selamanya sampai logout manual.
  - Diperbaiki: kolom `expiresAt` (DateTime, wajib) ditambahkan ke `Session` lewat migration `prisma/migrations/20260716123112_add_session_expiry`. Karena kolom wajib tanpa default yang masuk akal untuk sesi lama, migration ini **menghapus semua sesi aktif** (paksa re-login sekali) alih-alih memberi default sembarangan.
  - `SESSION_TTL_MS` (30 hari) ditambahkan di `server/auth.ts`; `POST /api/auth/login` (`server/routes/auth.ts`) sekarang set `expiresAt = now + 30 hari` saat membuat sesi. `requireAuth` mengecek `session.expiresAt <= now()`, kalau kedaluwarsa langsung hapus baris sesi dari DB dan balas 401.
  - Diverifikasi manual: paksa `expiresAt` sebuah sesi ke masa lalu lewat query DB langsung → request berikutnya dengan token itu **401** dan baris sesi terhapus otomatis dari tabel.

- [x] **Tidak ada rate limiting / lockout di `POST /api/auth/login`.** *(Selesai — 2026-07-16)*
  Rentan brute-force, apalagi beberapa password yang ada sekarang pendek/lemah (`admin`, `Yudi`, dll — lihat data user di backup).
  - Diperbaiki: paket `express-rate-limit` dipasang, `loginRateLimiter` di `server/routes/auth.ts` membatasi 10 percobaan / 15 menit per kombinasi IP + username (pakai `ipKeyGenerator` bawaan biar aman untuk IPv6).
  - Diverifikasi manual: 10 percobaan login salah beruntun untuk `admin` → semua **401**, percobaan ke-11 dan seterusnya (dalam window yang sama) **429** ("Terlalu banyak percobaan login...").
  - Catatan: rate limiter memakai in-memory store bawaan (cukup untuk instance server tunggal seperti sekarang); kalau nanti di-deploy multi-instance perlu store terpusat (mis. Redis).

- [x] **Tidak ada validasi kekuatan password** saat create/update user (`server/routes/users.ts`). *(Selesai — 2026-07-16)*
  - Diperbaiki: `validatePasswordStrength()` di `server/auth.ts` menolak password < 8 karakter atau password yang sama persis dengan username (case-insensitive). Dipasang di `POST /api/users` (create) dan `PUT /api/users/:id` (saat field password diisi).
  - Diverifikasi manual: buat user dengan password `"123"` → `400 "Password minimal 8 karakter."`; password sama dengan username → `400 "Password tidak boleh sama dengan username."`; password kuat (`Password123`) → berhasil dibuat, lalu dihapus lagi setelah verifikasi (user kembali ke 4).
  - Catatan: ini hanya berlaku untuk password baru/berubah — password lama yang sudah ada di DB (mis. `admin`/`admin`) tidak dipaksa ganti otomatis; perlu tindakan manual terpisah kalau mau dipaksa reset.

### 🟡 Sedang — Kualitas Kode & Pengerasan Umum

- [x] **Tidak ada `helmet` untuk security headers HTTP standar.** *(Selesai — 2026-07-17)*
  Dipasang `app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }))` di `server/index.ts` sebelum semua route. Diverifikasi header (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, dst.) muncul di response nyata.
- [x] **Tidak ada validasi skema input.** *(Selesai — 2026-07-17)*
  Dibuat `server/validation.ts` (skema `zod` per entity + middleware `validateBody`), dipasang di semua handler POST/PUT/PATCH: `customers.ts`, `products.ts`, `salesmen.ts`, `invoices.ts` (termasuk PATCH `/status`), `returns.ts`, `settings.ts`, `suratJalans.ts`, `activityLogs.ts`, `commissions.ts`, `users.ts`, `importLegacy.ts`. Body tidak valid dibalas `400` dengan detail field, bukan diteruskan mentah ke Prisma. Diverifikasi: body kosong/salah tipe ditolak 400, data produksi asli tetap lolos (tidak ada regresi).
- [x] **`.catch(() => null)` pada operasi `delete` menelan error secara diam-diam.** *(Selesai — 2026-07-17)*
  Dibuat helper `deleteOrError()` (`server/prismaErrors.ts`) yang memetakan `P2025`→404, `P2003`→409, error lain→500 (dicatat ke log). Dipasang di `customers.ts`, `products.ts`, `salesmen.ts`, `invoices.ts`, `returns.ts`, `users.ts`. Diverifikasi: delete id yang sama dua kali → panggilan kedua sekarang 404 (sebelumnya diam-diam tetap 200).
- [x] **Password user pernah tersimpan sebagai plaintext di file backup JSON.** *(Selesai — 2026-07-17)*
  `legacy-data-backup-2026-07-16.json` dan `prisma/dev.db.bak-20260716185819` dipindahkan keluar dari folder proyek ke `../secure-backups-faktur/`. `.gitignore` ditambah pola untuk kedua jenis file ini agar tidak ikut ter-commit kalau proyek ini di-`git init` di kemudian hari.

---

## 3. Rencana Pengerjaan Bertahap (Saran Urutan)

1. ✅ **Tahap 1 — Tutup lubang privilege escalation paling kritis** *(Selesai — 2026-07-16)*:
   - Middleware `requirePermission` + terapkan ke `users.ts` (create/update/delete) dan `importLegacy.ts` dulu.
2. ✅ **Tahap 2 — Perluas RBAC ke seluruh route mutasi** *(Selesai — 2026-07-16)* (customers, products, salesmen, invoices, returns, settings, activity-logs, surat-jalan, commissions).
3. ✅ **Tahap 3 — Perkuat sesi & login** *(Selesai — 2026-07-16)*: TTL session + rate limiting login + validasi password.
4. ✅ **Tahap 4 — Pengerasan umum** *(Selesai — 2026-07-17)*: helmet, validasi skema input (`zod`), perbaiki error handling silent-catch.
5. ✅ **Tahap 5 — Bersih-bersih data sensitif** *(Selesai — 2026-07-17)*: file backup JSON & `.db.bak` lama dipindahkan keluar folder proyek, `.gitignore` diperbarui.

> Catatan: kerjakan satu tahap → verifikasi manual (login sebagai user dengan permission terbatas, coba akses endpoint yang seharusnya ditolak) → baru lanjut tahap berikutnya.
>
> **Semua tahap di rencana ini sudah selesai per 2026-07-17.** Tidak ada temuan tersisa di backlog §2 yang belum ditandai selesai.
