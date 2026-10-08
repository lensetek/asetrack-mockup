import { NextResponse } from 'next/server';
import { logExport } from '@/lib/db';
import { consumeTokens } from '@/lib/license';
import { TOKEN_COST } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

// POST /api/export — catat ekspor laporan + potong token (bila berlisensi)
export async function POST() {
  try {
    const tok = await consumeTokens(TOKEN_COST.REPORT_EXPORT, 'REPORT_EXPORT');
    if (!tok.allowed) {
      return NextResponse.json(
        { error: 'Token Anda tidak cukup untuk mengekspor laporan.', token_balance: tok.balance, needed: tok.needed },
        { status: 402 },
      );
    }
    await logExport();
    return NextResponse.json({ ok: true, token: tok });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal mencatat ekspor', detail: String(e.message || e) }, { status: 500 });
  }
}