import { NextResponse } from 'next/server';
import { importAssets } from '@/lib/db';
import { getLicenseOverview } from '@/lib/license';

export const dynamic = 'force-dynamic';

// POST /api/import — { assets: [ { code, name, category, location, pic, value, condition } ] }
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data tidak terbaca.' }, { status: 400 });
  }

  const rows = Array.isArray(body.assets) ? body.assets : [];
  if (!rows.length) return NextResponse.json({ error: 'Tidak ada aset untuk diimpor.' }, { status: 400 });

  try {
    const overview = await getLicenseOverview();
    const total = overview.usage.assets;
    const max = overview.limits.maxAssets;
    if (total + rows.length > max) {
      const sisa = Math.max(0, max - total);
      return NextResponse.json(
        {
          error: `Kuota aset paket ${overview.plan} (${max}) tidak cukup. Sisa ${sisa} aset. Upgrade ke Pro untuk hingga 5.000 aset.`,
          upgrade: true,
        },
        { status: 403 },
      );
    }
    const result = await importAssets(rows);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal mengimpor', detail: String(e.message || e) }, { status: 500 });
  }
}