'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { jfetch, PageHead, Stat, Empty } from '@/components/ui';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [lic, setLic] = useState(null);

  useEffect(() => {
    jfetch('/api/stats')
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    jfetch('/api/license')
      .then(setLic)
      .catch(() => {});
  }, []);

  if (err) return <Empty icon="⚠️" text={`Tidak bisa memuat data: ${err}`} />;
  if (!data) return <Empty icon="⏳" text="Memuat…" />;

  const s = data.stats;

  return (
    <>
      <PageHead title={`Halo, Bu Ratna 👋`} sub={`${data.org.nama} · ${data.org.jenis}`} />

      <div className="stat-grid">
        <Stat icon="📦" num={s.total} label="Total aset" tone="brand" />
        <Stat icon="🏷️" num={s.printed} label="Label tercetak" tone="info" />
        <Stat icon="📷" num={s.scanned} label="Sudah discan" tone="ok" />
        <Stat icon="🔧" num={s.rusak} label="Perlu perbaikan" tone="bad" />
      </div>

      <div className="section">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              {lic?.active ? `⭐ Paket ${lic.license.plan} aktif` : '⭐ Coba AsetTrack Pro'}
            </h2>
            {lic?.active && <span className="badge ok">{lic.license.token_balance} token</span>}
          </div>
          <p className="card-sub" style={{ marginTop: 6 }}>
            {lic?.active
              ? 'Token Anda dipakai untuk aksi premium (ekspor laporan, cetak label, pengingat WhatsApp).'
              : 'Beli paket Pro (Rp49.000 = 50 token) untuk membuka aksi premium. Aksi inti tetap gratis.'}
          </p>
          <Link className="btn btn-primary btn-block" href="/upgrade">
            {lic?.active ? 'Lihat token & upgrade' : 'Lihat paket & beli token'}
          </Link>
        </div>
      </div>

      <div className="section">
        <div className="card">
          <h2 className="card-title">📋 Persiapan opname Anda</h2>
          <p className="card-sub">Lima langkah kecil — setelah langkah 5, aset siap dilaporkan ke pengurus.</p>
          <ul className="checklist">
            {data.checklist.map((c) => (
              <li key={c.no} className={`${c.done ? 'done' : ''}${c.now ? ' now' : ''}`}>
                <span className="step-dot">{c.done ? '✓' : c.no}</span>
                <span className="step-txt">
                  <b>{c.title}</b>
                  <span>{c.sub}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="btn-grid">
            <Link className="btn btn-primary btn-block" href="/impor">📥 Impor data aset</Link>
            <Link className="btn btn-soft btn-block" href="/label">🏷️ Cetak label QR</Link>
            <Link className="btn btn-ok btn-block" href="/scan">📷 Scan aset & update</Link>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="page-head" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>Menu utama</span>
        </h2>
        <div className="quick-grid">
          <Link className="quick" href="/aset">
            <span className="ic">📦</span><b>Daftar aset</b>
            <span>Cari, saring, dan cek kondisi</span>
          </Link>
          <Link className="quick" href="/impor">
            <span className="ic">📥</span><b>Impor data</b>
            <span>Upload file aset dari Excel/CSV</span>
          </Link>
          <Link className="quick" href="/label">
            <span className="ic">🏷️</span><b>Cetak label QR</b>
            <span>Buat label tempel A4</span>
          </Link>
          <Link className="quick" href="/scan">
            <span className="ic">📷</span><b>Scan & update</b>
            <span>Cek kondisi atau pindah lokasi</span>
          </Link>
          <Link className="quick" href="/laporan">
            <span className="ic">📄</span><b>Laporan opname</b>
            <span>Unduh laporan untuk pengurus</span>
          </Link>
        </div>
      </div>

      <div className="section">
        <div className="card">
          <h2 className="card-title">🕒 Aktivitas terakhir</h2>
          {data.recent.length === 0 ? (
            <Empty icon="🗒️" text="Belum ada aktivitas. Mulai scan aset pertama Anda." />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Aset</th><th>Aktivitas</th><th>Waktu</th></tr>
                </thead>
                <tbody>
                  {data.recent.map((r, i) => (
                    <tr key={i}>
                      <td><b>{r.name}</b> <span className="badge gray">{r.code}</span></td>
                      <td>{r.actionLabel}</td>
                      <td className="num">{new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}