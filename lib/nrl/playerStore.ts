import book from '@/data/players-2026.json'
import { SEASON, fetchMatch } from '@/lib/nrl/fetch'
import { foldMatch } from '@/lib/nrl/players'
import { getSeason } from '@/lib/nrl/store'
import type { PlayerBook, PlayerSeason } from '@/lib/nrl/types'

// Season player totals.
//
// Same shape of idea as the season store: a committed snapshot is the floor, a
// refresh adds only what is missing, and the result is parked in module memory.
//
// The difference is cost. Building the table from nothing is roughly one request
// per match — about 190 for a full season — which is why the full build is done
// on a laptop by `npm run snapshot` and never by a serverless function. Once the
// snapshot is in place a refresh only fetches matches that have finished since,
// which is at most a round: eight requests, usually none.

const SNAPSHOT = book as PlayerBook

/** Ceiling on one refresh, so a cold or stale cache cannot blow the function's
 *  time limit. Anything left over is picked up by the next refresh. */
const MAX_PER_REFRESH = 24

/** How many match centre payloads are in flight at once. */
const CONCURRENCY = 6

let warm: PlayerBook | null = null

export const getPlayers = (): PlayerBook => warm ?? SNAPSHOT

/**
 * Folds in every completed match not already counted.
 * Returns the book plus how much is still outstanding, so the caller can say so.
 */
export async function refreshPlayers(
  limit = MAX_PER_REFRESH,
): Promise<{ book: PlayerBook; remaining: number }> {
  const base = getPlayers()
  const counted = new Set(base.sources)

  const outstanding = getSeason()
    .fixtures.filter((f) => f.isComplete && f.matchCentreUrl && !counted.has(f.matchCentreUrl))
    .map((f) => f.matchCentreUrl as string)

  if (!outstanding.length) return { book: base, remaining: 0 }

  const batch = outstanding.slice(0, limit)
  const matches = await pool(batch, CONCURRENCY, async (url) => {
    try {
      return [url, await fetchMatch(url)] as const
    } catch {
      // One unreachable match should not sink the rest of the pull. It stays
      // outstanding and gets picked up next time.
      return null
    }
  })

  // Rebuilt from the previous table rather than from scratch: a completed match
  // never changes, so its numbers are already final and re-adding them would
  // double count.
  const table = new Map<number, PlayerSeason>(
    base.players.map((p) => [p.playerId, structuredClone(p)]),
  )
  const sources = [...base.sources]

  for (const result of matches) {
    if (!result) continue
    const [url, match] = result
    foldMatch(table, match)
    sources.push(url)
  }

  const next: PlayerBook = {
    season: SEASON,
    players: [...table.values()].sort(byName),
    sources,
    updatedAt: new Date().toISOString(),
  }

  warm = next
  return { book: next, remaining: outstanding.length - batch.length }
}

const byName = (a: PlayerSeason, b: PlayerSeason) =>
  a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)

/** Runs `work` over `items` with at most `size` in flight at once. */
async function pool<T, R>(
  items: T[],
  size: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0

  const runner = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await work(items[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(size, items.length) }, runner))
  return out
}
