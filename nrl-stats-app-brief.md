# NRL Stats App: Build Brief for Claude Code

**Client:** Oliver (12, Year 7)
**Producer:** Will
**Source:** Recorded interview with Oliver, 2 August 2026
**Status:** Ready to build
**Repository:** GitHub
**Hosting:** Vercel

---

## 1. The product

A private web app that shows every NRL team, where they sit on the ladder, every game they have played and are about to play, and full season stats for every player in the competition. It is built for one user, Oliver, and it is not going to the app stores.

---

## 2. Who it is for and what that changes

Oliver follows the whole competition, not one club. He asked for all seventeen teams treated equally, so there is no default team, no favourite, and no personalisation on first load.

He is twelve. Three consequences:

- Every stat needs a plain-English explanation available on tap. Oliver asked what the numbers mean, not just what they are.
- No betting content. The NRL ladder feed returns a live `odds` field and a `showOdds` flag. Strip both at the API layer so they never reach the client.
- Speed and obviousness beat density. If a screen needs a legend to be understood, redesign the screen.

---

## 3. Non-negotiable requirements

These are set. Do not design around them or propose alternatives.

**Refresh is manual and only manual.**

- A **Refresh** button sits at the top of every screen, always visible, never hidden behind a menu.
- Pull-to-refresh works on every scrollable screen.
- The pull gesture reveals the literal words **"Pull down for latest stats"**. Not an icon. Not a spinner alone. The words.
- No background polling. No cron jobs. No scheduled revalidation. No push notifications. No websockets. No live match auto-updating.
- Data is fetched when, and only when, the user asks for it. Every screen loads from cache first, then waits.

The reason is cost. Continuous fetching burns money for a single-user app, and the trade is deliberate: Oliver pulls down when he wants the truth.

**Every screen shows when the data was last pulled.** A quiet line such as "Updated 14 minutes ago". After six hours it changes tone and reads "Stats are stale. Pull down to update."

**The design has to be genuinely good.** Section 8 covers this. Do not ship a bootstrap dashboard.

---

## 4. Screens

### 4.1 Home

A grid of all seventeen clubs. Each tile carries the club badge and the club name, and the tiles are large enough to hit with a thumb without aiming.

This is Oliver's exact spec, quoted from the interview: the home page is all the teams in big tabs showing the icon of their team, the logo and then the name.

Order the grid by current ladder position, and show the position number small on each tile. It teaches the ladder without a separate ladder screen.

### 4.2 Team

Tapping a club opens a full team screen in the club's own colours.

Show, in this order:

1. **Ladder position** and competition points, treated as the headline number.
2. **Record:** played, wins, losses, draws, byes.
3. **Points for, points against, difference.**
4. **Form and streak** (both fields exist in the ladder feed).
5. **Next match:** opponent, date, kick-off time in local time, venue.
6. **Results so far:** every completed match this season with the score, most recent first.
7. **Squad:** the full player list, tappable.

Each stat label carries a tap target that reveals one sentence of plain English. Example for points difference: "How many more points they have scored than they have let in across the season."

### 4.3 Player

Tapping a player opens a dedicated player screen.

- Photo (available, see 5.4)
- Position, jersey number
- Age, height in centimetres, weight in kilograms
- Games played this season, minutes played
- Tries, try assists, conversions, goal conversion rate, field goals, total points
- Run metres, line breaks, tackle breaks, offloads
- Tackles made, missed tackles, tackle efficiency
- Errors

Oliver asked specifically for tries and conversions, so those two lead the layout. The rest sit below in grouped blocks: Attack, Defence, Discipline.

---

## 5. Data sources

All endpoints below were tested and returned live 2026 season data on 2 August 2026. They are undocumented and unsupported. Treat them as a dependency that can break, and fail gracefully rather than blankly.

Competition ID `111` is the Telstra Premiership. Season is `2026`. As at 2 August 2026 the competition has completed Round 22, Round 23 is next, and Penrith lead the ladder.

### 5.1 Verified endpoints

