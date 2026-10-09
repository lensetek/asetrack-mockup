// ------------------------------------------------------------------
// Lisensi & token (Supabase, ter-scope per pengguna lewat RLS).
//  - Aktivasi kode pesanan lynk.id -> fungsi RPC SECURITY DEFINER.
//  - Aksi premium -> consumeTokens() memotong saldo token pengguna.
// ------------------------------------------------------------------
import { getClient, countAssets, getOrganization } from './db';
import {
  TOKENS_PER_PURCHASE,
  TOKEN_COST,
  TOKEN_COST_INFO,
  PRICE_IDR,
  LYNX_CHECKOUT_URL,
  PRODUCT_NAME,
  planLimits,
} from './tokens';

const nowIso = () => new Date().toISOString();

export async function getActiveLicense() {
  const sb = await getClient();
  const { data, error } = await sb
    .from('license')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data && data[0]) || null;
}

export async function getRecentLedger(licenseId, limit = 10) {
  const sb = await getClient();
  const { data, error } = await sb
    .from('token_ledger')
    .select('delta, reason, ref, created_at')
    .eq('license_id', licenseId)
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function isAdmin() {
  const sb = await getClient();
  const { data, error } = await sb.rpc('is_admin');
  if (error) return false;
  return data === true;
}

async function countExports() {
  const sb = await getClient();
  const { count } = await sb
    .from('activity')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'EXPORT');
  return count ?? 0;
}

export async function getLicenseOverview() {
  const [license, org, assets, exports] = await Promise.all([
    getActiveLicense(),
    getOrganization(),
    countAssets(),
    countExports(),
  ]);
  const plan = org?.plan || (license ? 'PRO' : 'GRATIS');
  const limits = planLimits(plan);
  const ledger = license ? await getRecentLedger(license.id) : [];
  let admin = false;
  try {
    admin = await isAdmin();
  } catch {
    admin = false;
  }
  return {
    plan,
    limits,
    license,
    ledger,
    admin,
    usage: { assets, exports },
    product: { name: PRODUCT_NAME, price: PRICE_IDR, checkoutUrl: LYNX_CHECKOUT_URL, tokensPerPurchase: TOKENS_PER_PURCHASE },
    tokenCostInfo: TOKEN_COST_INFO,
  };
}

// Aktivasi: verifikasi kode pesanan lynk.id (via RPC SECURITY DEFINER) lalu +50 token.
export async function activateLicense({ email, orderRef }) {
  const e = String(email || '').trim();
  const ref = String(orderRef || '').trim();
  if (!e || !ref) return { error: 'EMAIL_REF_REQUIRED' };

  const sb = await getClient();
  const { data, error } = await sb.rpc('activate_license', { p_email: e, p_order_ref: ref });
  if (error) throw error;

  if (data && data.error) {
    if (data.error === 'NOT_FOUND') return { notFound: true };
    if (data.error === 'USED') return { used: true };
    if (data.error === 'EMAIL_MISMATCH') return { emailMismatch: true, orderEmail: data.orderEmail };
    return { error: data.error };
  }
  return { ok: true, token_balance: data.token_balance, plan: data.plan };
}

// Potong token untuk aksi premium. Tanpa lisensi -> gratis (batas diatur di route).
export async function consumeTokens(cost, reason, ref = null) {
  const license = await getActiveLicense();
  if (!license) return { allowed: true, noLicense: true, balance: 0 };
  const balance = license.token_balance || 0;
  if (balance < cost) return { allowed: false, insufficient: true, balance, needed: cost };
  const newBal = balance - cost;
  const sb = await getClient();
  const { error } = await sb.from('license').update({ token_balance: newBal }).eq('id', license.id);
  if (error) throw error;
  await sb.from('token_ledger').insert({
    license_id: license.id,
    delta: -cost,
    reason,
    ref,
    created_at: nowIso(),
  });
  return { allowed: true, balance: newBal, spent: cost };
}

// -------------------------------- Pesanan --------------------------------
export async function listPaidOrders(limit = 100) {
  const sb = await getClient();
  const { data, error } = await sb
    .from('paid_order')
    .select('*')
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function importPaidOrders(rows = []) {
  const sb = await getClient();
  const clean = [];
  for (const r of rows) {
    const ref = String(r.order_ref || r.trx || r.kode || '').trim();
    if (!ref) continue;
    clean.push({
      order_ref: ref,
      email: r.email ? String(r.email).trim().toLowerCase() : null,
      buyer_name: r.buyer_name ? String(r.buyer_name).trim() : r.nama ? String(r.nama).trim() : null,
      amount: Number(String(r.amount || r.nominal || '').replace(/[^0-9]/g, '')) || PRICE_IDR,
      product: PRODUCT_NAME,
    });
  }
  if (!clean.length) return { inserted: 0, total: 0 };
  const { data, error } = await sb
    .from('paid_order')
    .upsert(clean, { onConflict: 'order_ref', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;
  return { inserted: (data || []).length, total: clean.length };
}

// Parser CSV sederhana (header opsional).
export function parseOrdersCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const delim = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const split = (line) => line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ''));
  const first = split(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = first.some((c) =>
    ['order_ref', 'trx', 'kode', 'email', 'buyer_name', 'nama', 'amount'].includes(c),
  );
  const header = hasHeader ? first : ['order_ref', 'email', 'buyer_name', 'amount'];
  const body = hasHeader ? lines.slice(1) : lines;
  return body.map((line) => {
    const cells = split(line);
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = cells[i];
    });
    return obj;
  });
}

export { TOKEN_COST };