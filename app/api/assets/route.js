import { NextResponse } from 'next/server';
import { listAssets, countAssets } from '@/lib/db';

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
  try {
    const { searchParams } = new URL(request.url);
    const rows = await listAssets({
      q: searchParams.get('q') || '',
      lokasi: searchParams.get('lokasi') || '',
      kondisi: searchParams.get('kondisi') || '',
      printed: searchParams.get('printed') || '',
      scanned: searchParams.get('scanned') || '',
    });
    const total = await countAssets();
    return NextResponse.json({ assets: rows.map(toAsset), total });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal memuat aset', detail: String(e.message || e) }, { status: 500 });
  }
}