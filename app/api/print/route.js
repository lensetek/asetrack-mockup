import { NextResponse } from 'next/server';
import { markPrinted } from '@/lib/db';
import { consumeTokens } from '@/lib/license';
import { TOKEN_COST } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

// POST /api/print — { ids: [..] } tandai label tercetak.
// Token: 1 token per 50 label (pembulatan ke atas), bila berlisensi.
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
    const cost = Math.ceil(ids.length / 50) * TOKEN_COST.LABEL_PRINT;
    const tok = await consumeTokens(cost, 'LABEL_PRINT', `label:${ids.length}`);
    if (!tok.allowed) {
      return NextResponse.json(
        { error: 'Token Anda tidak cukup untuk mencetak label ini.', token_balance: tok.balance, needed: tok.needed },
        { status: 402 },
      );
    }
    const result = await markPrinted(ids);
    return NextResponse.json({ ...result, token: tok });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menandai label', detail: String(e.message || e) }, { status: 500 });
  }
}