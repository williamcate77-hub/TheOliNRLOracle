// Every upstream call goes through here. The NRL endpoints reject requests
// without a browser User-Agent, and they will not serve the browser directly, so
// this module only ever runs on the server.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

export const COMPETITION = 111
export const SEASON = 2026

export class NrlError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'NrlError'
  }
}

async function getJson(url: string): Promise<any> {
  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      // These feeds are pulled on demand only. Nothing here is ever revalidated
      // on a schedule.
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
  } catch (err) {
    throw new NrlError(`Could not reach ${url}: ${(err as Error).message}`)
  }
  if (!res.ok) throw new NrlError(`${url} returned ${res.status}`, res.status)
  try {
    return await res.json()
  } catch {
    throw new NrlError(`${url} did not return JSON`)
  }
}

export const fetchLadder = () =>
  getJson(`https://www.nrl.com/ladder/data?competition=${COMPETITION}&season=${SEASON}`)

export const fetchDraw = (round?: number) =>
  getJson(
    `https://www.nrl.com/draw/data?competition=${COMPETITION}&season=${SEASON}` +
      (round ? `&round=${round}` : ''),
  )

/** Absolutises the mixed relative/absolute URLs the feeds return. */
export function absolute(path: string | null | undefined): string | null {
  if (!path) return null
  const url = path.startsWith('http') ? path : `https://www.nrl.com${path}`
  return url.replace(/\/$/, '')
}
