import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/export — log ekspor laporan (untuk checklist aktivasi)
export async function POST() {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO activity (asset_id, action, from_value, to_value, actor, created_at) VALUES (NULL, 'EXPORT', NULL, 'laporan', 'Ibu Maya (demo)', ?)",
  ).run(now);
  return NextResponse.json({ ok: true });
}