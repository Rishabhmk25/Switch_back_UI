import { animate, type AnimationPlaybackControls, type DOMKeyframesDefinition, type AnimationOptions } from 'motion/react'
import type { Motion } from '../state'

/*
 * Motion owns Switchback's own choreography: list entrances, row collapse,
 * the recovery banner and the sidebar spring. Callers pass the level from
 * `effectiveMotion()`, so the OS preference is already folded in and every
 * transition sets `reduceMotion: false` instead of relying on Motion's
 * mount-time reduced-motion cache. Every helper resolves when the motion is
 * done — or interrupted by a newer one — and immediately under Off.
 */

type Level = Exclude<Motion, 'Off'>
type Ease = [number, number, number, number]

const outQuint: Ease = [0.22, 1, 0.36, 1]
const outQuad: Ease = [0.5, 1, 0.89, 1]
const inOutQuad: Ease = [0.45, 0, 0.55, 1]

const STAGGER_CAP = 12
const staggered = (step: number, start = 0) => (i: number) => start + Math.min(i, STAGGER_CAP - 1) * step

/** One place for every Full / Calm choice. Calm: shorter, smaller, no stagger, no springs. */
const presets = {
  Full: {
    enter: { y: 8, transition: { duration: 0.34, ease: outQuint, delay: staggered(0.028, 0.04) } },
    collapseOut: { x: -12, transition: { duration: 0.18, ease: outQuad, delay: staggered(0.03) } },
    collapseFold: { duration: 0.22, ease: inOutQuad, delay: staggered(0.03) },
    bannerIn: { type: 'spring' as const, stiffness: 260, damping: 24 },
    bannerOut: { duration: 0.2, ease: outQuad },
    width: { type: 'spring' as const, stiffness: 320, damping: 30 },
  },
  Calm: {
    enter: { y: 3, transition: { duration: 0.16, ease: outQuint } },
    collapseOut: { x: 0, transition: { duration: 0.12, ease: outQuad } },
    collapseFold: { duration: 0.12, ease: inOutQuad },
    bannerIn: { duration: 0.14, ease: outQuad },
    bannerOut: { duration: 0.14, ease: outQuad },
    width: { duration: 0.14, ease: outQuad },
  },
} satisfies Record<Level, Record<string, unknown>>

// A newer animation on the same element interrupts the older one; the older
// promise still settles so callers awaiting it never hang.
const running = new WeakMap<Element, { controls: AnimationPlaybackControls; settle: () => void }>()

function interrupt(els: Element[]) {
  for (const el of els) {
    const r = running.get(el)
    if (!r) continue
    running.delete(el)
    r.controls.stop()
    r.settle()
  }
}

function run(els: HTMLElement[], keyframes: DOMKeyframesDefinition, options: AnimationOptions): Promise<boolean> {
  interrupt(els)
  return new Promise((resolve) => {
    let done = false
    const settle = (finished: boolean) => {
      if (done) return
      done = true
      for (const el of els) if (running.get(el)?.settle === interrupted) running.delete(el)
      resolve(finished)
    }
    const interrupted = () => settle(false)
    const controls = animate(els, keyframes, { ...options, reduceMotion: false } as AnimationOptions)
    for (const el of els) running.set(el, { controls, settle: interrupted })
    controls.then(() => settle(true), interrupted)
  })
}

function clear(els: HTMLElement[], props: string[]) {
  for (const el of els) for (const p of props) el.style.removeProperty(p)
}

/** Staggered rise-in for list items. Call from a layout effect so nothing flashes. */
export async function enterList(els: HTMLElement[], level: Motion): Promise<void> {
  if (!els.length) return
  interrupt(els)
  if (level === 'Off') {
    clear(els, ['opacity', 'transform'])
    return
  }
  const { y, transition } = presets[level].enter
  for (const el of els) el.style.opacity = '0'
  if (await run(els, { opacity: [0, 1], y: [y, 0] }, transition)) clear(els, ['opacity', 'transform'])
}

/** Fade and slide rows out, then fold their height away. */
export async function collapseRows(els: HTMLElement[], level: Motion): Promise<void> {
  if (!els.length || level === 'Off') return
  interrupt(els)
  const p = presets[level]
  for (const el of els) {
    el.style.height = `${el.offsetHeight}px`
    el.style.overflow = 'hidden'
  }
  if (!(await run(els, { opacity: 0, x: p.collapseOut.x }, p.collapseOut.transition))) return
  await run(els, { height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0 }, p.collapseFold)
}

/** Recovery banner: springs open, eases shut. */
export async function slideBanner(el: HTMLElement, dir: 'in' | 'out', level: Motion, height = 36): Promise<void> {
  interrupt([el])
  if (level === 'Off') {
    clear([el], ['height', 'opacity'])
    return
  }
  const open = dir === 'in'
  if (open) {
    el.style.height = '0px'
    el.style.opacity = '0'
    if (await run([el], { height: [0, height], opacity: [0, 1] }, presets[level].bannerIn)) clear([el], ['height', 'opacity'])
    return
  }
  await run([el], { height: [el.offsetHeight, 0], opacity: 0 }, presets[level].bannerOut)
}

/** Sidebar width change: a soft spring on Full, a short ease on Calm. */
export function springWidth(el: HTMLElement, from: number, to: number, level: Motion) {
  interrupt([el])
  if (level === 'Off' || from === to) {
    el.style.width = `${to}px`
    return
  }
  el.style.width = `${from}px`
  void run([el], { width: [from, to] }, presets[level].width)
}
