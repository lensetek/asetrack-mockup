import { NextResponse } from 'next/server';
import { markPrinted } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/print — { ids: [..] } tandai label tercetak
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data tidak terbaca.' }, { status: 400 });
  }
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return NextResponse.json({ error: 'Tidak ada label dipilih.' }, { status: 400 });

  try {
    const result = await markPrinted(ids);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menandai label', detail: String(e.message || e) }, { status: 500 });
  }
}