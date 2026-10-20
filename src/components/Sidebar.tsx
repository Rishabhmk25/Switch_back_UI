import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Brain, HardDrive, Moon, Pause, Plus, Settings, Volume2, VolumeX, X, TriangleAlert, EyeOff } from 'lucide-react'
import { useStore } from '../state'
import type { Tab } from '../mock/data'
import { hostOf, hueVar } from '../mock/data'
import { cx, LetterTile } from './ui'
import { effectiveMotion } from '../lib/motion'
import { springWidth } from '../lib/choreo'

function Favicon({ tab, size = 16 }: { tab: Tab; size?: number }) {
  const { s } = useStore()
  if (tab.loading)
    return <span aria-label="Loading" className="sb-spinner inline-block shrink-0 rounded-full border-[1.5px] border-line-strong border-t-accent" style={{ width: 14, height: 14, margin: (size - 14) / 2 }} />
  if (tab.crashed) return <TriangleAlert size={size} className="shrink-0 text-err" />
  if (tab.kind === 'memory') return <Brain size={size} strokeWidth={1.5} className="shrink-0 text-accent" />
  if (tab.kind === 'settings') return <Settings size={size} strokeWidth={1.5} className="shrink-0 text-text-2" />
  if (tab.kind === 'newtab')
    return s.isPrivate ? <EyeOff size={size} strokeWidth={1.5} className="shrink-0 text-private" /> : <span className="inline-flex shrink-0 items-center justify-center rounded-[5px] bg-bg-3 text-[9px] font-semibold text-text-2" style={{ width: size, height: size }}>S</span>
  return (
    <span className={cx(tab.suspended && 'opacity-60')}>
      <LetterTile host={hostOf(tab.url)} size={size} />
    </span>
  )
}

