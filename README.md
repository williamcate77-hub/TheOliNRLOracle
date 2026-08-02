# The Oracle — NRL 2026

A private NRL app for one reader. Every club, where they sit, every match played
and coming. Built to the brief in [nrl-stats-app-brief.md](nrl-stats-app-brief.md).

## The one rule

Data is fetched when, and only when, the user asks for it. There is no polling,
no cron, no scheduled revalidation, no websocket and no push. Every screen renders
from cache first and waits.

`/api/refresh` is the only route that talks to the NRL. Everything else reads the
store.

## Running it

```bash
npm install
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run snapshot` | Rebuilds `data/season-2026.json` by starting the app and calling its own `/api/refresh`, so the snapshot comes from the same code path a real refresh uses. Run it after a round finishes. |
| `npm run icons` | Rebuilds the home screen icons from the NRL badge. Needs Python with Pillow. Only needed if the badge changes. |

## How the caching works

Three layers, in order of preference:

1. **Whatever the last refresh returned**, held in memory on the server for the
   life of the serverless instance.
2. **`localStorage`** on the phone, from the last successful refresh.
3. **`data/season-2026.json`**, committed into the build.

That third layer is why the app never waits on the NRL to draw a screen, and why
a cold instance is cheap: a completed match never changes, so it is never fetched
twice. Once the snapshot is current, a refresh costs three upstream requests —
the ladder, the current round, and the round coming up.

Refresh the snapshot after each round (`npm run snapshot`) to keep that true.

## Where the data comes from

Undocumented nrl.com JSON endpoints, listed in section 5 of the brief. They reject
requests without a browser `User-Agent` and will not serve the browser directly,
so everything goes through the serverless routes in `app/api/`. Betting odds are
stripped in `lib/nrl/normalise.ts` and never reach the client.

They are unsupported and can break. Nothing here fails blank — the last good
payload stays on screen and the header says how old it is.

## Phase

Phase 1 is deployed: ladder and draw ingestion, the Home grid, Team screens,
manual refresh, client cache and the "Updated" line.

Phase 2 is pull-to-refresh with its full state copy. Phase 3 is the season player
aggregation, squads and player screens. Phase 4 is the tick-over animation, stat
explanations and offline.
