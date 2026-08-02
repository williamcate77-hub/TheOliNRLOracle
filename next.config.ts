import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The snapshot script starts a second Next server while one may already be
  // running. Two servers sharing .next corrupt each other's chunks, so the
  // script points itself at its own build directory.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    // Player photos come from Stats Perform at full resolution — a head shot is
    // around 270KB and a body shot 600KB. Serving thirty of those in a squad
    // list is unacceptable on a phone, so they go through the optimizer and come
    // back as WebP at the size actually rendered.
    remotePatterns: [
      { protocol: 'https', hostname: 'www.nrl.com' },
      { protocol: 'https', hostname: 'rugbyimages.statsperform.com' },
    ],
    // Everything here is either a 40px row avatar or a portrait beside it.
    imageSizes: [48, 96, 144, 288],
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default nextConfig
