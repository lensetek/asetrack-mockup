import { NextResponse } from 'next/server';
import { logExport } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/export — log ekspor laporan (untuk checklist aktivasi)
export async function POST() {
  try {
    const result = await logExport();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal mencatat ekspor', detail: String(e.message || e) }, { status: 500 });
  }
}