# AsetTrack — UI/UX Mockup (prototipe interaktif MLL)

Prototipe antarmuka **AsetTrack** untuk siklus opname aset yayasan, sesuai **PRD v1.0** (Minimum Lovable Loop) dan **Full Project Plan Agile** tim 5 orang.

**Stack:** Next.js (App Router) · **Supabase (Postgres + Auth)** · React · `qrcode`.

> **Riwayat:** awalnya mockup memakai SQLite lokal (`better-sqlite3` / `node:sqlite`). Seluruh data kini disimpan di **Supabase** (project `bewrqibazwwlfyasdjrj`) pada tabel `organization`, `asset`, `activity`, ditambah `license`, `token_ledger`, `paid_order`, `app_admin`. **Autentikasi (login/register) sudah aktif** dan data terisolasi per akun lewat RLS.

## Menjalankan

```bash
cp .env.example .env.local   # isi 4 variabel (lihat .env.example)
npm install                  # sekali
npm run dev                  # http://localhost:3000
npm run build                # build produksi
npm start                    # jalankan hasil build
```

Environment yang dibaca (lihat `.env.example`):

| Variabel | Dipakai oleh | Wajib |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | sisi server (API routes) | ya |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser & middleware | ya |

> Di **Netlify**, tambahkan keempat variabel tersebut di *Site settings → Environment variables*. Nilai `NEXT_PUBLIC_*` ikut ter-bundle ke klien (aman, hanya publishable/anon key).

### Setting Supabase Auth (sekali)

Secara default Supabase mewajibkan **konfirmasi email** saat daftar, sehingga pengguna baru belum bisa login sebelum mengeklik tautan di email.

- **Untuk demo/uji cepat:** matikan konfirmasi di *Supabase Dashboard → Authentication → Sign In / Providers → Email → matikan "Confirm email"*. Setelah itu, daftar → langsung masuk.
- **Untuk produksi:** biarkan menyala. Halaman register sudah menangani kasus "cek email untuk konfirmasi".
- **Jika email rate-limit** saat uji (batas kirim email Supabase), konfirmasi satu akun manual via SQL: `update auth.users set email_confirmed_at = now() where email = 'akun@contoh.id';`

## Akun, login & register

- **/login** — masuk (email + password).
- **/register** — daftar: nama organisasi, jenis, email, password. Setiap akun otomatis mendapat **organisasi sendiri (per pengguna)** yang di-*seed* dengan 19 aset contoh, sehingga dashboard langsung terisi.
- **Akun pertama** yang mendaftar otomatis menjadi **admin platform** (boleh mengimpor daftar pesanan lynk.id).
- Semua halaman aplikasi dilindungi middleware: pengguna belum login diarahkan ke `/login`; panggilan API tanpa sesi dibalas **401**.
- **Isolasi data:** RLS menggunakan `auth.uid()` — organisasi, aset, aktivitas, lisensi, dan token tiap akun hanya terlihat oleh pemiliknya.

## Paket Gratis vs Pro

| | **Gratis** (Rp0) | **Pro** (Rp49.000 sekali beli) |
|---|---|---|
| Jumlah aset | ≤ 100 | ≤ 5.000 |
| Pengguna | 1 | sampai 10 |
| Impor / scan / cetak label | ✓ | ✓ |
| Ekspor laporan | 3× total | tanpa batas (potong token) |
| Pengingat WhatsApp | — | 5 token / 100 pesan |
| Saldo token | — | **50 token** |

Batas paket didefinisikan di `lib/tokens.js` (`PLAN_LIMITS`). **Semua angka = asumsi**, mudah diubah di satu tempat.

### Alur gratis → bayar
1. **Daftar** (email + password) → **login** → otomatis dapat paket **Gratis**.
2. Pakai fitur gratis (batas 100 aset, ekspor laporan 3×). Bila kuota habis, aksi ditolak (HTTP 403) dengan ajakan upgrade.
3. Butuh lebih → di **/upgrade** klik **"Beli sekarang"** → bayar di **lynk.id**.
4. Admin mengimpor daftar pesanan lynk.id (ekspor CSV) via kartu **Admin** di `/upgrade` → tersimpan di tabel `paid_order`.
5. Pembeli memasukkan **email** + **kode pesanan** di `/upgrade` → lisensi aktif + **50 token** (tercatat di `token_ledger`), paket naik ke **Pro**.
6. Aksi premium Pro memotong token; bila token kurang, aksi ditolak (HTTP 402).

> **Keamanan aktivasi:** verifikasi kode pesanan dijalankan lewat fungsi database **SECURITY DEFINER** (`activate_license`) — tabel `paid_order` tidak dapat dibaca langsung oleh pengguna, sehingga tidak ada email pembeli lain yang bocor dan tidak ada cara mengaktifkan diri sendiri tanpa kode.

## Integrasi lynk.id & sistem token

Penjualan paket Pro memakai **lynk.id**. Konfigurasi produk & biaya token ada di `lib/tokens.js`.

- **Produk:** `AsetTrack Pro — 50 Token`, harga **Rp49.000**, checkout: `https://lynk.id/lensetek/1dzzgxkxlqkg/checkout`.
- **Token = kuota aksi premium.** Aksi inti (impor, scan, update, lihat daftar, **cetak label**) **tidak** memakai token.
- **Biaya token di paket Pro (asumsi):** ekspor laporan 1 token / laporan · pengingat WhatsApp 5 token / 100 pesan · anggota tim tambahan 10 token / user / bulan.

