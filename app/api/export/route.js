import { NextResponse } from 'next/server';
import { logExport } from '@/lib/db';
import { consumeTokens, getLicenseOverview } from '@/lib/license';
import { TOKEN_COST } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

// POST /api/export — catat ekspor laporan.
//  - Paket GRATIS: maks 3× (lihat PLAN_LIMITS).
//  - Paket PRO   : tak terbatas, memotong 1 token per laporan.
export async function POST() {
  try {
    const overview = await getLicenseOverview();

    if (overview.plan === 'GRATIS') {
      const used = overview.usage.exports;
      const max = overview.limits.maxExports;
      if (used >= max) {
        return NextResponse.json(
          {
            error: `Paket Gratis hanya bisa ekspor laporan ${max}×. Upgrade ke Pro untuk ekspor tanpa batas.`,
            upgrade: true,
          },
          { status: 403 },
        );
      }
      await logExport();
      return NextResponse.json({ ok: true, free: true, remaining: max - used - 1 });
    }

    const tok = await consumeTokens(TOKEN_COST.REPORT_EXPORT, 'REPORT_EXPORT');
    if (!tok.allowed) {
      return NextResponse.json(
        { error: 'Token Anda tidak cukup untuk mengekspor laporan.', token_balance: tok.balance, needed: tok.needed, upgrade: true },
        { status: 402 },
      );
    }
    await logExport();
    return NextResponse.json({ ok: true, token: tok });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal mencatat ekspor', detail: String(e.message || e) }, { status: 500 });
  }
}