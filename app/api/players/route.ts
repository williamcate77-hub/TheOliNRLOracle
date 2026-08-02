import { NextResponse } from 'next/server'
import { getPlayers, refreshPlayers } from '@/lib/nrl/playerStore'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Reads the store. Does not fetch. */
export async function GET() {
  return NextResponse.json(getPlayers(), { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Folds in matches that have finished since the last pull.
 * Capped per call, so a stale cache converges over a few refreshes rather than
 * timing out on one.
 */
export async function POST() {
  try {
    const { book, remaining } = await refreshPlayers()
    // A summary, not the book. The table is several hundred kilobytes and the
    // caller is either polling until it is done or about to GET it once.
    return NextResponse.json(
      {
        ok: true,
        counted: book.sources.length,
        players: book.players.length,
        updatedAt: book.updatedAt,
        remaining,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, remaining: 0 },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
