import { NextResponse } from 'next/server'
import { CLUBS } from '@/lib/clubs'
import { getSeason } from '@/lib/nrl/store'

export const dynamic = 'force-dynamic'

/** The seventeen clubs in ladder order, which is the order Home renders them. */
export async function GET() {
  const { ladder, updatedAt } = getSeason()
  const position = new Map(ladder.map((r) => [r.teamId, r.position]))

  const teams = CLUBS.map((c) => ({
    teamId: c.teamId,
    name: c.name,
    themeKey: c.themeKey,
    accent: c.accent,
    position: position.get(c.teamId) ?? null,
  })).sort((a, b) => (a.position ?? 99) - (b.position ?? 99))

  return NextResponse.json({ teams, updatedAt }, { headers: { 'Cache-Control': 'no-store' } })
}
