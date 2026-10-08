import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tetapkan root tracing ke folder proyek agar tidak salah menebak
  // (mis. karena ada package-lock.json lain di folder induk saat build lokal).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;