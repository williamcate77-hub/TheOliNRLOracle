import { imageUrl } from '@/lib/nrl/fetch'
import type { PlayerSeason, PlayerTotals } from '@/lib/nrl/types'

// Season player totals, built by adding up matches.
//
// There is no season-long player stats endpoint — /stats/players/data returns
// 500 — so the only honest way to a try count is to sum every match.
//
// The match centre payload keeps identity and numbers in two different places:
// `homeTeam.players` has the name, jersey number and photos but no statistics,
// and `stats.players.homeTeam` has around sixty statistics but nothing except a
// playerId. They are joined here on playerId.

/** The fields worth carrying. The feed returns roughly sixty; the screens use these. */
const SUMMED = [
  'minutesPlayed',
  'tries',
  'tryAssists',
  'conversions',
  'conversionAttempts',
  'fieldGoals',
  'points',
  'allRunMetres',
  'lineBreaks',
  'tackleBreaks',
  'offloads',
  'tacklesMade',
  'missedTackles',
  'errors',
] as const

export type SummedKey = (typeof SUMMED)[number]

export function emptyTotals(): PlayerTotals {
  const totals = { games: 0 } as PlayerTotals
  for (const key of SUMMED) totals[key] = 0
  return totals
}

/**
 * Folds one match into the running season table, in place.
 * Safe to call twice on the same match only if the table is rebuilt from scratch.
 */
export function foldMatch(table: Map<number, PlayerSeason>, match: any): void {
  for (const which of ['homeTeam', 'awayTeam'] as const) {
    const lineup: any[] = match?.[which]?.players ?? []
    const stats: any[] = match?.stats?.players?.[which] ?? []
    const teamId = Number(match?.[which]?.teamId) || 0
    if (!lineup.length) continue

    const byId = new Map<number, any>()
    for (const row of stats) if (row?.playerId) byId.set(Number(row.playerId), row)

    for (const person of lineup) {
      const playerId = Number(person?.playerId)
      if (!playerId) continue

      let player = table.get(playerId)
      if (!player) {
        player = {
          playerId,
          teamId,
          firstName: person.firstName ?? '',
          lastName: person.lastName ?? '',
          position: person.position ?? null,
          number: typeof person.number === 'number' ? person.number : null,
          headImage: imageUrl(person.headImage),
          bodyImage: imageUrl(person.bodyImage),
          totals: emptyTotals(),
        }
        table.set(playerId, player)
      }

      // Identity comes from the most recent match the player appeared in, so a
      // mid-season transfer or a change of jersey ends up on the right club.
      player.teamId = teamId
      player.position = person.position ?? player.position
      if (typeof person.number === 'number') player.number = person.number
      player.headImage = imageUrl(person.headImage) ?? player.headImage
      player.bodyImage = imageUrl(person.bodyImage) ?? player.bodyImage

      const row = byId.get(playerId)
      // Named in the squad but did not take the field: no game, no numbers.
      if (!row) continue

      player.totals.games += 1
      for (const key of SUMMED) {
        const value = row[key]
        if (typeof value === 'number' && Number.isFinite(value)) player.totals[key] += value
      }
    }
  }
}

/**
 * Rates are recomputed from the season's own totals rather than averaged out of
 * the per-match rates, which would weight a two-kick night the same as an
 * eight-kick one.
 */
export const goalRate = (t: PlayerTotals): number | null =>
  t.conversionAttempts > 0 ? (t.conversions / t.conversionAttempts) * 100 : null

export const tackleEfficiency = (t: PlayerTotals): number | null => {
  const attempts = t.tacklesMade + t.missedTackles
  return attempts > 0 ? (t.tacklesMade / attempts) * 100 : null
}

export const fullName = (p: PlayerSeason) => `${p.firstName} ${p.lastName}`.trim()
