import { fixtureKey } from '@/lib/nrl/normalise'
import type { Fixture, Season } from '@/lib/nrl/types'

// Combining two copies of the same season without either one hiding a match the
// other has.
//
// This app deliberately keeps three copies — the snapshot in the build,
// localStorage on the phone, and whatever the last refresh returned — and each
// of them is complete the moment it is written and goes thin the moment the
// other two move on. Choosing one and throwing the rest away is how a team
// screen ends up short of games it has actually played: a refresh that ran on a
// cold instance sitting on an old snapshot is *newer* than the build without
// being *fuller* than it, and newer used to win outright.
//
// So nothing is thrown away. A completed match never changes, which is what
// makes the union of two copies safe to take: the fresher copy wins any match
// both of them hold, and a match only one of them holds survives either way.

/**
 * Fixtures from both copies, `fresh` winning wherever the two describe the same
 * match.
 *
 * A stored fixture is dropped in exactly one case: `fresh` describes the round
 * it belongs to, does not contain it, and the match had not been played — a
 * fixture that has been rescheduled out of that round. A completed match is
 * never dropped. Losing one loses a result off the team screen, the form guide
 * and the player totals, and no upstream answer is worth that.
 */
export function mergeFixtures(stored: Fixture[], fresh: Fixture[]): Fixture[] {
  const incoming = new Map<string, Fixture>()
  const rounds = new Set<number>()
  for (const f of fresh) {
    incoming.set(fixtureKey(f), f)
    rounds.add(f.round)
  }

  const merged = new Map<string, Fixture>()
  for (const f of stored) {
    const key = fixtureKey(f)
    if (!incoming.has(key) && rounds.has(f.round) && !f.isComplete) continue
    merged.set(key, f)
  }
  for (const [key, f] of incoming) merged.set(key, f)

  return [...merged.values()].sort(byKickOff)
}

/**
 * Two seasons into one. The later `updatedAt` decides the ladder and the round
 * number, because those are snapshots of a moment; the fixtures are merged,
 * because those accumulate.
 */
export function mergeSeasons(a: Season, b: Season): Season {
  const [older, newer] = (b.updatedAt ?? '') >= (a.updatedAt ?? '') ? [a, b] : [b, a]

  return {
    season: newer.season || older.season,
    currentRound: Math.max(newer.currentRound || 0, older.currentRound || 0),
    // An empty ladder is a failed pull, not a league with no teams.
    ladder: newer.ladder?.length ? newer.ladder : older.ladder,
    fixtures: mergeFixtures(older.fixtures ?? [], newer.fixtures ?? []),
    updatedAt: newer.updatedAt,
  }
}

export const byKickOff = (a: Fixture, b: Fixture) =>
  a.round - b.round || (a.kickOff ?? '').localeCompare(b.kickOff ?? '')
