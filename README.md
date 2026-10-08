# AsetTrack — UI/UX Mockup (prototipe interaktif MLL)

Prototipe antarmuka **AsetTrack** untuk siklus opname aset yayasan, sesuai **PRD v1.0** (Minimum Lovable Loop) dan **Full Project Plan Agile** tim 5 orang.

**Stack:** Next.js (App Router) · **Supabase (Postgres)** · React · `qrcode`.

> **Riwayat:** awalnya mockup memakai SQLite lokal (`better-sqlite3` / `node:sqlite`). Seluruh data lokal (1 organisasi · 19 aset · 25 aktivitas) kini **dimigrasikan ke Supabase** (project `bewrqibazwwlfyasdjrj`) pada tabel `organization`, `asset`, `activity` — agar dapat dideploy ke Netlify (filesystem ephemeral).

## Menjalankan

```bash
cp .env.example .env.local   # isi SUPABASE_URL + SUPABASE_ANON_KEY
npm install                  # sekali
npm run dev                  # http://localhost:3000
npm run build                # build produksi
npm start                    # jalankan hasil build
```

Konfigurasi koneksi Supabase dibaca dari environment (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), lihat `.env.example`. Kredensial asli disimpan di `.env.local` (tidak di-commit).

### Skema database (Supabase)

| Tabel | Isi |
|---|---|
| `organization` | Data yayasan (nama, jenis, plan) |
| `asset` | Aset: `code` (unik), nama, kategori, lokasi, PIC, nilai, kondisi, status, status cetak, jumlah scan |
| `activity` | Audit trail aksi: SCAN / UPDATE_KONDISI / PINDAH / PINJAM / KEMBALI / CETAK / EXPORT |

> **Catatan keamanan (mockup):** karena belum ada autentikasi, RLS diaktifkan dengan policy longgar untuk role `anon`. **Perketat** (batasi per user/organisasi) begitu Supabase Auth diaktifkan.

## Halaman (alur MLL: impor → label → scan → update → laporan)

| Rute | Isi | FR terkait (PRD) |
|---|---|---|
| `/` | Beranda Bu Ratna: statistik, **checklist 5 langkah aktivasi**, menu cepat, aktivitas terakhir | FR-15 |
| `/aset` | Daftar aset: cari, filter lokasi/kondisi/tercetak, badge kondisi & status | FR-03 |
| `/impor` | **Impor data**: unduh template, upload CSV, pratinjau + baris bermasalah (duplikat/kosong) sebelum disimpan | FR-01, FR-02, FR-04 |
| `/label` | **Cetak label QR**: QR level-H + teks cadangan, preset A4 (2×2 / 3×3 / 4×2), cetak nyata (`window.print`), tandai tercetak | FR-05, FR-06, FR-07, FR-08 |
| `/scan` | **Scan & update**: simulasi scan kamera, ketik kode manual, error menuntun, 3 aksi (kondisi/lokasi/pinjam-kembali), audit trail | FR-09 s.d. FR-13 |
| `/laporan` | **Laporan opname**: filter, ringkasan per lokasi/kondisi, unduh CSV (ringkasan & rincian), tercatat sebagai "export" | FR-14 |
| `/upgrade` | **Upgrade Pro**: paket & harga, tombol beli **lynk.id**, aktivasi token, tabel biaya token, impor pesanan (admin) | FR-16 (monetisasi) |

## Integrasi lynk.id & sistem token

Penjualan paket Pro memakai **lynk.id**. Konfigurasi produk & biaya token ada di `lib/tokens.js` (semua angka = **asumsi**, mudah diubah).

- **Produk:** `AsetTrack Pro — 50 Token`, harga **Rp49.000**, checkout: `https://lynk.id/lensetek/1dzzgxkxlqkg/checkout`.
- **Token = kuota aksi premium.** Aksi inti (impor, scan, update, lihat daftar) **tidak** memakai token.
- **Biaya token (asumsi):** cetak label 1 token / 50 label · ekspor laporan 1 token / laporan · pengingat WhatsApp 5 token / 100 pesan · anggota tim tambahan 10 token / user / bulan.

### Alur beli → aktivasi → pakai
1. Pembeli membayar di **lynk.id** (tombol "Beli sekarang" di `/upgrade`).
2. Admin memuat daftar pesanan lynk.id (ekspor CSV) via kartu **Admin** di `/upgrade` → `POST /api/orders` → tersimpan di tabel `paid_order`.
3. Pembeli membuka `/upgrade`, mengisi **email** + **kode pesanan** → `POST /api/license/activate`. Setelah cocok, lisensi aktif (tabel `license`) dan **+50 token** tercatat di `token_ledger`.
4. Aksi premium memotong saldo token; bila token kurang, aksi ditolak (HTTP 402) dengan pesan token tidak cukup.

> **Catatan:** lynk.id free tidak menyediakan webhook, sehingga verifikasi pembayaran bersifat **semi-manual** (kode pesanan). Bila lynk.id menyediakan webhook/API di paket berbayar, alur bisa diotomatiskan.

### Endpoint terkait
| Endpoint | Fungsi |
|---|---|
| `GET /api/license` | Status lisensi + saldo token + riwayat |
| `POST /api/license/activate` | `{ email, orderRef }` → aktifkan & beri 50 token |
| `GET /api/orders` | Daftar pesanan lynk.id |
| `POST /api/orders` | Impor pesanan (body `{ csv }` atau `{ orders }`) |

## Catatan mockup vs produksi (batas yang disengaja)

- **Kamera = simulasi.** Klik "Scan label" → animasi → aset berikutnya yang belum discan. Versi produksi: kamera PWA offline-first.
- **Import = CSV.** Versi produksi: Excel (.xlsx) dengan error per-baris penuh.
- **Satu tenant.** Isolasi multi-tenant & auth penuh di luar mockup (FR-21); saat ini akses via key anon dengan RLS longgar (lihat catatan skema di atas).
- **UI mengikuti NFR-06**: mobile-first, Bahasa Indonesia sederhana, tombol ≥48px, kontras tinggi, pesan error menuntun.
- Setiap aksi tercatat di tabel `activity` (audit trail) — dasar metrik aktivasi (FR-18/19).

## Struktur

```
app/
  page.jsx              # Beranda
  aset/  impor/  label/  scan/  laporan/   # halaman
  api/                  # Route handlers (Supabase)
    assets/ import/ action/ print/ export/ stats/
lib/db.js               # lapisan data Supabase (organization/asset/activity)
components/             # Nav, ui (badge, stat, toast, dst)
```

Dokumen induk: `../PostMortem/`, `../StudiKelayakan/`, `../ProjectPlan/`, `../PRD/`.