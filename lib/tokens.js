// ------------------------------------------------------------------
// Konfigurasi produk & token AsetTrack Pro (via lynk.id).
// Angka harga & biaya token di bawah ini adalah ASUMSI bisnis — ubah di
// satu tempat ini bila kebijakan berubah.
// ------------------------------------------------------------------

// Produk lynk.id yang dijual
export const LYNX_CHECKOUT_URL = 'https://lynk.id/lensetek/1dzzgxkxlqkg/checkout';
export const PRODUCT_NAME = 'AsetTrack Pro — 50 Token';
export const PRICE_IDR = 49000;
export const TOKENS_PER_PURCHASE = 50;

// Biaya token per aksi premium (kredit terpakai).
// Aksi inti (scan, update, impor, lihat daftar) TIDAK memakai token.
export const TOKEN_COST = {
  LABEL_PRINT: 1, // per 50 label QR
  REPORT_EXPORT: 1, // per laporan opname
  WA_REMINDER: 5, // per 100 pesan WhatsApp
  EXTRA_TEAM_MEMBER: 10, // per anggota tim tambahan / bulan
};

export const TOKEN_COST_INFO = [
  { key: 'LABEL_PRINT', label: 'Cetak label QR', unit: 'per 50 label', cost: TOKEN_COST.LABEL_PRINT },
  { key: 'REPORT_EXPORT', label: 'Ekspor laporan opname', unit: 'per laporan', cost: TOKEN_COST.REPORT_EXPORT },
  { key: 'WA_REMINDER', label: 'Pengingat WhatsApp', unit: 'per 100 pesan', cost: TOKEN_COST.WA_REMINDER },
  { key: 'EXTRA_TEAM_MEMBER', label: 'Anggota tim tambahan', unit: 'per user / bulan', cost: TOKEN_COST.EXTRA_TEAM_MEMBER },
];

export const PACKAGES = [
  {
    id: 'GRATIS',
    name: 'Gratis',
    price: 'Rp0',
    period: 'selamanya',
    highlight: false,
    features: ['Hingga 500 aset', '1 pengguna', 'Impor, label QR, scan & laporan dasar', 'Tanpa notifikasi WhatsApp'],
    cta: 'Paket saat ini',
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 'Rp49.000',
    period: 'sekali beli · 50 token',
    highlight: true,
    features: [
      'Token 50 untuk aksi premium',
      'Kuota aset lebih besar',
      'Ekspor laporan & cetak label prioritas',
      'Pengingat WhatsApp (memakai token)',
      'Dukungan prioritas',
    ],
    cta: 'Beli sekarang',
    lynk: true,
  },
  {
    id: 'INSTANSI',
    name: 'Instansi',
    price: 'Custom',
    period: 'per organisasi',
    highlight: false,
    features: ['Multi-cabang / multi-yayasan', 'Anggota tim tak terbatas', 'SLA & pendampingan', 'Kustomisasi laporan'],
    cta: 'Hubungi kami',
  },
];

// Format rupiah ringkas
export function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}