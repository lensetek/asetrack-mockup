import { NextResponse } from 'next/server';
import { applyAction } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/action — { code, action, value, actor }
// action: SCAN | UPDATE_KONDISI | PINDAH | PINJAM | KEMBALI | CETAK
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data tidak terbaca.' }, { status: 400 });
  }

  const { code, action, value } = body || {};
  if (!code || !action) return NextResponse.json({ error: 'Kode / aksi kosong.' }, { status: 400 });

  try {
    const result = await applyAction({ code, action, value, actor: (body && body.actor) || 'Operator (demo)' });
    if (result.notFound) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    if (result.unknown) return NextResponse.json({ error: `Aksi tidak dikenal: ${action}` }, { status: 400 });
    return NextResponse.json({ ok: true, update: result.update });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menerapkan aksi', detail: String(e.message || e) }, { status: 500 });
  }
}