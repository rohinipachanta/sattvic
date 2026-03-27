/** @type {import('next').NextConfig} */
const nextConfig = {
  // Railway sets PORT automatically — Next.js respects it
  // No special config needed for Railway + Nixpacks
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'sattvic.up.railway.app'] },
  },
}

export default nextConfig
