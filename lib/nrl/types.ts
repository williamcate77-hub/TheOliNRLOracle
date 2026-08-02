// The shapes the screens actually use. Everything the NRL returns beyond this —
// theme logo version stamps, call-to-action blocks, betting odds — is dropped at
// the API layer and never reaches the client.

export type FixtureSide = {
  teamId: number
  name: string
  themeKey: string
  score: number | null
}

export type Fixture = {
  round: number
  roundTitle: string
  /** 'Upcoming' | 'FullTime' | 'FirstHalf' | … straight from the feed. */
  matchState: string
  /** 'Pre' | 'Live' | 'Post' */
  matchMode: string
  isComplete: boolean
  venue: string | null
  venueCity: string | null
  /** ISO 8601, UTC. Rendered in the user's local time. */
  kickOff: string | null
  /** Absolute, no trailing slash. Append '/data' for the match centre payload. */
  matchCentreUrl: string | null
  home: FixtureSide
  away: FixtureSide
}

export type LadderNext = {
  teamId: number | null
  name: string
  themeKey: string | null
  isBye: boolean
}

export type LadderRow = {
  position: number
  teamId: number
  name: string
  themeKey: string
  played: number
  wins: number
  drawn: number
  lost: number
  byes: number
  pointsFor: number
  pointsAgainst: number
  pointsDifference: number
  points: number
  streak: string
  form: string
  homeRecord: string
  awayRecord: string
  next: LadderNext | null
}

export type PlayerTotals = {
  /** Matches actually taken the field in, not matches named in. */
  games: number
  minutesPlayed: number
  tries: number
  tryAssists: number
  conversions: number
  conversionAttempts: number
  fieldGoals: number
  points: number
  allRunMetres: number
  lineBreaks: number
  tackleBreaks: number
  offloads: number
  tacklesMade: number
  missedTackles: number
  errors: number
}

export type PlayerSeason = {
  playerId: number
  teamId: number
  firstName: string
  lastName: string
  position: string | null
  number: number | null
  /** Absolute nrl.com URLs. headImage for rows, bodyImage for the player screen. */
  headImage: string | null
  bodyImage: string | null
  totals: PlayerTotals
}

export type Season = {
  season: number
  /** Highest round that has appeared in the draw feed. */
  currentRound: number
  ladder: LadderRow[]
  fixtures: Fixture[]
  /** ISO 8601. When this payload was pulled from the NRL. */
  updatedAt: string
}

/**
 * Player totals live in their own payload rather than inside Season. They are an
 * order of magnitude larger, they only matter on two screens, and keeping them
 * separate stops Home carrying five hundred players' statistics it never reads.
 */
export type PlayerBook = {
  season: number
  players: PlayerSeason[]
  /** Match centre URLs already folded in, so a rebuild knows what it can skip. */
  sources: string[]
  updatedAt: string
}
