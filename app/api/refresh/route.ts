import { NextResponse } from 'next/server'
import { fingerprint, getSeason, refreshSeason } from '@/lib/nrl/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// The only route that talks to the NRL.
//
// One user action, one call. The client never fans out — the fan-out, such as it
// is, happens here and only for the rounds that could actually have changed.

export async function POST() {
  try {
    const season = await refreshSeason()
    return NextResponse.json(
      { ok: true, season, fingerprint: fingerprint(season) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    // The client is holding a good copy of the last successful pull. Say the
    // refresh failed and let it keep showing that.
    const season = getSeason()
    return NextResponse.json(
      {
        ok: false,
        error: (err as Error).message,
        season,
        fingerprint: fingerprint(season),
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

/** Same payload without the upstream pull. Never triggers a fetch. */
export async function GET() {
  const season = getSeason()
  return NextResponse.json(
    { ok: true, season, fingerprint: fingerprint(season) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
