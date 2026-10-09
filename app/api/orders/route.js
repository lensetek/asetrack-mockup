import { NextResponse } from 'next/server';
import { importPaidOrders, parseOrdersCsv, listPaidOrders, isAdmin } from '@/lib/license';

export const dynamic = 'force-dynamic';

// GET /api/orders — daftar pesanan lynk.id (khusus admin platform)
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Hanya admin yang boleh melihat pesanan.' }, { status: 403 });
    }
    return NextResponse.json({ orders: await listPaidOrders() });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal memuat pesanan', detail: String(e.message || e) }, { status: 500 });
  }
}

// POST /api/orders — impor pesanan (khusus admin).
// Body: { csv: "..." } atau { orders: [{...}] }
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data tidak terbaca.' }, { status: 400 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Hanya admin yang boleh mengimpor pesanan.' }, { status: 403 });
  }
  let rows = [];
  if (typeof body.csv === 'string' && body.csv.trim()) {
    rows = parseOrdersCsv(body.csv);
  } else if (Array.isArray(body.orders)) {
    rows = body.orders;
  }
  if (!rows.length) {
    return NextResponse.json({ error: 'Tidak ada data pesanan untuk diimpor.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await importPaidOrders(rows));
  } catch (e) {
    return NextResponse.json({ error: 'Gagal mengimpor pesanan', detail: String(e.message || e) }, { status: 500 });
  }
}