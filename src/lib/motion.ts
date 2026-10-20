import type { Motion } from '../state'

/*
 * Switchback's Motion setting (Full / Calm / Off) has to reach code that only
 * knows about the OS preference: motion/react's reduced-motion detection and
 * Kokonut components that call matchMedia directly. The shim answers every
 * `prefers-reduced-motion` query with "OS preference OR app setting" and fires
 * `change` when either side changes. All other queries go to the browser.
 */

let forced = false
let native: MediaQueryList | null = null
const fakes = new Set<FakeQueryList>()

const reduced = () => forced || !!native?.matches

class FakeQueryList extends EventTarget implements MediaQueryList {
  readonly media: string
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null
  private readonly inverted: boolean
  constructor(media: string) {
    super()
    this.media = media
    this.inverted = media.includes('no-preference')
  }
  get matches() {
    return this.inverted ? !reduced() : reduced()
  }
  addListener(cb: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null) {
    if (cb) this.addEventListener('change', cb as EventListener)
  }
  removeListener(cb: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null) {
    if (cb) this.removeEventListener('change', cb as EventListener)
  }
  notify() {
    const ev = new MediaQueryListEvent('change', { matches: this.matches, media: this.media })
    this.dispatchEvent(ev)
    this.onchange?.call(this, ev)
  }
}

export function installReducedMotionShim() {
  if (typeof window === 'undefined' || !window.matchMedia || native) return
  const original = window.matchMedia.bind(window)
  native = original('(prefers-reduced-motion: reduce)')
  native.addEventListener('change', () => fakes.forEach((f) => f.notify()))
  window.matchMedia = (query: string) => {
    if (!query.includes('prefers-reduced-motion')) return original(query)
    const fake = new FakeQueryList(query)
    fakes.add(fake)
    return fake
  }
}

/** Called by the app whenever the Motion setting changes. */
export function setForcedReducedMotion(value: boolean) {
  if (value === forced) return
  forced = value
  fakes.forEach((f) => f.notify())
}

/** The level Switchback's own choreography should use: the OS can only lower it. */
export function effectiveMotion(setting: Motion): Motion {
  return setting === 'Full' && native?.matches ? 'Calm' : setting
}
