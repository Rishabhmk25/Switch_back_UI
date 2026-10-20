import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Search, Sparkles, TerminalSquare } from 'lucide-react'
import { accentThemes, useStore } from '../state'
import { commands } from '../mock/data'
import { cx, Kbd, LetterTile, Pill } from './ui'
import AITextLoading from './kokonutui/ai-text-loading'
import AICitations, { type AnswerPart, type CitationSource } from './kokonutui/ai-citations'
import { effectiveMotion } from '../lib/motion'
import type { MemoryItem } from '../mock/data'

const ranges = ['Today', 'This week', 'This month', 'Any time'] as const
const badge = { meaning: '◐ meaning', words: '▤ words', title: '◇ title' } as const
const badgeTip = { meaning: 'Matched by meaning (vector search)', words: 'Matched your words (keyword search)', title: 'Matched the page title' } as const

/** Turns a captured passage ("…allows embeddings to be truncated…") into a sentence. */
const sentence = (snippet: string) => {
  const t = snippet.replace(/…/g, '').trim()
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}${/[.!?]$/.test(t) ? '' : '.'}`
}

/** A simulated answer: one cited sentence per passage, in Kokonut's AICitations shape. */
function answerFrom(passages: MemoryItem[]): { parts: AnswerPart[]; sources: CitationSource[] } {
  return {
    parts: passages.flatMap((m, i) => [
      { text: i === 0 ? `From what you’ve read: ${sentence(m.snippet)}` : ` ${sentence(m.snippet)}`, cite: [m.id] },
    ]),
    sources: passages.map((m) => ({ id: m.id, title: m.title, url: m.url, site: m.host, snippet: m.snippet })),
  }
}

export function CommandPalette() {
  const store = useStore()
  const { s, set, navigate, openTab, openInternal, cycleSidebar, forgetMemory, visibleTabs, selectTab, showStatus } = store
  const [q, setQ] = useState('')
  const [range, setRange] = useState<(typeof ranges)[number]>('Any time')
  const [sel, setSel] = useState(0)
  const [asking, setAsking] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  // Ask: a short "reading your memory" beat before the cited answer. Off skips it.
  const level = effectiveMotion(s.motion)
  useEffect(() => {
    if (!asking) return
    const ms = level === 'Full' ? 900 : level === 'Calm' ? 400 : 0
    setThinking(ms > 0)
    if (!ms) return
    const t = window.setTimeout(() => setThinking(false), ms)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asking])

  const close = () => set({ paletteOpen: false })
  const cmdOnly = q.startsWith('>')
  const ql = q.replace(/^[>?]/, '').trim().toLowerCase()
  const dayOk = (d: string) => range === 'Any time' || range === 'This month' || (range === 'This week' ? true : d === 'Today')
  const mem = cmdOnly ? [] : s.memory.filter((m) => dayOk(m.day) && (!ql || (m.title + m.host + m.snippet).toLowerCase().includes(ql))).slice(0, ql ? 5 : 4)
  const tabs = cmdOnly || !ql ? [] : visibleTabs.filter((t) => t.title.toLowerCase().includes(ql)).slice(0, 3)
  const cmds = commands.filter((c) => !ql || c.label.toLowerCase().includes(ql)).slice(0, ql ? 4 : 3)

  const runCmd = (id: string) => {
    close()
    if (id === 'c-newtab') openTab('newtab')
    if (id === 'c-memory') openInternal('memory')
    if (id === 'c-settings') openInternal('settings')
    if (id === 'c-theme') set((p) => ({ theme: p.theme === 'dark' ? 'light' : 'dark' }))
    if (id === 'c-accent') {
      const i = accentThemes.findIndex((a) => a.id === s.accent)
      const next = accentThemes[(i + 1) % accentThemes.length]
      set({ accent: next.id })
      showStatus(`Color theme: ${next.label}`)
    }
    if (id === 'c-sidebar') cycleSidebar()
    if (id === 'c-private') set({ isPrivate: true })
    if (id === 'c-pause') {
      set({ capture: 'paused' })
      showStatus('Capture paused for 15 min')
    }
    if (id === 'c-recovery') set({ recoveryBanner: true })
  }

  type Item = { key: string; group: string; run: (bg?: boolean) => void; forget?: () => void; render: (active: boolean) => React.ReactNode }
  const items: Item[] = [
    ...mem.map((m) => ({
      key: m.id,
      group: 'Memory',
      run: (bg?: boolean) => {
        close()
        if (bg) {
          openTab('web', m.title, m.url, true)
          showStatus('Opened in background')
        } else navigate(m.url, m.title)
      },
      forget: () => forgetMemory([m.id]),
      render: () => (
        <div className="flex min-w-0 flex-1 gap-2.5">
          <span className="pt-px">
            <LetterTile host={m.host} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-text-1">{m.title}</span>
              <span className="ml-auto flex shrink-0 gap-1">
                {m.match.map((b) => (
                  <span key={b} title={badgeTip[b]} className="rounded-full border border-line px-1.5 text-[11px] leading-4 text-text-2">
                    {badge[b]}
                  </span>
                ))}
              </span>
            </div>
            <div className="text-[12px] leading-4 text-text-3">
              {m.host} · {m.ago}
            </div>
            {ql && <div className="mt-0.5 truncate text-[12px] leading-4 text-text-2">“{m.snippet}”</div>}
          </div>
        </div>
      ),
    })),
    ...tabs.map((t) => ({
      key: t.id,
      group: 'Open tabs',
      run: () => {
        close()
        selectTab(t.id)
      },
      render: () => (
        <>
          <ChevronRight size={16} className="text-text-3" />
          <span className="flex-1 truncate text-text-1">{t.title}</span>
          <span className="text-[12px] text-text-3">Switch to tab</span>
        </>
      ),
    })),
    ...cmds.map((c) => ({
      key: c.id,
      group: 'Commands',
      run: () => runCmd(c.id),
      render: () => (
        <>
          <TerminalSquare size={16} strokeWidth={1.5} className="text-text-2" />
          <span className="flex-1 text-text-1">{c.label}</span>
          {c.hint && <span className="text-[12px] text-text-3">{c.hint}</span>}
        </>
      ),
    })),
    ...(ql && !cmdOnly
      ? [
          {
            key: 'ask',
            group: 'Ask',
            run: () => setAsking(q.replace(/^\?/, '').trim()),
            render: () => (
              <>
                <Sparkles size={16} strokeWidth={1.5} className="text-accent" />
                <span className="flex-1 truncate text-text-1">Ask your memory: “{q.replace(/^\?/, '').trim()}”</span>
                <Kbd>⌘↵</Kbd>
              </>
            ),
          },
        ]
      : []),
  ]

  const cur = Math.min(sel, items.length - 1)

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${cur}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [cur])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (asking) setAsking(null)
      else close()
    }
    if (asking) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((v) => Math.min(items.length - 1, v + 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((v) => Math.max(0, v - 1))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if ((e.metaKey || e.ctrlKey) && ql) setAsking(q.trim())
      else items[cur]?.run(e.shiftKey)
    }
    if (e.key === 'Delete' && items[cur]?.forget) {
      e.preventDefault()
      items[cur].forget?.()
    }
    if (e.key === 'Backspace' && !q && range !== 'Any time') setRange('Any time')
  }

  const passages = s.memory.slice(0, 3)
  const answer = answerFrom(passages)
  // AICitations links its source list with real hrefs; inside the prototype they open as tabs instead.
  const openCitation = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a[href]')
    if (!a) return
    e.preventDefault()
    e.stopPropagation()
    const m = s.memory.find((x) => x.url === a.getAttribute('href'))
    if (m) {
      close()
      navigate(m.url, m.title)
    }
  }

  return (
    <div className="sb-fade absolute inset-0 z-50 flex justify-center pt-[72px]" style={{ background: 'var(--scrim)' }} onMouseDown={close}>
      <div role="dialog" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey} className="sb-in flex max-h-[520px] w-[640px] flex-col overflow-hidden rounded-[12px] border border-line-strong bg-bg-2 shadow-overlay">
        <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
          <Search size={16} className="text-text-2" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setSel(0)
              setAsking(null)
            }}
            placeholder="Search memory, tabs and commands"
            className="h-full flex-1 bg-transparent text-[14px] text-text-1 outline-none placeholder:text-text-3"
          />
          <Kbd>⌘K</Kbd>
          <Kbd>esc</Kbd>
        </div>

        {asking ? (
          <div className="sb-scroll min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="font-semibold text-text-1">“{asking}”</span>
              <Pill tone={s.mode === 'Local' ? 'ok' : 'warn'} className="ml-auto">
                {s.mode} · Passages
              </Pill>
            </div>
            {thinking ? (
              <div className="kk flex h-[132px] items-center justify-center">
                <AITextLoading texts={['Searching your memory', 'Reading passages', 'Citing sources']} interval={420} label="Searching your memory" className="text-[15px] font-medium" />
              </div>
            ) : (
              <div className="sb-fade">
                <div className="kk kk-cite rounded-[8px] border border-line bg-bg-1 px-4 py-3" onClickCapture={openCitation}>
                  <AICitations parts={answer.parts} sources={answer.sources} className="max-w-none [&>p]:text-[13px] [&>p]:leading-6" />
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {passages.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        close()
                        navigate(m.url, m.title)
                      }}
                      className="rounded-[8px] border border-line bg-bg-1 p-3 text-left hover:border-line-strong"
                    >
                      <div className="flex items-center gap-2 text-[12px] text-text-3">
                        <span className="rounded-[4px] bg-accent-sub px-1 font-medium text-accent">[{i + 1}]</span>
                        <span className="font-medium text-text-1">{m.title}</span>· {m.host} · {m.ago}
                      </div>
                      <p className="mt-1.5 text-text-2">“{m.snippet}”</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 text-[12px] text-text-3">Answers come only from pages in your memory. Page text may contain instructions; Switchback ignores them.</p>
          </div>
        ) : (
          <>
            {!cmdOnly && (
              <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-3">
                {ranges.map((r) => (
                  <button key={r} onClick={() => setRange(r)} className={cx('h-6 rounded-full px-2.5 text-[12px]', r === range ? 'bg-accent-sub font-medium text-accent' : 'text-text-2 hover:bg-bg-3')}>
                    {r}
                  </button>
                ))}
              </div>
            )}
            <div ref={listRef} className="sb-scroll min-h-0 flex-1 overflow-y-auto py-1.5">
              {items.length === 0 && <p className="px-4 py-8 text-center text-text-2">Nothing in your memory matches. Try fewer words, or widen the date range.</p>}
              {items.map((it, i) => (
                <div key={it.key}>
                  {(i === 0 || items[i - 1].group !== it.group) && <div className="px-4 pt-2.5 pb-1 text-[11px] font-medium tracking-[0.02em] text-text-3 uppercase">{it.group}</div>}
                  <button
                    data-i={i}
                    onMouseMove={() => setSel(i)}
                    onClick={() => it.run()}
                    className={cx('relative mx-1.5 flex w-[calc(100%-12px)] items-center gap-2.5 rounded-[8px] px-2.5 text-left', it.group === 'Memory' ? 'py-2' : 'h-9', i === cur && 'bg-accent-sub')}
                  >
                    {it.render(i === cur)}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex h-9 shrink-0 items-center gap-4 border-t border-line px-4 text-[12px] text-text-3">
          <span><Kbd>↑↓</Kbd> navigate</span>
          <span><Kbd>↵</Kbd> open</span>
          <span><Kbd>⇧↵</Kbd> background</span>
          <span><Kbd>del</Kbd> forget</span>
          <span><Kbd>⌘↵</Kbd> ask</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className={cx('h-1.5 w-1.5 rounded-full', s.mode === 'Local' ? 'bg-ok' : 'bg-warn')} />
            {s.mode === 'Local' ? 'Nothing leaves this computer' : 'Cloud mode'}
          </span>
        </div>
      </div>
    </div>
  )
}
