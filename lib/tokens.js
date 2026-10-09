// ------------------------------------------------------------------
// Konfigurasi produk, paket & token AsetTrack Pro (via lynk.id).
// Angka di bawah adalah ASUMSI bisnis — ubah di satu tempat ini.
// ------------------------------------------------------------------

export const LYNX_CHECKOUT_URL = 'https://lynk.id/lensetek/1dzzgxkxlqkg/checkout';
export const PRODUCT_NAME = 'AsetTrack Pro — 50 Token';
export const PRICE_IDR = 49000;
export const TOKENS_PER_PURCHASE = 50;

// Biaya token per aksi premium pada paket PRO.
// Aksi inti (impor, scan, cetak label, lihat daftar) TIDAK memakai token.
export const TOKEN_COST = {
  REPORT_EXPORT: 1, // per laporan opname
  WA_REMINDER: 5, // per 100 pesan WhatsApp
  EXTRA_TEAM_MEMBER: 10, // per anggota tim tambahan / bulan
};

export const TOKEN_COST_INFO = [
  { key: 'REPORT_EXPORT', label: 'Ekspor laporan opname', unit: 'per laporan', cost: TOKEN_COST.REPORT_EXPORT },
  { key: 'WA_REMINDER', label: 'Pengingat WhatsApp', unit: 'per 100 pesan', cost: TOKEN_COST.WA_REMINDER },
  { key: 'EXTRA_TEAM_MEMBER', label: 'Anggota tim tambahan', unit: 'per user / bulan', cost: TOKEN_COST.EXTRA_TEAM_MEMBER },
];

// Batas tiap paket (angka = asumsi).
export const PLAN_LIMITS = {
  GRATIS: { maxAssets: 100, maxUsers: 1, maxExports: 3, whatsapp: false, token: false },
  PRO: { maxAssets: 5000, maxUsers: 10, maxExports: Infinity, whatsapp: true, token: true },
};

export function planLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.GRATIS;
}

export const PACKAGES = [
  {
    id: 'GRATIS',
    name: 'Gratis',
    price: 'Rp0',
    period: 'selamanya',
    highlight: false,
    features: [
      'Hingga 100 aset',
      '1 pengguna',
      'Impor, scan & cetak label QR',
      'Ekspor laporan maks 3×',
      'Tanpa pengingat WhatsApp',
    ],
    cta: 'Paket saat ini',
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 'Rp49.000',
    period: 'sekali beli · 50 token',
    highlight: true,
    features: [
      'Hingga 5.000 aset',
      'Sampai 10 pengguna',
      'Ekspor laporan tanpa batas (potong token)',
      'Pengingat WhatsApp (potong token)',
      'Saldo 50 token',
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