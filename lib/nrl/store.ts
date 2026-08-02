import seed from '@/data/season-2026.json'
import { SEASON, fetchDraw, fetchLadder } from '@/lib/nrl/fetch'
import { mergeFixtures } from '@/lib/nrl/merge'
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

  const byRound = new Map<number, Fixture[]>()
  for (const f of base.fixtures) {
    const list = byRound.get(f.round) ?? []
    list.push(f)
    byRound.set(f.round, list)
  }

  // Rounds worth asking about, and only those:
  //
  //  - Any round nothing is stored for at all. That is the backfill, and it is
  //    what stops a gap in the store from becoming permanent — a round that was
  //    never pulled, or was pulled on a day the feed was down, used to be
  //    invisible forever because the loop below only ever looked as far ahead as
  //    the next round. Every one of those games is missing off both teams'
  //    screens until somebody rebuilds the snapshot by hand.
  //  - Rounds that are stored but have not finished, up to the round after the
  //    current one. Those are the only stored rounds whose scores can still
  //    move, and the round that is next up is the one the Team screen needs for
  //    its kick-off time and venue.
  //
  // A future round already sitting in the store is left alone until it comes
  // into that window, so a complete store still costs the same three requests it
  // always did: the ladder, this round, and the next.
  const stale = new Set<number>()
  for (let r = 1; r <= LAST_ROUND; r++) {
    if (fetched.has(r)) continue
    const stored = byRound.get(r)
    if (!stored?.length) stale.add(r)
    else if (r <= currentRound + 1 && stored.some((f) => !f.isComplete)) stale.add(r)
  }

  const results = await Promise.allSettled(
    [...stale].map(async (r) => [r, normaliseDraw(await fetchDraw(r))] as const),
  )
  for (const result of results) {
    // A round that will not load is not fatal. Keep whatever was stored for it
    // and let the rest of the refresh through.
    if (result.status !== 'fulfilled') continue
    const [asked, fixtures] = result.value
    // The draw endpoint answers a round it does not recognise with the current
    // round instead of an error. Filed under the round the payload says it is,
    // never the round that was asked for, so an answer like that updates the
    // round it actually describes rather than wiping the one it does not.
    for (const [round, list] of groupByRound(fixtures)) {
      if (round === asked || !fetched.has(round)) fetched.set(round, list)
    }
  }

  const season: Season = {
    season: SEASON,
    currentRound,
    ladder: ladder.length ? ladder : base.ladder,
    fixtures: mergeFixtures(base.fixtures, [...fetched.values()].flat()),
    updatedAt: new Date().toISOString(),
  }

  warm = season
  return season
}

function groupByRound(fixtures: Fixture[]): Map<number, Fixture[]> {
  const rounds = new Map<number, Fixture[]>()
  for (const f of fixtures) {
    if (!f.round) continue
    const list = rounds.get(f.round) ?? []
    list.push(f)
    rounds.set(f.round, list)
  }
  return rounds
}

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