### Endpoint terkait
| Endpoint | Fungsi |
|---|---|
| `GET /api/license` | Paket, batas, saldo token, riwayat, status admin |
| `POST /api/license/activate` | `{ email, orderRef }` → aktifkan & beri 50 token |
| `GET /api/orders` | Daftar pesanan lynk.id (khusus admin) |
| `POST /api/orders` | Impor pesanan (body `{ csv }` atau `{ orders }`, khusus admin) |
| `GET /api/stats` | Statistik beranda (ter-scope akun) |
| `GET /api/assets` · `POST /api/import` · `POST /api/action` · `POST /api/print` | Data aset, impor, aksi scan/update, tandai label |
| `POST /api/export` | Catat ekspor laporan (Gratis: maks 3×; Pro: potong token) |

## Skema database (Supabase)

| Tabel | Isi |
|---|---|
| `organization` | Yayasan per akun (nama, jenis, plan, **`owner_id`** → `auth.users`) |
| `asset` | Aset: `code` (unik **per organisasi**), `organization_id`, nama, kategori, lokasi, PIC, nilai, kondisi, status, status cetak, jumlah scan |
| `activity` | Audit trail: SCAN / UPDATE_KONDISI / PINDAH / PINJAM / KEMBALI / CETAK / EXPORT (`org_id`) |
| `license` | Lisensi Pro per akun (`owner_id`, saldo `token_balance`, status) |
| `token_ledger` | Riwayat pemakaian/penambahan token |
| `paid_order` | Daftar pesanan lynk.id (diakses hanya lewat fungsi SECURITY DEFINER / admin) |
| `app_admin` | Daftar email admin platform (deny-all RLS; hanya fungsi definer) |

### Fungsi database
| Fungsi | Fungsi |
|---|---|
| `bootstrap_user(nama, jenis)` | Buat organisasi + seed aset contoh untuk `auth.uid()`; pengguna pertama → admin |
| `activate_license(email, kode)` | Verifikasi kode pesanan lynk.id → aktifkan lisensi + 50 token |
| `is_admin()` | Cek apakah pengguna adalah admin platform |

## Halaman (alur MLL: impor → label → scan → update → laporan)

| Rute | Isi | FR terkait (PRD) |
|---|---|---|
| `/login`, `/register` | Autentikasi (Supabase Auth) | FR-21 |
| `/` | Beranda: statistik, checklist 5 langkah, kartu paket, aktivitas terakhir | FR-15 |
| `/aset` | Daftar aset: cari, filter lokasi/kondisi/tercetak, badge kondisi & status | FR-03 |
| `/impor` | **Impor data**: unduh template, upload CSV, pratinjau + baris bermasalah; dibatasi kuota aset paket | FR-01, FR-02, FR-04 |
| `/label` | **Cetak label QR**: QR level-H + teks cadangan, preset A4 (2×2 / 3×3 / 4×2), cetak nyata (`window.print`), tandai tercetak | FR-05 s.d. FR-08 |
| `/scan` | **Scan & update**: simulasi scan kamera, ketik kode manual, error menuntun, 3 aksi, audit trail | FR-09 s.d. FR-13 |
| `/laporan` | **Laporan opname**: filter, ringkasan per lokasi/kondisi, unduh CSV; Gratis maks 3×, Pro potong token | FR-14 |
| `/upgrade` | **Upgrade Pro**: status paket, paket & harga, beli **lynk.id**, aktivasi token, riwayat, impor pesanan (admin) | FR-16 (monetisasi) |

## Struktur

```
middleware.js            # proteksi rute + refresh sesi (redirect /login, 401 untuk /api)
app/
  login/  register/      # halaman auth
  auth/callback/         # callback konfirmasi email / magic link
  page.jsx               # Beranda
  aset/  impor/  label/  scan/  laporan/  upgrade/
  api/                   # Route handlers (Supabase)
    auth/ assets/ import/ action/ print/ export/ stats/
    license/  license/activate/  orders/
lib/
  db.js                  # lapisan data (organization/asset/activity), ter-scope akun
  license.js             # lisensi, token, pesanan (admin)
  tokens.js              # produk, harga, biaya token, batas paket
  supabase/server.js     # klien server ber-cookie (RLS auth.uid())
  supabase/client.js     # klien browser (login/register/logout)
components/              # Nav, ui (badge, stat, toast, dst)
```

## Catatan mockup vs produksi (batas yang disengaja)

- **Kamera = simulasi.** Klik "Scan label" → animasi → aset berikutnya yang belum discan. Versi produksi: kamera PWA offline-first.
- **Import = CSV.** Versi produksi: Excel (.xlsx) dengan error per-baris penuh.
- **Multi-akun sudah ada** (Supabase Auth + RLS per `owner_id`). Belum ada: multi-staf per organisasi (undangan & peran), reset password UI, dan verifikasi pembayaran otomatis (webhook lynk.id).
- **UI mengikuti NFR-06**: mobile-first, Bahasa Indonesia sederhana, tombol ≥48px, kontras tinggi, pesan error menuntun.
- Setiap aksi tercatat di tabel `activity` (audit trail) — dasar metrik aktivasi (FR-18/19).

Dokumen induk: `../PostMortem/`, `../StudiKelayakan/`, `../ProjectPlan/`, `../PRD/`.
