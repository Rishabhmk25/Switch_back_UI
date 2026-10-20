import { useState, type ReactNode } from 'react'
import { Check, Cloud, Search } from 'lucide-react'
import { accentThemes, useStore, type AccentTheme, type Motion, type Profile, type SidebarMode, type Theme } from '../state'
import { Button, cx, MockTag, Pill, Segmented, Toggle } from '../components/ui'
import SwitchButton from '../components/kokonutui/switch-button'
import { BackgroundOptions } from '../components/NewTabBackground'

const sections = ['General', 'Appearance', 'Workspaces', 'Memory', 'Providers', 'Privacy', 'Performance', 'Advanced', 'About'] as const
type Section = (typeof sections)[number]

function Row({ label, desc, children, cloud }: { label: string; desc?: ReactNode; children: ReactNode; cloud?: boolean }) {
  return (
    <div className="flex items-start gap-6 border-b border-line py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-medium text-text-1">
          {label}
          {cloud && (
            <Pill tone="warn">
              <Cloud size={12} /> Cloud
            </Pill>
          )}
        </div>
        {desc && <div className="mt-0.5 text-[12px] leading-4 text-text-2">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="mb-1 text-[11px] font-medium tracking-[0.02em] text-text-3 uppercase">{title}</h3>
      <div className="rounded-[8px] border border-line bg-bg-1 px-4">{children}</div>
    </section>
  )
}

function Select<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)} className="h-7 rounded-[6px] border border-line-strong bg-bg-2 px-2 text-text-1 outline-none focus:border-accent">
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  )
}

const profileMb: Record<Exclude<Profile, 'Custom'>, number> = { Saver: 1024, Balanced: 2048, Performance: 4096 }

// Fixed palettes for the miniature previews, so each card shows its own mode regardless of the current one.
const previewPalette: Record<Theme, { bg: string; side: string; bar: string; line: string }> = {
  dark: { bg: '#0c0d0f', side: '#121417', bar: '#1f2328', line: '#343a42' },
  light: { bg: '#fafaf8', side: '#f2f2ef', bar: '#e3e3de', line: '#c6c6bf' },
}

function MiniWindow({ mode, accent }: { mode: Theme; accent: AccentTheme }) {
  const a = accentThemes.find((x) => x.id === accent)!
  // Same accent tint as the real tokens in index.css, applied to the preview's fixed palette.
  const k = mode === 'dark' ? 1 : 0.8
  const tint = (c: string, pct: number) => `color-mix(in oklab, ${c}, ${a[mode]} ${pct * k}%)`
  const n = previewPalette[mode]
  const p = { bg: tint(n.bg, 4), side: tint(n.side, 5), bar: tint(n.bar, 8), line: tint(n.line, 10) }
  return (
    <div className="absolute inset-0 flex" style={{ background: p.bg }}>
      <div className="flex w-[30%] flex-col gap-1.5 px-2 pt-3" style={{ background: p.side, borderRight: `1px solid ${p.bar}` }}>
        <span className="h-1.5 w-full rounded-full" style={{ background: a[mode] }} />
        <span className="h-1.5 w-4/5 rounded-full" style={{ background: p.line }} />
        <span className="h-1.5 w-3/5 rounded-full" style={{ background: p.line }} />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-3 border-b" style={{ borderColor: p.bar }} />
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-3">
          <span className="h-2 w-3/5 rounded-full" style={{ background: p.line }} />
          <span className="h-3 w-full rounded-[4px] border" style={{ borderColor: a[mode], background: p.side }} />
        </div>
      </div>
    </div>
  )
}

function ModeCard({ label, selected, onSelect, children }: { label: string; selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button role="radio" aria-checked={selected} onClick={onSelect} className="group flex flex-col gap-2 text-left">
      <span className={cx('relative block h-[84px] w-full overflow-hidden rounded-[8px] border transition-shadow', selected ? 'border-accent shadow-[0_0_0_1px_var(--accent)]' : 'border-line-strong group-hover:border-text-3')}>{children}</span>
      <span className={cx('flex items-center gap-1.5 text-[12px] font-medium', selected ? 'text-text-1' : 'text-text-2')}>
        {selected && <Check size={12} className="text-accent" />}
        {label}
      </span>
    </button>
  )
}

