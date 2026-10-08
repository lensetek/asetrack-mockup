import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/action — { code, action, value, actor }
// action: SCAN | UPDATE_KONDISI | PINDAH | PINJAM | KEMBALI
export async function POST(request) {
  const db = getDb();
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data tidak terbaca.' }, { status: 400 });
  }

  const { code, action, value } = body || {};
  const actor = (body && body.actor) || 'Operator (demo)';
  if (!code || !action) return NextResponse.json({ error: 'Kode / aksi kosong.' }, { status: 400 });

  const asset = db.prepare('SELECT * FROM asset WHERE code = ?').get(String(code).trim().toUpperCase());
  if (!asset) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const now = new Date().toISOString();
  const log = db.prepare(
    'INSERT INTO activity (asset_id, action, from_value, to_value, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );

  const A = action.toUpperCase();
  let update = null;

  if (A === 'SCAN' || A === 'UPDATE_KONDISI' || A === 'PINDAH' || A === 'PINJAM' || A === 'KEMBALI' || A === 'CETAK') {
    if (A === 'SCAN') {
      db.prepare('UPDATE asset SET scanned_count = scanned_count + 1, updated_at = ? WHERE id = ?').run(now, asset.id);
      log.run(asset.id, 'SCAN', asset.condition, asset.condition, actor, now);
      update = { scanned_count: asset.scanned_count + 1 };
    } else if (A === 'UPDATE_KONDISI') {
      const to = ['BAIK', 'PERLU PERBAIKAN', 'RUSAK'].includes(value) ? value : 'BAIK';
      db.prepare('UPDATE asset SET condition = ?, scanned_count = scanned_count + 1, updated_at = ? WHERE id = ?').run(to, now, asset.id);
      log.run(asset.id, 'UPDATE_KONDISI', asset.condition, to, actor, now);
      update = { condition: to, scanned_count: asset.scanned_count + 1 };
    } else if (A === 'PINDAH') {
      const to = value ? String(value) : asset.location;
      db.prepare('UPDATE asset SET location = ?, scanned_count = scanned_count + 1, updated_at = ? WHERE id = ?').run(to, now, asset.id);
      log.run(asset.id, 'PINDAH', asset.location, to, actor, now);
      update = { location: to, scanned_count: asset.scanned_count + 1 };
    } else if (A === 'PINJAM') {
      db.prepare("UPDATE asset SET status = 'DIPINJAM', scanned_count = scanned_count + 1, updated_at = ? WHERE id = ?").run(now, asset.id);
      log.run(asset.id, 'PINJAM', asset.status, 'DIPINJAM', actor, now);
      update = { status: 'DIPINJAM', scanned_count: asset.scanned_count + 1 };
    } else if (A === 'KEMBALI') {
      db.prepare("UPDATE asset SET status = 'AKTIF', scanned_count = scanned_count + 1, updated_at = ? WHERE id = ?").run(now, asset.id);
      log.run(asset.id, 'KEMBALI', asset.status, 'AKTIF', actor, now);
      update = { status: 'AKTIF', scanned_count: asset.scanned_count + 1 };
    }
  } else {
    return NextResponse.json({ error: `Aksi tidak dikenal: ${action}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, update });
}