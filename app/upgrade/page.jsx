'use client';

import { useEffect, useState } from 'react';
import { jfetch, PageHead, Empty } from '@/components/ui';
import { PACKAGES, TOKEN_COST_INFO, LYNX_CHECKOUT_URL, PRICE_IDR, TOKENS_PER_PURCHASE, rupiah } from '@/lib/tokens';

const REASON_LABEL = {
  PURCHASE: 'Pembelian token',
  REPORT_EXPORT: 'Ekspor laporan',
  LABEL_PRINT: 'Cetak label',
  WA_REMINDER: 'Pengingat WhatsApp',
  EXTRA_TEAM_MEMBER: 'Anggota tim',
};

export default function UpgradePage() {
  const [lic, setLic] = useState(null);
  const [err, setErr] = useState(null);
  const [email, setEmail] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [msg, setMsg] = useState(null); // { type: 'ok'|'bad', text }
  const [busy, setBusy] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [csv, setCsv] = useState('');
  const [orders, setOrders] = useState([]);
  const [adminMsg, setAdminMsg] = useState(null);

  const loadLicense = () =>
    jfetch('/api/license')
      .then(setLic)
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
      if (!r.ok) throw new Error(r.error);
      setMsg({ type: 'ok', text: `${r.message || 'Aktivasi berhasil.'} Saldo: ${r.token_balance} token.` });
      setOrderRef('');
      await loadLicense();
    } catch (e) {
      setMsg({ type: 'bad', text: e.message || 'Aktivasi gagal.' });
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
      setAdminMsg({ type: 'ok', text: `Berhasil mengimpor ${r.inserted} pesanan baru (dari ${r.total} baris).` });
      setCsv('');
      loadOrders();
    } catch (e) {
      setAdminMsg({ type: 'bad', text: e.message });
    }
  }

  if (err) return <Empty icon="⚠️" text={`Tidak bisa memuat data: ${err}`} />;
  if (!lic) return <Empty icon="⏳" text="Memuat…" />;

  const active = lic.active;
  const balance = lic.license?.token_balance ?? 0;

  return (
    <>
      <PageHead title="Upgrade ke AsetTrack Pro ⭐" sub="Tingkatkan kuota & buka aksi premium dengan token." />

      {/* Status */}
      <div className="section">
        <div className="card">
          <h2 className="card-title">🎫 Status paket Anda</h2>
          {active ? (
            <>
              <p className="card-sub">
                Paket <b>{lic.license.plan}</b> aktif · {lic.license.email}
              </p>
              <div className="stat-grid">
                <div className="stat">
                  <div className="num" style={{ color: 'var(--brand)' }}>{balance}</div>
                  <div className="lbl">Sisa token</div>
                </div>
                <div className="stat">
                  <div className="num">{lic.license.tokens_granted}</div>
                  <div className="lbl">Total token dibeli</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="card-sub">Anda sedang di paket <b>Gratis</b> — belum ada token.</p>
              <div className="note">
                Aksi inti (impor, scan, lihat daftar) tetap gratis. Beli paket Pro untuk membuka aksi premium
                seperti ekspor laporan & cetak label tanpa batas, plus pengingat WhatsApp.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Paket */}
      <div className="section">
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px' }}>Pilih paket</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {PACKAGES.map((p) => (
            <div
              key={p.id}
              className="card"
              style={p.highlight ? { borderColor: 'var(--brand)', borderWidth: 2 } : undefined}
            >
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 className="card-title" style={{ margin: 0 }}>{p.name}</h3>
                {p.highlight && <span className="badge info">Paling diminati</span>}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 2px' }}>{p.price}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>{p.period}</div>
              <ul className="checklist" style={{ marginBottom: 12 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ padding: '6px 0' }}>
                    <span className="step-dot" style={{ flexBasis: 24, height: 24, fontSize: 12 }}>✓</span>
                    <span className="step-txt"><span style={{ color: 'var(--ink)' }}>{f}</span></span>
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
                <button className="btn btn-soft btn-block" disabled>Paket saat ini</button>
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
            Setelah membayar di lynk.id, Anda menerima <b>kode pesanan</b> (contoh: dari email/struk). Masukkan
            email pembelian + kode pesanan untuk mengaktifkan {TOKENS_PER_PURCHASE} token.
          </p>
          {msg && (
            <div className="note" style={msg.type === 'bad' ? { background: 'var(--bad-soft)', borderColor: '#f0b8b4', color: 'var(--bad)' } : undefined}>
              {msg.text}
            </div>
          )}
          <form onSubmit={activate}>
            <div className="field">
              <label htmlFor="act-email">Email pembelian</label>
              <input id="act-email" type="text" placeholder="nama@yayasan.id" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
      {active && lic.ledger?.length > 0 && (
        <div className="section">
          <div className="card">
            <h2 className="card-title">📒 Riwayat token</h2>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Tanggal</th><th>Keterangan</th><th>Token</th></tr>
                </thead>
                <tbody>
                  {lic.ledger.map((l, i) => (
                    <tr key={i}>
                      <td className="num">{new Date(l.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>{REASON_LABEL[l.reason] || l.reason}{l.ref ? ` · ${l.ref}` : ''}</td>
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
          <p className="card-sub">Aksi inti gratis. Token memotong biaya aksi premium berikut:</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Aksi premium</th><th>Satuan</th><th>Token</th></tr>
              </thead>
              <tbody>
                {TOKEN_COST_INFO.map((t) => (
                  <tr key={t.key}>
                    <td><b>{t.label}</b></td>
                    <td>{t.unit}</td>
                    <td className="num">{t.cost} token</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="input-hint">
            1 pembelian {rupiah(PRICE_IDR)} = {TOKENS_PER_PURCHASE} token. Aksi inti (impor, scan, update) tidak memakai token.
          </div>
        </div>
      </div>

      {/* Admin */}
      <div className="section">
        <div className="card">
          <button className="btn btn-ghost btn-block" onClick={() => setShowAdmin((v) => !v)}>
            {showAdmin ? '▲ Tutup' : '⚙️ Admin: impor pesanan lynk.id'}
          </button>
          {showAdmin && (
            <div style={{ marginTop: 12 }}>
              <p className="card-sub">
                Tempel data pesanan lynk.id (CSV). Kolom: <code>order_ref,email,buyer_name,amount</code> (baris header opsional).
              </p>
              {adminMsg && (
                <div className="note" style={adminMsg.type === 'bad' ? { background: 'var(--bad-soft)', borderColor: '#f0b8b4', color: 'var(--bad)' } : undefined}>
                  {adminMsg.text}
                </div>
              )}
              <div className="field">
                <textarea rows={5} placeholder={'order_ref,email,buyer_name,amount\nLYNK-DEMO-001,demo@yayasan.id,Bu Ratna,49000'} value={csv} onChange={(e) => setCsv(e.target.value)} />
              </div>
              <button className="btn btn-soft btn-block" onClick={importOrders}>📥 Impor pesanan</button>

              {orders.length > 0 && (
                <div className="tbl-wrap" style={{ marginTop: 12 }}>
                  <table className="tbl">
                    <thead>
                      <tr><th>Kode pesanan</th><th>Email</th><th>Nama</th><th>Status</th></tr>
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
    </>
  );
}