'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useSeason } from '@/components/SeasonProvider'
import styles from './PullToRefresh.module.css'

// Pull down for latest stats.
//
// The gesture and the button run exactly the same routine. Nothing here polls,
// nothing here fires on a timer — the only way data moves is because Oliver
// pulled, which is the whole bargain the app makes with him.
//
// The content slides down under the sticky header while the header's own status
// line says what a release will do. The numbers never move out from under him
// and the screen is never blanked.

/** How far down the content has to come before a release counts. */
const THRESHOLD = 72

/** Past this the pull stops giving, so it always feels like it has an end. */
const CEILING = 116

/** Only the first half of the finger's travel becomes movement. */
const DAMPING = 0.5

export type PullPhase = 'idle' | 'pulling' | 'ready'

const PullContext = createContext<{ phase: PullPhase }>({ phase: 'idle' })

export const usePull = () => useContext(PullContext)

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const { refresh, state } = useSeason()
  const [distance, setDistance] = useState(0)
  const [settling, setSettling] = useState(false)

  const startY = useRef(0)
  const engaged = useRef(false)
  const travelled = useRef(0)
  const fetching = state.kind === 'fetching'

  const finish = useCallback(() => {
    setSettling(true)
    setDistance(0)
    // Long enough for the slide back to land, short enough that a second pull
    // is never blocked.
    window.setTimeout(() => setSettling(false), 240)
  }, [])

  useEffect(() => {
    const atTop = () => window.scrollY <= 0

    const onStart = (e: TouchEvent) => {
      // A second finger means a pinch or a scroll, not a pull.
      if (e.touches.length !== 1 || !atTop()) {
        engaged.current = false
        return
      }
      engaged.current = true
      startY.current = e.touches[0].clientY
      travelled.current = 0
    }

    const onMove = (e: TouchEvent) => {
      if (!engaged.current) return

      const dy = e.touches[0].clientY - startY.current

      // Upward, or the page has scrolled under us: this is an ordinary scroll
      // and the pull gives up its claim on the gesture.
      if (dy <= 0 || !atTop()) {
        engaged.current = false
        travelled.current = 0
        setDistance(0)
        return
      }

      // Holding the page still while the finger is down is what stops the
      // browser's own overscroll from fighting this one.
      if (e.cancelable) e.preventDefault()

      travelled.current = Math.min(dy * DAMPING, CEILING)
      setDistance(travelled.current)
    }

    const onEnd = () => {
      if (!engaged.current) return
      engaged.current = false

      const release = travelled.current
      travelled.current = 0
      finish()

      // Past the threshold is a request. Anything less was a look, not an ask.
      if (release >= THRESHOLD) void refresh()
    }

    // Not passive: the move handler has to be allowed to hold the page still.
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [refresh, finish])

  const phase: PullPhase =
    distance <= 0 ? 'idle' : distance >= THRESHOLD ? 'ready' : 'pulling'

  return (
    <PullContext.Provider value={{ phase }}>
      <div
        className={`${styles.surface} ${settling ? styles.settling : ''}`}
        // While fetching the content sits exactly where it was, because the old
        // numbers have to stay readable until the new ones arrive.
        style={{ transform: distance > 0 && !fetching ? `translateY(${distance}px)` : undefined }}
      >
        {children}
      </div>
    </PullContext.Provider>
  )
}
