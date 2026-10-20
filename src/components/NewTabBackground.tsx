import { useEffect, useRef, useState } from 'react'
import { Check, Wallpaper } from 'lucide-react'
import { newTabBackgrounds, type Motion, type NewTabBg } from '../state'
import { cx } from './ui'
import FlowField from './kokonutui/flow-field'
import DotField from './kokonutui/dot-field'
import BackgroundPaths from './kokonutui/background-paths'
import TopoBackground from './kokonutui/topo-background'

/*
 * New Tab backgrounds, all decorative and ignoring the cursor. Plain and Glow
 * are pure CSS (index.css → .sb-ntbg-*). Flow, Dots, Paths and Contours are
 * Kokonut canvases drawn in `--ntbg-ink`, so they follow theme, accent and the
 * private palette. The Motion level is already OS-adjusted by effectiveMotion:
 *   Full — drifts slowly (about half Kokonut's default pace).   Calm and Off — one still frame.
 */

// Kokonut roots are page sections; pin them behind the New Tab as a layer instead.
const LAYER = 'pointer-events-none absolute inset-0 -z-10 block min-h-0 bg-transparent text-[var(--ntbg-ink)] dark:bg-transparent dark:text-[var(--ntbg-ink)]'

export function NewTabBackground({ kind, level }: { kind: NewTabBg; level: Motion }) {
  const still = level !== 'Full'
  if (kind === 'plain') return null
  if (kind === 'glow')
    return (
      <div aria-hidden className="sb-ntbg-layer -z-10">
        <div className="sb-ntbg-layer sb-ntbg-glow" />
        <div className="sb-ntbg-layer sb-ntbg-dots" />
      </div>
    )
  return (
    <>
      <div aria-hidden className="sb-ntbg-layer sb-ntbg-glow -z-10 opacity-50" />
      {kind === 'flow' && (
        <FlowField className="-z-10 text-[var(--ntbg-ink)]" speed={0.3} interactive={false} reducedMotion={still}>
          {null}
        </FlowField>
      )}
      {kind === 'dots' && (
        <DotField className={LAYER} speed={0.5} interactive={false} reducedMotion={still}>
          {null}
        </DotField>
      )}
      {kind === 'paths' && (
        <BackgroundPaths className={LAYER} count={36} speed={0.25} interactive={false} reducedMotion={still}>
          {null}
        </BackgroundPaths>
      )}
      {kind === 'contours' && (
        <TopoBackground className={LAYER} labels={false} speed={0.3} interactive={false} reducedMotion={still}>
          {null}
        </TopoBackground>
      )}
    </>
  )
}

/* Still frames for the picker, drawn once as SVG in a 160×72 box. */

const TW = 160
const TH = 72
const f1 = (n: number) => n.toFixed(1)

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const FLOW_THUMB = (() => {
  const r = rng(7)
  const angle = (x: number, y: number) => 0.45 * Math.sin(x / 26 + y / 40) + 0.35 * Math.cos(y / 14 - x / 60)
  return Array.from({ length: 70 }, () => {
    let x = r() * TW
    let y = r() * TH
    let d = `M${f1(x)} ${f1(y)}`
    for (let i = 0; i < 6; i++) {
      const a = angle(x, y)
      x += Math.cos(a) * 3.2
      y += Math.sin(a) * 3.2
      d += `L${f1(x)} ${f1(y)}`
    }
    return { d, o: 0.25 + r() * 0.6 }
  })
})()

const DOTS_THUMB = (() => {
  const out: { x: number; y: number; r: number }[] = []
  for (let y = 4; y < TH; y += 6) {
    for (let x = 4; x < TW; x += 6) {
      const n = (Math.sin(x * 0.07 + 1) + Math.cos(y * 0.15 + x * 0.035) + 2) / 4
      out.push({ x, y, r: 0.35 + n * n * 1.6 })
    }
  }
  return out
})()

const PATHS_THUMB = Array.from({ length: 14 }, (_, i) => {
  let d = ''
  for (let x = -4; x <= TW + 4; x += 4) {
    const y = 14 + i * 3.4 - x * 0.14 + 7 * Math.sin(x / 30 + i * 0.22) + 3 * Math.sin(x / 13 - i * 0.4)
    d += `${d ? 'L' : 'M'}${x} ${f1(y)}`
  }
  return { d, o: 0.2 + (i % 4) * 0.17 }
})

const CONTOURS_THUMB = [
  { cx: 46, cy: 30, k: 0.6 },
  { cx: 124, cy: 50, k: 2.1 },
].flatMap(({ cx: hx, cy: hy, k }) =>
  Array.from({ length: 7 }, (_, ring) => {
    const r0 = 5 + ring * 7
    let d = ''
    for (let s = 0; s <= 48; s++) {
      const t = (s / 48) * Math.PI * 2
      const r = r0 * (1 + 0.14 * Math.sin(3 * t + k + ring * 0.3) + 0.07 * Math.cos(5 * t - k))
      d += `${d ? 'L' : 'M'}${f1(hx + Math.cos(t) * r * 1.5)} ${f1(hy + Math.sin(t) * r)}`
    }
    return { d: `${d}Z`, major: ring % 3 === 2 }
  }),
)

