const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Six hours is where "Updated" stops being reassuring and starts being a warning. */
export const STALE_AFTER = 6 * HOUR

export function isStale(updatedAt: string, now: number): boolean {
  const age = now - Date.parse(updatedAt)
  return !Number.isFinite(age) || age > STALE_AFTER
}

/** "just now", "14 minutes ago", "3 hours ago", "2 days ago". */
export function ago(updatedAt: string, now: number): string {
  const age = now - Date.parse(updatedAt)
  if (!Number.isFinite(age) || age < 0) return 'just now'
  if (age < MINUTE) return 'just now'
  if (age < HOUR) return plural(Math.floor(age / MINUTE), 'minute')
  if (age < DAY) return plural(Math.floor(age / HOUR), 'hour')
  return plural(Math.floor(age / DAY), 'day')
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`

// Australian formatting, the device's own time zone. Locale is pinned because a
// kick-off written 18:00 is not how anyone here says it; the zone is not pinned
// because the whole point is that it reads in the time the reader is living in.
const LOCALE = 'en-AU'

/** Kick-off in the reader's own time zone. "Sat 8 Aug, 7:35pm". */
export function kickOff(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const day = d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d
    .toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })
    .replace(/\s/g, '')
    .toLowerCase()
  return `${day}, ${time}`
}

/** "8 Aug" — enough to place a result on the calendar without crowding it. */
export function shortDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
}
