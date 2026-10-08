import { NextResponse } from 'next/server';
import { getActiveLicense } from '@/lib/license';
import { getClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/license — status lisensi + saldo token + riwayat singkat
export async function GET() {
  try {
    const license = await getActiveLicense(1);
    let ledger = [];
    if (license) {
      const { data, error } = await getClient()
        .from('token_ledger')
        .select('delta, reason, ref, created_at')
        .eq('license_id', license.id)
        .order('id', { ascending: false })
        .limit(10);
      if (error) throw error;
      ledger = data || [];
    }
    return NextResponse.json({
      active: !!license,
      license: license
        ? {
            email: license.email,
            plan: license.plan,
            token_balance: license.token_balance,
            tokens_granted: license.tokens_granted,
            status: license.status,
            activated_at: license.activated_at,
          }
        : null,
      ledger,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal memuat lisensi', detail: String(e.message || e) }, { status: 500 });
  }
}