function ThumbArt({ kind }: { kind: NewTabBg }) {
  if (kind === 'plain') return null
  if (kind === 'glow')
    return (
      <>
        <span className="sb-ntbg-layer sb-ntbg-glow" />
        <span className="sb-ntbg-layer sb-ntbg-dots" />
      </>
    )
  return (
    <>
      <span className="sb-ntbg-layer sb-ntbg-glow opacity-50" />
      <svg viewBox={`0 0 ${TW} ${TH}`} preserveAspectRatio="xMidYMid slice" className="sb-ntbg-layer sb-ntbg-thumb-art h-full w-full" fill="none" stroke="currentColor" strokeLinecap="round">
        {kind === 'flow' && FLOW_THUMB.map((p, i) => <path key={i} d={p.d} strokeWidth={0.8} strokeOpacity={p.o} />)}
        {kind === 'dots' && DOTS_THUMB.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="currentColor" stroke="none" opacity={0.75} />)}
        {kind === 'paths' && PATHS_THUMB.map((p, i) => <path key={i} d={p.d} strokeWidth={0.7} strokeOpacity={p.o} />)}
        {kind === 'contours' && CONTOURS_THUMB.map((p, i) => <path key={i} d={p.d} strokeWidth={p.major ? 0.9 : 0.6} strokeOpacity={p.major ? 0.6 : 0.32} />)}
      </svg>
    </>
  )
}

/** Still frame of a background, for pickers. Inherit `.sb-ntbg` tokens from an ancestor or pass `isPrivate`. */
export function BackgroundThumb({ kind, isPrivate, className }: { kind: NewTabBg; isPrivate?: boolean; className?: string }) {
  return (
    <span className={cx('sb-ntbg sb-ntbg-thumb block', isPrivate && 'is-private', className)}>
      <ThumbArt kind={kind} />
    </span>
  )
}
/** Radio cards for every background. Shared by the New Tab picker and Settings. */
export function BackgroundOptions({ value, onChange, isPrivate, compact }: { value: NewTabBg; onChange: (v: NewTabBg) => void; isPrivate?: boolean; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="New Tab background" className={cx('grid grid-cols-3', compact ? 'gap-2' : 'gap-3')}>
      {newTabBackgrounds.map((b) => {
        const selected = value === b.id
        return (
          <button
            key={b.id}
            role="radio"
            aria-checked={selected}
            data-selected={selected || undefined}
            onClick={() => onChange(b.id)}
            className="group text-left"
          >
            <span className={cx('relative block overflow-hidden rounded-[8px] border transition-colors', selected ? 'border-accent ring-1 ring-accent' : 'border-line-strong group-hover:border-text-3')}>
              <BackgroundThumb kind={b.id} isPrivate={isPrivate} className={compact ? 'h-[52px]' : 'h-[72px]'} />
              {selected && (
                <span className="absolute top-1.5 right-1.5 grid h-4 w-4 place-items-center rounded-full bg-accent text-accent-fg">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </span>
            <span className={cx('mt-1.5 block text-[12px]', selected ? 'font-medium text-text-1' : 'text-text-2')}>{b.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Corner button on the New Tab that opens the background picker. */
export function BackgroundPicker({ value, onChange, isPrivate, level }: { value: NewTabBg; onChange: (v: NewTabBg) => void; isPrivate: boolean; level: Motion }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector<HTMLElement>('[data-selected]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])
  return (
    <div className="absolute right-4 bottom-4 z-10">
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div ref={panelRef} role="dialog" aria-label="Background" className={cx('absolute right-0 bottom-10 w-[300px] rounded-[10px] border border-line-strong bg-bg-2 p-3 shadow-overlay', level !== 'Off' && 'sb-in')}>
            <div className="mb-2.5 text-[13px] font-medium text-text-1">Background</div>
            <BackgroundOptions compact value={value} onChange={onChange} isPrivate={isPrivate} />
            {level !== 'Full' && <p className="mt-2.5 text-[11px] leading-4 text-text-3">Backgrounds drift only when Motion is Full; for now they hold a still frame.</p>}
          </div>
        </>
      )}
      <button
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={cx('flex h-8 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12px] backdrop-blur-sm transition-colors', open ? 'border-line-strong bg-bg-3 text-text-1' : 'border-line bg-bg-1/70 text-text-2 hover:border-line-strong hover:text-text-1')}
      >
        <Wallpaper size={14} />
        Background
      </button>
    </div>
  )
}
