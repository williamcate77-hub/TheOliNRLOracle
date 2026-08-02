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

/**
 * The full match centre payload: both lineups and roughly sixty statistics per
 * player. Pass the matchCentreUrl the draw returned — never build one by hand.
 */
export const fetchMatch = (matchCentreUrl: string) => getJson(`${matchCentreUrl}/data`)

/** Absolutises the mixed relative/absolute URLs the feeds return. */
export function absolute(path: string | null | undefined): string | null {
  if (!path) return null
  const url = path.startsWith('http') ? path : `https://www.nrl.com${path}`
  return url.replace(/\/$/, '')
}

/**
 * Player photos.
 *
 * The feeds hand back the image wrapped in nrl.com's own proxy —
 * `/remote.axd?http://rugbyimages.statsperform.com/…?center=0.3,0.5` — and that
 * proxy will not serve anyone outside nrl.com: 406 without a browser
 * User-Agent, 404 with one. The source it wraps answers 200 to anybody, so the
 * wrapper is unpicked and the source used directly, forced to https.
 *
 * The `center` parameter is the proxy's crop hint and means nothing to the
 * source, so it goes.
 */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null

  const proxy = path.indexOf('remote.axd?')
  if (proxy === -1) return absolute(path)

  let inner = path.slice(proxy + 'remote.axd?'.length)
  // The wrapped URL keeps its own extension, then the proxy's parameters are
  // appended after it. Anything from that second '?' onwards is not ours.
  const params = inner.indexOf('?')
  if (params !== -1) inner = inner.slice(0, params)

  if (!inner) return null
  if (inner.startsWith('http://')) inner = `https://${inner.slice('http://'.length)}`
  return inner.startsWith('https://') ? inner : null
}
