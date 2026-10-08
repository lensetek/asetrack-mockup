'use client';

import { useEffect, useRef, useState } from 'react';
import { jfetch, PageHead, Badge, ScannedBadge, Empty, useToast } from '@/components/ui';

const KONDISI_CYCLE = ['BAIK', 'PERLU PERBAIKAN', 'RUSAK'];

export default function ScanPage() {
  const [all, setAll] = useState([]);
  const [lokasiList, setLokasiList] = useState([]);
  const [current, setCurrent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, show] = useToast();
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    jfetch('/api/assets')
      .then((d) => setAll(d.assets))
      .catch(() => {});
    jfetch('/api/stats')
      .then((s) => setLokasiList([...new Set(s.perLokasi.map((l) => l.location))]))
      .catch(() => {});
  }, []);

  const pickNext = () => {
    const unscanned = all.filter((a) => a.scanned_count === 0);
    const pool = unscanned.length ? unscanned : all;
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const startScan = () => {
    setScanning(true);
    setNotFound(false);
    setTimeout(() => {
      const hit = pickNext();
      if (!hit) {
        setScanning(false);
        show('Belum ada aset. Impor data dulu ya.');
        return;
      }
      setCurrent(hit);
      setScanning(false);
      setScanCount((c) => c + 1);
      show(`Aset ditemukan: ${hit.code}`); // mensimulasikan hasil scan kamera
    }, 1300);
  };

  const lookupManual = async () => {
    const code = manual.trim().toUpperCase();
    if (!code) return;
    setNotFound(false);
    setBusy(true);
    try {
      // catat scan manual sekaligus
      await jfetch('/api/action', { method: 'POST', body: JSON.stringify({ code, action: 'SCAN' }) });
      const { assets } = await jfetch(`/api/assets?q=${encodeURIComponent(code)}`);
      const hit = assets.find((a) => a.code.toUpperCase() === code);
      if (hit) {
        if (!current || current.code !== hit.code) setScanCount((c) => c + 1);
        setCurrent(hit);
        show(`Aset ditemukan: ${hit.code}`);
      } else {
        setNotFound(true);
        show('Label tidak dikenal');
      }
    } catch {
      setNotFound(true);
      show('Label tidak dikenal');
    } finally {
      setBusy(false);
      setManual('');
    }
  };

  const doAction = async (action, value) => {
    if (!current) return;
    setBusy(true);
    try {
      const res = await jfetch('/api/action', {
        method: 'POST',
        body: JSON.stringify({ code: current.code, action, value, actor: 'Operator (demo)' }),
      });
      setCurrent({ ...current, ...res.update, scanned_count: (current.scanned_count || 0) + 1 });
      const label =
        action === 'UPDATE_KONDISI' ? `Kondisi diubah ke ${value}` :
        action === 'PINDAH' ? 'Lokasi diperbarui' :
        action === 'PINJAM' ? 'Aset dicatat DIPINJAM' :
        action === 'KEMBALI' ? 'Aset sudah dibalikan' : 'Tersimpan';
      show(`${label} ✓`);
    } catch (e) {
      show(`Gagal: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const cycleKondisi = () => {
    if (!current) return;
    const next = KONDISI_CYCLE[(KONDISI_CYCLE.indexOf(current.condition) + 1) % KONDISI_CYCLE.length];
    doAction('UPDATE_KONDISI', next);
  };

  return (
    <>
      <PageHead title="📷 Scan aset & update" sub="Langkah 4 dari 5: temukan aset dari label QR, lalu update kondisi atau lokasi." />
      <p className="input-hint" style={{ margin: '0 0 10px' }}>
        Mockup ini mensimulasikan kamera (klik tombol <b>Scan</b>). Versi produksi memakai kamera HP dengan mode offline.
      </p>

      <div className="scan-stage no-print">
        <div className="scan-frame">
          <span className="corners" />
          {scanning && <span className="scanline" />}
          {scanning ? (
            <span style={{ fontSize: 18, fontWeight: 800 }}>Memindai…</span>
          ) : (
            <span style={{ fontSize: 46 }}>🏷️</span>
          )}
        </div>
        <button className="btn btn-ok btn-lg btn-block" onClick={startScan} disabled={scanning} style={{ maxWidth: 360, margin: '0 auto' }}>
          {scanning ? '⏳ Memindai label…' : '📷 Scan label'}
        </button>
        <p className="input-hint" style={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center', maxWidth: 360, margin: '8px auto 0' }}>
          Arahkan kamera ke kode QR di label aset
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">⌨️ Atau ketik kode label</h2>
        <div className="row" style={{ alignItems: 'stretch' }}>
          <input
            type="text"
            placeholder="contoh: A-0010"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookupManual()}
            style={{ flex: 1 }}
            aria-label="Ketik kode aset"
          />
          <button className="btn btn-soft" onClick={lookupManual} disabled={busy}>Cari</button>
        </div>
        {notFound && (
          <div style={{ marginTop: 10, background: 'var(--bad-soft)', color: 'var(--bad)', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>
            ⚠️ Label tidak dikenal. Periksa: cahaya cukup? label rusak? atau kode salah ketik. Coba lagi.
          </div>
        )}
      </div>

      {current && (
        <div className="card">
          <h2 className="card-title">🔍 Hasil scan · <Badge value={current.condition} /></h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 4px' }}>
            <span className="badge gray">{current.code}</span>
            <ScannedBadge n={scanCount + (current.scanned_count || 0)} />
          </div>
          <p style={{ margin: '2px 0', fontSize: 18, fontWeight: 700 }}>{current.name}</p>
          <p className="card-sub" style={{ margin: '4px 0 8px' }}>
            📍 {current.location} · {current.category} · PIC: {current.pic || '—'} · Status:{' '}
            <Badge value={current.status} />
          </p>

          <div className="action-stack">
            <button className="btn btn-soft btn-lg" onClick={cycleKondisi} disabled={busy}>
              🔧 Ubah kondisi menjadi {KONDISI_CYCLE[(KONDISI_CYCLE.indexOf(current.condition) + 1) % KONDISI_CYCLE.length]}
            </button>
            <PindahForm lokasiList={lokasiList} onSave={(v) => doAction('PINDAH', v)} busy={busy} />
            {current.status === 'DIPINJAM' ? (
              <button className="btn btn-ok btn-lg" onClick={() => doAction('KEMBALI')} disabled={busy}>
                ↩️ Tandai sudah kembali
              </button>
            ) : (
              <button className="btn btn-ghost btn-lg" onClick={() => doAction('PINJAM')} disabled={busy}>
                🤝 Tandai sedang dipinjam
              </button>
            )}
          </div>
        </div>
      )}

      {!current && !scanning && (
        <Empty icon="📷" text="Belum ada hasil scan. Tekan tombol hijau untuk mensimulasikan scan label berikutnya." />
      )}

      {toast}
    </>
  );
}

function PindahForm({ lokasiList, onSave, busy }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState('');
  if (!open) {
    return (
      <button className="btn btn-ghost btn-lg" onClick={() => setOpen(true)}>
        📍 Pindah lokasi
      </button>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <input
        type="text"
        list="lokasi-opt"
        placeholder="Ketik lokasi baru…"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <datalist id="lokasi-opt">
        {lokasiList.map((l) => <option key={l} value={l} />)}
      </datalist>
      <div className="row">
        <button className="btn btn-ok" disabled={busy || !v.trim()} onClick={() => { onSave(v.trim()); setOpen(false); setV(''); }}>
          Simpan lokasi
        </button>
        <button className="btn btn-ghost" onClick={() => { setOpen(false); setV(''); }}>Batal</button>
      </div>
    </div>
  );
}