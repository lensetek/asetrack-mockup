import './globals.css';
import Nav from '@/components/Nav';

export const metadata = {
  title: 'AsetTrack — Pengelolaan Aset Yayasan',
  description:
    'Mockup (prototipe UI/UX) AsetTrack: impor, cetak label QR, scan, dan laporan opname aset — Next.js + SQLite3.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <Nav />
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}