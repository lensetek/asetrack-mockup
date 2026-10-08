'use client';

import { useEffect, useMemo, useState } from 'react';
import { jfetch, PageHead, Badge, ScannedBadge, Empty } from '@/components/ui';

export default function AsetPage() {
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [q, setQ] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [kondisi, setKondisi] = useState('');
  const [printed, setPrinted] = useState('');
  const [loading, setLoading] = useState(true);

  const reloadAssets = () => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (lokasi) p.set('lokasi', lokasi);
    if (kondisi) p.set('kondisi', kondisi);
    if (printed) p.set('printed', printed);
    jfetch(`/api/assets?${p.toString()}`)
      .then((d) => setAssets(d.assets))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reloadAssets();
    jfetch('/api/stats').then(setStats).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lokasi, kondisi, printed]);

  const lokasiList = useMemo(
    () => [...new Set((stats?.perLokasi || []).map((l) => l.location))].sort(),
    [stats],
  );
  const kondisiList = useMemo(
    () => ['BAIK', 'PERLU PERBAIKAN', 'RUSAK'],
    [],
  );

  let debounce;
  const onSearch = (v) => {
    setQ(v);
    clearTimeout(debounce);
    debounce = setTimeout(reloadAssets, 350);
  };

  const fmt = (n) => (n ? `Rp ${Number(n).toLocaleString('id-ID')}` : '—');

  return (
    <>
      <PageHead title="📦 Daftar aset" sub={`${stats?.stats.total ?? '…'} aset yayasan · ${stats?.stats.printed ?? 0} label tercetak`} />

      <div className="card">
        <input
          type="search"
          placeholder="Cari kode / nama / kategori…"
          defaultValue={q}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Cari aset"
        />

        <div className="chip-row">
          <button className={`chip ${!lokasi ? 'active' : ''}`} onClick={() => setLokasi('')}>Semua lokasi</button>
          {lokasiList.map((l) => (
            <button key={l} className={`chip ${lokasi === l ? 'active' : ''}`} onClick={() => setLokasi(l)}>
              📍 {l}
            </button>
          ))}
        </div>

        <div className="chip-row">
          <button className={`chip ${!kondisi ? 'active' : ''}`} onClick={() => setKondisi('')}>Semua kondisi</button>
          {kondisiList.map((k) => (
            <button key={k} className={`chip ${kondisi === k ? 'active' : ''}`} onClick={() => setKondisi(k)}>{k}</button>
          ))}
          <button className={`chip ${printed === 'BELUM' ? 'active' : ''}`} onClick={() => setPrinted(printed === 'BELUM' ? '' : 'BELUM')}>
            🏷️ Belum cetak
          </button>
        </div>
      </div>

      <div className="section">
        {loading ? (
          <Empty icon="⏳" text="Memuat…" />
        ) : assets.length === 0 ? (
          <Empty icon="🗂️" text="Tidak ada aset sesuai filter. Coba ubah pencarian atau impor data." />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Kode</th><th>Nama</th><th>Lokasi</th><th>Kondisi</th><th>Status cetak</th><th>Scan</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td className="num"><b>{a.code}</b></td>
                    <td>
                      <b>{a.name}</b>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{a.category} {a.pic ? `· ${a.pic}` : ''}</div>
                    </td>
                    <td>{a.location}</td>
                    <td><Badge value={a.condition} /></td>
                    <td><Badge value={a.print_status} /></td>
                    <td><ScannedBadge n={a.scanned_count} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}