import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Railway sets PORT automatically — Next.js respects it
  // No special config needed for Railway + Nixpacks
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
}

export default nextConfig
