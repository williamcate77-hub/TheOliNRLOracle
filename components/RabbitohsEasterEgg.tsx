'use client'

import { useEffect, useRef } from 'react'

// Souths get a round of applause.
//
// One delegated listener rather than a prop on every component: anything
// rendered with data-club="rabbitohs" is a trigger, wherever it sits. The
// applause is capped at a few per session so it stays a greeting, and the
// sunglasses are rare enough that Oliver has to earn them.

const SOUTHS = 'rabbitohs'
const APPLAUSE_LIMIT = 3
const RAIN_ODDS = 20
const CHEER_KEY = 'nrl-oracle:souths-cheers'

export function RabbitohsEasterEgg() {
  const audio = useRef<AudioContext | null>(null)
  const noise = useRef<AudioBuffer | null>(null)
  const sky = useRef<HTMLDivElement | null>(null)
  const raining = useRef(false)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = event.target as Element | null
      if (el?.closest?.('[data-club]')?.getAttribute('data-club') !== SOUTHS) return

      const rain = Math.floor(Math.random() * RAIN_ODDS) === 0
      const heard = count()

      // The rare one always gets its sound, cap or no cap.
      if (rain || heard < APPLAUSE_LIMIT) {
        applaud(context())
        if (!rain) bump(heard)
      }
      if (rain) shades(sky.current)
    }

    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      void audio.current?.close()
    }
  }, [])

  function context(): AudioContext {
    if (!audio.current) audio.current = new AudioContext()
    // Safari parks the context until a gesture. A click is a gesture.
    if (audio.current.state === 'suspended') void audio.current.resume()
    return audio.current
  }

  /** Two seconds of noise, made once and reused for every clap. */
  function bed(ctx: AudioContext): AudioBuffer {
    if (noise.current) return noise.current
    const frames = Math.ceil(ctx.sampleRate * 2)
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1
    noise.current = buffer
    return buffer
  }

  function applaud(ctx: AudioContext) {
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.value = 0.16
    master.connect(ctx.destination)

    const source = (at: number, length: number) => {
      const src = ctx.createBufferSource()
      src.buffer = bed(ctx)
      src.start(at, Math.random(), length)
      return src
    }

    // The body of the crowd: a broad swell that comes up fast and falls away.
    const swell = source(now, 1.6)
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 1600
    band.Q.value = 0.7
    const swellGain = ctx.createGain()
    swellGain.gain.setValueAtTime(0.0001, now)
    swellGain.gain.exponentialRampToValueAtTime(0.85, now + 0.18)
    swellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5)
    swell.connect(band).connect(swellGain).connect(master)

    // Individual hands on top, scattered, so it reads as people not as static.
    for (let i = 0; i < 28; i++) {
      const at = now + Math.random() * 1.15
      const clap = source(at, 0.07)
      const edge = ctx.createBiquadFilter()
      edge.type = 'highpass'
      edge.frequency.value = 900 + Math.random() * 1300
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.2 + Math.random() * 0.3, at)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05 + Math.random() * 0.06)
      clap.connect(edge).connect(gain).connect(master)
    }
  }

  function shades(host: HTMLDivElement | null) {
    if (!host || raining.current) return
    // The whole thing is motion, so under reduced motion it simply does not
    // happen. The applause already carried the moment.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    raining.current = true
    for (let i = 0; i < 26; i++) {
      const el = document.createElement('span')
      el.className = 'shades'
      el.textContent = '😎'
      el.style.left = `${Math.random() * 100}%`
      el.style.fontSize = `${20 + Math.random() * 26}px`
      el.style.animationDelay = `${Math.random() * 0.8}s`
      el.style.animationDuration = `${2.6 + Math.random() * 1.8}s`
      el.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`)
      host.appendChild(el)
    }
    setTimeout(() => {
      host.replaceChildren()
      raining.current = false
    }, 5600)
  }

  return <div ref={sky} className="shades-sky" aria-hidden="true" />
}

// Session-scoped on purpose: quiet after a few clicks today, warm again tomorrow.
function count(): number {
  try {
    return Number(sessionStorage.getItem(CHEER_KEY)) || 0
  } catch {
    return APPLAUSE_LIMIT // no storage, so err on the side of not making noise
  }
}

function bump(heard: number) {
  try {
    sessionStorage.setItem(CHEER_KEY, String(heard + 1))
  } catch {
    /* private mode. The cap just will not persist. */
  }
}
