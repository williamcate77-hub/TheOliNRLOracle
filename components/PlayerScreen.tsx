'use client'

import Image from 'next/image'
import { usePlayers } from '@/components/PlayersProvider'
import { RefreshHeader } from '@/components/RefreshHeader'
import { type Club, badgeUrl } from '@/lib/clubs'
import { goalRate, tackleEfficiency } from '@/lib/nrl/players'
import type { PlayerSeason } from '@/lib/nrl/types'
import styles from './PlayerScreen.module.css'

// The player screen, in the club's colours.
//
// Oliver asked for tries and conversions by name, so those two lead. Everything
// else sits underneath in the three blocks the brief sets out: Attack, Defence,
// Discipline.

export function PlayerScreen({ player: built, club }: { player: PlayerSeason; club: Club }) {
  // Prerendered totals are on screen immediately; a refresh replaces them.
  const { overlay } = usePlayers()
  const player = overlay.get(built.playerId) ?? built

  const t = player.totals
  const rate = goalRate(t)
  const efficiency = tackleEfficiency(t)

  return (
    <div
      style={{ ['--accent' as string]: club.accent, ['--accent-deep' as string]: club.accentDeep }}
      data-club={club.themeKey}
    >
      <RefreshHeader title={`${player.firstName} ${player.lastName}`} backTo={`/team/${club.teamId}`} />

      <main className="shell">
        <section className={styles.hero}>
          <img className={styles.watermark} src={badgeUrl(club.themeKey)} alt="" aria-hidden="true" />

          {player.bodyImage ? (
            <Image
              className={styles.portrait}
              src={player.bodyImage}
              alt={`${player.firstName} ${player.lastName}`}
              width={288}
              height={366}
              priority
            />
          ) : (
            <img
              className={`${styles.portrait} ${styles.portraitFallback}`}
              src={`https://www.nrl.com/.theme/${club.themeKey}/silhouette.svg`}
              alt=""
            />
          )}

          <div className={styles.identity}>
            <p className={`num ${styles.jersey}`}>{player.number ?? '–'}</p>
            <p className={styles.name}>
              <span className={styles.first}>{player.firstName}</span>
              <span className={styles.last}>{player.lastName}</span>
            </p>
            <p className="label">{[player.position, club.name].filter(Boolean).join(' · ')}</p>
          </div>
        </section>

        {/* The two Oliver asked for, at the size that says so. */}
        <section className={styles.headline}>
          <Figure value={t.tries} label="Tries" lead />
          <Figure value={t.conversions} label="Conversions" lead />
          <Figure value={t.points} label="Points" lead />
        </section>

        <Block title="This season">
          <Figure value={t.games} label="Games" />
          <Figure value={t.minutesPlayed} label="Minutes" />
          <Figure value={rate === null ? '–' : `${Math.round(rate)}%`} label="Goal rate" />
          <Figure value={t.fieldGoals} label="Field goals" />
        </Block>

        <Block title="Attack">
          <Figure value={t.tryAssists} label="Try assists" />
          <Figure value={t.allRunMetres} label="Run metres" />
          <Figure value={t.lineBreaks} label="Line breaks" />
          <Figure value={t.tackleBreaks} label="Tackle breaks" />
          <Figure value={t.offloads} label="Offloads" />
        </Block>

        <Block title="Defence">
          <Figure value={t.tacklesMade} label="Tackles" />
          <Figure value={t.missedTackles} label="Missed" />
          <Figure
            value={efficiency === null ? '–' : `${Math.round(efficiency)}%`}
            label="Efficiency"
          />
        </Block>

        <Block title="Discipline">
          <Figure value={t.errors} label="Errors" />
        </Block>

        <p className={styles.footnote}>
          Season totals, added up from every match {player.firstName} has played this year.
        </p>
      </main>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.block}>
      <h2 className={`label ${styles.blockTitle}`}>{title}</h2>
      <div className={styles.figures}>{children}</div>
    </section>
  )
}

function Figure({
  value,
  label,
  lead,
}: {
  value: number | string
  label: string
  lead?: boolean
}) {
  return (
    <div className={styles.figure}>
      <p className={`num ${lead ? styles.leadValue : styles.value}`}>{value}</p>
      <p className="label">{label}</p>
    </div>
  )
}