| Purpose | Endpoint | Returns |
|---|---|---|
| Ladder | `https://www.nrl.com/ladder/data?competition=111&season=2026` | Position, played, wins, drawn, lost, byes, points for and against, difference, home and away record, streak, form, next opponent, club theme key |
| Draw, current round | `https://www.nrl.com/draw/data?competition=111&season=2026` | Fixtures for the current round with scores, venue, match state, kick-off time |
| Draw, specific round | `https://www.nrl.com/draw/data?competition=111&season=2026&round=N` | As above for round N. Loop 1 to 27 to build full season history |
| Squad by club | `https://www.nrl.com/players/data?competition=111&season=2026&team={teamId}` | Player names, position, photo paths, profile URL |
| Club list and IDs | `https://www.nrl.com/players/data?competition=111&season=2026` | `filterTeams` array: all seventeen clubs with `teamId` and theme key |
| Match detail | `https://www.nrl.com/draw/nrl-premiership/2026/round-{n}/{home}-v-{away}/data` | Full match centre payload including a `stats.players` block with roughly sixty per-player statistics for both sides |
| Club badge | `https://www.nrl.com/.theme/{themeKey}/badge.svg` | SVG badge. Also `badge-light.svg`, `silhouette.svg`, `text.svg` |

The match centre URL for every fixture is returned inside the draw payload as `matchCentreUrl`, so do not construct these by hand. Read them from the draw response and append `/data`.

### 5.2 Building season player totals

There is no working season-long player stats endpoint. `https://www.nrl.com/stats/players/data` returns HTTP 500.

Season totals must be built by aggregating per-match data:

1. Loop rounds 1 to current across the draw endpoint, collecting every `matchCentreUrl`.
2. Fetch each match centre payload, read `stats.players.homeTeam` and `stats.players.awayTeam`.
3. Sum by `playerId` into a season table.

This is roughly 190 requests for a full season. Run it once, store the result, and on refresh only fetch matches whose `matchState` has changed since the last pull. A completed match never changes, so it never needs fetching twice.

### 5.3 Player biography

Height, weight, date of birth and birthplace live on the club profile page as HTML, not JSON. Example: `https://www.nrl.com/players/nrl-premiership/broncos/adam-reynolds/` returns "Height: 173 cm", "Weight: 85 kg", "Date of Birth: 10 July 1990".

Parse these once per player and cache them. They change at most once a season. Calculate age from date of birth at render time.

### 5.4 Player photos

Photos are available, which reverses what Oliver was told in the interview. Tell him.

The squad and match centre payloads both return `headImage` and `bodyImage` paths pointing at Stats Perform assets through an NRL image proxy. Prefix with `https://www.nrl.com` and they resolve. Use `headImage` on list rows and `bodyImage` on the player screen. Fall back to the club silhouette SVG when a path is missing.

### 5.5 Constraints on the data layer

- These endpoints reject requests without a browser `User-Agent` header. Set one.
- They will not allow direct calls from the browser. Every request must go through a Vercel serverless function that fetches server-side and returns clean JSON.
- Normalise at the API layer. The raw payloads carry theme objects, logo version stamps and betting odds that the client does not need. Strip them and return only the fields the screens use.
- Never ship a build that depends on a live fetch to render. Cache first, always.

---

## 6. Architecture

- **Framework:** Next.js on Vercel.
- **Repository:** GitHub, deploying to Vercel on push to `main`.
- **API layer:** Vercel serverless routes, one per resource: `/api/ladder`, `/api/teams`, `/api/team/[id]`, `/api/player/[id]`, `/api/refresh`.
- **Server cache:** persist normalised season data so a refresh does not rebuild the whole season. Vercel KV or a committed JSON snapshot both work. Choose the simpler one and say why.
- **Client cache:** store the last successful payload plus its timestamp in `localStorage`. Render from it instantly on open.
- **Refresh contract:** one user action triggers one batched server call. The server decides what is genuinely stale and fetches only that. The client never fans out into dozens of requests.
- **Progressive web app:** installable to the home screen, works offline against the cached payload. Oliver should be able to add it to his phone like an app.

---

## 7. Refresh behaviour, in detail

This is the requirement most likely to be built carelessly, so it is specified fully.

**The button.** Top right of a sticky header. Labelled with both an icon and the word "Refresh". Tapping it runs the same routine as the pull gesture.

**The gesture.** Available on Home, Team and Player screens.

States and copy:

| State | What the user sees |
|---|---|
| Idle | "Updated 14 minutes ago" in the header |
| Pulling, below threshold | "Pull down for latest stats" |
| Pulling, past threshold | "Release to update" |
| Fetching | "Getting the latest stats" with the numbers held in place |
| Success | Numbers tick over to their new values, header resets to "Updated just now" |
| No change found | "Already up to date" for two seconds, then back to idle |
| Failed | "Could not reach the NRL. Showing stats from 14 minutes ago." Cached data stays on screen |
| Stale, over six hours | "Stats are stale. Pull down to update." in the header, in the warning colour |

