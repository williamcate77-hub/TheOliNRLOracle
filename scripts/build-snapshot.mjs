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

const server = spawn('npx', ['next', 'dev', '--port', PORT], {
  stdio: ['ignore', 'pipe', 'inherit'],
  env: process.env,
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
