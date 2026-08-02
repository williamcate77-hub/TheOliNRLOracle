import type { MetadataRoute } from 'next'

// Enough of a manifest for "Add to Home Screen" to give the app a real icon, a
// name under it, and a full-screen launch with no browser chrome.
//
// The rest of the progressive web app — the service worker and working offline
// against the cached payload — is Phase 4. Nothing here fetches or caches
// anything on its own.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oli's NRL Oracle",
    short_name: 'NRL Oracle',
    description: 'Every NRL team, the ladder, every match and every player.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1015',
    theme_color: '#0B1015',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
