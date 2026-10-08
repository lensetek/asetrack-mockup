import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/import — { assets: [{code, name, category, location, pic, value, condition}] }
export async function POST(request) {
  const db = getDb();
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data tidak terbaca.' }, { status: 400 });
  }

  const rows = Array.isArray(body.assets) ? body.assets : [];
  if (!rows.length) return NextResponse.json({ error: 'Tidak ada aset untuk diimpor.' }, { status: 400 });

  const existing = new Set(db.prepare('SELECT code FROM asset').all().map((r) => r.code));
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO asset (code, name, category, location, pic, value, condition, status, print_status, scanned_count, created_at, updated_at)
    VALUES (@code, @name, @category, @location, @pic, @value, @condition, 'AKTIF', 'BELUM', 0, @now, @now)
  `);

  let inserted = 0;
  const skipped = [];
  const tx = db.transaction((items) => {
    for (const it of items) {
      if (!it.code || !it.name) {
        skipped.push({ code: it.code, name: it.name, alasan: 'Kolom wajib (kode / nama) kosong' });
        continue;
      }
      if (existing.has(it.code)) {
        skipped.push({ code: it.code, name: it.name, alasan: 'Kode sudah terdaftar' });
        continue;
      }
      insert.run({
        code: String(it.code).trim().toUpperCase(),
        name: String(it.name).trim(),
        category: String(it.category || '').trim(),
        location: String(it.location || '').trim(),
        pic: String(it.pic || '').trim(),
        value: Number(it.value) || 0,
        condition: ['BAIK', 'RUSAK', 'PERLU PERBAIKAN'].includes(it.condition) ? it.condition : 'BAIK',
        now,
      });
      existing.add(String(it.code).trim().toUpperCase());
      inserted += 1;
    }
  });
  tx(rows);

  return NextResponse.json({ inserted, skipped, total: inserted + skipped.length });
}