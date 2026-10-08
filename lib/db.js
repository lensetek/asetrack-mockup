// ------------------------------------------------------------------
// Lapisan data AsetTrack — berbasis Supabase (Postgres).
// Sebelumnya SQLite (better-sqlite3 / node:sqlite); seluruh data lokal
// telah dimigrasikan ke tabel: organization, asset, activity.
//
// Semua fungsi di sini ASYNC dan hanya dipakai di sisi server (API routes).
// Kredensial dibaca dari environment:
//   SUPABASE_URL, SUPABASE_ANON_KEY
// ------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js';

let client = null;

export function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase belum dikonfigurasi. Set SUPABASE_URL dan SUPABASE_ANON_KEY (lihat .env.example).',
    );
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

const nowIso = () => new Date().toISOString();

// ------------------------------ ORGANISASI ------------------------------
export async function getOrganization() {
  const sb = getClient();
  const { data, error } = await sb
    .from('organization')
    .select('id, nama, jenis, plan')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// -------------------------------- ASET ----------------------------------
export async function countAssets() {
  const sb = getClient();
  const { count, error } = await sb
    .from('asset')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function listAssets({ q = '', lokasi = '', kondisi = '', printed = '', scanned = '' } = {}) {
  const sb = getClient();
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
  const sb = getClient();
  const { data, error } = await sb
    .from('asset')
    .select('*')
    .eq('code', String(code).trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function importAssets(rows = []) {
  const sb = getClient();
  const { data: existingRows, error: exErr } = await sb.from('asset').select('code');
  if (exErr) throw exErr;
  const existing = new Set((existingRows || []).map((r) => r.code));

  const now = nowIso();
  const skipped = [];
  const toInsert = [];
  for (const it of rows) {
    if (!it.code || !it.name) {
      skipped.push({ code: it.code, name: it.name, alasan: 'Kolom wajib (kode / nama) kosong' });
      continue;
    }
    const code = String(it.code).trim().toUpperCase();
    if (existing.has(code)) {
      skipped.push({ code: it.code, name: it.name, alasan: 'Kode sudah terdaftar' });
      continue;
    }
    existing.add(code);
    toInsert.push({
      code,
      name: String(it.name).trim(),
      category: String(it.category || '').trim(),
      location: String(it.location || '').trim(),
      pic: String(it.pic || '').trim(),
      value: Number(it.value) || 0,
      condition: ['BAIK', 'RUSAK', 'PERLU PERBAIKAN'].includes(it.condition) ? it.condition : 'BAIK',
      status: 'AKTIF',
      print_status: 'BELUM',
      scanned_count: 0,
      created_at: now,
      updated_at: now,
    });
  }

  let inserted = 0;
  if (toInsert.length) {
    const { data, error } = await sb.from('asset').insert(toInsert).select('id');
    if (error) throw error;
    inserted = data ? data.length : toInsert.length;
  }
  return { inserted, skipped, total: inserted + skipped.length };
}

// Terapkan satu aksi scan/update ke sebuah aset + catat activity.
export async function applyAction({ code, action, value, actor = 'Operator (demo)' }) {
  const sb = getClient();
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

  const { error: upErr } = await getClient().from('asset').update(patch).eq('id', asset.id);
  if (upErr) throw upErr;
  const { error: logErr } = await getClient().from('activity').insert({
    asset_id: asset.id,
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
  const sb = getClient();
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
  const sb = getClient();
  const now = nowIso();
  const { error: upErr } = await sb
    .from('asset')
    .update({ print_status: 'SUDAH', updated_at: now })
    .in('id', ids);
  if (upErr) throw upErr;
  const logs = ids.map((id) => ({
    asset_id: id,
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
  const sb = getClient();
  const { error } = await sb.from('activity').insert({
    asset_id: null,
    action: 'EXPORT',
    from_value: null,
    to_value: 'laporan',
    actor: 'Ibu Maya (demo)',
    created_at: nowIso(),
  });
  if (error) throw error;
  return { ok: true };
}