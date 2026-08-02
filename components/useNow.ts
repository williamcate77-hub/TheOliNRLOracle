'use client'

import { useEffect, useState } from 'react'

/**
 * A clock that ticks slowly, and only after mount.
 *
 * Two reasons it starts at 0: "14 minutes ago" cannot be rendered on the server
 * without the two copies disagreeing at hydration, and the reader's time zone is
 * not knowable server-side. Every relative or local time in the app waits for
 * this to be non-zero.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
