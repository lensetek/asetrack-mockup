'use client';

import { useEffect, useMemo, useState } from 'react';
import { jfetch, PageHead, Empty, useToast } from '@/components/ui';

const KONDISI = ['BAIK', 'PERLU PERBAIKAN', 'RUSAK'];

function downloadCSV(filename, header, rows) {
  const csv = [
    header.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function LaporanPage() {
  const [all, setAll] = useState([]);
  const [stats, setStats] = useState(null);
  const [lokasi, setLokasi] = useState('');
  const [kondisi, setKondisi] = useState('');
  const [toast, show] = useToast();

  useEffect(() => {
    jfetch('/api/assets')
      .then((d) => setAll(d.assets))
      .catch(() => {});
    jfetch('/api/stats').then(setStats).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return all.filter(
      (a) => (!lokasi || a.location === lokasi) && (!kondisi || a.condition === kondisi),
    );
  }, [all, lokasi, kondisi]);

  const countBy = (fn) => filtered.reduce((m, a) => ((m[fn(a)] = (m[fn(a)] || 0) + 1), m), {});

  const perLokasi = Object.entries(countBy((a) => a.location)).sort((a, b) => b[1] - a[1]);
  const perKondisi = Object.entries(countBy((a) => a.condition)).sort((a, b) => b[1] - a[1]);
  const nilaiTotal = filtered.reduce((s, a) => s + (a.value || 0), 0);

  const logExport = async () => {
    try { await jfetch('/api/export', { method: 'POST' }); } catch { /* non-kritis */ }
  };

  const unduhRincian = async () => {
    await logExport();
    downloadCSV(
      'laporan_rincian_aset.csv',
      ['Kode', 'Nama', 'Kategori', 'Lokasi', 'PIC', 'Nilai', 'Kondisi', 'Status', 'Tercetak', 'Jumlah Scan'],
      filtered.map((a) => [a.code, a.name, a.category, a.location, a.pic, a.value, a.condition, a.status, a.print_status, a.scanned_count]),
    );
    show('Laporan rincian berhasil diunduh ✓');
  };

  const unduhRingkasan = async () => {
    await logExport();
    const rows = [
      ['Laporan Ringkasan', stats?.org?.nama || 'Yayasan'],
      ['Tanggal', new Date().toLocaleDateString('id-ID')],
      [],
      ['Total aset', filtered.length],
      ['Nilai total (Rp)', nilaiTotal],
      [],
      ['PER LOKASI'],
      ...perLokasi.map(([k, n]) => [k, n]),
      [],
      ['PER KONDISI'],
      ...perKondisi.map(([k, n]) => [k, n]),
    ];
    downloadCSV('laporan_ringkasan_opname.csv', ['Keterangan', 'Jumlah'], rows);
    show('Laporan ringkasan berhasil diunduh ✓');
  };

  const lokasiList = useMemo(() => [...new Set(all.map((a) => a.location))].sort(), [all]);

  return (
    <>
      <PageHead title="📄 Laporan opname" sub="Langkah 5 dari 5: susun dan unduh laporan untuk pengurus / bendahara." />

      <div className="card">
        <h2 className="card-title">🎛️ Atur laporan</h2>
        <div className="chip-row" style={{ marginTop: 0 }}>
          <button className={`chip ${!lokasi ? 'active' : ''}`} onClick={() => setLokasi('')}>Semua lokasi</button>
          {lokasiList.map((l) => (
            <button key={l} className={`chip ${lokasi === l ? 'active' : ''}`} onClick={() => setLokasi(l)}>📍 {l}</button>
          ))}
        </div>
        <div className="chip-row">
          <button className={`chip ${!kondisi ? 'active' : ''}`} onClick={() => setKondisi('')}>Semua kondisi</button>
          {KONDISI.map((k) => (
            <button key={k} className={`chip ${kondisi === k ? 'active' : ''}`} onClick={() => setKondisi(k)}>{k}</button>
          ))}
        </div>

        <div className="stat-grid" style={{ marginTop: 14 }}>
          <div className="stat"><div className="num">📦 {filtered.length}</div><div className="lbl">Aset terdata</div></div>
          <div className="stat"><div className="num">💰 {nilaiTotal ? `Rp ${nilaiTotal.toLocaleString('id-ID')}` : '—'}</div><div className="lbl">Nilai total</div></div>
          <div className="stat"><div className="num">🔧 {(filtered.filter((a) => a.condition !== 'BAIK').length)}</div><div className="lbl">Perlu tindak lanjut</div></div>
          <div className="stat"><div className="num">🤝 {filtered.filter((a) => a.status === 'DIPINJAM').length}</div><div className="lbl">Sedang dipinjam</div></div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">⬇️ Unduh laporan</h2>
        <p className="card-sub">Ringkasan untuk pengurus · rincian untuk arsip. Format CSV (terbuka di Excel).</p>
        <div className="btn-grid">
          <button className="btn btn-primary" onClick={unduhRingkasan} disabled={!filtered.length}>📄 Ringkasan opname</button>
          <button className="btn btn-soft" onClick={unduhRincian} disabled={!filtered.length}>🗂️ Rincian aset</button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">📊 Ringkasan singkat ({filtered.length} aset)</h2>
        {filtered.length === 0 ? (
          <Empty icon="🧾" text="Belum ada data sesuai filter." />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Lokasi</th><th>Jumlah</th><th>Baik</th><th>Perlu perbaikan</th><th>Rusak</th></tr>
              </thead>
              <tbody>
                {perLokasi.map(([l, n]) => (
                  <tr key={l}>
                    <td><b>{l}</b></td>
                    <td className="num">{n}</td>
                    <td className="num">{filtered.filter((a) => a.location === l && a.condition === 'BAIK').length}</td>
                    <td className="num">{filtered.filter((a) => a.location === l && a.condition === 'PERLU PERBAIKAN').length}</td>
                    <td className="num">{filtered.filter((a) => a.location === l && a.condition === 'RUSAK').length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast}
    </>
  );
}