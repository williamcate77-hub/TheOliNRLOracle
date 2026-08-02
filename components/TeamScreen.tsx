'use client'

import Link from 'next/link'
import { RefreshHeader } from '@/components/RefreshHeader'
import { useSeason } from '@/components/SeasonProvider'
import { useNow } from '@/components/useNow'
import { badgeUrl } from '@/lib/clubs'
import { isHome, opponentOf, outcome, selectTeam } from '@/lib/nrl/select'
import type { Fixture } from '@/lib/nrl/types'
import { kickOff, shortDate } from '@/lib/time'
import styles from './TeamScreen.module.css'

// The team screen, in the club's own colours. Ladder position leads at 72px
// because it is the number Oliver actually wants; everything else is arranged
// underneath it in the order the brief sets out.

export function TeamScreen({ teamId }: { teamId: number }) {
  const { season } = useSeason()
  const now = useNow()

  const team = selectTeam(season, teamId)

  if (!team) {
    return (
      <>
        <RefreshHeader title="Not found" back />
        <main className="shell">
          <p className={styles.empty}>
            No club with that number. <Link href="/">Back to all teams</Link>.
          </p>
        </main>
      </>
    )
  }

  const { club, row, results, next } = team

  return (
    <div
      style={{ ['--accent' as string]: club.accent, ['--accent-deep' as string]: club.accentDeep }}
      data-club={club.themeKey}
    >
      <RefreshHeader title={club.name} back />

      <main className="shell">
        {/* The badge sits behind the header as a watermark, bleeding off the
            right edge. It is the only decoration on the screen. */}
        <section className={styles.hero}>
          <img className={styles.watermark} src={badgeUrl(club.themeKey)} alt="" aria-hidden="true" />

          <div className={styles.heroFigures}>
            <div>
              <p className="label">Ladder position</p>
              <p className={`num ${styles.position}`}>{row ? row.position : '–'}</p>
            </div>
            <div>
              <p className="label">Points</p>
              <p className={`num ${styles.points}`}>{row ? row.points : '–'}</p>
            </div>
          </div>
        </section>

        <Section title="Record">
          <div className={styles.row}>
            <Stat label="Played" value={row?.played} />
            <Stat label="Won" value={row?.wins} />
            <Stat label="Lost" value={row?.lost} />
            <Stat label="Drawn" value={row?.drawn} />
            <Stat label="Byes" value={row?.byes} />
          </div>
        </Section>

        <Section title="Points">
          <div className={styles.row}>
            <Stat label="For" value={row?.pointsFor} />
            <Stat label="Against" value={row?.pointsAgainst} />
            <Stat
              label="Difference"
              value={row?.pointsDifference}
              signed
              accent={(row?.pointsDifference ?? 0) !== 0}
            />
          </div>
        </Section>

        <Section title="Form">
          <div className={styles.row}>
            <Stat label="Last five" text={row?.form || '–'} />
            <Stat label="Streak" text={row?.streak || '–'} accent={Boolean(row?.streak)} />
            <Stat label="Home" text={row?.homeRecord || '–'} />
            <Stat label="Away" text={row?.awayRecord || '–'} />
          </div>
        </Section>

        <Section title="Next match">
          {next ? (
            {/* data-club names the opponent, not the club whose screen this is,
                so a Souths badge cheers wherever it appears — and the Souths
                screen itself does not cheer for someone else's result row. */}
            <div className={styles.next} data-club={opponentOf(next, teamId).themeKey}>
              <img className={styles.nextBadge} src={badgeUrl(opponentOf(next, teamId).themeKey)} alt="" />
              <div className={styles.nextBody}>
                <p className={styles.nextOpponent}>
                  <span className={styles.versus}>{isHome(next, teamId) ? 'v' : 'away to'}</span>{' '}
                  {opponentOf(next, teamId).name}
                </p>
                {/* Local time only appears once the clock has started, so the
                    server and the phone never disagree about the time zone. */}
                <p className={styles.nextMeta}>
                  {now > 0 ? (kickOff(next.kickOff) ?? 'Time to be confirmed') : ' '}
                </p>
                <p className={styles.nextMeta}>
                  {[next.roundTitle, next.venue].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ) : row?.next?.isBye ? (
            <p className={styles.empty}>Bye this round.</p>
          ) : (
            <p className={styles.empty}>No match scheduled yet.</p>
          )}
        </Section>

        <Section title={`Results${results.length ? ` · ${results.length}` : ''}`}>
          {results.length ? (
            <ol className={styles.timeline}>
              {results.map((f) => (
                <Result
                  key={`${f.round}-${f.home.teamId}-${f.away.teamId}`}
                  fixture={f}
                  teamId={teamId}
                  mounted={now > 0}
                />
              ))}
            </ol>
          ) : (
            <p className={styles.empty}>No completed matches yet this season.</p>
          )}
        </Section>

        <p className={styles.footnote}>Squad and player stats are coming next.</p>
      </main>
    </div>
  )
}

/* A result reads as a result without reading a word: the winning score is
   heavier and brighter than the losing one, and the outcome letter carries the
   only colour in the row. */
function Result({
  fixture,
  teamId,
  mounted,
}: {
  fixture: Fixture
  teamId: number
  mounted: boolean
}) {
  const res = outcome(fixture, teamId)
  const them = opponentOf(fixture, teamId)
  const mine = isHome(fixture, teamId) ? fixture.home.score : fixture.away.score
  const theirs = isHome(fixture, teamId) ? fixture.away.score : fixture.home.score
  const won = res === 'win'

  return (
    <li className={styles.result}>
      <span className={`num ${styles.outcome} ${styles[res ?? 'draw']}`}>
        {res === 'win' ? 'W' : res === 'loss' ? 'L' : 'D'}
      </span>

      <img
        className={styles.resultBadge}
        src={badgeUrl(them.themeKey)}
        alt=""
        data-club={them.themeKey}
      />

      <div className={styles.resultBody} data-club={them.themeKey}>
        <p className={styles.resultOpponent}>
          <span className={styles.versus}>{isHome(fixture, teamId) ? 'v' : '@'}</span> {them.name}
        </p>
        {/* The date is the reader's local date, so it waits for the clock. */}
        <p className={styles.resultMeta}>
          {[fixture.roundTitle, mounted ? shortDate(fixture.kickOff) : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <p className={`num ${styles.score}`}>
        <span className={won ? styles.scoreWin : styles.scoreLose}>{mine ?? '–'}</span>
        <span className={styles.dash}>–</span>
        <span className={won ? styles.scoreLose : styles.scoreWin}>{theirs ?? '–'}</span>
      </p>
    </li>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={`label ${styles.sectionTitle}`}>{title}</h2>
      {children}
    </section>
  )
}

function Stat({
  label,
  value,
  text,
  signed,
  accent,
}: {
  label: string
  value?: number
  text?: string
  signed?: boolean
  accent?: boolean
}) {
  const shown =
    text ?? (value === undefined ? '–' : signed && value > 0 ? `+${value}` : String(value))

  return (
    <div className={styles.stat}>
      <p className={`num ${styles.statValue} ${accent ? styles.statAccent : ''}`}>{shown}</p>
      <p className="label">{label}</p>
    </div>
  )
}
