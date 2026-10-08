import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/print — { ids: [..] } tandai label tercetak
export async function POST(request) {
  const db = getDb();
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data tidak terbaca.' }, { status: 400 });
  }
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return NextResponse.json({ error: 'Tidak ada label dipilih.' }, { status: 400 });

  const now = new Date().toISOString();
  const upd = db.prepare("UPDATE asset SET print_status = 'SUDAH', updated_at = ? WHERE id = ?");
  const log = db.prepare('INSERT INTO activity (asset_id, action, from_value, to_value, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)');

  const tx = db.transaction((list) => {
    for (const id of list) {
      upd.run(now, id);
      log.run(id, 'CETAK', 'BELUM', 'SUDAH', 'Admin (demo)', now);
    }
  });
  tx(ids);

  return NextResponse.json({ ok: true, updated: ids.length });
}