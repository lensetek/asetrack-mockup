// ------------------------------------------------------------------
// Lapisan SQLite untuk mockup AsetTrack.
// Driver: better-sqlite3 (preferensi, sesuai permintaan "sqlite3").
// Fallback otomatis: node:sqlite bawaan Node (DatabaseSync) bila
// better-sqlite3 tidak terpasang/tidak kompatibel.
// ------------------------------------------------------------------
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

let better = null;
try {
  better = req('better-sqlite3');
} catch {
  better = null;
}

// node:sqlite tersedia tanpa flag sejak Node 23.4+ (kita di Node 24).
const { DatabaseSync } = req('node:sqlite');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'aset.db');

let db = null;

function open() {
  fs.mkdirSync(DB_DIR, { recursive: true });
  db = better ? new better(DB_FILE) : new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate();
  seed();
  return db;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organization (
      id   INTEGER PRIMARY KEY,
      nama TEXT NOT NULL,
      jenis TEXT,
      plan TEXT DEFAULT 'GRATIS'
    );

    CREATE TABLE IF NOT EXISTS asset (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      code          TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      category      TEXT,
      location      TEXT,
      pic           TEXT,
      value         INTEGER,
      condition     TEXT DEFAULT 'BAIK',
      status        TEXT DEFAULT 'AKTIF',
      print_status  TEXT DEFAULT 'BELUM',
      scanned_count INTEGER DEFAULT 0,
      created_at    TEXT,
      updated_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS activity (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id   INTEGER,
      action     TEXT NOT NULL,
      from_value TEXT,
      to_value   TEXT,
      actor      TEXT,
      created_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_asset_location ON asset(location);
    CREATE INDEX IF NOT EXISTS idx_asset_condition ON asset(condition);
    CREATE INDEX IF NOT EXISTS idx_activity_asset ON activity(asset_id);
  `);
}

// ------------------------- data contoh (mockup) -------------------------
const SEED_ORG = { id: 1, nama: 'Yayasan Nurul Ilmi', jenis: 'Yayasan (100-500 aset)', plan: 'GRATIS' };

const SEED_ASSETS = [
  ['A-0001', 'Meja Belajar Kayu 01', 'Meja', 'Ruang Kelas A', 'Bu Ratna', 850000, 'BAIK', 'AKTIF', 'SUDAH', 4],
  ['A-0002', 'Meja Belajar Kayu 02', 'Meja', 'Ruang Kelas A', 'Bu Ratna', 850000, 'BAIK', 'AKTIF', 'SUDAH', 3],
  ['A-0003', 'Kursi Lipat 01', 'Kursi', 'Ruang Kelas A', 'Bu Ratna', 150000, 'PERLU PERBAIKAN', 'AKTIF', 'SUDAH', 2],
  ['A-0004', 'Kursi Lipat 02', 'Kursi', 'Ruang Kelas A', 'Bu Ratna', 150000, 'BAIK', 'AKTIF', 'SUDAH', 1],
  ['A-0005', 'Papan Tulis Kapur', 'Alat Ajar', 'Ruang Kelas A', 'Bu Ratna', 320000, 'BAIK', 'AKTIF', 'SUDAH', 2],
  ['A-0010', 'Laptop Acer Aspire 01', 'Komputer', 'Ruang Kantor', 'Pak Selamet', 7500000, 'BAIK', 'DIPINJAM', 'SUDAH', 5],
  ['A-0011', 'Printer Epson L3210', 'Komputer', 'Ruang Kantor', 'Pak Selamet', 2900000, 'BAIK', 'AKTIF', 'SUDAH', 3],
  ['A-0012', 'Meja Kantor Direktur', 'Meja', 'Ruang Kantor', 'Bu Ratna', 1500000, 'BAIK', 'AKTIF', 'SUDAH', 2],
  ['A-0013', 'Kursi Kantor Direktur', 'Kursi', 'Ruang Kantor', 'Bu Ratna', 900000, 'PERLU PERBAIKAN', 'AKTIF', 'BELUM', 0],
  ['A-0020', 'Proyektor Epson EB-X06', 'Alat Ajar', 'Gudang', 'Pak Selamet', 5200000, 'BAIK', 'AKTIF', 'SUDAH', 4],
  ['A-0021', 'Kipas Angin Dinding 01', 'Elektronik', 'Gudang', 'Pak Selamet', 450000, 'BAIK', 'AKTIF', 'SUDAH', 1],
  ['A-0022', 'Kipas Angin Dinding 02', 'Elektronik', 'Gudang', 'Pak Selamet', 450000, 'RUSAK', 'AKTIF', 'SUDAH', 2],
  ['A-0030', 'Lemari Buku Perpustakaan 01', 'Perabot', 'Perpustakaan', 'Bu Ratna', 1300000, 'BAIK', 'AKTIF', 'BELUM', 0],
  ['A-0031', 'Meja Baca Perpustakaan 01', 'Meja', 'Perpustakaan', 'Bu Ratna', 700000, 'BAIK', 'AKTIF', 'BELUM', 0],
  ['A-0032', 'Tasmi Al-Quran', 'Alat Ajar', 'Musholla', 'Ustadz Karim', 300000, 'BAIK', 'AKTIF', 'BELUM', 0],
  ['A-0033', 'Karpet Musholla 01', 'Perlengkapan', 'Musholla', 'Ustadz Karim', 600000, 'BAIK', 'AKTIF', 'BELUM', 0],
  ['A-0040', 'Sound System Portable', 'Elektronik', 'Aula', 'Pak Selamet', 2800000, 'BAIK', 'AKTIF', 'BELUM', 0],
  ['A-0041', 'Bangku Panjang Aula', 'Kursi', 'Aula', 'Pak Selamet', 500000, 'BAIK', 'AKTIF', 'BELUM', 0],
];

function seed() {
  const orgCount = db.prepare('SELECT COUNT(*) AS n FROM organization').get().n;
  if (orgCount === 0) {
    db.prepare('INSERT INTO organization (id, nama, jenis, plan) VALUES (?, ?, ?, ?)').run(
      SEED_ORG.id, SEED_ORG.nama, SEED_ORG.jenis, SEED_ORG.plan,
    );
  }
  const assetCount = db.prepare('SELECT COUNT(*) AS n FROM asset').get().n;
  if (assetCount === 0) {
    const ins = db.prepare(`
      INSERT INTO asset (code, name, category, location, pic, value, condition, status, print_status, scanned_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    const tx = db.transaction((rows) => {
      for (const r of rows) {
        ins.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], now, now);
        // buat sedikit riwayat scan untuk aset yang sudah discan
        if (r[9] > 0) {
          db.prepare('INSERT INTO activity (asset_id, action, from_value, to_value, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(db.prepare('SELECT id FROM asset WHERE code = ?').get(r[0]).id, 'SCAN', null, 'Cek kondisi', 'Operator (demo)', now);
        }
      }
    });
    tx(SEED_ASSETS);
  }
}

export function getDb() {
  if (!db) open();
  return db;
}

// Jalankan langsung: `npm run seed`
const IS_CLI =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
    path.resolve(process.argv[1]).toLowerCase().endsWith(path.sep + 'db.js'));

if (IS_CLI) {
  getDb();
  const org = db.prepare('SELECT * FROM organization WHERE id = 1').get();
  const cnt = db.prepare('SELECT COUNT(*) AS n FROM asset').get().n;
  console.log(`[seed] DB siap: ${path.basename(DB_FILE)} | organisasi: ${org.nama} | aset: ${cnt} | driver: ${better ? 'better-sqlite3' : 'node:sqlite (fallback)'}`);
} else {
  getDb();
}