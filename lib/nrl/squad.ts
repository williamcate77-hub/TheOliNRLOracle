import book from '@/data/players-2026.json'
import type { PlayerBook, PlayerSeason } from '@/lib/nrl/types'

// Reading the committed player book at build time.
//
// Team and player screens are prerendered against this, so a squad list is
// static HTML and a player screen opens with its numbers already on it. The
// client layers anything newer on top after a refresh.

const BOOK = book as PlayerBook

export const allPlayers = (): PlayerSeason[] => BOOK.players

export const playerById = (playerId: number): PlayerSeason | undefined =>
  BOOK.players.find((p) => p.playerId === playerId)

/**
 * A club's squad, in the order a team sheet reads: jersey numbers first, then
 * everyone else alphabetically.
 */
export function squadOf(teamId: number): PlayerSeason[] {
  return BOOK.players.filter((p) => p.teamId === teamId).sort(byJersey)
}

const byJersey = (a: PlayerSeason, b: PlayerSeason) => {
  if (a.number !== b.number) {
    if (a.number === null) return 1
    if (b.number === null) return -1
    return a.number - b.number
  }
  return a.lastName.localeCompare(b.lastName)
}
