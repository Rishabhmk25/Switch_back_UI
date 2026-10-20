import { useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react'
import { Info } from 'lucide-react'
import { MotionConfig } from 'motion/react'
import { StoreProvider, useStore } from './state'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { CommandPalette } from './components/CommandPalette'
import { Dialog } from './components/Dialog'
import { StatusIslandHost } from './components/StatusIslandHost'
import { Button, cx } from './components/ui'
import { NewTab } from './pages/NewTab'
import { WebPage } from './pages/WebPage'
import { MemoryPage } from './pages/MemoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { effectiveMotion, setForcedReducedMotion } from './lib/motion'
import { slideBanner } from './lib/choreo'

const W = 1440
const H = 900

/** Stays mounted while it slides out, then unmounts. */
function RecoveryBannerSlot() {
  const { s } = useStore()
  const show = s.recoveryBanner && !s.isPrivate
  const [mounted, setMounted] = useState(show)
  const [leaving, setLeaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const level = effectiveMotion(s.motion)
  const levelRef = useRef(level)
  levelRef.current = level

  useEffect(() => {
    if (show) {
      setLeaving(false)
      setMounted(true)
    } else if (mounted) setLeaving(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (leaving) {
      let live = true
      slideBanner(el, 'out', levelRef.current).then(() => {
        if (live) {
          setMounted(false)
          setLeaving(false)
        }
      })
      return () => {
        live = false
      }
    }
    if (mounted) slideBanner(el, 'in', levelRef.current)
  }, [mounted, leaving])

  if (!mounted) return null
  return <RecoveryBanner bannerRef={ref} />
}

function RecoveryBanner({ bannerRef }: { bannerRef: Ref<HTMLDivElement> }) {
  const { set } = useStore()
  const [details, setDetails] = useState(false)
  return (
    <>
      <div ref={bannerRef} role="status" className="flex h-9 shrink-0 items-center gap-2.5 overflow-hidden border-b border-line bg-accent-sub px-4 text-[12px] text-text-1">
        <Info size={14} className="shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate">
          Switchback closed unexpectedly. <strong className="font-semibold">14 tabs in 3 workspaces were restored.</strong> Text you were typing and the state of web apps could not be saved.
        </span>
        <Button size="sm" variant="ghost" onClick={() => setDetails(true)}>View details</Button>
        <Button size="sm" variant="ghost" onClick={() => set({ recoveryBanner: false })}>Dismiss</Button>
      </div>
      {details && (
        <Dialog
          title="What was restored"
          onClose={() => setDetails(false)}
          actions={<Button data-cancel variant="primary" onClick={() => setDetails(false)}>Done</Button>}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1 text-[11px] font-medium tracking-[0.02em] text-ok uppercase">Restored</div>
              <ul className="space-y-0.5 text-text-1">
                <li>Tab URLs and order</li>
                <li>Pinned tabs</li>
                <li>3 workspaces</li>
                <li>Window layout</li>
              </ul>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-medium tracking-[0.02em] text-warn uppercase">Not restored</div>
              <ul className="space-y-0.5 text-text-1">
                <li>Form fields</li>
                <li>Web app state</li>
                <li>sessionStorage</li>
                <li>Scroll position</li>
              </ul>
            </div>
          </div>
        </Dialog>
      )}
    </>
  )
}

function Content() {
  const { activeTab } = useStore()
  if (!activeTab) return null
  if (activeTab.kind === 'newtab') return <NewTab key={activeTab.id} />
  if (activeTab.kind === 'memory') return <MemoryPage />
  if (activeTab.kind === 'settings') return <SettingsPage />
  return <WebPage tab={activeTab} />
}

function BrowserWindow() {
  const store = useStore()
  const { s, set, cycleSidebar, openTab, openInternal, closeTab, activeTab, showStatus } = store
  const [peek, setPeek] = useState(false)
  const [consent, setConsent] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === 'k' && !s.isPrivate) {
        e.preventDefault()
        set((p) => ({ paletteOpen: !p.paletteOpen }))
      } else if (k === 'b') {
        e.preventDefault()
        cycleSidebar()
      } else if (k === 't') {
        e.preventDefault()
        openTab('newtab')
      } else if (k === 'w' && activeTab) {
        e.preventDefault()
        closeTab(activeTab.id)
      } else if (k === ',') {
        e.preventDefault()
        openInternal('settings')
      } else if (k === 'n' && e.shiftKey) {
        e.preventDefault()
        set((p) => ({ isPrivate: !p.isPrivate }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.isPrivate, set, cycleSidebar, openTab, openInternal, closeTab, activeTab])

  const hidden = s.sidebarMode === 'hidden'

  // Kokonut's `dark:` variant reads <html class="dark">; keep it in step with the store.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', s.theme === 'dark')
    document.documentElement.style.colorScheme = s.theme
  }, [s.theme])

  // Calm and Off read as "reduce" to every prefers-reduced-motion query (see lib/motion).
  useLayoutEffect(() => setForcedReducedMotion(s.motion !== 'Full'), [s.motion])

  return (
    <MotionConfig reducedMotion={s.motion === 'Full' ? 'user' : 'always'}>
    <div className={cx('sb-window relative flex h-full w-full overflow-hidden rounded-[12px] border border-line bg-bg-0', s.theme === 'dark' ? 'sb-dark' : 'sb-light', `sb-accent-${s.accent}`, s.motion !== 'Full' && 'sb-calm')}>
      {!hidden && <Sidebar />}
      {hidden && <div className="absolute top-0 left-0 z-30 h-full w-[6px]" onMouseEnter={() => setPeek(true)} aria-hidden />}
      {hidden && peek && <Sidebar overlay onLeave={() => setPeek(false)} />}

      <main className="relative flex min-w-0 flex-1 flex-col">
        <TopBar onCloud={() => setConsent(true)} />
        <RecoveryBannerSlot />
        <div className="relative min-h-0 flex-1">
          <Content />
        </div>
        {s.paletteOpen && !s.isPrivate && <CommandPalette />}
        <StatusIslandHost />
      </main>

      {consent && (
        <Dialog
          title="Switch to Cloud?"
          width={480}
          onClose={() => setConsent(false)}
          actions={
            <>
              <Button data-cancel onClick={() => setConsent(false)}>Stay Local</Button>
              <Button
                variant="primary"
                onClick={() => {
                  set({ mode: 'Cloud', cloudConsent: true })
                  setConsent(false)
                  showStatus('Switched to Cloud')
                }}
              >
                Switch to Cloud
              </Button>
            </>
          }
        >
          <p>Search data and questions may be sent to the providers you choose.</p>
          <ul className="mt-3 space-y-1 rounded-[8px] border border-warn/30 bg-warn-sub p-3 text-[12px] text-text-1">
            <li>· Your question and a few matching passages go to the provider.</li>
            <li>· The provider’s own privacy policy applies to that data.</li>
            <li>· You can switch back to Local at any time.</li>
          </ul>
        </Dialog>
      )}
    </div>
    </MotionConfig>
  )
}

export default function App() {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 32) / W, (window.innerHeight - 32) / H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <div style={{ width: W * scale, height: H * scale }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <StoreProvider>
            <BrowserWindow />
          </StoreProvider>
        </div>
      </div>
    </div>
  )
}
