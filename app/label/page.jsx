'use client';

import { useEffect, useMemo, useState } from 'react';
import { jfetch, PageHead, Empty, useToast } from '@/components/ui';

const PRESETS = {
  '2x2': { label: '2 × 2 (besar)', cols: 2 },
  '3x3': { label: '3 × 3 (sedang)', cols: 3 },
  '4x2': { label: '4 × 2 (kecil)', cols: 4 },
};

export default function LabelPage() {
  const [org, setOrg] = useState('Yayasan');
  const [labels, setLabels] = useState([]);
  const [qrMap, setQrMap] = useState({});
  const [preset, setPreset] = useState('3x3');
  const [onlyUnprinted, setOnlyUnprinted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, show] = useToast();

  const load = () => {
    jfetch(onlyUnprinted ? '/api/assets?printed=BELUM' : '/api/assets')
      .then(async (d) => {
        setLabels(d.assets);
        setQrMap(await buildQrs(d.assets));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    jfetch('/api/stats')
      .then((s) => setOrg(s.org.nama))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnprinted]);

  const buildQrs = async (assets) => {
    let QRCode = null;
    try {
      ({ default: QRCode } = await import('qrcode'));
    } catch {
      return {};
    }
    const map = {};
    await Promise.all(
      assets.map(async (a) => {
        try {
          map[a.id] = await QRCode.toDataURL(`ASETTRACK|${org}|${a.code}`, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 240,
            color: { dark: '#111111', light: '#ffffff' },
          });
        } catch {
          map[a.id] = null;
        }
      }),
    );
    return map;
  };

  const cols = PRESETS[preset].cols;

  const doPrint = () => {
    if (!labels.length) return;
    show('Membuka dialog cetak… (pilih printer & kertas A4)');
    setTimeout(() => window.print(), 350);
  };

  const markPrinted = async () => {
    if (!labels.length) return;
    setBusy(true);
    try {
      const res = await jfetch('/api/print', { method: 'POST', body: JSON.stringify({ ids: labels.map((l) => l.id) }) });
      show(`${res.updated} label ditandai sudah dicetak ✓`);
      setLabels([]);
      setQrMap({});
    } catch (e) {
      show(`Gagal: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const filteredTxt = onlyUnprinted ? `${labels.length} label belum dicetak` : `${labels.length} label`;

  return (
    <>
      <PageHead title="🏷️ Cetak label QR" sub={`${org} · ${filteredTxt}`} />

      <div className="card no-print">
        <div className="label-toolbar">
          <div className="chip-row" style={{ marginTop: 0 }}>
            {Object.entries(PRESETS).map(([k, v]) => (
              <button key={k} className={`chip ${preset === k ? 'active' : ''}`} onClick={() => setPreset(k)}>
                {v.label}
              </button>
            ))}
          </div>
          <button
            className={`chip ${onlyUnprinted ? 'active' : ''}`}
            style={{ minHeight: 42, border: '1.5px solid var(--line)', background: '#fff', borderRadius: 999 }}
            onClick={() => setOnlyUnprinted(!onlyUnprinted)}
          >
            {onlyUnprinted ? '🟢 Hanya belum dicetak' : '⚪ Semua label'}
          </button>
        </div>

        <div className="btn-grid">
          <button className="btn btn-primary" onClick={doPrint} disabled={!labels.length || loading}>
            🖨️ Cetak label
          </button>
          <button className="btn btn-soft" onClick={markPrinted} disabled={!labels.length || busy}>
            ✓ Tandai sudah dicetak
          </button>
        </div>
        <p className="input-hint">
          Gunakan kertas A4. Mode <b>kalibrasi cetak-1-scan-1</b> tersedia di versi produksi — di pratinjau ini
          setiap label menampilkan QR <b>level-H</b> (tahan lecet) + kode teks cadangan.
        </p>
      </div>

      {loading ? (
        <Empty icon="⏳" text="Menyiapkan label…" />
      ) : labels.length === 0 ? (
        <div className="card">
          <Empty icon="🏷️" text="Tidak ada label untuk dicetak. Impor aset dulu atau pilih 'Semua label'." />
        </div>
      ) : (
        <div className="card">
          <div className={`label-sheet label-grid preset-${preset}`}>
            {labels.map((a) => (
              <div key={a.id} className="label-cell">
                {qrMap[a.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrMap[a.id]} alt={`QR ${a.code}`} />
                ) : (
                  <div className="lc-code" style={{ height: 92, display: 'grid', placeItems: 'center' }}>QR…</div>
                )}
                <div className="lc-code">{a.code}</div>
                <div className="lc-name">{a.name}</div>
                <div className="lc-org">{org}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast}
    </>
  );
}