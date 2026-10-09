'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm({ next = '/' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace(next);
      router.refresh();
    } catch (e) {
      setErr(e.message || 'Gagal masuk');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">🏷️ AsetTrack</div>
        <h1>Masuk</h1>
        <p className="card-sub">Kelola aset yayasan Anda dengan mudah.</p>
        {err && <div className="note bad">{err}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Kata sandi</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Memproses…' : 'Masuk'}
          </button>
        </form>
        <p className="auth-alt">
          Belum punya akun? <Link href="/register">Daftar gratis</Link>
        </p>
      </div>
    </div>
  );
}