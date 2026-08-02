import { type Club, clubById } from '@/lib/clubs'
import type { Fixture, LadderRow, Season } from '@/lib/nrl/types'

// Pure derivations from a Season. Shared by the API routes and the screens, so a
// team page reads the same way whether it came from the bundled snapshot, from
// localStorage, or from a refresh that landed a second ago.

export type TeamView = {
  club: Club
  row: LadderRow | null
  /** Completed matches this season, most recent first. */
  results: Fixture[]
  next: Fixture | null
}

export function selectTeam(season: Season, teamId: number): TeamView | null {
  const club = clubById(teamId)
  if (!club) return null

  const involves = (f: Fixture) => f.home.teamId === teamId || f.away.teamId === teamId
  const mine = season.fixtures.filter(involves)

  const results = mine
    .filter((f) => f.isComplete)
    .sort((a, b) => (b.kickOff ?? '').localeCompare(a.kickOff ?? '') || b.round - a.round)

  const next =
    mine
      .filter((f) => !f.isComplete)
      .sort((a, b) => (a.kickOff ?? '').localeCompare(b.kickOff ?? '') || a.round - b.round)[0] ??
    null

  return {
    club,
    row: season.ladder.find((r) => r.teamId === teamId) ?? null,
    results,
    next,
  }
}

/** True when a completed fixture was a win for this team. */
export function outcome(f: Fixture, teamId: number): 'win' | 'loss' | 'draw' | null {
  if (!f.isComplete || f.home.score === null || f.away.score === null) return null
  const mine = f.home.teamId === teamId ? f.home.score : f.away.score
  const theirs = f.home.teamId === teamId ? f.away.score : f.home.score
  if (mine > theirs) return 'win'
  if (mine < theirs) return 'loss'
  return 'draw'
}

export const opponentOf = (f: Fixture, teamId: number) =>
  f.home.teamId === teamId ? f.away : f.home

export const isHome = (f: Fixture, teamId: number) => f.home.teamId === teamId
