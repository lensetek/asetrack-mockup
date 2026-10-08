# AsetTrack — UI/UX Mockup (prototipe interaktif MLL)

Prototipe antarmuka **AsetTrack** untuk siklus opname aset yayasan, sesuai **PRD v1.0** (Minimum Lovable Loop) dan **Full Project Plan Agile** tim 5 orang.

**Stack:** Next.js (App Router) · SQLite (`better-sqlite3`, fallback otomatis `node:sqlite`) · React · `qrcode`.

## Menjalankan

```bash
npm install        # sekali
npm run dev        # http://localhost:3000
npm run build      # build produksi
npm start          # jalankan hasil build
npm run seed       # (opsional) inisialisasi ulang DB contoh
```

Database tersimpan di `data/aset.db` (dibuat otomatis + di-seed 18 aset contoh yayasan saat pertama kali dijalankan).

## Halaman (alur MLL: impor → label → scan → update → laporan)

| Rute | Isi | FR terkait (PRD) |
|---|---|---|
| `/` | Beranda Bu Ratna: statistik, **checklist 5 langkah aktivasi**, menu cepat, aktivitas terakhir | FR-15 |
| `/aset` | Daftar aset: cari, filter lokasi/kondisi/tercetak, badge kondisi & status | FR-03 |
| `/impor` | **Impor data**: unduh template, upload CSV, pratinjau + baris bermasalah (duplikat/kosong) sebelum disimpan | FR-01, FR-02, FR-04 |
| `/label` | **Cetak label QR**: QR level-H + teks cadangan, preset A4 (2×2 / 3×3 / 4×2), cetak nyata (`window.print`), tandai tercetak | FR-05, FR-06, FR-07, FR-08 |
| `/scan` | **Scan & update**: simulasi scan kamera, ketik kode manual, error menuntun, 3 aksi (kondisi/lokasi/pinjam-kembali), audit trail | FR-09 s.d. FR-13 |
| `/laporan` | **Laporan opname**: filter, ringkasan per lokasi/kondisi, unduh CSV (ringkasan & rincian), tercatat sebagai "export" | FR-14 |

## Catatan mockup vs produksi (batas yang disengaja)

- **Kamera = simulasi.** Klik "Scan label" → animasi → aset berikutnya yang belum discan. Versi produksi: kamera PWA offline-first.
- **Import = CSV.** Versi produksi: Excel (.xlsx) dengan error per-baris penuh.
- **Satu tenant + database file lokal.** Isolasi multi-tenant & auth penuh di luat mockup (FR-21).
- **UI mengikuti NFR-06**: mobile-first, Bahasa Indonesia sederhana, tombol ≥48px, kontras tinggi, pesan error menuntun.
- Setiap aksi tercatat di tabel `activity` (audit trail) — dasar metrik aktivasi (FR-18/19).

## Struktur

```
app/
  page.jsx              # Beranda
  aset/  impor/  label/  scan/  laporan/   # halaman
  api/                  # Route handlers (SQLite)
    assets/ import/ action/ print/ export/ stats/
lib/db.js               # koneksi SQLite + migrasi + seed (PRAGMA WAL)
components/             # Nav, ui (badge, stat, toast, dst)
```

Dokumen induk: `../PostMortem/`, `../StudiKelayakan/`, `../ProjectPlan/`, `../PRD/`.