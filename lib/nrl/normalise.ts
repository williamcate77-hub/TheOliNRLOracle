import { clubByThemeKey, clubById } from '@/lib/clubs'
import { absolute } from '@/lib/nrl/fetch'
import type { Fixture, FixtureSide, LadderRow } from '@/lib/nrl/types'

// Two jobs: cut the payloads down to what the screens use, and strip the betting
// data. The ladder feed carries a per-club `odds` string and a top-level
// `showOdds` flag; neither is read here, so neither can reach the client.

export function normaliseLadder(raw: any): LadderRow[] {
  const positions: any[] = Array.isArray(raw?.positions) ? raw.positions : []

  return positions.flatMap((row, i): LadderRow[] => {
    const themeKey: string | undefined = row?.theme?.key
    const club = themeKey ? clubByThemeKey(themeKey) : undefined
    // A club we cannot resolve to a teamId has no team screen to link to, so it
    // is dropped rather than rendered as a dead tile.
    if (!club) return []

    const s = row?.stats ?? {}
    const nextTheme: string | undefined = row?.next?.theme?.key
    const next = row?.next
      ? {
          teamId: row.next.teamId ?? (nextTheme ? (clubByThemeKey(nextTheme)?.teamId ?? null) : null),
          name: row.next.nickname ?? row.next.fullName ?? 'To be confirmed',
          themeKey: nextTheme ?? null,
          isBye: Boolean(row.next.isBye),
        }
      : null

    return [
      {
        position: i + 1,
        teamId: club.teamId,
        name: row?.teamNickname ?? club.name,
        themeKey: club.themeKey,
        played: num(s.played),
        wins: num(s.wins),
        drawn: num(s.drawn),
        lost: num(s.lost),
        byes: num(s.byes),
        pointsFor: num(s['points for']),
        pointsAgainst: num(s['points against']),
        pointsDifference: num(s['points difference']),
        points: num(s.points),
        streak: str(s.streak),
        form: str(s.form),
        homeRecord: str(s['home record']),
        awayRecord: str(s['away record']),
        next,
      },
    ]
  })
}

export function normaliseDraw(raw: any): Fixture[] {
  const fixtures: any[] = Array.isArray(raw?.fixtures) ? raw.fixtures : []
  const round = Number(raw?.selectedRoundId) || 0

  return fixtures
    .filter((f) => f?.type === 'Match')
    .map((f): Fixture => {
      const matchMode = str(f.matchMode)
      return {
        round,
        roundTitle: str(f.roundTitle) || `Round ${round}`,
        matchState: str(f.matchState),
        matchMode,
        isComplete: matchMode === 'Post',
        venue: f.venue ?? null,
        venueCity: f.venueCity ?? null,
        kickOff: f?.clock?.kickOffTimeLong ?? null,
        matchCentreUrl: absolute(f.matchCentreUrl),
        home: side(f.homeTeam),
        away: side(f.awayTeam),
      }
    })
}

function side(raw: any): FixtureSide {
  const themeKey: string = raw?.theme?.key ?? ''
  const club = themeKey ? clubByThemeKey(themeKey) : undefined
  const teamId = Number(raw?.teamId) || club?.teamId || 0
  return {
    teamId,
    name: raw?.nickName ?? clubById(teamId)?.name ?? 'Unknown',
    themeKey: themeKey || (clubById(teamId)?.themeKey ?? ''),
    // A match that has not been played has no score, which is not the same as
    // nil. Upcoming fixtures must not render as 0-0.
    score: typeof raw?.score === 'number' ? raw.score : null,
  }
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** Stable identity for a fixture, used to merge rounds without duplicating. */
export const fixtureKey = (f: Fixture) => `${f.round}:${f.home.teamId}:${f.away.teamId}`
