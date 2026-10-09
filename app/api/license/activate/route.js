import { NextResponse } from 'next/server';
import { activateLicense } from '@/lib/license';

export const dynamic = 'force-dynamic';

// POST /api/license/activate — { email, orderRef }
// Memverifikasi kode pesanan lynk.id lalu memberi 50 token.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data tidak terbaca.' }, { status: 400 });
  }
  const email = body?.email;
  const orderRef = body?.orderRef || body?.order_ref;
  if (!email || !orderRef) {
    return NextResponse.json({ error: 'Email dan kode pesanan wajib diisi.' }, { status: 400 });
  }

  try {
    const result = await activateLicense({ email, orderRef });
    if (result.notFound) {
      return NextResponse.json(
        { error: 'Kode pesanan tidak ditemukan. Pastikan sudah membayar di lynk.id dan kode pesanan benar.' },
        { status: 404 },
      );
    }
    if (result.used) {
      return NextResponse.json({ error: 'Kode pesanan ini sudah pernah diaktifkan.' }, { status: 409 });
    }
    if (result.emailMismatch) {
      return NextResponse.json(
        { error: `Email tidak cocok dengan pesanan (terdaftar: ${result.orderEmail}).` },
        { status: 400 },
      );
    }
    if (result.ok) {
      return NextResponse.json({
        ok: true,
        message: 'Aktivasi berhasil! Token Anda sudah ditambahkan.',
        token_balance: result.token_balance,
        plan: result.plan,
      });
    }
    return NextResponse.json({ error: 'Aktivasi gagal.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal mengaktifkan', detail: String(e.message || e) }, { status: 500 });
  }
}