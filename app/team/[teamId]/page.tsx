import { notFound } from 'next/navigation'
import { TeamScreen } from '@/components/TeamScreen'
import { CLUBS, clubById } from '@/lib/clubs'

// All seventeen team screens are prerendered at build time against the
// committed snapshot, so opening one is a static file and nothing else. The
// client swaps in newer numbers from localStorage the moment it mounts.

export const dynamicParams = false

export function generateStaticParams() {
  return CLUBS.map((c) => ({ teamId: String(c.teamId) }))
}

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const club = clubById(Number(teamId))
  return { title: club ? `${club.name} — NRL 2026` : 'NRL 2026' }
}

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  if (!clubById(Number(teamId))) notFound()
  return <TeamScreen teamId={Number(teamId)} />
}
