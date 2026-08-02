'use client'

import { useEffect, useRef } from 'react'

// Souths get sunglasses.
//
// One delegated listener rather than a prop on every component: anything
// rendered with data-club="rabbitohs" is a trigger, wherever it sits. Rare
// enough — roughly one click in twenty, genuinely random rather than every
// exact twentieth — that Oliver has to earn it.

const SOUTHS = 'rabbitohs'
const RAIN_ODDS = 20

export function RabbitohsEasterEgg() {
  const sky = useRef<HTMLDivElement | null>(null)
  const raining = useRef(false)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = event.target as Element | null
      if (el?.closest?.('[data-club]')?.getAttribute('data-club') !== SOUTHS) return
      if (Math.floor(Math.random() * RAIN_ODDS) !== 0) return
      shades(sky.current)
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  function shades(host: HTMLDivElement | null) {
    if (!host || raining.current) return
    // The whole thing is motion, so under reduced motion it simply does not
    // happen. The global rule would otherwise collapse it to 0.01ms and make it
    // silently invisible rather than deliberately absent.
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
