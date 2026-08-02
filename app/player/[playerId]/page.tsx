import { notFound } from 'next/navigation'
import { PlayerScreen } from '@/components/PlayerScreen'
import { clubById } from '@/lib/clubs'
import { allPlayers, playerById } from '@/lib/nrl/squad'

// Every player in the competition gets a prerendered page, built against the
// committed snapshot. Around five hundred static files, which is nothing to
// serve and means a player screen opens instantly from a squad list.

export const dynamicParams = false

export function generateStaticParams() {
  return allPlayers().map((p) => ({ playerId: String(p.playerId) }))
}

export async function generateMetadata({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const player = playerById(Number(playerId))
  return {
    title: player
      ? `${player.firstName} ${player.lastName} — Oli's NRL Oracle`
      : "Oli's NRL Oracle",
  }
}

export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const player = playerById(Number(playerId))
  const club = player ? clubById(player.teamId) : undefined
  // A player whose club cannot be resolved has no colours and nowhere to go
  // back to, so there is no screen to render.
  if (!player || !club) notFound()
  return <PlayerScreen player={player} club={club} />
}
