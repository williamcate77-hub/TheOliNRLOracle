// Rebuilds data/season-2026.json, the snapshot that ships inside the build.
//
// It works by starting the app and calling its own /api/refresh, so the snapshot
// is produced by exactly the code path a real refresh uses. There is no second
// copy of the normalisation logic to drift out of step.
//
//   npm run snapshot
//
// Run it after a round finishes. A fresher snapshot means a cold serverless
// instance has less to fetch and Oliver's first paint is more correct.

import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = process.env.SNAPSHOT_PORT ?? '3123'
const OUT = new URL('../data/season-2026.json', import.meta.url)
const OUT_PLAYERS = new URL('../data/players-2026.json', import.meta.url)

const server = spawn('npx', ['next', 'dev', '--port', PORT], {
  stdio: ['ignore', 'pipe', 'inherit'],
  // Its own build directory, so running this while `npm run dev` is up does not
  // leave both servers serving half-written chunks.
  env: { ...process.env, NEXT_DIST_DIR: '.next-snapshot' },
})
server.stdout.on('data', (b) => process.stdout.write(b))

let exitCode = 1
try {
  await waitForServer(`http://localhost:${PORT}/api/ladder`)

  console.log('Pulling the season from the NRL…')
  const res = await fetch(`http://localhost:${PORT}/api/refresh`, { method: 'POST' })
  const body = await res.json()
  if (!body?.ok) throw new Error(body?.error ?? `refresh returned ${res.status}`)

  const season = body.season
  if (!season.ladder?.length) throw new Error('refresh returned an empty ladder')

  await writeFile(OUT, `${JSON.stringify(season, null, 2)}\n`)
  console.log(
    `Wrote ${season.ladder.length} ladder rows and ${season.fixtures.length} fixtures ` +
      `through round ${season.currentRound}.`,
  )

  // Player totals are built one match at a time. The route caps how many it will
  // do per call so it can survive as a serverless function, so this keeps asking
  // until there is nothing outstanding. On an empty cache that is the full
  // season — roughly 190 requests, a few minutes.
  console.log('Building season player totals. This is the slow part.')
  let stalled = 0
  for (let pass = 1; ; pass++) {
    let summary
    try {
      const r = await fetch(`http://localhost:${PORT}/api/players`, { method: 'POST' })
      summary = await r.json()
    } catch {
      summary = null
    }

    // The dev server recompiles under us occasionally and answers a pass with an
    // error page. Nothing is lost when that happens — the matches already
    // counted stay counted — so retry rather than abandon the build.
    if (!summary?.ok) {
      if (++stalled > 5) throw new Error(summary?.error ?? 'players route kept failing')
      console.log(`  pass ${pass}: no answer, retrying`)
      await sleep(2000)
      continue
    }

    stalled = 0
    console.log(
      `  pass ${pass}: ${summary.counted} matches counted, ` +
        `${summary.players} players, ${summary.remaining} to go`,
    )
    if (!summary.remaining) break
  }

  const bookRes = await fetch(`http://localhost:${PORT}/api/players`)
  const bookData = await bookRes.json()
  await writeFile(OUT_PLAYERS, `${JSON.stringify(bookData, null, 2)}\n`)
  console.log(
    `Wrote ${bookData.players.length} players from ${bookData.sources.length} matches.`,
  )
  exitCode = 0
} catch (err) {
  console.error(`Snapshot failed: ${err.message}`)
} finally {
  server.kill('SIGTERM')
}

process.exit(exitCode)

async function waitForServer(url) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // Not listening yet.
    }
    await sleep(1000)
  }
  throw new Error('dev server did not come up')
}