Never blank the screen during a refresh. Never show a skeleton loader over data that already exists. The old numbers stay visible until the new ones replace them.

---

## 8. Design direction

The brief here is "very cool". That means opinionated and specific, not decorated.

**The concept: matchday.** The app should feel like a stadium scoreboard rather than a sports website. Data is the decoration.

**Colour.** A single dark base, close to the colour of a pitch under lights rather than pure black: `#0B1015`. Surfaces sit one step above at `#151C24`. Text at `#F2F5F7`, secondary text at `#7C8A99`. The accent is not fixed. Every club in the ladder feed carries a theme key, so when the user enters a team screen the club's own colours take over the accent role across the entire screen. Souths turns the app cardinal and myrtle, Storm turns it purple, Cowboys turn it blue. Seventeen identities from one build.

**Type.** A condensed grotesque for all numerals and headings, set with tabular figures so digits do not jump width when they change. Numbers are the loudest thing on every screen: a ladder position should be set at 72px, its label at 11px in uppercase with wide tracking. Body copy sits in a clean neutral sans at a comfortable reading size. The contrast between enormous data and tiny labels is the whole type system.

**Structure.** Club badges are the navigation on Home, at real size, not shrunk into a list. On Team screens the badge sits behind the header as a large low-opacity watermark, bleeding off the edge. Results run as a vertical timeline with the winning score weighted heavier than the losing one, so form is readable at a glance without reading a single word.

**The signature: the tick-over.** When a refresh returns new data, every changed number mechanically flips to its new value like a split-flap board, staggered by about 40 milliseconds across the screen. Unchanged numbers stay still. This makes the refresh, the one thing that costs money and the one thing Oliver has to do deliberately, into the most satisfying moment in the app. Spend the animation budget here and keep everything else still.

**Restraint.** No gradients. No glassmorphism. No card shadows. No decorative icons next to labels. One accent colour per screen, taken from the club. Respect `prefers-reduced-motion` by swapping the flip for a straight cross-fade.

---

## 9. Build order

| Phase | Ships | Effort | Depends on |
|---|---|---|---|
| 1 | Serverless proxy, ladder and draw ingestion, Home grid with badges, Team screen with record and fixtures, manual Refresh button | M | Nothing |
| 2 | Pull-to-refresh with full state copy, client cache, "Updated" timestamps, stale warning | S | Phase 1 |
| 3 | Season player aggregation, squad lists, Player screens, photos and biography parsing | L | Phase 1 |
| 4 | Tick-over animation, stat explanations, PWA install, offline mode | M | Phases 2 and 3 |

Ship Phase 1 to Vercel before starting Phase 2. Oliver should have something on his phone within the first session.

---

## 10. Out of scope for version one

Live in-game score updates. Notifications of any kind. The Telstra Women's Premiership. Seasons before 2026. State of Origin. Tipping or predictions. Betting odds, permanently. Accounts or login, since there is one user and the app is not public.

---

## 11. How we know it worked

The test is whether Oliver uses it without being asked.

- **Correctness:** ladder position, wins, losses and player try counts match nrl.com exactly for three clubs picked at random, checked after each round.
- **Speed:** the app renders cached content in under one second from a cold home screen tap.
- **Refresh clarity:** Oliver can explain, without prompting, why he has to pull down. If he cannot, the copy has failed.
- **Cost:** total monthly spend stays inside the Vercel free tier. A single refresh should trigger no more than a handful of upstream requests once the season cache is warm.

Check in at ninety days, which lands during the 2026 finals. If he is opening it on match nights without being reminded, it worked.

---

## 12. Open questions for Oliver

1. What is the app called?
2. On the Home grid, should the tiles be ordered by ladder position, or alphabetically, or by his own ranking?
3. On a player screen, does he want career totals alongside this season, or this season only?
4. Should completed matches show the full match stats, or just the score?

---

## 13. Instructions to Claude Code

Read this brief completely before writing anything. Then:

1. Confirm the data endpoints in section 5 still return the shapes described. They are undocumented and may have changed since 2 August 2026.
2. Propose the repository structure and the caching strategy in one short message, and wait for approval.
3. Build Phase 1 only, and deploy it before proposing Phase 2.
4. Where this brief and Oliver's recorded words conflict, Oliver wins on what the app does and this brief wins on how it is built.
