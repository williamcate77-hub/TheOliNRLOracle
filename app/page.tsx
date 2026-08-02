'use client'

import Link from 'next/link'
import { RefreshHeader } from '@/components/RefreshHeader'
import { useSeason } from '@/components/SeasonProvider'
import { CLUBS, badgeUrl } from '@/lib/clubs'
import styles from './home.module.css'

// Home: all seventeen clubs as big tiles, badge first, name under it.
//
// Ordered by ladder position with the position shown small on each tile, so the
// grid teaches the ladder without there being a ladder screen to go and find.

export default function Home() {
  const { season } = useSeason()

  const position = new Map(season.ladder.map((r) => [r.teamId, r.position]))
  const clubs = [...CLUBS].sort(
    (a, b) => (position.get(a.teamId) ?? 99) - (position.get(b.teamId) ?? 99),
  )

  return (
    <>
      <RefreshHeader title="NRL 2026" />

      <main className="shell">
        <p className={`label ${styles.caption}`}>
          {season.currentRound ? `After round ${season.currentRound}` : 'All teams'}
        </p>

        <div className={styles.grid}>
          {clubs.map((club) => (
            <Link
              key={club.teamId}
              href={`/team/${club.teamId}`}
              className={styles.tile}
              style={{ ['--accent' as string]: club.accent }}
              data-club={club.themeKey}
            >
              <span className={`num ${styles.position}`}>{position.get(club.teamId) ?? '–'}</span>
              <img
                className={styles.badge}
                src={badgeUrl(club.themeKey)}
                alt=""
                width={80}
                height={80}
                loading="eager"
              />
              <span className={styles.name}>{club.name}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}
