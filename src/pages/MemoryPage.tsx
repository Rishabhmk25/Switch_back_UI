import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ExternalLink, LayoutGrid, List, Network, Search, Trash2, X } from 'lucide-react'
import { useStore } from '../state'
import type { MemoryItem } from '../mock/data'
import { Button, cx, LetterTile, Pill } from '../components/ui'
import { Dialog } from '../components/Dialog'
import SmoothTab, { type SwipeTabItem } from '../components/kokonutui/smooth-tab'
import UndoButton from '../components/kokonutui/undo-button'
import HoldButton from '../components/kokonutui/hold-button'
import { effectiveMotion } from '../lib/motion'
import { collapseRows, enterList } from '../lib/choreo'

type ConfirmState = { title: string; body: string; ids: string[] } | null
type View = 'Timeline' | 'Sessions' | 'Graph'

const viewTabs: SwipeTabItem[] = [
  { id: 'Timeline', title: 'Timeline', icon: List },
  { id: 'Sessions', title: 'Sessions', icon: LayoutGrid },
  { id: 'Graph', title: 'Graph', icon: Network },
]

export function MemoryPage() {
  const { s, navigate, forgetMemory, set, showStatus } = useStore()
  const [view, setView] = useState<View>('Timeline')
  const [q, setQ] = useState('')
  const [selId, setSelId] = useState<string | null>(s.memory[0]?.id ?? null)
  const [multi, setMulti] = useState<string[]>([])
  const [forgetMenu, setForgetMenu] = useState<'header' | 'drawer' | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [everything, setEverything] = useState(false)
  const [typed, setTyped] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const level = effectiveMotion(s.motion)
  const listRef = useRef<HTMLDivElement>(null)
  const collapsing = useRef(new Set<string>())
  const pendingRef = useRef<string | null>(null)
  pendingRef.current = pendingId
  const tabs = useMemo(() => (s.graph === 'Off' ? viewTabs.slice(0, 2) : viewTabs), [s.graph])

  const items = useMemo(() => s.memory.filter((m) => !q || (m.title + m.host + m.snippet).toLowerCase().includes(q.toLowerCase())), [s.memory, q])
  const groups = (['Today', 'Yesterday', 'Earlier this week'] as const).map((d) => ({ day: d, items: items.filter((m) => m.day === d) })).filter((g) => g.items.length)
  const sel = s.memory.find((m) => m.id === selId) ?? null

  const rowsFor = (ids: string[]) => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-mem-id]') ?? []).filter((el) => ids.includes(el.dataset.memId ?? ''))
  const neighbourOf = (id: string) => {
    const idx = items.findIndex((x) => x.id === id)
    return items[idx + 1]?.id ?? items[idx - 1]?.id ?? null
  }
  /** Plays the Motion collapse; resolves to the ids that weren't already leaving. */
  const collapse = async (ids: string[]) => {
    const fresh = ids.filter((id) => !collapsing.current.has(id))
    fresh.forEach((id) => collapsing.current.add(id))
    await collapseRows(rowsFor(fresh), level)
    fresh.forEach((id) => collapsing.current.delete(id))
    return fresh
  }

  const forgetOne = async (m: MemoryItem) => {
    const next = neighbourOf(m.id)
    const ids = await collapse([m.id])
    if (!ids.length) return
    forgetMemory(ids)
    setSelId((cur) => (cur === m.id ? next : cur))
  }
  const askSite = (host: string) => {
    const ids = s.memory.filter((m) => m.host === host).map((m) => m.id)
    setConfirm({ title: `Forget ${ids.length} ${ids.length === 1 ? 'page' : 'pages'} from ${host}?`, body: 'Their text, search data and graph links are removed. This can’t be undone.', ids })
  }
  const askRange = (label: string, days: MemoryItem['day'][]) => {
    const ids = s.memory.filter((m) => days.includes(m.day)).map((m) => m.id)
    setConfirm({ title: `Forget ${ids.length} pages from ${label.toLowerCase()}?`, body: 'Their text, search data and graph links are removed. This can’t be undone.', ids })
  }
  const hardForget = async (all: string[]) => {
    setMulti([])
    const ids = await collapse(all)
    if (!ids.length) return
    set((p) => ({ memory: p.memory.filter((m) => !ids.includes(m.id)) }))
    showStatus(`Forgot ${ids.length} ${ids.length === 1 ? 'page' : 'pages'}.`)
    setSelId((cur) => (cur && ids.includes(cur) ? null : cur))
  }

  // Drawer "Forget page": Kokonut's UndoButton holds the forget for 5 s, then commits here.
  const commitPending = async (id: string) => {
    setPendingId(null)
    const next = neighbourOf(id)
    const ids = await collapse([id])
    if (!ids.length) return
    set((p) => ({ memory: p.memory.filter((m) => m.id !== id) }))
    showStatus('Forgot 1 page.')
    setSelId((cur) => (cur === id || cur === null ? next : cur))
  }
  // Moving on (another row, closing the drawer, another view) commits a pending forget right away.
  useEffect(() => {
    const id = pendingRef.current
    if (id && (id !== selId || view !== 'Timeline')) void commitPending(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, view])
  // Leaving Memory entirely: there's nothing left to animate, so just drop it.
  useEffect(
    () => () => {
      const id = pendingRef.current
      if (id) set((p) => ({ memory: p.memory.filter((m) => m.id !== id) }))
    },
    [set],
  )

  // Staggered entrance on open and on each view switch.
  useLayoutEffect(() => {
    enterList(Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-anim="item"]') ?? []), level)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Rows brought back by Undo rise back in.
  const known = useRef(new Set(s.memory.map((m) => m.id)))
  useLayoutEffect(() => {
    const now = new Set(s.memory.map((m) => m.id))
    const back = [...now].filter((id) => !known.current.has(id))
    known.current = now
    if (back.length) enterList(rowsFor(back), level)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.memory])

  return (
    <div className="relative flex h-full flex-col bg-bg-0">
      <header className="shrink-0 border-b border-line px-8 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-[20px] leading-[26px] font-semibold tracking-[-0.015em] text-text-1">Memory</h1>
          <div className="kk kk-tabs-only ml-6">
            <SmoothTab key={tabs.length} items={tabs} value={view} onChange={(id) => setView(id as View)} label="View" className="w-auto max-w-none gap-0" activeColor="bg-accent" activeTextColor="text-accent-fg" />
          </div>
          <label className="ml-auto flex h-7 w-[240px] items-center gap-2 rounded-[6px] border border-line-strong bg-bg-2 px-2.5 focus-within:border-accent">
            <Search size={14} className="text-text-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search memory…" className="flex-1 bg-transparent text-text-1 outline-none placeholder:text-text-3" />
          </label>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[12px] text-text-2">
          <span className="tnum">{s.memory.length.toLocaleString()} pages · 41 MB · capture {s.capture === 'paused' ? 'paused' : 'on'}</span>
          <Pill tone={s.mode === 'Local' ? 'ok' : 'warn'}>{s.mode}</Pill>
          <div className="relative ml-auto flex gap-2">
            {multi.length > 0 && (
              <Button size="sm" variant="danger" onClick={() => setConfirm({ title: `Forget ${multi.length} selected pages?`, body: 'Their text, search data and graph links are removed. This can’t be undone.', ids: multi })}>
                Forget selected ({multi.length})
              </Button>
            )}
            <Button size="sm" onClick={() => setForgetMenu(forgetMenu === 'header' ? null : 'header')}>
              Forget… <ChevronDown size={12} />
            </Button>
            {forgetMenu === 'header' && (
              <Menu onClose={() => setForgetMenu(null)} className="top-8 right-0">
                <MenuItem onClick={() => askRange('Today', ['Today'])}>Today</MenuItem>
                <MenuItem onClick={() => askRange('the last 7 days', ['Today', 'Yesterday', 'Earlier this week'])}>Last 7 days</MenuItem>
                <div className="my-1 h-px bg-line" />
                <MenuItem danger onClick={() => setEverything(true)}>Everything…</MenuItem>
              </Menu>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div ref={listRef} className="sb-scroll min-w-0 flex-1 overflow-y-auto px-6 py-4">
          {view === 'Timeline' && (
            <>
              {groups.length === 0 && <p className="py-16 text-center text-text-2">{q ? 'Nothing in your memory matches. Try fewer words.' : 'Your memory is empty. Pages you read will appear here once capture is on.'}</p>}
              {groups.map((g) => (
                <section key={g.day} className="mb-4">
                  <h2 data-anim="item" className="px-2 pb-1.5 text-[11px] font-medium tracking-[0.02em] text-text-3 uppercase">{g.day}</h2>
                  {g.items.map((m) => {
                    const active = m.id === selId
                    const checked = multi.includes(m.id)
                    const pending = m.id === pendingId
                    return (
                      <div
                        key={m.id}
                        data-mem-id={m.id}
                        data-anim="item"
                        tabIndex={0}
                        onClick={(e) => {
                          if (e.shiftKey || e.metaKey) setMulti((x) => (x.includes(m.id) ? x.filter((i) => i !== m.id) : [...x, m.id]))
                          else setSelId(m.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setSelId(m.id)
                          if (e.key === 'Delete' || e.key === 'Backspace') forgetOne(m)
                        }}
                        className={cx('group flex cursor-default gap-3 rounded-[8px] px-2 py-2 transition-opacity duration-200', active ? 'bg-accent-sub' : checked ? 'bg-bg-2' : 'hover:bg-bg-2', pending && 'opacity-45')}
                      >
                        <input type="checkbox" aria-label={`Select ${m.title}`} checked={checked} onClick={(e) => e.stopPropagation()} onChange={() => setMulti((x) => (x.includes(m.id) ? x.filter((i) => i !== m.id) : [...x, m.id]))} className={cx('mt-1 accent-[var(--accent)]', !checked && multi.length === 0 && 'opacity-0 group-hover:opacity-100')} />
                        <LetterTile host={m.host} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-3">
                            <span className={cx('truncate font-medium text-text-1', pending && 'line-through decoration-text-3')}>{m.title}</span>
                            <span className="truncate text-[12px] text-text-3">{m.host}</span>
                            <span className="tnum ml-auto shrink-0 text-[12px] text-text-3">{pending ? 'Forgetting…' : m.time}</span>
                          </div>
                          <p className="truncate text-[12px] leading-4 text-text-2">{m.snippet}</p>
                        </div>
                      </div>
                    )
                  })}
                </section>
              ))}
            </>
          )}
          {view === 'Sessions' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'huggingface.co · embeddings, nomic', span: 'Today 16:12 – 21:04', ids: ['m1', 'm3'] },
                { label: 'electronjs.org · security, sandbox', span: 'Today 18:40 · Mon 10:05', ids: ['m2', 'm8'] },
                { label: 'sqlite.org · fts5, clustering', span: 'Yesterday 11:48 – 19:02', ids: ['m5', 'm6'] },
                { label: 'github.com · chronicleos, ollama', span: 'Yesterday · Mon', ids: ['m4', 'm7'] },
              ].map((c) => {
                const pages = s.memory.filter((m) => c.ids.includes(m.id))
                if (!pages.length) return null
                return (
                  <div key={c.label} data-anim="item" className="rounded-[8px] border border-line bg-bg-1 p-4">
                    <div className="font-medium text-text-1">{c.label}</div>
                    <div className="tnum mt-0.5 text-[12px] text-text-3">{c.span} · {pages.length} pages</div>
                    <ul className="mt-3 space-y-1.5">
                      {pages.map((m) => (
                        <li key={m.id} data-mem-id={m.id} className="flex items-center gap-2 truncate text-text-2">
                          <LetterTile host={m.host} size={16} /> <span className="truncate">{m.title}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => showStatus(`Opened ${pages.length} tabs in a new workspace`)}>Open as tabs</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirm({ title: `Forget this session (${pages.length} pages)?`, body: 'Their text, search data and graph links are removed. This can’t be undone.', ids: pages.map((p) => p.id) })}>
                        Forget
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {view === 'Graph' && <p data-anim="item" className="py-16 text-center text-text-2">Graph view ({s.graph}) — visual placeholder.</p>}
        </div>

        {sel && view === 'Timeline' && (
          <aside className="sb-fade sb-scroll w-[360px] shrink-0 overflow-y-auto border-l border-line bg-bg-1 p-5">
            <div className="flex items-start gap-2">
              <h2 className="flex-1 text-[16px] leading-[22px] font-semibold tracking-[-0.01em] text-text-1">{sel.title}</h2>
              <button aria-label="Close preview" onClick={() => setSelId(null)} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-text-2 hover:bg-bg-3">
                <X size={14} />
              </button>
            </div>
            <p className="mt-1 text-[12px] text-text-2">
              {sel.host} · {sel.day} {sel.time}
            </p>
            <dl className="tnum mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-4 text-[12px]">
              <dt className="text-text-3">Stored</dt>
              <dd className="text-text-1">{sel.words.toLocaleString()} words · {sel.chunks} chunks</dd>
              <dt className="text-text-3">Captured</dt>
              <dd className="text-text-1">after {sel.dwell} s on page</dd>
              <dt className="text-text-3">Why</dt>
              <dd className="text-text-1">{sel.rule}</dd>
            </dl>
            <blockquote className="mt-4 rounded-[8px] border border-line bg-bg-2 p-3 text-text-2">“{sel.snippet}”</blockquote>
            <div className="mt-5 flex items-center gap-2">
              <Button variant="primary" onClick={() => navigate(sel.url, sel.title)}>
                <ExternalLink size={14} /> Open
              </Button>
              <span className="kk">
                <UndoButton
                  key={sel.id}
                  label="Forget page"
                  doneLabel="Forgetting"
                  icon={Trash2}
                  duration={5000}
                  resetAfter={null}
                  onAction={() => setPendingId(sel.id)}
                  onUndo={() => setPendingId(null)}
                  onCommit={() => void commitPending(sel.id)}
                  className="h-8 text-[13px]"
                />
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1 text-[12px] text-text-3">
              <span className="mr-1">Or forget</span>
              <Button size="sm" variant="ghost" onClick={() => askSite(sel.host)}>Everything from {sel.host}</Button>
              <Button size="sm" variant="ghost" onClick={() => askRange(sel.day, [sel.day])}>{sel.day}</Button>
            </div>
          </aside>
        )}
      </div>

      {confirm && (
        <Dialog
          title={confirm.title}
          onClose={() => setConfirm(null)}
          actions={
            <>
              <Button data-cancel onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => { hardForget(confirm.ids); setConfirm(null) }}>
                Forget {confirm.ids.length} {confirm.ids.length === 1 ? 'page' : 'pages'}
              </Button>
            </>
          }
        >
          <p>{confirm.body}</p>
          <p className="mt-3 text-[12px] text-text-3">Solid-state drives may keep deleted bits until they’re overwritten. With encryption on, erasing the key makes the data unreadable.</p>
        </Dialog>
      )}
      {everything && (
        <Dialog
          title={`Forget everything (${s.memory.length} pages)?`}
          onClose={() => { setEverything(false); setTyped('') }}
          actions={
            <>
              <Button data-cancel onClick={() => { setEverything(false); setTyped('') }}>Cancel</Button>
              <span className="kk">
                <HoldButton
                  variant="red"
                  disabled={typed !== 'forget everything'}
                  holdDuration={1200}
                  holdingLabel="Keep holding…"
                  completeLabel="Forgotten"
                  resetAfter={0}
                  onHoldComplete={() => {
                    const ids = s.memory.map((m) => m.id)
                    // Let the drawn check land before the dialog closes.
                    window.setTimeout(() => {
                      setEverything(false)
                      setTyped('')
                      void hardForget(ids)
                    }, level === 'Off' ? 0 : 420)
                  }}
                  className="h-8 min-w-48 rounded-[6px] text-[13px]"
                >
                  Hold to forget {s.memory.length} pages
                </HoldButton>
              </span>
            </>
          }
        >
          <p>All remembered text, search data and graph links are removed. This can’t be undone.</p>
          <label className="mt-4 block text-[12px] text-text-2">
            Type <span className="font-mono text-text-1">forget everything</span>, then press and hold the button
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1.5 h-8 w-full rounded-[6px] border border-line-strong bg-bg-1 px-2.5 text-text-1 outline-none focus:border-accent" />
          </label>
          <p className="mt-3 text-[12px] text-text-3">Solid-state drives may keep deleted bits until they’re overwritten. With encryption on, erasing the key makes the data unreadable.</p>
        </Dialog>
      )}
    </div>
  )
}

function Menu({ children, onClose, className }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div role="menu" onClick={onClose} className={cx('sb-in absolute z-50 w-[220px] rounded-[8px] border border-line-strong bg-bg-2 p-1 shadow-overlay', className)}>
        {children}
      </div>
    </>
  )
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={cx('flex h-7 w-full items-center truncate rounded-[6px] px-2.5 text-left hover:bg-bg-3', danger ? 'text-err' : 'text-text-1')}>
      {children}
    </button>
  )
}
