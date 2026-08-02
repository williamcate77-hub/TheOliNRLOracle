import seed from '@/data/season-2026.json'
import { SEASON, fetchDraw, fetchLadder } from '@/lib/nrl/fetch'
import { fixtureKey, normaliseDraw, normaliseLadder } from '@/lib/nrl/normalise'
import type { Fixture, Season } from '@/lib/nrl/types'

// The season store.
//
// The committed snapshot in data/ is the floor: every render, including the very
// first one on a cold serverless instance, has real data to work with and never
// waits on the NRL. A refresh layers fresh data on top and parks it in module
// memory for as long as the instance lives.
//
// A completed match never changes, so it is never fetched twice. That is what
// keeps a refresh down to three upstream requests once the snapshot is in place:
// the ladder, the current round, and the round that is coming.

const LAST_ROUND = 27

let warm: Season | null = null

export const getSeason = (): Season => warm ?? (seed as Season)

/**
 * Pulls what is genuinely stale and returns the whole season.
 * Called only by /api/refresh, which is only called when the user asks.
 */
export async function refreshSeason(): Promise<Season> {
  const base = getSeason()

  // The ladder is the one thing that always moves, and the one thing every
  // screen leads with. If it fails the refresh fails and the client keeps its
  // cache — a half-updated season is worse than an honest failure.
  const [ladderRaw, drawRaw] = await Promise.all([fetchLadder(), fetchDraw()])

  const ladder = normaliseLadder(ladderRaw)
  const currentFixtures = normaliseDraw(drawRaw)
  const currentRound = currentFixtures[0]?.round || base.currentRound

  const fetched = new Map<number, Fixture[]>()
  if (currentFixtures.length) fetched.set(currentRound, currentFixtures)

  // Rounds still worth asking about: anything already stored that has not
  // finished, anything missing outright, and the round that is next up — which
  // the default draw response does not include, but the Team screen needs for
  // its kick-off time and venue.
  const stale = new Set<number>()
  const byRound = new Map<number, Fixture[]>()
  for (const f of base.fixtures) {
    const list = byRound.get(f.round) ?? []
    list.push(f)
    byRound.set(f.round, list)
  }
  for (let r = 1; r <= Math.min(currentRound + 1, LAST_ROUND); r++) {
    if (fetched.has(r)) continue
    const stored = byRound.get(r)
    if (!stored?.length || stored.some((f) => !f.isComplete)) stale.add(r)
  }

  const results = await Promise.allSettled(
    [...stale].map(async (r) => [r, normaliseDraw(await fetchDraw(r))] as const),
  )
  for (const result of results) {
    // A round that will not load is not fatal. Keep whatever was stored for it
    // and let the rest of the refresh through.
    if (result.status === 'fulfilled' && result.value[1].length) {
      fetched.set(result.value[0], result.value[1])
    }
  }

  // Freshly fetched rounds replace what was stored for those rounds; every other
  // round carries over untouched.
  const merged = new Map<string, Fixture>()
  for (const f of base.fixtures) if (!fetched.has(f.round)) merged.set(fixtureKey(f), f)
  for (const list of fetched.values()) for (const f of list) merged.set(fixtureKey(f), f)

  const season: Season = {
    season: SEASON,
    currentRound,
    ladder: ladder.length ? ladder : base.ladder,
    fixtures: [...merged.values()].sort(byKickOff),
    updatedAt: new Date().toISOString(),
  }

  warm = season
  return season
}

const byKickOff = (a: Fixture, b: Fixture) =>
  a.round - b.round || (a.kickOff ?? '').localeCompare(b.kickOff ?? '')

/**
 * Everything the season is made of except when it was pulled. Two payloads with
 * the same fingerprint mean the refresh found nothing new, which is a state the
 * user is shown rather than a no-op.
 */
export function fingerprint(s: Season): string {
  const ladder = s.ladder
    .map((r) => `${r.position}${r.teamId}${r.points}${r.pointsDifference}${r.streak}${r.form}`)
    .join('|')
  const fixtures = s.fixtures
    .map((f) => `${fixtureKey(f)}${f.matchState}${f.home.score}${f.away.score}${f.kickOff}`)
    .join('|')
  return hash(`${s.currentRound}~${ladder}~${fixtures}`)
}

function hash(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}
