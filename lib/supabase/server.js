import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Klien Supabase untuk sisi server (API routes / server components).
// Membawa sesi pengguna lewat cookie sehingga RLS "auth.uid()" berlaku.
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component (read-only) — aman untuk diabaikan;
          // penyegaran sesi ditangani middleware.
        }
      },
    },
  });
}