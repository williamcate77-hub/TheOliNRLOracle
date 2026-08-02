import type { Metadata, Viewport } from 'next'
import { Inter, Oswald } from 'next/font/google'
import { PlayersProvider } from '@/components/PlayersProvider'
import { PullToRefresh } from '@/components/PullToRefresh'
import { RabbitohsEasterEgg } from '@/components/RabbitohsEasterEgg'
import { SeasonProvider } from '@/components/SeasonProvider'
import './globals.css'

// A condensed grotesque for numerals and headings, a clean neutral sans for
// everything else. The gap between the two is the type system.
const condensed = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-condensed',
  display: 'swap',
})

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Oli's NRL Oracle",
  description: 'Every NRL team, the ladder, every match and every player. Updated when you say so.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    // Launches from the home screen without Safari's chrome, and titles the
    // icon on the home screen.
    capable: true,
    title: "Oli's NRL Oracle",
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#0B1015',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${condensed.variable} ${sans.variable}`}>
      <body>
        {/* Players wraps Season because a season refresh pulls player totals
            along with it. */}
        <PlayersProvider>
          <SeasonProvider>
            <PullToRefresh>{children}</PullToRefresh>
          </SeasonProvider>
        </PlayersProvider>
        {/* At layout level so the sound and the overlay survive the navigation
            the click usually causes. */}
        <RabbitohsEasterEgg />
      </body>
    </html>
  )
}
