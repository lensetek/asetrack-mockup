// ------------------------------------------------------------------
// Lapisan data AsetTrack — Supabase (Postgres) + autentikasi.
// Setiap pengguna memiliki organisasinya sendiri; RLS membatasi data
// berdasarkan auth.uid(). Fungsi di sini ASYNC dan hanya dipakai di server.
// ------------------------------------------------------------------
import { createClient } from './supabase/server';

// Klien Supabase yang membawa sesi pengguna (cookie). Dibuat per panggilan.
export async function getClient() {
  return createClient();
}

const nowIso = () => new Date().toISOString();

// Pastikan organisasi milik pengguna ada; buat + seed demo bila belum.
async function ensureOrg(sb) {
  const { data: existing } = await sb
    .from('organization')
    .select('id')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const nama = user.user_metadata?.nama || (user.email ? user.email.split('@')[0] : 'Organisasi Saya');
  const jenis = user.user_metadata?.jenis || 'Yayasan';
  const { data: orgId, error } = await sb.rpc('bootstrap_user', { p_nama: nama, p_jenis: jenis });
  if (error) throw error;
  return orgId ?? null;
}

// ------------------------------ ORGANISASI ------------------------------
export async function getOrganization() {
  const sb = await getClient();
  await ensureOrg(sb);
  const { data, error } = await sb
    .from('organization')
    .select('id, nama, jenis, plan')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// -------------------------------- ASET ----------------------------------
export async function countAssets() {
  const sb = await getClient();
  await ensureOrg(sb);
  const { count, error } = await sb
    .from('asset')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function listAssets({ q = '', lokasi = '', kondisi = '', printed = '', scanned = '' } = {}) {
  const sb = await getClient();
  await ensureOrg(sb);
  let query = sb.from('asset').select('*');
  if (q) {
    const like = `%${q}%`;
    query = query.or(`code.ilike.${like},name.ilike.${like},category.ilike.${like}`);
  }
  if (lokasi) query = query.eq('location', lokasi);
  if (kondisi) query = query.eq('condition', kondisi);
  if (printed === 'SUDAH' || printed === 'BELUM') query = query.eq('print_status', printed);
  if (scanned === 'ADA') query = query.gt('scanned_count', 0);
  if (scanned === 'KOSONG') query = query.eq('scanned_count', 0);
  query = query.order('code', { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function findAssetByCode(code) {
  const sb = await getClient();
  const { data, error } = await sb
    .from('asset')
    .select('*')
    .eq('code', code)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function importAssets(rows = []) {
  const sb = await getClient();
  const orgId = await ensureOrg(sb);
  const existing = new Set((await listAssets({})).map((a) => a.code));
  const toInsert = [];
  const skipped = [];
  for (const r of rows) {
    const code = String(r.code || '').trim().toUpperCase();
    if (!code || !r.name) {
      skipped.push({ code: r.code, name: r.name, alasan: 'Kode/Nama kosong' });
      continue;
    }
    if (existing.has(code)) {
      skipped.push({ code, name: r.name, alasan: 'Kode sudah ada' });
      continue;
    }
    existing.add(code);
    toInsert.push({
      organization_id: orgId,
      code,
      name: String(r.name).trim(),
      category: String(r.category || '').trim(),
      location: String(r.location || '').trim(),
      pic: String(r.pic || '').trim(),
      value: Number(r.value) || 0,
      condition: ['BAIK', 'RUSAK', 'PERLU PERBAIKAN'].includes(r.condition) ? r.condition : 'BAIK',
      status: 'AKTIF',
      print_status: 'BELUM',
      scanned_count: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  }

  if (toInsert.length) {
    const { error } = await sb.from('asset').insert(toInsert);
    if (error) throw error;
  }
  return { inserted: toInsert.length, skipped, total: rows.length, existing: existing.size };
}

// ----------------------- AKSI SCAN / UPDATE ASET ------------------------
export async function applyAction({ code, action, value, actor = 'Operator (demo)' }) {
  const sb = await getClient();
  const orgId = await ensureOrg(sb);
  const asset = await findAssetByCode(code);
  if (!asset) return { notFound: true };

  const now = nowIso();
  const A = String(action).toUpperCase();
  const patch = {};
  let logTo = null;
  let from = null;

  if (A === 'SCAN') {
    Object.assign(patch, { scanned_count: (asset.scanned_count || 0) + 1, updated_at: now });
    from = asset.condition;
    logTo = asset.condition;
  } else if (A === 'UPDATE_KONDISI') {
    const to = ['BAIK', 'PERLU PERBAIKAN', 'RUSAK'].includes(value) ? value : 'BAIK';
    Object.assign(patch, { condition: to, scanned_count: (asset.scanned_count || 0) + 1, updated_at: now });
    from = asset.condition;
    logTo = to;
  } else if (A === 'PINDAH') {
    const to = value ? String(value) : asset.location;
    Object.assign(patch, { location: to, scanned_count: (asset.scanned_count || 0) + 1, updated_at: now });
    from = asset.location;
    logTo = to;
  } else if (A === 'PINJAM') {
    Object.assign(patch, { status: 'DIPINJAM', scanned_count: (asset.scanned_count || 0) + 1, updated_at: now });
    from = asset.status;
    logTo = 'DIPINJAM';
  } else if (A === 'KEMBALI') {
    Object.assign(patch, { status: 'AKTIF', scanned_count: (asset.scanned_count || 0) + 1, updated_at: now });
    from = asset.status;
    logTo = 'AKTIF';
  } else if (A === 'CETAK') {
    Object.assign(patch, { print_status: 'SUDAH', updated_at: now });
    from = asset.print_status;
    logTo = 'SUDAH';
  } else {
    return { unknown: true };
  }

  const { error: upErr } = await sb.from('asset').update(patch).eq('id', asset.id);
  if (upErr) throw upErr;
  const { error: logErr } = await sb.from('activity').insert({
    asset_id: asset.id,
    org_id: orgId,
    action: A,
    from_value: from,
    to_value: logTo,
    actor,
    created_at: now,
  });
  if (logErr) throw logErr;

  return {
    ok: true,
    update: {
      ...(patch.condition ? { condition: patch.condition } : {}),
      ...(patch.location ? { location: patch.location } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      scanned_count: patch.scanned_count ?? asset.scanned_count,
    },
  };
}

// ------------------------------ STATISTIK -------------------------------
export async function getStats() {
  const sb = await getClient();
  await ensureOrg(sb);
  const org = await getOrganization();

  const head = async (build) => {
    const { count, error } = await build(sb.from('asset').select('*', { count: 'exact', head: true }));
    if (error) throw error;
    return count ?? 0;
  };

  const total = await head((q) => q);
  const printed = await head((q) => q.eq('print_status', 'SUDAH'));
  const scanned = await head((q) => q.gt('scanned_count', 0));
  const rusak = await head((q) => q.eq('condition', 'RUSAK'));
  const pinjam = await head((q) => q.eq('status', 'DIPINJAM'));

  const { count: exports, error: exErr } = await sb
    .from('activity')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'EXPORT');
  if (exErr) throw exErr;

  const { data: condRows, error: cErr } = await sb.from('asset').select('condition');
  if (cErr) throw cErr;
  const { data: locRows, error: lErr } = await sb.from('asset').select('location');
  if (lErr) throw lErr;

  const group = (rows, key) => {
    const map = new Map();
    for (const r of rows || []) {
      const k = r[key] || '-';
      map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()].map(([name, n]) => ({ [key]: name, n, name, count: n }));
  };

  let perKondisi = group(condRows, 'condition').sort((a, b) => b.n - a.n);
  let perLokasi = group(locRows, 'location').sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const { data: recentActs, error: rErr } = await sb
    .from('activity')
    .select('asset_id, action, to_value, created_at')
    .order('id', { ascending: false })
    .limit(6);
  if (rErr) throw rErr;

  const ids = [...new Set((recentActs || []).map((r) => r.asset_id).filter(Boolean))];
  let assetMap = new Map();
  if (ids.length) {
    const { data: assets, error: aErr } = await sb.from('asset').select('id, code, name').in('id', ids);
    if (aErr) throw aErr;
    assetMap = new Map((assets || []).map((a) => [a.id, a]));
  }
  const recent = (recentActs || []).map((r) => {
    const a = assetMap.get(r.asset_id) || {};
    return { code: a.code || '—', name: a.name || 'Organisasi', action: r.action, to_value: r.to_value, created_at: r.created_at };
  });

  return {
    org: org ? { nama: org.nama, jenis: org.jenis, plan: org.plan } : null,
    stats: { total, printed, scanned, rusak, pinjam, exports: exports ?? 0 },
    perKondisi,
    perLokasi,
    recent,
  };
}

// ------------------------------- AKSI LAIN ------------------------------
export async function markPrinted(ids = []) {
  const sb = await getClient();
  const orgId = await ensureOrg(sb);
  const now = nowIso();
  const { error: upErr } = await sb
    .from('asset')
    .update({ print_status: 'SUDAH', updated_at: now })
    .in('id', ids);
  if (upErr) throw upErr;
  const logs = ids.map((id) => ({
    asset_id: id,
    org_id: orgId,
    action: 'CETAK',
    from_value: 'BELUM',
    to_value: 'SUDAH',
    actor: 'Admin (demo)',
    created_at: now,
  }));
  if (logs.length) {
    const { error: logErr } = await sb.from('activity').insert(logs);
    if (logErr) throw logErr;
  }
  return { ok: true, updated: ids.length };
}

export async function logExport() {
  const sb = await getClient();
  const orgId = await ensureOrg(sb);
  const { error } = await sb.from('activity').insert({
    asset_id: null,
    org_id: orgId,
    action: 'EXPORT',
    from_value: null,
    to_value: 'laporan',
    actor: 'Pengguna',
    created_at: nowIso(),
  });
  if (error) throw error;
  return { ok: true };
}