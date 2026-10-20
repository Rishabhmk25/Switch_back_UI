import { useLayoutEffect, useRef, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { useStore } from '../state'
import { cx, LetterTile } from '../components/ui'
import CommandButton from '../components/kokonutui/command-button'
import { effectiveMotion } from '../lib/motion'
import { enterList } from '../lib/choreo'
import { BackgroundPicker, NewTabBackground } from '../components/NewTabBackground'

export function NewTab() {
  const { s, navigate, openInternal, set } = useStore()
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const level = effectiveMotion(s.motion)
  const recents = s.memory.slice(0, 3)

  // One staggered rise-in per new tab (Motion).
  useLayoutEffect(() => {
    enterList(Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-anim="item"]') ?? []), level)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = () => {
    const v = q.trim()
    if (!v) return
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v)) navigate(`https://${v}`, v)
    else navigate(`https://duckduckgo.com/?q=${encodeURIComponent(v)}`, `${v} at DuckDuckGo`)
  }
  return (
    <div className={cx('sb-ntbg relative isolate h-full overflow-hidden', s.isPrivate && 'is-private')}>
      <NewTabBackground kind={s.newTabBg} level={level} />
      <BackgroundPicker value={s.newTabBg} onChange={(v) => set({ newTabBg: v })} isPrivate={s.isPrivate} level={level} />
    <div ref={rootRef} className="sb-scroll flex h-full flex-col items-center overflow-y-auto px-8 pt-[140px]">
      <h1 data-anim="item" className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]" style={{ color: s.isPrivate ? 'var(--private)' : 'var(--text-1)' }}>
        {s.isPrivate ? 'Private window' : 'Switchback'}
      </h1>
      <form
        data-anim="item"
        className="mt-8 flex h-12 w-full max-w-[560px] items-center gap-3 rounded-[12px] border border-line-strong bg-bg-2 px-4 focus-within:border-accent"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Search size={16} className="text-text-2" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.isPrivate ? 'Search privately' : 'Search the web or your memory'} className="h-full flex-1 bg-transparent text-[14px] text-text-1 outline-none placeholder:text-text-3" />
      </form>

      {s.isPrivate ? (
        <p data-anim="item" className="mt-8 max-w-[480px] text-center text-text-2">Nothing from this window is saved to history or memory. Websites, your network and your employer can still see your activity.</p>
      ) : (
        <>
          <div data-anim="item" className="kk mt-4">
            {/* App owns ⌘K globally; the button only shows it, so it doesn't listen itself. */}
            <CommandButton global={false} shortcut="mod+k" onClick={() => set({ paletteOpen: true })} className="h-9 gap-2.5 rounded-[10px] text-[13px]">
              <Sparkles size={14} className="text-accent" />
              Ask your memory
            </CommandButton>
          </div>
          <section className="mt-10 w-full max-w-[640px]">
            <div data-anim="item" className="mb-2 flex items-baseline justify-between px-3">
              <h2 className="text-[13px] font-medium text-text-1">Jump back in</h2>
              <span className="text-[12px] text-text-3">from your memory</span>
            </div>
            {recents.length === 0 ? (
              <p data-anim="item" className="px-3 text-text-2">Your memory is empty. Pages you read will appear here once capture is on.</p>
            ) : (
              recents.map((m) => (
                <button key={m.id} data-anim="item" onClick={() => navigate(m.url, m.title)} className="flex h-10 w-full items-center gap-3 rounded-[8px] px-3 text-left hover:bg-bg-2">
                  <LetterTile host={m.host} />
                  <span className="min-w-0 flex-1 truncate text-text-1">{m.title}</span>
                  <span className="w-[160px] truncate text-text-2">{m.host}</span>
                  <span className="w-[90px] text-right text-[12px] text-text-3">{m.ago}</span>
                </button>
              ))
            )}
          </section>
          <button data-anim="item" onClick={() => openInternal('memory')} className="tnum mt-10 flex items-center gap-2 text-[12px] text-text-2 hover:text-text-1">
            <span className={s.mode === 'Local' ? 'text-ok' : 'text-warn'}>●</span>
            {s.mode} · 1,284 pages remembered · {s.capture === 'paused' ? 'capture paused' : 'indexing idle'}
          </button>
          {s.capture === 'paused' && (
            <button onClick={() => set({ capture: 'captured' })} className="mt-2 text-[12px] text-accent hover:underline">
              Resume capture
            </button>
          )}
        </>
      )}
    </div>
    </div>
  )
}