export function SettingsPage() {
  const { s, set, showStatus } = useStore()
  const [section, setSection] = useState<Section>('Appearance')
  const [filter, setFilter] = useState('')
  const [systemTheme, setSystemTheme] = useState(false)
  const [hc, setHc] = useState(false)
  const save = (patch: Parameters<typeof set>[0]) => {
    set(patch)
    showStatus('Saved')
  }
  const visible = sections.filter((x) => x.toLowerCase().includes(filter.toLowerCase()))
  const sidebarLabel: Record<SidebarMode, string> = { expanded: 'Expanded', rail: 'Rail', hidden: 'Hidden' }

  return (
    <div className="flex h-full bg-bg-0">
      <nav className="w-[220px] shrink-0 border-r border-line px-3 py-6">
        <h1 className="px-2 text-[20px] leading-[26px] font-semibold tracking-[-0.015em] text-text-1">Settings</h1>
        <label className="mt-4 flex h-7 items-center gap-2 rounded-[6px] border border-line-strong bg-bg-2 px-2.5 focus-within:border-accent">
          <Search size={14} className="text-text-3" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search settings" className="min-w-0 flex-1 bg-transparent text-text-1 outline-none placeholder:text-text-3" />
        </label>
        <ul className="mt-3 space-y-0.5">
          {visible.map((x) => (
            <li key={x}>
              <button onClick={() => setSection(x)} className={cx('flex h-8 w-full items-center rounded-[6px] px-2.5 text-left', section === x ? 'bg-bg-3 font-medium text-text-1' : 'text-text-2 hover:bg-bg-2 hover:text-text-1')}>
                {x}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sb-scroll min-w-0 flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-[720px]">
          <h2 className="mb-6 text-[20px] leading-[26px] font-semibold tracking-[-0.015em] text-text-1">{section}</h2>

          {section === 'Appearance' && (
            <>
              <Group title="Theme">
                <div className="border-b border-line py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-text-1">Mode</div>
                      <div className="mt-0.5 text-[12px] leading-4 text-text-2">Dark is the default. System follows your computer.</div>
                    </div>
                    {/* Store-controlled: the switch never touches <html> itself. */}
                    <span className="kk">
                      <SwitchButton
                        size="sm"
                        showLabel
                        theme={s.theme}
                        reveal={s.motion === 'Full'}
                        onThemeChange={(t) => {
                          setSystemTheme(false)
                          save({ theme: t })
                        }}
                      />
                    </span>
                  </div>
                  <div role="radiogroup" aria-label="Mode" className="mt-3 grid grid-cols-3 gap-3">
                    {(['System', 'Dark', 'Light'] as const).map((v) => {
                      const selected = v === 'System' ? systemTheme : !systemTheme && s.theme === v.toLowerCase()
                      return (
                        <ModeCard
                          key={v}
                          label={v}
                          selected={selected}
                          onSelect={() => {
                            setSystemTheme(v === 'System')
                            save({ theme: v === 'Light' ? 'light' : v === 'Dark' ? 'dark' : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark' })
                          }}
                        >
                          {v === 'System' ? (
                            <>
                              <MiniWindow mode="light" accent={s.accent} />
                              <span className="absolute inset-0" style={{ clipPath: 'polygon(55% 0, 100% 0, 100% 100%, 45% 100%)' }}>
                                <MiniWindow mode="dark" accent={s.accent} />
                              </span>
                            </>
                          ) : (
                            <MiniWindow mode={v === 'Dark' ? 'dark' : 'light'} accent={s.accent} />
                          )}
                        </ModeCard>
                      )
                    })}
                  </div>
                </div>
                <div className="border-b border-line py-4">
                  <div className="font-medium text-text-1">Color theme</div>
                  <div className="mt-0.5 text-[12px] leading-4 text-text-2">Sets the accent for buttons, focus and highlights. Private windows keep their violet.</div>
                  <div role="radiogroup" aria-label="Color theme" className="mt-3 flex flex-wrap gap-2">
                    {accentThemes.map((a) => {
                      const selected = s.accent === a.id
                      return (
                        <button
                          key={a.id}
                          role="radio"
                          aria-checked={selected}
                          onClick={() => save({ accent: a.id })}
                          className={cx('flex h-8 items-center gap-2 rounded-[8px] border pr-3 pl-2 text-[12px] font-medium transition-colors', selected ? 'border-accent bg-accent-sub text-text-1' : 'border-line-strong text-text-2 hover:border-text-3 hover:text-text-1')}
                        >
                          <span className="grid h-4 w-4 place-items-center rounded-full" style={{ background: s.theme === 'dark' ? a.dark : a.light }}>
                            {selected && <Check size={10} strokeWidth={3} className="text-accent-fg" />}
                          </span>
                          {a.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="border-b border-line py-4">
                  <div className="font-medium text-text-1">New Tab background</div>
                  <div className="mt-0.5 text-[12px] leading-4 text-text-2">
                    {s.motion === 'Full' ? 'Flow, Dots, Paths and Contours drift slowly. Calm or Off holds them still.' : `Motion is ${s.motion}, so every background holds a still frame.`}
                  </div>
                  <div className="mt-3 max-w-[480px]">
                    <BackgroundOptions value={s.newTabBg} onChange={(v) => save({ newTabBg: v })} />
                  </div>
                </div>
                <Row label="High contrast" desc="Stronger borders and text. (Visual only in this prototype.)">
                  <Toggle label="High contrast" checked={hc} onChange={(v) => { setHc(v); showStatus('Saved') }} />
                </Row>
              </Group>
              <Group title="Motion">
                <Row label="Motion" desc={s.motion === 'Full' ? 'All transitions play.' : s.motion === 'Calm' ? 'Fewer, shorter transitions. Nothing moves on its own.' : 'No animation.'}>
                  <Segmented<Motion> label="Motion" value={s.motion} options={['Full', 'Calm', 'Off']} onChange={(v) => save({ motion: v })} />
                </Row>
              </Group>
              <Group title="Sidebar">
                <Row label="Sidebar default mode" desc="⌘B cycles Expanded, Rail and Hidden.">
                  <Segmented label="Sidebar" value={sidebarLabel[s.sidebarMode]} options={['Expanded', 'Rail', 'Hidden'] as const} onChange={(v) => save({ sidebarMode: v.toLowerCase() as SidebarMode })} />
                </Row>
              </Group>
            </>
          )}

          {section === 'Performance' && (
            <>
              <Group title="RAM use">
                <Row
                  label="Profile"
                  desc={
                    s.profile === 'Custom'
                      ? 'Custom — set your own RAM limit.'
                      : `${s.profile} — Keeps Switchback around ${(profileMb[s.profile] / 1024).toFixed(1)} GB of RAM (this computer has 8 GB).`
                  }
                >
                  <Segmented<Profile> label="Profile" value={s.profile} options={['Saver', 'Balanced', 'Performance', 'Custom']} onChange={(v) => save(v === 'Custom' ? { profile: v } : { profile: v, ramLimit: profileMb[v] })} />
                </Row>
                <div className="border-b border-line py-4">
                  <div className="flex items-center gap-4">
                    <span className="w-[90px] font-medium text-text-1">RAM limit</span>
                    <input
                      type="range"
                      min={512}
                      max={6144}
                      step={128}
                      value={s.ramLimit}
                      disabled={s.profile !== 'Custom'}
                      onChange={(e) => set({ ramLimit: Number(e.target.value) })}
                      onPointerUp={() => showStatus('Saved')}
                      className="flex-1 accent-[var(--accent)] disabled:opacity-50"
                      aria-label="RAM limit"
                    />
                    <span className="tnum w-[80px] text-right font-mono text-[12px] text-text-1">{s.ramLimit.toLocaleString()} MB</span>
                  </div>
                  <p className="mt-2 text-[12px] text-text-2">About {Math.max(1, Math.round((s.ramLimit - 450) / 64))} simple pages can stay open at this limit. Heavy sites use more, so fewer.</p>
                  {s.profile !== 'Custom' && <p className="mt-1 text-[12px] text-text-3">Choose Custom to edit (minimum 512 MB).</p>}
                </div>
                <Row label="Show RAM in the sidebar">
                  <Select label="Show RAM" value={s.showRam} options={['always', 'when low', 'never'] as const} onChange={(v) => save({ showRam: v })} />
                </Row>
              </Group>
              <Group title="Tabs">
                <Row label="Suspend tabs after" desc="Suspended tabs reload when you open them.">
                  <Select label="Suspend after" value={s.suspendAfter} options={['5 minutes', '10 minutes', '20 minutes', '60 minutes', 'never']} onChange={(v) => save({ suspendAfter: v })} />
                </Row>
                <Row label="Don’t suspend pinned tabs" desc="Unless the computer is very low on RAM.">
                  <Toggle label="Don't suspend pinned tabs" checked={s.keepPinned} onChange={(v) => save({ keepPinned: v })} />
                </Row>
                <Row label="Sites that are never suspended">
                  <Button size="sm" onClick={() => showStatus('Opened keep-alive list')}>Manage…</Button>
                </Row>
              </Group>
              <Group title="Background work">
                <Row label="Pause indexing on battery">
                  <Toggle label="Pause on battery" checked={s.pauseOnBattery} onChange={(v) => save({ pauseOnBattery: v })} />
                </Row>
                <Row label="Search model" desc="Unloads after 2 minutes unused.">
                  <span className="font-mono text-[12px] text-text-2">nomic-embed-text v1.5</span>
                </Row>
                <Row label="Graph" desc="Off hides the Graph view in Memory.">
                  <Segmented label="Graph" value={s.graph} options={['Off', 'Light', 'Full'] as const} onChange={(v) => save({ graph: v })} />
                </Row>
              </Group>
              <p className="text-[12px] leading-4 text-text-2">Suspended tabs reload when you open them. Text you were typing isn’t kept, so Switchback never suspends a tab with unsaved text, audio, a call or a download.</p>
            </>
          )}

          {section === 'Providers' && (
            <Group title="Mode">
              <Row label="Mode" desc={s.mode === 'Local' ? 'Search and answers stay on this computer.' : 'Search data and questions may be sent to the providers you choose.'} cloud={s.mode === 'Cloud'}>
                <Segmented label="Mode" value={s.mode} options={['Local', 'Cloud'] as const} onChange={(v) => save({ mode: v, cloudConsent: s.cloudConsent || v === 'Cloud' })} />
              </Row>
            </Group>
          )}

          {section !== 'Appearance' && section !== 'Performance' && section !== 'Providers' && (
            <div className="flex items-center gap-3 rounded-[8px] border border-dashed border-line-strong p-6 text-text-2">
              <MockTag />
              The {section} section isn’t part of this prototype yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
