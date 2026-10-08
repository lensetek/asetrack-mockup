import { NextResponse } from 'next/server';
import { importPaidOrders, parseOrdersCsv } from '@/lib/license';
import { getClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/orders — daftar pesanan lynk.id yang sudah dikonfirmasi
export async function GET() {
  try {
    const { data, error } = await getClient()
      .from('paid_order')
      .select('order_ref, email, buyer_name, amount, paid_at, used_by_license')
      .order('id', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ orders: data || [] });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal memuat pesanan', detail: String(e.message || e) }, { status: 500 });
  }
}

// POST /api/orders — impor pesanan (admin).
// Body: { csv: "order_ref,email,buyer_name,amount\n..." }  atau  { orders: [{...}] }
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data tidak terbaca.' }, { status: 400 });
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
    const result = await importPaidOrders(rows);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal mengimpor pesanan', detail: String(e.message || e) }, { status: 500 });
  }
}