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

  const row = new Map(season.ladder.map((r) => [r.teamId, r]))
  const clubs = [...CLUBS].sort(
    (a, b) => (row.get(a.teamId)?.position ?? 99) - (row.get(b.teamId)?.position ?? 99),
  )

  return (
    <>
      <RefreshHeader title="Oli's NRL Oracle" />

      <main className="shell">
        <p className={`label ${styles.caption}`}>
          {season.currentRound ? `After round ${season.currentRound}` : 'All teams'}
        </p>

        <div className={styles.grid}>
          {clubs.map((club) => {
            const r = row.get(club.teamId)
            return (
              <Link
                key={club.teamId}
                href={`/team/${club.teamId}`}
                className={styles.tile}
                style={{ ['--accent' as string]: club.accent }}
                data-club={club.themeKey}
              >
                <span className={`num ${styles.position}`}>{r?.position ?? '–'}</span>
                <img
                  className={styles.badge}
                  src={badgeUrl(club.themeKey)}
                  alt=""
                  width={80}
                  height={80}
                  loading="eager"
                />
                <span className={styles.name}>{club.name}</span>

                {/* Competition points and points difference, the two numbers
                    that explain the order the tiles are already in. */}
                <span className={styles.stats}>
                  <span className={`num ${styles.points}`}>{r?.points ?? '–'}</span>
                  <span className={styles.unit}>pts</span>
                  <span className={`num ${styles.diff}`}>{signed(r?.pointsDifference)}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </main>
    </>
  )
}

/** Points difference only means anything with its sign attached. */
const signed = (value: number | undefined) =>
  value === undefined ? '–' : value > 0 ? `+${value}` : String(value)
