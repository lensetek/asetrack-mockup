'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { jfetch, PageHead, Empty, useToast } from '@/components/ui';

// --- parser CSV kecil (mendukung kutip ") untuk mockup ---
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const HEADERS = ['kode', 'nama', 'kategori', 'lokasi', 'pic', 'nilai', 'kondisi'];

function indexHeader(headerRow) {
  const idx = {};
  HEADERS.forEach((h, i) => {
    const pos = headerRow.findIndex(
      (c) => String(c).trim().replace(/^\uFEFF/, '').toLowerCase() === h,
    );
    idx[h] = pos >= 0 ? pos : i;
  });
  return idx;
}

export default function ImporPage() {
  const fileRef = useRef(null);
  const [toast, show] = useToast();
  const [preview, setPreview] = useState(null); // { assets:[], problems:[{row,msg}], existing:Set }
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    const csv = [
      HEADERS.join(','),
      '"A-0100","Meja Rapat 01","Meja","Ruang Rapat","Bu Ratna","1200000","BAIK"',
      '"A-0101","Kursi Rapat 01","Kursi","Ruang Rapat","Bu Ratna","300000","BAIK"',
    ].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'template_aset_asetrack.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    show('Template berhasil diunduh ✓ (buka di Excel, isi, simpan sebagai CSV)');
  };

  const onFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.length < 2) throw new Error('File kosong atau tidak terbaca sebagai tabel.');
      const [headerRow, ...body] = parsed;
      const idx = indexHeader(headerRow);

      // kumpulan kode yang sudah ada di database
      const { assets: existingAssets } = await jfetch('/api/assets?scanned=&q=');
      const existing = new Set(existingAssets.map((a) => a.code.toUpperCase()));

      const seenInFile = new Set();
      const assets = [];
      const problems = [];
      body.forEach((row, i) => {
        const lineNo = i + 2; // +1 header
        const get = (h) => (row[idx[h]] ?? '').toString().trim();
        const code = get('kode');
        const name = get('nama');
        if (!code || !name) {
          problems.push({ row: lineNo, code, name, msg: 'Kolom wajib kosong (kode atau nama)' });
          return;
        }
        const codeUp = code.toUpperCase();
        if (existing.has(codeUp) || seenInFile.has(codeUp)) {
          problems.push({ row: lineNo, code, name, msg: 'Kode sudah terdaftar (kemungkinan duplikat)' });
          return;
        }
        seenInFile.add(codeUp);
        assets.push({
          code,
          name,
          category: get('kategori'),
          location: get('lokasi'),
          pic: get('pic'),
          value: Number(get('nilai')) || 0,
          condition: ['BAIK', 'RUSAK', 'PERLU PERBAIKAN'].includes(get('kondisi').toUpperCase())
            ? get('kondisi').toUpperCase()
            : 'BAIK',
        });
      });
      setPreview({ assets, problems, fileName: file.name });
    } catch (e) {
      setPreview(null);
      show(`Terjadi kendala: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!preview || !preview.assets.length) return;
    setBusy(true);
    try {
      const res = await jfetch('/api/import', { method: 'POST', body: JSON.stringify({ assets: preview.assets }) });
      setPreview(null);
      fileRef.current.value = '';
      setFileName('');
      show(
        `Berhasil impor ${res.inserted} aset ✓${res.skipped.length ? `, ${res.skipped.length} dilewati` : ''}`,
      );
    } catch (e) {
      show(`Gagal impor: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="📥 Impor data aset" sub="Langkah 2 dari 5 persiapan opname: masukkan data aset dari file Excel/CSV." />

      <div className="note">
        💡 <b>Tips:</b> cukup isi kolom <b>Kode</b> dan <b>Nama</b> untuk mulai; kolom lain boleh kosong.
        Salah satu dari 3 kondisi: <b>BAIK</b>, <b>RUSAK</b>, <b>PERLU PERBAIKAN</b>.
      </div>

      <div className="card">
        <h2 className="card-title">1 · Unduh template</h2>
        <p className="card-sub">Isi di Excel lalu simpan sebagai CSV (bisa juga .csv langsung).</p>
        <button className="btn btn-primary" onClick={downloadTemplate}>⬇️ Unduh template CSV</button>
      </div>

      <div className="card">
        <h2 className="card-title">2 · Upload file</h2>
        <p className="card-sub">{fileName ? `File dipilih: ${fileName}` : 'Pilih file CSV hasil isian template.'}</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files[0])}
          disabled={busy}
        />
      </div>

      {preview && (
        <div className="card">
          <h2 className="card-title">3 · Periksa dulu sebelum disimpan</h2>
          <p className="card-sub">
            Benar <b>{preview.assets.length}</b> aset · bermasalah <b>{preview.problems.length}</b> baris.
          </p>

          {preview.assets.length > 0 && (
            <div className="tbl-wrap" style={{ marginBottom: 12 }}>
              <table className="tbl">
                <thead>
                  <tr><th>Kode</th><th>Nama</th><th>Lokasi</th><th>PIC</th><th>Kondisi</th></tr>
                </thead>
                <tbody>
                  {preview.assets.slice(0, 8).map((a, i) => (
                    <tr key={i}>
                      <td className="num"><b>{a.code}</b></td>
                      <td>{a.name}</td>
                      <td>{a.location || '—'}</td>
                      <td>{a.pic || '—'}</td>
                      <td>{a.condition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.assets.length > 8 && (
                <div style={{ padding: 8, color: 'var(--muted)', fontSize: 13 }}>
                  … dan {preview.assets.length - 8} aset lain
                </div>
              )}
            </div>
          )}

          {preview.problems.length > 0 && (
            <div className="card" style={{ background: 'var(--bad-soft)', borderColor: '#f3c1bd' }}>
              <h2 className="card-title" style={{ color: 'var(--bad)' }}>⚠️ Perlu diperiksa</h2>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Baris</th><th>Kode</th><th>Nama</th><th>Pesan</th></tr>
                  </thead>
                  <tbody>
                    {preview.problems.map((p, i) => (
                      <tr key={i}>
                        <td className="num">{p.row}</td>
                        <td className="num">{p.code || '—'}</td>
                        <td>{p.name || '—'}</td>
                        <td>{p.msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="card-sub" style={{ marginTop: 10 }}>
                Baris bermasalah <b>tidak akan disimpan</b>. Perbaiki di file lalu upload ulang.
              </p>
            </div>
          )}

          <button
            className="btn btn-ok btn-lg btn-block"
            onClick={doImport}
            disabled={busy || !preview.assets.length}
          >
            💾 Simpan {preview.assets.length} aset
          </button>
        </div>
      )}

      {!preview && (
        <div className="card">
          <div className="empty" style={{ padding: 14 }}>
            <span className="ic">📄</span>
            Belum ada file dianalisis. Setelah upload, Anda akan melihat <b>pratinjau</b> dan <b>baris bermasalah</b> sebelum data disimpan.
          </div>
          <Link className="btn btn-ghost btn-block" href="/aset">Lihat daftar aset →</Link>
        </div>
      )}

      {toast}
    </>
  );
}