export function Sidebar({ overlay = false, onLeave }: { overlay?: boolean; onLeave?: () => void }) {
  const store = useStore()
  const { s, set, visibleTabs, activeTab, selectTab, closeTab, openTab, openInternal, updateTabs, addWorkspace, showStatus } = store
  const rail = s.sidebarMode === 'rail' && !overlay
  const width = rail ? 52 : s.sidebarWidth
  const pinned = visibleTabs.filter((t) => t.pinned)
  const regular = visibleTabs.filter((t) => !t.pinned)
  const [menu, setMenu] = useState<{ id: string; y: number } | null>(null)
  const [fade, setFade] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<number | null>(null)
  const asideRef = useRef<HTMLElement>(null)
  const prevWidth = useRef(width)
  const dragging = useRef(false)

  // Rail ↔ expanded springs (Motion); drag-resizing tracks the pointer directly.
  useLayoutEffect(() => {
    const el = asideRef.current
    const from = prevWidth.current
    prevWidth.current = width
    if (!el || overlay) return
    springWidth(el, from, width, dragging.current ? 'Off' : effectiveMotion(s.motion))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  // Single sliding active indicator (MO-04).
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-tab="${activeTab?.id}"]`)
    setIndicator(el ? el.offsetTop + 9 : null)
  }, [activeTab?.id, visibleTabs.length, rail, s.activeWs])

  useEffect(() => setFade((f) => f + 1), [s.activeWs])

  const startResize = (e: React.PointerEvent) => {
    const startX = e.clientX
    const startW = s.sidebarWidth
    const scale = (e.currentTarget as HTMLElement).getBoundingClientRect().width / (e.currentTarget as HTMLElement).offsetWidth || 1
    dragging.current = true
    const move = (ev: PointerEvent) => set({ sidebarWidth: Math.max(200, Math.min(360, startW + (ev.clientX - startX) / scale)) })
    const up = () => {
      dragging.current = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const menuTab = menu ? visibleTabs.find((t) => t.id === menu.id) : null
  const memoryLine = s.capture === 'paused' ? { icon: <Pause size={14} />, text: 'Capture paused', cls: 'text-text-2' } : { icon: <HardDrive size={14} />, text: 'Memory ready', cls: 'text-ok' }

  return (
    <aside
      ref={asideRef}
      aria-label="Sidebar"
      onMouseLeave={onLeave}
      className={cx('relative flex h-full shrink-0 flex-col border-r border-line bg-bg-1', overlay && 'sb-in absolute top-0 left-0 z-40 shadow-overlay')}
      style={{ width }}
    >
      {/* Window controls inset */}
      {/* Rail stacks the controls vertically (48px), so the inset grows to fit instead of the fixed 44px row. */}
      <div className={cx('flex shrink-0 items-center gap-2', rail ? 'justify-center px-0 pt-3 pb-2.5' : 'h-11 px-4')}>
        <div className={cx('flex gap-2', rail && 'flex-col gap-1.5')}>
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        {!rail && s.isPrivate && <span className="ml-auto text-[11px] font-medium tracking-[0.02em] text-private">Private</span>}
        {!rail && !s.isPrivate && (
          <span className="ml-auto truncate text-[11px] font-medium tracking-[0.02em] text-text-3">{s.workspaces.find((w) => w.id === s.activeWs)?.name}</span>
        )}
      </div>

      <div key={fade} className="sb-fade sb-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {pinned.length > 0 && (
          <div className={cx('grid gap-1 px-2 pb-2', rail ? 'grid-cols-1 justify-items-center' : 'grid-cols-[repeat(auto-fill,minmax(36px,1fr))]')}>
            {pinned.map((t) => (
              <button
                key={t.id}
                title={t.title}
                onClick={() => selectTab(t.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setMenu({ id: t.id, y: (e.currentTarget as HTMLElement).offsetTop + 30 })
                }}
                className={cx('flex h-9 items-center justify-center rounded-[8px] border transition-colors', activeTab?.id === t.id ? 'border-line-strong bg-bg-3' : 'border-line bg-bg-2/40 hover:bg-bg-2', rail && 'w-9')}
              >
                <Favicon tab={t} />
              </button>
            ))}
          </div>
        )}
        {pinned.length > 0 && <div className="mx-3 mb-2 h-px bg-line" />}

        <div
          ref={listRef}
          role="tablist"
          aria-orientation="vertical"
          aria-label="Tabs"
          className="relative flex flex-col gap-0.5 px-2"
          onDoubleClick={(e) => e.target === e.currentTarget && openTab('newtab')}
        >
          {indicator !== null && (
            <span
              aria-hidden
              className={cx('absolute left-0 h-4 w-[2px] rounded-r-full', s.isPrivate ? 'bg-private' : 'bg-accent')}
              style={{ top: indicator, transition: 'top 180ms cubic-bezier(0.2,0,0,1)' }}
            />
          )}
          {regular.map((t) => {
            const active = activeTab?.id === t.id
            return (
              <div
                key={t.id}
                data-tab={t.id}
                role="tab"
                tabIndex={active ? 0 : -1}
                aria-selected={active}
                title={rail ? t.title : t.suspended ? t.suspendReason : undefined}
                onClick={() => selectTab(t.id)}
                onAuxClick={(e) => e.button === 1 && closeTab(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') selectTab(t.id)
                  if (e.key === 'Delete') closeTab(t.id)
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    const i = regular.findIndex((x) => x.id === t.id) + (e.key === 'ArrowDown' ? 1 : -1)
                    const n = regular[i]
                    if (n) (listRef.current?.querySelector(`[data-tab="${n.id}"]`) as HTMLElement | null)?.focus()
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setMenu({ id: t.id, y: (e.currentTarget as HTMLElement).offsetTop + 34 + (listRef.current?.offsetTop ?? 0) })
                }}
                className={cx(
                  'group flex h-[34px] cursor-default items-center gap-2 rounded-[8px] transition-colors select-none',
                  rail ? 'justify-center px-0' : 'pr-1 pl-2.5',
                  active ? 'bg-bg-3' : 'hover:bg-bg-2',
                )}
              >
                {s.isPrivate && !rail && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-private" />}
                <Favicon tab={t} />
                {!rail && (
                  <>
                    <span className={cx('min-w-0 flex-1 truncate', active ? 'font-medium text-text-1' : 'text-text-2')}>{t.title}</span>
                    {t.audible && (
                      <button
                        aria-label={t.muted ? 'Unmute tab' : 'Mute tab'}
                        onClick={(e) => {
                          e.stopPropagation()
                          updateTabs((tabs) => tabs.map((x) => (x.id === t.id ? { ...x, muted: !x.muted } : x)))
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-[6px] text-text-2 hover:bg-bg-3 hover:text-text-1"
                      >
                        {t.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
                    )}
                    {t.suspended && <Moon size={14} className="mr-1 shrink-0 text-text-3 group-hover:hidden" aria-label="Suspended" />}
                    <button
                      aria-label={`Close ${t.title}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTab(t.id)
                      }}
                      className={cx('h-6 w-6 items-center justify-center rounded-[6px] text-text-2 hover:bg-bg-1 hover:text-text-1', active ? 'flex' : 'hidden group-hover:flex')}
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            )
          })}
          <button
            onClick={() => openTab('newtab')}
            title="New tab (⌘T)"
            className={cx('flex h-[34px] items-center gap-2 rounded-[8px] text-text-3 transition-colors hover:bg-bg-2 hover:text-text-1', rail ? 'justify-center' : 'px-2.5')}
          >
            <Plus size={16} strokeWidth={1.5} />
            {!rail && <span>New tab</span>}
          </button>
        </div>
      </div>

      {/* Footer: workspaces, memory status, settings */}
      <div className="shrink-0 border-t border-line px-2 pt-2 pb-2.5">
        {!s.isPrivate && (
          <div className={cx('flex items-center gap-1.5 pb-2', rail ? 'flex-col' : 'px-1')}>
            {s.workspaces.map((w) => {
              const active = w.id === s.activeWs
              return (
                <button
                  key={w.id}
                  title={`${w.name} workspace`}
                  aria-pressed={active}
                  onClick={() => set({ activeWs: w.id })}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-105"
                  style={{ boxShadow: active ? `0 0 0 1.5px var(--bg-1), 0 0 0 3px ${hueVar(w.hue)}` : undefined }}
                >
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-semibold" style={{ background: hueVar(w.hue), color: 'var(--bg-0)' }}>
                    {w.name[0]}
                  </span>
                </button>
              )
            })}
            {s.workspaces.length < 6 && (
              <button aria-label="New workspace" title="New workspace" onClick={addWorkspace} className="flex h-7 w-7 items-center justify-center rounded-full text-text-3 hover:bg-bg-3 hover:text-text-1">
                <Plus size={14} />
              </button>
            )}
          </div>
        )}
        <div className={cx('flex items-center gap-2', rail ? 'flex-col' : 'pl-2')}>
          {s.isPrivate ? (
            !rail && <span className="flex-1 text-[12px] leading-4 text-private">Memory off in Private window</span>
          ) : (
            <button
              onClick={() => openInternal('memory')}
              title={memoryLine.text}
              className={cx('flex min-w-0 items-center gap-1.5 rounded-[6px] text-[12px] leading-4 text-text-2 hover:text-text-1', !rail && 'flex-1')}
            >
              <span className={memoryLine.cls}>{memoryLine.icon}</span>
              {!rail && <span className="truncate">{memoryLine.text}</span>}
            </button>
          )}
          <button aria-label="Settings" title="Settings (⌘,)" onClick={() => openInternal('settings')} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-text-2 hover:bg-bg-3 hover:text-text-1">
            <Settings size={16} strokeWidth={1.5} />
          </button>
        </div>
        {!rail && s.showRam === 'always' && <div className="tnum pt-1 pl-2 text-[12px] leading-4 text-text-3">RAM 1.4 of {(s.ramLimit / 1024).toFixed(1)} GB</div>}
      </div>

      {!rail && !overlay && <div onPointerDown={startResize} className="absolute top-0 -right-[3px] z-10 h-full w-[6px] cursor-col-resize hover:bg-accent/30" aria-hidden />}

      {menu && menuTab && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null) }} />
          <div role="menu" className="sb-in absolute left-2 z-50 w-[220px] rounded-[8px] border border-line-strong bg-bg-2 py-1 shadow-overlay" style={{ top: Math.min(menu.y, 560) }}>
            {[
              { l: 'Reload', a: () => updateTabs((ts) => ts.map((x) => (x.id === menuTab.id ? { ...x, loading: true } : x))) },
              { l: menuTab.pinned ? 'Unpin' : 'Pin', a: () => updateTabs((ts) => ts.map((x) => (x.id === menuTab.id ? { ...x, pinned: !x.pinned } : x))) },
              { l: 'Duplicate', a: () => openTab(menuTab.kind, menuTab.title, menuTab.url, true) },
              {
                l: 'Suspend now',
                a: () => updateTabs((ts) => ts.map((x) => (x.id === menuTab.id ? { ...x, suspended: true, suspendReason: 'Suspended by you.' } : x))),
                disabled: menuTab.id === activeTab?.id || menuTab.audible,
                reason: menuTab.id === activeTab?.id ? "The tab you're viewing can't be suspended" : 'Playing audio',
              },
              { l: 'Copy link', a: () => showStatus('Link copied') },
              { l: "Don't capture this site", a: () => showStatus(`Won't capture ${hostOf(menuTab.url)}`) },
              { l: 'Close', a: () => closeTab(menuTab.id) },
            ].map((it) => (
              <button
                key={it.l}
                role="menuitem"
                disabled={it.disabled}
                title={it.disabled ? it.reason : undefined}
                onClick={() => {
                  it.a()
                  setMenu(null)
                }}
                className="flex h-7 w-full items-center px-3 text-left text-text-1 hover:bg-bg-3 disabled:text-text-3 disabled:hover:bg-transparent"
              >
                {it.l}
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  )
}
