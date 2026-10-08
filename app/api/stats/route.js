import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getStats();
    const { stats } = data;
    const imported = stats.total >= 10;

    const checklist = [
      { no: 1, title: 'Unduh template aset', sub: 'Template Excel + panduan isi', done: true },
      { no: 2, title: 'Impor data aset (≥10 aset)', sub: 'Data masuk tanpa korup', done: imported },
      { no: 3, title: 'Cetak label QR', sub: 'Labelsi siap ditempel', done: stats.printed > 0 },
      { no: 4, title: 'Scan aset pertama', sub: 'Satu aset terpindai & ter-update', done: stats.scanned > 0 },
      { no: 5, title: 'Buat laporan opname', sub: 'Ekspor laporan untuk pengurus', done: stats.exports > 0 },
    ];
    const nowIndex = checklist.findIndex((c) => !c.done);

    return NextResponse.json({
      org: data.org,
      stats,
      perKondisi: data.perKondisi.map((r) => ({ condition: r.name, n: r.n })),
      perLokasi: data.perLokasi.map((r) => ({ location: r.name, n: r.n })),
      recent: data.recent.map((r) => ({ ...r, actionLabel: actionLabel(r.action) })),
      checklist: checklist.map((c, i) => ({ ...c, now: i === nowIndex })),
    });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal memuat statistik', detail: String(e.message || e) }, { status: 500 });
  }
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