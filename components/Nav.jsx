'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const ITEMS = [
  { href: '/', label: 'Beranda', ic: '🏠', short: 'Beranda' },
  { href: '/aset', label: 'Daftar Aset', ic: '📦', short: 'Aset' },
  { href: '/impor', label: 'Impor Data', ic: '📥', short: 'Impor' },
  { href: '/label', label: 'Cetak Label', ic: '🏷️', short: 'Label' },
  { href: '/scan', label: 'Scan Aset', ic: '📷', short: 'Scan' },
  { href: '/laporan', label: 'Laporan', ic: '📄', short: 'Laporan' },
  { href: '/upgrade', label: 'Upgrade Pro', ic: '⭐', short: 'Pro' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (isAuthPage) return;
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data?.user?.email || ''))
      .catch(() => {});
  }, [pathname, isAuthPage]);

  if (isAuthPage) return null;

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  async function logout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <>
      <header className="topnav no-print">
        <div className="topnav-inner">
          <Link href="/" className="brand">
            <span className="brand-logo">🏷️</span>
            <span>AsetTrack</span>
          </Link>
          <nav className="desktop-nav" aria-label="Navigasi utama">
            {ITEMS.map((it) => (
              <Link key={it.href} href={it.href} className={isActive(it.href) ? 'active' : ''}>
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            {email && (
              <span className="nav-user" title={email}>
                {email}
              </span>
            )}
            <button className="btn-logout" type="button" onClick={logout}>
              Keluar
            </button>
          </div>
        </div>
      </header>

      <nav className="mobile-nav no-print" aria-label="Navigasi bawah">
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href} className={isActive(it.href) ? 'active' : ''}>
            <span className="ic">{it.ic}</span>
            <span>{it.short}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}