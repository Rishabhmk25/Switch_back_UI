import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Cloud, Command, Eye, EyeOff, HardDrive, Lock, Minus, MoreHorizontal, Moon, PanelLeft, Pause, RotateCw, Search, Settings, Sun, Brain } from 'lucide-react'
import { useStore } from '../state'
import { hostOf, urlParts } from '../mock/data'
import { Button, cx, IconButton, Kbd, LetterTile, MockTag, Pill } from './ui'

function Omnibox() {
  const { s, activeTab, navigate, visibleTabs, selectTab, set } = useStore()
  const [editing, setEditing] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [footer, setFooter] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const url = activeTab?.kind === 'newtab' ? '' : (activeTab?.url ?? '')
  const parts = urlParts(url)
  const ql = q.trim().toLowerCase()
  const mem = s.isPrivate || !ql ? [] : s.memory.filter((m) => (m.title + m.host).toLowerCase().includes(ql)).slice(0, 3)
  const tabs = !ql ? [] : visibleTabs.filter((t) => (t.title + t.url).toLowerCase().includes(ql) && t.id !== activeTab?.id).slice(0, 2)
  type Row = { key: string; group: string; run: () => void; node: React.ReactNode }
  const rows: Row[] = [
    ...mem.map((m) => ({
      key: m.id,
      group: 'Memory',
      run: () => navigate(m.url, m.title),
      node: (
        <>
          <LetterTile host={m.host} />
          <span className="min-w-0 flex-1 truncate text-text-1">{m.title}</span>
          <span className="shrink-0 text-[12px] text-text-3">
            {m.host} · {m.ago}
          </span>
        </>
      ),
    })),
    ...tabs.map((t) => ({
      key: t.id,
      group: 'Open tabs',
      run: () => selectTab(t.id),
      node: (
        <>
          <LetterTile host={hostOf(t.url)} />
          <span className="min-w-0 flex-1 truncate text-text-1">{t.title}</span>
          <span className="shrink-0 text-[12px] text-text-3">{hostOf(t.url)}</span>
        </>
      ),
    })),
    ...(ql
      ? [
          {
            key: 'search',
            group: 'Search',
            run: () => {
              const v = q.trim()
              if (v.startsWith('http') || v.startsWith('switchback://')) navigate(v, hostOf(v))
              else if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v)) navigate(`https://${v}`, hostOf(`https://${v}`))
              else navigate(`https://duckduckgo.com/?q=${encodeURIComponent(v)}`, `${v} at DuckDuckGo`)
            },
            node: (
              <>
                <Search size={16} className="mx-0.5 shrink-0 text-text-2" />
                <span className="min-w-0 flex-1 truncate text-text-1">Search DuckDuckGo for “{q}”</span>
                <Kbd>↵</Kbd>
              </>
            ),
          },
        ]
      : []),
  ]

  const close = () => {
    setEditing(false)
    setQ('')
    inputRef.current?.blur()
  }

  return (
    <div className="relative min-w-0 flex-1">
      <div
        className={cx('relative flex h-8 items-center gap-2 overflow-hidden rounded-[8px] border bg-bg-2 px-2.5 transition-colors', editing ? 'border-accent' : 'border-line hover:border-line-strong')}
        onClick={() => inputRef.current?.focus()}
      >
        {s.isPrivate && !url ? (
          <EyeOff size={14} className="shrink-0 text-private" />
        ) : url.startsWith('switchback://') ? (
          <Brain size={14} className="shrink-0 text-accent" />
        ) : url ? (
          <Lock size={14} className="shrink-0 text-text-2" aria-label="Secure connection" />
        ) : (
          <Search size={14} className="shrink-0 text-text-3" />
        )}
        <input
          ref={inputRef}
          value={editing ? q : ''}
          onFocus={(e) => {
            setEditing(true)
            setQ(url)
            setSel(0)
            const el = e.target
            requestAnimationFrame(() => el.select())
          }}
          onBlur={() => window.setTimeout(close, 120)}
          onChange={(e) => {
            setQ(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close()
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel((v) => Math.min(rows.length - 1, v + 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel((v) => Math.max(0, v - 1))
            }
            if (e.key === 'Enter') {
              if ((e.metaKey || e.ctrlKey) && q && !s.isPrivate) set({ paletteOpen: true })
              else if (q && q !== url) (rows[sel] ?? rows[rows.length - 1])?.run()
              close()
            }
          }}
          aria-label="Address and search"
          placeholder={editing ? 'Search the web or your memory' : ''}
          className={cx('h-full min-w-0 flex-1 bg-transparent text-text-1 outline-none placeholder:text-text-3', !editing && 'absolute inset-0 opacity-0')}
        />
        {!editing && (
          <span className="pointer-events-none min-w-0 flex-1 truncate">
            {url ? (
              <>
                <span className="text-text-2">{parts.pre}</span>
                <span className="font-semibold text-text-1">{parts.domain}</span>
                <span className="text-text-2">{parts.post}</span>
              </>
            ) : (
              <span className="text-text-3">{s.isPrivate ? 'Search privately' : 'Search the web or your memory'}</span>
            )}
          </span>
        )}
        {activeTab?.loading && (
          <span className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden">
            <span className="sb-loadbar block h-full w-1/3 bg-accent" />
          </span>
        )}
      </div>

      {editing && ql && q !== url && (
        <div className="sb-in absolute top-[38px] right-0 left-0 z-50 overflow-hidden rounded-[12px] border border-line-strong bg-bg-2 py-1.5 shadow-overlay" onMouseDown={(e) => e.preventDefault()}>
          {rows.map((r, i) => (
            <div key={r.key}>
              {(i === 0 || rows[i - 1].group !== r.group) && <div className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-[0.02em] text-text-3 uppercase">{r.group}</div>}
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => {
                  r.run()
                  close()
                }}
                className={cx('mx-1.5 flex h-9 w-[calc(100%-12px)] items-center gap-2.5 rounded-[8px] px-2 text-left', i === sel && 'bg-accent-sub')}
              >
                {r.node}
              </button>
            </div>
          ))}
          {footer && (
            <div className="mt-1.5 flex items-center gap-2 border-t border-line px-3 pt-2 pb-1 text-[12px] text-text-3">
              <span className="flex-1">
                {s.isPrivate ? 'Suggestions come from this window’s tabs only.' : 'Suggestions come from your own memory only.'} <Kbd>⌘K</Kbd> for more.
              </span>
              <button className="text-text-2 hover:text-text-1" onClick={() => setFooter(false)}>
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const menuRow = 'flex h-7 items-center rounded-[6px] px-1.5 text-left text-text-2 hover:bg-bg-3 hover:text-text-1'

function CaptureRing() {
  const { s, set, activeTab, showStatus, forgetMemory } = useStore()
  const [open, setOpen] = useState(false)
  if (s.isPrivate || activeTab?.kind !== 'web') return <span className="w-7" />
  const st = s.capture
  const host = hostOf(activeTab.url)
  const icon = st === 'captured' ? <Check size={12} strokeWidth={2.5} className="text-ok" /> : st === 'paused' ? <Pause size={11} className="text-text-3" /> : st === 'skipped' ? <Minus size={12} className="text-text-3" /> : null
  return (
    <div className="relative">
      <button aria-label="What was captured?" title="What was captured?" onClick={() => setOpen((o) => !o)} className={cx('relative flex h-7 w-7 items-center justify-center rounded-[6px] hover:bg-bg-3', open && 'bg-bg-3')}>
        <svg width="18" height="18" viewBox="0 0 18 18" className="absolute">
          <circle cx="9" cy="9" r="7" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" />
          {(st === 'captured' || st === 'dwelling') && (
            <circle
              key={st + activeTab.id}
              cx="9"
              cy="9"
              r="7"
              fill="none"
              stroke={st === 'captured' ? 'var(--ok)' : 'var(--accent)'}
              strokeWidth="1.5"
              strokeDasharray="44"
              strokeDashoffset={st === 'captured' ? 0 : 44}
              transform="rotate(-90 9 9)"
              style={{ transition: st === 'dwelling' ? 'stroke-dashoffset 5s linear' : 'none' }}
              ref={(el) => {
                if (el && st === 'dwelling') requestAnimationFrame(() => requestAnimationFrame(() => el.setAttribute('stroke-dashoffset', '0')))
              }}
            />
          )}
        </svg>
        {icon}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="sb-in absolute top-9 right-0 z-50 w-[300px] rounded-[12px] border border-line-strong bg-bg-2 p-3.5 shadow-overlay">
            <div className="mb-1 text-[11px] font-medium tracking-[0.02em] text-text-3 uppercase">Capture · {host}</div>
            {st === 'captured' && (
              <>
                <p className="text-text-1">Remembered at 21:04 · 1,840 words</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      set({ capture: 'skipped' })
                      setOpen(false)
                      const m = s.memory.find((x) => x.url === activeTab.url)
                      if (m) forgetMemory([m.id])
                      else showStatus('Forgot 1 page.')
                    }}
                  >
                    Forget this page
                  </Button>
                </div>
              </>
            )}
            {st === 'dwelling' && (
              <>
                <p className="text-text-1">
                  Remembering this page in <strong>5 s</strong>.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => { set({ capture: 'skipped' }); setOpen(false) }}>
                    Don’t capture
                  </Button>
                </div>
              </>
            )}
            {st === 'skipped' && <p className="text-text-1">Skipped: you asked not to remember this page.</p>}
            {st === 'paused' && (
              <>
                <p className="text-text-1">Capture is paused.</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => { set({ capture: 'captured' }); showStatus('Capture resumed') }}>
                    Resume
                  </Button>
                </div>
              </>
            )}
            <div className="mt-3.5 flex flex-col gap-0.5 border-t border-line pt-2.5">
              {st !== 'paused' && (
                <button className={menuRow} onClick={() => { set({ capture: 'paused' }); setOpen(false); showStatus('Capture paused for 15 min') }}>
                  Pause capture · 15 min
                </button>
              )}
              <button className={menuRow} onClick={() => { setOpen(false); showStatus(`Paused on ${host}`) }}>
                Pause this site
              </button>
              <button className={menuRow} onClick={() => { set({ capture: 'skipped' }); setOpen(false); showStatus(`Won't capture ${host}`) }}>
                Never on this site
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ModeChip({ onCloud }: { onCloud: () => void }) {
  const { s, set, showStatus } = useStore()
  const [open, setOpen] = useState(false)
  const local = s.mode === 'Local'
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Provider mode: ${s.mode}`}
        className={cx('flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium tracking-[0.02em]', local ? 'bg-ok-sub text-ok' : 'bg-warn-sub text-warn')}
      >
        {local ? <HardDrive size={12} /> : <Cloud size={12} />}
        {s.mode}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="sb-in absolute top-9 right-0 z-50 w-[280px] rounded-[12px] border border-line-strong bg-bg-2 p-1.5 shadow-overlay">
            {(['Local', 'Cloud'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setOpen(false)
                  if (m === s.mode) return
                  if (m === 'Cloud' && !s.cloudConsent) onCloud()
                  else {
                    set({ mode: m })
                    showStatus(`Switched to ${m}`)
                  }
                }}
                className={cx('flex w-full items-start gap-2.5 rounded-[8px] p-2.5 text-left hover:bg-bg-3', m === s.mode && 'bg-accent-sub')}
              >
                <span className={cx('mt-0.5', m === 'Local' ? 'text-ok' : 'text-warn')}>{m === 'Local' ? <HardDrive size={14} /> : <Cloud size={14} />}</span>
                <span>
                  <span className="block font-medium text-text-1">{m}</span>
                  <span className="block text-[12px] leading-4 text-text-2">{m === 'Local' ? 'Search and answers stay on this computer.' : 'Search data and questions may be sent to the providers you choose.'}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function OverflowMenu() {
  const { s, set, cycleSidebar, openInternal, openTab } = useStore()
  const [open, setOpen] = useState(false)
  const items = [
    { l: 'New tab', k: '⌘T', i: null, a: () => openTab('newtab') },
    { l: s.isPrivate ? 'Close Private window' : 'New Private window', k: '⇧⌘N', i: s.isPrivate ? <Eye size={14} /> : <EyeOff size={14} />, a: () => set((p) => ({ isPrivate: !p.isPrivate })) },
    { l: s.theme === 'dark' ? 'Light theme' : 'Dark theme', k: '', i: s.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />, a: () => set((p) => ({ theme: p.theme === 'dark' ? 'light' : 'dark' })) },
    { l: `Sidebar: ${s.sidebarMode === 'expanded' ? 'Expanded' : s.sidebarMode === 'rail' ? 'Rail' : 'Hidden'}`, k: '⌘B', i: <PanelLeft size={14} />, a: cycleSidebar },
    ...(s.isPrivate ? [] : [{ l: 'Memory', k: '', i: <Brain size={14} />, a: () => openInternal('memory') }]),
    { l: 'Settings', k: '⌘,', i: <Settings size={14} />, a: () => openInternal('settings') },
    ...(s.isPrivate ? [] : [{ l: 'Show recovery banner', k: '', i: null, a: () => set({ recoveryBanner: true }), mock: true }]),
  ]
  return (
    <div className="relative">
      <IconButton label="More" active={open} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={16} />
      </IconButton>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className="sb-in absolute top-9 right-0 z-50 w-[248px] rounded-[12px] border border-line-strong bg-bg-2 p-1 shadow-overlay">
            {items.map((it) => (
              <button
                key={it.l}
                role="menuitem"
                onClick={() => {
                  it.a()
                  setOpen(false)
                }}
                className="flex h-8 w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left text-text-1 hover:bg-bg-3"
              >
                <span className="flex w-4 justify-center text-text-2">{it.i}</span>
                <span className="flex-1">{it.l}</span>
                {'mock' in it && it.mock && <MockTag />}
                {it.k && <span className="text-[12px] text-text-3">{it.k}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function TopBar({ onCloud }: { onCloud: () => void }) {
  const { s, set, activeTab, updateTabs, cycleSidebar } = useStore()
  return (
    <header className="relative z-30 flex h-11 shrink-0 items-center gap-1 border-b border-line bg-bg-1 px-2">
      {s.sidebarMode !== 'expanded' && (
        <IconButton label="Cycle sidebar (⌘B)" onClick={cycleSidebar}>
          <PanelLeft size={16} strokeWidth={1.5} />
        </IconButton>
      )}
      <IconButton label="Back" disabled={activeTab?.kind === 'newtab'}>
        <ArrowLeft size={16} strokeWidth={1.5} />
      </IconButton>
      <IconButton label="Forward" disabled>
        <ArrowRight size={16} strokeWidth={1.5} />
      </IconButton>
      <IconButton
        label="Reload"
        onClick={() => {
          const id = activeTab?.id
          updateTabs((ts) => ts.map((t) => (t.id === id ? { ...t, loading: true } : t)))
          window.setTimeout(() => updateTabs((ts) => ts.map((t) => (t.id === id ? { ...t, loading: false } : t))), 800)
        }}
      >
        <RotateCw size={15} strokeWidth={1.5} />
      </IconButton>
      <div className="mx-1.5 flex min-w-0 flex-1">
        <Omnibox />
      </div>
      <CaptureRing />
      {s.isPrivate ? (
        <Pill tone="private">
          <EyeOff size={12} /> Private
        </Pill>
      ) : (
        <ModeChip onCloud={onCloud} />
      )}
      {!s.isPrivate && (
        <button onClick={() => set({ paletteOpen: true })} className="ml-1 flex h-7 items-center gap-1 rounded-[6px] px-2 text-text-2 hover:bg-bg-3 hover:text-text-1" aria-label="Command palette" title="Search memory and commands">
          <Command size={13} />
          <span className="text-[12px] font-medium">K</span>
        </button>
      )}
      <OverflowMenu />
      {s.isPrivate && <span className="absolute right-0 -bottom-px left-0 h-[2px] bg-private" />}
    </header>
  )
}
