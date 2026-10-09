import { NextResponse } from 'next/server';
import { getLicenseOverview } from '@/lib/license';

export const dynamic = 'force-dynamic';

// GET /api/license — paket, batas, saldo token, riwayat, status admin
export async function GET() {
  try {
    return NextResponse.json(await getLicenseOverview());
  } catch (e) {
    return NextResponse.json({ error: 'Gagal memuat lisensi', detail: String(e.message || e) }, { status: 500 });
  }
}