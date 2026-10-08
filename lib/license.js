// ------------------------------------------------------------------
// Logika lisensi & token (Supabase).
// Model: satu "dompet token" per organisasi (org_id = 1).
//  - Pembelian lynk.id  -> order tercatat di paid_order -> aktivasi
//    menambah TOKENS_PER_PURCHASE ke saldo & mencatat token_ledger.
//  - Aksi premium       -> consumeTokens() memotong saldo.
// ------------------------------------------------------------------
import { getClient } from './db';
import { TOKENS_PER_PURCHASE, TOKEN_COST, TOKEN_COST_INFO, PRICE_IDR, LYNX_CHECKOUT_URL, PRODUCT_NAME } from './tokens';

const nowIso = () => new Date().toISOString();

export async function getActiveLicense(orgId = 1) {
  const sb = getClient();
  const { data, error } = await sb
    .from('license')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'ACTIVE')
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data && data[0]) || null;
}

export async function getRecentLedger(licenseId, limit = 10) {
  const sb = getClient();
  const { data, error } = await sb
    .from('token_ledger')
    .select('*')
    .eq('license_id', licenseId)
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getLicenseOverview(orgId = 1) {
  const license = await getActiveLicense(orgId);
  const ledger = license ? await getRecentLedger(license.id) : [];
  return {
    license,
    ledger,
    product: { name: PRODUCT_NAME, price: PRICE_IDR, checkoutUrl: LYNX_CHECKOUT_URL, tokensPerPurchase: TOKENS_PER_PURCHASE },
    tokenCostInfo: TOKEN_COST_INFO,
  };
}

// Aktivasi: verifikasi kode pesanan lynk.id lalu tambah token.
export async function activateLicense({ email, orderRef, orgId = 1 }) {
  const sb = getClient();
  const e = String(email || '').trim().toLowerCase();
  const ref = String(orderRef || '').trim();
  if (!e || !ref) return { error: 'EMAIL_REF_REQUIRED' };

  const { data: order, error: oErr } = await sb
    .from('paid_order')
    .select('*')
    .ilike('order_ref', ref)
    .limit(1);
  if (oErr) throw oErr;
  const ord = (order && order[0]) || null;
  if (!ord) return { notFound: true };
  if (ord.used_by_license) return { used: true };
  if (ord.email && ord.email.toLowerCase() !== e) return { emailMismatch: true, orderEmail: ord.email };

  const now = nowIso();
  let license = await getActiveLicense(orgId);

  if (license) {
    const newBal = (license.token_balance || 0) + TOKENS_PER_PURCHASE;
    const newGranted = (license.tokens_granted || 0) + TOKENS_PER_PURCHASE;
    const { error } = await sb
      .from('license')
      .update({ token_balance: newBal, tokens_granted: newGranted })
      .eq('id', license.id);
    if (error) throw error;
    license = { ...license, token_balance: newBal, tokens_granted: newGranted };
  } else {
    const { data: created, error } = await sb
      .from('license')
      .insert({
        org_id: orgId,
        email: e,
        order_ref: ref,
        plan: 'PRO',
        token_balance: TOKENS_PER_PURCHASE,
        tokens_granted: TOKENS_PER_PURCHASE,
        status: 'ACTIVE',
        activated_at: now,
      })
      .select('*')
      .limit(1);
    if (error) throw error;
    license = (created && created[0]) || null;
    await sb.from('organization').update({ plan: 'PRO' }).eq('id', orgId);
  }

  await sb.from('token_ledger').insert({
    license_id: license.id,
    delta: TOKENS_PER_PURCHASE,
    reason: 'PURCHASE',
    ref,
    created_at: now,
  });
  await sb.from('paid_order').update({ used_by_license: license.id }).eq('id', ord.id);

  return { ok: true, license, order: { order_ref: ord.order_ref, buyer_name: ord.buyer_name } };
}

// Potong token untuk aksi premium.
// Bila belum ada lisensi -> aksi tetap boleh (tier gratis, tanpa token).
export async function consumeTokens(cost, reason, ref = null, orgId = 1) {
  const sb = getClient();
  const license = await getActiveLicense(orgId);
  if (!license) return { allowed: true, noLicense: true, balance: 0 };
  const balance = license.token_balance || 0;
  if (balance < cost) return { allowed: false, insufficient: true, balance, needed: cost };
  const newBal = balance - cost;
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
  const sb = getClient();
  const { data, error } = await sb
    .from('paid_order')
    .select('*')
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// rows: [{ order_ref, email, buyer_name, amount }]
export async function importPaidOrders(rows = []) {
  const sb = getClient();
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

// Parser CSV sederhana (header opsional). Kolom: order_ref/trx, email, buyer_name/nama, amount.
export function parseOrdersCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const delim = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const split = (line) => line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ''));
  const first = split(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = first.some((c) => ['order_ref', 'trx', 'kode', 'email', 'buyer_name', 'nama', 'amount'].includes(c));
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