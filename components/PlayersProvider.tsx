'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PlayerBook, PlayerSeason } from '@/lib/nrl/types'

// Player totals on the client.
//
// Squad lists and player screens are prerendered against the committed book, so
// they are already correct and already on screen. This layer only exists to put
// something newer on top after a refresh — otherwise a try scored on Saturday
// would not show up until the next deploy.
//
// The book is around half a megabyte, so it is never shipped in the page bundle
// and never re-fetched unless a refresh reports that it actually changed.

const KEY = 'nrl-oracle:players:v1'

type Ctx = {
  /** Newer totals than the build, keyed by playerId. Empty until a refresh lands. */
  overlay: Map<number, PlayerSeason>
  /** Called by the season refresh. Returns true if anything moved. */
  pull: () => Promise<boolean>
}

const PlayersContext = createContext<Ctx | null>(null)

export function PlayersProvider({ children }: { children: React.ReactNode }) {
  const [book, setBook] = useState<PlayerBook | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const stored = JSON.parse(raw) as PlayerBook
        if (stored?.players?.length) setBook(stored)
      }
    } catch {
      // Nothing stored, or storage unavailable. The build's own book is already
      // rendered, so there is nothing to recover from.
    }
  }, [])

  const pull = useCallback(async () => {
    // Fold in any matches that finished since the last pull. The response is a
    // summary, not the table.
    const res = await fetch('/api/players', { method: 'POST' })
    const summary = await res.json()
    if (!res.ok || !summary?.ok) throw new Error(summary?.error ?? 'players refresh failed')

    // Only worth pulling half a megabyte down if the server says it changed.
    if (book && summary.updatedAt === book.updatedAt) return false

    const full = await fetch('/api/players')
    const next = (await full.json()) as PlayerBook
    if (!next?.players?.length) return false

    setBook(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // Out of quota. It still applies for this session.
    }
    return true
  }, [book])

  const overlay = useMemo(
    () => new Map((book?.players ?? []).map((p) => [p.playerId, p])),
    [book],
  )

  const value = useMemo(() => ({ overlay, pull }), [overlay, pull])
  return <PlayersContext.Provider value={value}>{children}</PlayersContext.Provider>
}

export function usePlayers() {
  const ctx = useContext(PlayersContext)
  if (!ctx) throw new Error('usePlayers must be used inside PlayersProvider')
  return ctx
}

/** Prefers a refreshed player over the one baked into the build. */
export function useFreshest<T extends PlayerSeason>(players: T[]): (T | PlayerSeason)[] {
  const { overlay } = usePlayers()
  return useMemo(
    () => players.map((p) => overlay.get(p.playerId) ?? p),
    [players, overlay],
  )
}
