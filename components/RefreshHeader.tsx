'use client'

import Link from 'next/link'
import { useSeason } from '@/components/SeasonProvider'
import { useNow } from '@/components/useNow'
import { ago, isStale } from '@/lib/time'
import styles from './RefreshHeader.module.css'

// The refresh button. Sticky, always visible, never behind a menu, on every
// screen. The status line underneath it is the whole contract with the reader:
// this is how old the numbers are, and pulling is what makes them new.

export function RefreshHeader({ title, back }: { title: string; back?: boolean }) {
  const { season, state, refresh } = useSeason()
  const now = useNow()
  const fetching = state.kind === 'fetching'
  const stale = now > 0 && isStale(season.updatedAt, now)

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        {back ? (
          <Link href="/" className={styles.back} aria-label="Back to all teams">
            <Chevron />
          </Link>
        ) : null}

        <h1 className={styles.title}>{title}</h1>

        <button
          type="button"
          className={styles.refresh}
          onClick={refresh}
          disabled={fetching}
          aria-label="Refresh stats"
        >
          <Arrows spinning={fetching} />
          <span>Refresh</span>
        </button>
      </div>

      <p
        className={`${styles.status} ${stale && state.kind === 'idle' ? styles.stale : ''}`}
        aria-live="polite"
      >
        {statusLine(state.kind, season.updatedAt, now, stale)}
      </p>
    </header>
  )
}

function statusLine(
  kind: string,
  updatedAt: string,
  now: number,
  stale: boolean,
): string {
  switch (kind) {
    case 'fetching':
      return 'Getting the latest stats'
    case 'success':
      return 'Updated just now'
    case 'nochange':
      return 'Already up to date'
    case 'error':
      return now > 0
        ? `Could not reach the NRL. Showing stats from ${ago(updatedAt, now)}.`
        : 'Could not reach the NRL. Showing the stats you already had.'
    default:
      if (now === 0) return 'Pull down for latest stats'
      if (stale) return 'Stats are stale. Pull down to update.'
      return `Updated ${ago(updatedAt, now)}`
  }
}

const Chevron = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M12.5 4 6.5 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
  </svg>
)

const Arrows = ({ spinning }: { spinning: boolean }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    className={spinning ? styles.spinning : undefined}
  >
    <path
      d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6M16.5 2.5V6h-3.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
    />
  </svg>
)
