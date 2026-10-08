/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 adalah modul native — jangan di-bundle oleh Next.js
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;