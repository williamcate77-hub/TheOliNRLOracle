import { NextResponse } from 'next/server'
import { getSeason } from '@/lib/nrl/store'

export const dynamic = 'force-dynamic'

/** Reads the store. Does not fetch — only /api/refresh does that. */
export async function GET() {
  const { ladder, updatedAt, currentRound } = getSeason()
  return NextResponse.json(
    { ladder, updatedAt, currentRound },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
