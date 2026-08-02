import { notFound } from 'next/navigation'
import { TeamScreen } from '@/components/TeamScreen'
import { CLUBS, clubById } from '@/lib/clubs'
import { squadOf } from '@/lib/nrl/squad'

// All seventeen team screens are prerendered at build time against the
// committed snapshot, squad included, so opening one is a static file and
// nothing else. The client swaps in newer numbers from localStorage on mount.

export const dynamicParams = false

export function generateStaticParams() {
  return CLUBS.map((c) => ({ teamId: String(c.teamId) }))
}

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const club = clubById(Number(teamId))
  return { title: club ? `${club.name} — Oli's NRL Oracle` : "Oli's NRL Oracle" }
}

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const id = Number(teamId)
  if (!clubById(id)) notFound()
  return <TeamScreen teamId={id} squad={squadOf(id)} />
}
