import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function toAsset(r) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    location: r.location,
    pic: r.pic,
    value: r.value,
    condition: r.condition,
    status: r.status,
    print_status: r.print_status,
    scanned_count: r.scanned_count,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function GET(request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const lokasi = searchParams.get('lokasi') || '';
  const kondisi = searchParams.get('kondisi') || '';
  const printed = searchParams.get('printed') || '';
  const scanned = searchParams.get('scanned') || '';

  const sql = [];
  const params = [];
  if (q) {
    sql.push('(code LIKE ? OR name LIKE ? OR category LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (lokasi) { sql.push('location = ?'); params.push(lokasi); }
  if (kondisi) { sql.push('condition = ?'); params.push(kondisi); }
  if (printed === 'SUDAH') sql.push("print_status = 'SUDAH'");
  if (printed === 'BELUM') sql.push("print_status = 'BELUM'");
  if (scanned === 'ADA') sql.push('scanned_count > 0');
  if (scanned === 'KOSONG') sql.push('scanned_count = 0');

  const where = sql.length ? `WHERE ${sql.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM asset ${where} ORDER BY code`)
    .all(...params);
  const total = db.prepare('SELECT COUNT(*) AS n FROM asset').get().n;

  return NextResponse.json({ assets: rows.map(toAsset), total });
}