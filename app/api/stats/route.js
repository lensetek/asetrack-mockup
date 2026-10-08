import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const org = db.prepare('SELECT * FROM organization WHERE id = 1').get();
  const total = db.prepare('SELECT COUNT(*) AS n FROM asset').get().n;
  const printed = db.prepare("SELECT COUNT(*) AS n FROM asset WHERE print_status = 'SUDAH'").get().n;
  const scanned = db.prepare('SELECT COUNT(*) AS n FROM asset WHERE scanned_count > 0').get().n;
  const rusak = db.prepare("SELECT COUNT(*) AS n FROM asset WHERE condition = 'RUSAK'").get().n;
  const pinjam = db.prepare("SELECT COUNT(*) AS n FROM asset WHERE status = 'DIPINJAM'").get().n;
  const exports = db.prepare("SELECT COUNT(*) AS n FROM activity WHERE action = 'EXPORT'").get().n;
  const imported = total >= 10;

  const perKondisi = db
    .prepare('SELECT condition, COUNT(*) AS n FROM asset GROUP BY condition ORDER BY n DESC')
    .all();
  const perLokasi = db
    .prepare('SELECT location, COUNT(*) AS n FROM asset GROUP BY location ORDER BY location')
    .all();
  const recent = db
    .prepare(
      `SELECT a.code, a.name, ac.action, ac.to_value, ac.created_at
       FROM activity ac JOIN asset a ON a.id = ac.asset_id
       ORDER BY ac.id DESC LIMIT 6`,
    )
    .all();

  const checklist = [
    { no: 1, title: 'Unduh template aset', sub: 'Template Excel + panduan isi', done: true },
    { no: 2, title: 'Impor data aset (≥10 aset)', sub: 'Data masuk tanpa korup', done: imported },
    { no: 3, title: 'Cetak label QR', sub: 'Labelsi siap ditempel', done: printed > 0 },
    { no: 4, title: 'Scan aset pertama', sub: 'Satu aset terpindai & ter-update', done: scanned > 0 },
    { no: 5, title: 'Buat laporan opname', sub: 'Ekspor laporan untuk pengurus', done: exports > 0 },
  ];
  const nowIndex = checklist.findIndex((c) => !c.done);

  return NextResponse.json({
    org: { nama: org.nama, jenis: org.jenis, plan: org.plan },
    stats: { total, printed, scanned, rusak, pinjam, exports },
    perKondisi,
    perLokasi,
    recent: recent.map((r) => ({ ...r, actionLabel: actionLabel(r.action) })),
    checklist: checklist.map((c, i) => ({ ...c, now: i === nowIndex })),
  });
}

function actionLabel(a) {
  const map = {
    SCAN: 'Cek kondisi (scan)',
    UPDATE_KONDISI: 'Ubah kondisi',
    PINDAH: 'Pindah lokasi',
    PINJAM: 'Pinjam',
    KEMBALI: 'Kembali',
    EXPORT: 'Unduh laporan',
    CETAK: 'Cetak label',
  };
  return map[a] || a;
}