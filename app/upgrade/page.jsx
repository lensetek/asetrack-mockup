'use client';

import { useEffect, useState } from 'react';
import { jfetch, PageHead, Empty } from '@/components/ui';
import { PACKAGES, TOKEN_COST_INFO, LYNX_CHECKOUT_URL, PRICE_IDR, TOKENS_PER_PURCHASE, rupiah } from '@/lib/tokens';

const REASON_LABEL = {
  PURCHASE: 'Pembelian token',
  REPORT_EXPORT: 'Ekspor laporan',
  WA_REMINDER: 'Pengingat WhatsApp',
  EXTRA_TEAM_MEMBER: 'Anggota tim',
};

export default function UpgradePage() {
  const [ov, setOv] = useState(null);
  const [err, setErr] = useState(null);
  const [email, setEmail] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [csv, setCsv] = useState('');
  const [orders, setOrders] = useState([]);
  const [adminMsg, setAdminMsg] = useState(null);

  const loadLicense = () =>
    jfetch('/api/license')
      .then(setOv)
      .catch((e) => setErr(e.message));
  const loadOrders = () =>
    jfetch('/api/orders')
      .then((d) => setOrders(d.orders || []))
      .catch(() => {});

  useEffect(() => {
    loadLicense();
  }, []);

  useEffect(() => {
    if (showAdmin) loadOrders();
  }, [showAdmin]);

  async function activate(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, orderRef }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Aktivasi gagal.');
      setMsg({ type: 'ok', text: `${d.message || 'Aktivasi berhasil.'} Saldo: ${d.token_balance} token.` });
      setEmail('');
      setOrderRef('');
      await loadLicense();
    } catch (e) {
      setMsg({ type: 'bad', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function importOrders(e) {
    e.preventDefault();
    setAdminMsg(null);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gagal');
      setAdminMsg({ type: 'ok', text: `Berhasil mengimpor ${d.inserted} pesanan baru (dari ${d.total} baris).` });
      setCsv('');
      loadOrders();
    } catch (e) {
      setAdminMsg({ type: 'bad', text: e.message });
    }
  }

  if (err) return <Empty icon="⚠️" text={`Tidak bisa memuat data: ${err}`} />;
  if (!ov) return <Empty icon="⏳" text="Memuat…" />;

  const isPro = ov.plan === 'PRO';
  const balance = ov.license?.token_balance ?? 0;

  return (
    <>
      <PageHead title="Upgrade ke AsetTrack Pro ⭐" sub="Naikkan kuota & buka fitur premium dengan token." />

      {/* Status */}
      <div className="section">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              🎫 Paket Anda: {ov.plan === 'PRO' ? 'Pro' : 'Gratis'}
            </h2>
            {isPro && <span className="badge ok">{balance} token</span>}
          </div>
          <div className="tbl-wrap" style={{ marginTop: 10 }}>
            <table className="tbl">
              <tbody>
                <tr>
                  <td>Kuota aset</td>
                  <td className="num">
                    <b>{ov.usage.assets}</b> / {ov.limits.maxAssets}
                  </td>
                </tr>
                <tr>
                  <td>Ekspor laporan</td>
                  <td className="num">
                    {ov.usage.exports} / {ov.limits.maxExports === Infinity ? '∞' : ov.limits.maxExports}
                  </td>
                </tr>
                <tr>
                  <td>Saldo token</td>
                  <td className="num">{isPro ? `${balance} token` : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {!isPro && (
            <div className="note" style={{ marginTop: 10 }}>
              Beli paket Pro untuk naik ke 5.000 aset, ekspor tanpa batas, dan pengingat WhatsApp.
            </div>
          )}
        </div>
      </div>

      {/* Paket */}
      <div className="section">
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px' }}>Pilih paket</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {PACKAGES.map((p) => (
            <div key={p.id} className="card" style={p.highlight ? { borderColor: 'var(--brand)', borderWidth: 2 } : undefined}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  {p.name}
                </h3>
                {p.highlight && <span className="badge info">Paling diminati</span>}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 2px' }}>{p.price}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>{p.period}</div>
              <ul className="checklist" style={{ marginBottom: 12, listStyle: 'none', padding: 0 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: 'flex', gap: 8, padding: '5px 0', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--ok)', fontWeight: 800 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {p.lynk ? (
                <a className="btn btn-primary btn-block" href={LYNX_CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
                  🛒 Beli sekarang ({rupiah(PRICE_IDR)})
                </a>
              ) : p.id === 'INSTANSI' ? (
                <a className="btn btn-ghost btn-block" href="https://lynk.id/lensetek" target="_blank" rel="noopener noreferrer">
                  Hubungi kami
                </a>
              ) : (
                <button className="btn btn-soft btn-block" disabled>
                  {isPro ? 'Termasuk' : 'Paket saat ini'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Aktivasi */}
      <div className="section">
        <div className="card">
          <h2 className="card-title">🔑 Sudah bayar? Aktifkan token</h2>
          <p className="card-sub">
            Setelah membayar di lynk.id, Anda menerima <b>kode pesanan</b>. Masukkan email pembelian + kode pesanan untuk
            mengaktifkan {TOKENS_PER_PURCHASE} token.
          </p>
          {msg && <div className={msg.type === 'bad' ? 'note bad' : 'note'}>{msg.text}</div>}
          <form onSubmit={activate}>
            <div className="field">
              <label htmlFor="act-email">Email pembelian</label>
              <input id="act-email" type="email" placeholder="nama@yayasan.id" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="act-ref">Kode pesanan (lynk.id)</label>
              <input id="act-ref" type="text" placeholder="mis. LYNK-XXXX-XXXX" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} required />
              <div className="input-hint">Kode ada di struk/notifikasi pembelian lynk.id Anda.</div>
            </div>
            <button className="btn btn-ok btn-block" type="submit" disabled={busy}>
              {busy ? 'Mengaktifkan…' : 'Aktifkan token'}
            </button>
          </form>
        </div>
      </div>

      {/* Riwayat token */}
      {isPro && ov.ledger?.length > 0 && (
        <div className="section">
          <div className="card">
            <h2 className="card-title">📒 Riwayat token</h2>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Keterangan</th>
                    <th>Token</th>
                  </tr>
                </thead>
                <tbody>
                  {ov.ledger.map((l, i) => (
                    <tr key={i}>
                      <td className="num">{new Date(l.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>
                        {REASON_LABEL[l.reason] || l.reason}
                        {l.ref ? ` · ${l.ref}` : ''}
                      </td>
                      <td className="num" style={{ color: l.delta > 0 ? 'var(--ok)' : 'var(--bad)', fontWeight: 700 }}>
                        {l.delta > 0 ? `+${l.delta}` : l.delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Biaya token */}
      <div className="section">
        <div className="card">
          <h2 className="card-title">💡 Token dipakai untuk apa?</h2>
          <p className="card-sub">Aksi inti gratis. Pada paket Pro, token memotong aksi premium berikut:</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Aksi premium</th>
                  <th>Satuan</th>
                  <th>Token</th>
                </tr>
              </thead>
              <tbody>
                {TOKEN_COST_INFO.map((t) => (
                  <tr key={t.key}>
                    <td>
                      <b>{t.label}</b>
                    </td>
                    <td>{t.unit}</td>
                    <td className="num">{t.cost} token</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="input-hint">1 pembelian {rupiah(PRICE_IDR)} = {TOKENS_PER_PURCHASE} token.</div>
        </div>
      </div>

      {/* Admin */}
      {ov.admin && (
        <div className="section">
          <div className="card">
            <button className="btn btn-ghost btn-block" onClick={() => setShowAdmin((v) => !v)}>
              {showAdmin ? '▲ Tutup' : '⚙️ Admin: impor pesanan lynk.id'}
            </button>
            {showAdmin && (
              <div style={{ marginTop: 12 }}>
                <p className="card-sub">
                  Tempel data pesanan lynk.id (CSV). Kolom: <code>order_ref,email,buyer_name,amount</code> (baris header
                  opsional).
                </p>
                {adminMsg && <div className={adminMsg.type === 'bad' ? 'note bad' : 'note'}>{adminMsg.text}</div>}
                <div className="field">
                  <textarea
                    rows={5}
                    placeholder={'order_ref,email,buyer_name,amount\nLYNK-DEMO-001,demo@yayasan.id,Bu Ratna,49000'}
                    value={csv}
                    onChange={(e) => setCsv(e.target.value)}
                  />
                </div>
                <button className="btn btn-soft btn-block" onClick={importOrders}>
                  📥 Impor pesanan
                </button>

                {orders.length > 0 && (
                  <div className="tbl-wrap" style={{ marginTop: 12 }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Kode pesanan</th>
                          <th>Email</th>
                          <th>Nama</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o, i) => (
                          <tr key={i}>
                            <td className="num">{o.order_ref}</td>
                            <td>{o.email || '-'}</td>
                            <td>{o.buyer_name || '-'}</td>
                            <td>{o.used_by_license ? <span className="badge gray">terpakai</span> : <span className="badge ok">siap aktivasi</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}