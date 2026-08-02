import { NextResponse } from 'next/server'
import { selectTeam } from '@/lib/nrl/select'
import { getSeason } from '@/lib/nrl/store'

export const dynamic = 'force-dynamic'

/** Reads the store. Does not fetch — only /api/refresh does that. */
export async function GET(_req: Request, ctx: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await ctx.params
  const season = getSeason()
  const team = selectTeam(season, Number(teamId))

  if (!team) return NextResponse.json({ error: 'Unknown team' }, { status: 404 })

  return NextResponse.json(
    { ...team, updatedAt: season.updatedAt },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
