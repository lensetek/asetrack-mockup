'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterForm() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [jenis, setJenis] = useState('Yayasan');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nama, jenis },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      if (data.session) {
        router.replace('/');
        router.refresh();
      } else {
        setInfo('Akun dibuat. Cek email Anda untuk mengonfirmasi, lalu masuk.');
      }
    } catch (e) {
      setErr(e.message || 'Gagal mendaftar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">🏷️ AsetTrack</div>
        <h1>Daftar gratis</h1>
        <p className="card-sub">Mulai kelola aset yayasan dalam beberapa menit.</p>
        {err && <div className="note bad">{err}</div>}
        {info && <div className="note">{info}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="nama">Nama organisasi</label>
            <input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Yayasan Cahaya Ilmu" required />
          </div>
          <div className="field">
            <label htmlFor="jenis">Jenis</label>
            <select id="jenis" value={jenis} onChange={(e) => setJenis(e.target.value)}>
              <option>Yayasan</option>
              <option>Sekolah</option>
              <option>Masjid</option>
              <option>Panti Asuhan</option>
              <option>Lainnya</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Kata sandi</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            <div className="input-hint">Minimal 6 karakter.</div>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Memproses…' : 'Daftar'}
          </button>
        </form>
        <p className="auth-alt">
          Sudah punya akun? <Link href="/login">Masuk</Link>
        </p>
      </div>
    </div>
  );
}