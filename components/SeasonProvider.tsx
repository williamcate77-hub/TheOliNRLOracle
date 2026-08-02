'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePlayers } from '@/components/PlayersProvider'
import seed from '@/data/season-2026.json'
import type { Season } from '@/lib/nrl/types'

// Cache first, always.
//
// Three layers, in order of preference: whatever the last refresh returned, then
// localStorage from a previous visit, then the snapshot committed into the build.
// The screen has real numbers on it before any network call is even considered,
// and no render in this app ever waits on the NRL.

const KEY = 'nrl-oracle:season:v1'
const SNAPSHOT = seed as Season

export type RefreshState =
  | { kind: 'idle' }
  | { kind: 'fetching' }
  | { kind: 'success' }
  | { kind: 'nochange' }
  | { kind: 'error' }

type Ctx = {
  season: Season
  state: RefreshState
  refresh: () => Promise<void>
  /** False until the client has had a chance to read localStorage. */
  ready: boolean
}

const SeasonContext = createContext<Ctx | null>(null)

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState<Season>(SNAPSHOT)
  const [state, setState] = useState<RefreshState>({ kind: 'idle' })
  const [ready, setReady] = useState(false)
  const inFlight = useRef(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { pull: pullPlayers } = usePlayers()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const stored = JSON.parse(raw) as Season
        // Only trust the stored copy if it is actually newer than what shipped
        // in the build — a deploy can carry a fresher snapshot than the phone.
        if (stored?.updatedAt && stored.updatedAt > SNAPSHOT.updatedAt && stored.ladder?.length) {
          setSeason(stored)
        }
      }
    } catch {
      // A corrupt or unavailable store is not worth failing over. The snapshot
      // is already on screen.
    }
    setReady(true)
  }, [])

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  const settle = useCallback((next: RefreshState, holdMs: number) => {
    setState(next)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setState({ kind: 'idle' }), holdMs)
  }, [])

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setState({ kind: 'fetching' })

    try {
      const res = await fetch('/api/refresh', { method: 'POST' })
      const body = await res.json()
      if (!res.ok || !body?.ok || !body?.season?.ladder?.length) {
        throw new Error(body?.error ?? `Refresh failed (${res.status})`)
      }

      const next = body.season as Season
      const seasonChanged = fingerprint(next) !== fingerprint(season)

      // Player totals ride along on the same user action. A failure here is not
      // a failed refresh — the ladder and the fixtures already came back fine,
      // and the squad numbers are simply as old as they were.
      let playersChanged = false
      try {
        playersChanged = await pullPlayers()
      } catch {
        playersChanged = false
      }

      const changed = seasonChanged || playersChanged

      // The numbers are replaced either way — updatedAt has moved even when
      // nothing else has — but the user is told which of the two happened.
      setSeason(next)
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // Out of quota or private mode. The refresh still worked for this
        // session; it just will not survive a reload.
      }
      settle({ kind: changed ? 'success' : 'nochange' }, changed ? 1200 : 2000)
    } catch {
      settle({ kind: 'error' }, 6000)
    } finally {
      inFlight.current = false
    }
  }, [season, settle, pullPlayers])

  const value = useMemo(() => ({ season, state, refresh, ready }), [season, state, refresh, ready])

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>
}

export function useSeason() {
  const ctx = useContext(SeasonContext)
  if (!ctx) throw new Error('useSeason must be used inside SeasonProvider')
  return ctx
}

/** Client-side twin of the server fingerprint: everything except updatedAt. */
function fingerprint(s: Season): string {
  const ladder = s.ladder
    .map((r) => `${r.position}${r.teamId}${r.points}${r.pointsDifference}${r.streak}${r.form}`)
    .join('|')
  const fixtures = s.fixtures
    .map(
      (f) =>
        `${f.round}:${f.home.teamId}:${f.away.teamId}${f.matchState}${f.home.score}${f.away.score}${f.kickOff}`,
    )
    .join('|')
  return `${s.currentRound}~${ladder}~${fixtures}`
}
