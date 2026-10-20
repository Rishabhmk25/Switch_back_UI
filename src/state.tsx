import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { initialMemory, initialTabs, workspaces as initialWs, type MemoryItem, type PageKind, type Tab, type Workspace } from './mock/data'

export type SidebarMode = 'expanded' | 'rail' | 'hidden'
export type Theme = 'dark' | 'light'
export type AccentTheme = 'indigo' | 'teal' | 'green' | 'copper' | 'rose' | 'graphite'

/** Color themes shown in Settings → Appearance. Swatches mirror the tokens in index.css. */
export const accentThemes: { id: AccentTheme; label: string; dark: string; light: string }[] = [
  { id: 'indigo', label: 'Indigo', dark: '#8aa4ff', light: '#3f5bd9' },
  { id: 'teal', label: 'Teal', dark: '#5fd4c8', light: '#0f7c78' },
  { id: 'green', label: 'Fern', dark: '#7ccf8f', light: '#2a7a3e' },
  { id: 'copper', label: 'Copper', dark: '#f0a072', light: '#b04f24' },
  { id: 'rose', label: 'Rose', dark: '#f28db2', light: '#c2336b' },
  { id: 'graphite', label: 'Graphite', dark: '#c9ced6', light: '#3a3f47' },
]
export type ProviderMode = 'Local' | 'Cloud'
export type CaptureState = 'dwelling' | 'captured' | 'skipped' | 'paused'
export type Motion = 'Full' | 'Calm' | 'Off'
export type Profile = 'Saver' | 'Balanced' | 'Performance' | 'Custom'
export type NewTabBg = 'plain' | 'glow' | 'flow' | 'dots' | 'paths' | 'contours'

/** New Tab backgrounds shown in the New Tab picker and Settings → Appearance. */
export const newTabBackgrounds: { id: NewTabBg; label: string }[] = [
  { id: 'plain', label: 'Plain' },
  { id: 'glow', label: 'Glow' },
  { id: 'flow', label: 'Flow' },
  { id: 'dots', label: 'Dots' },
  { id: 'paths', label: 'Paths' },
  { id: 'contours', label: 'Contours' },
]

export interface Status {
  id: number
  text: string
  undo?: () => void
}

interface S {
  theme: Theme
  accent: AccentTheme
  newTabBg: NewTabBg
  sidebarMode: SidebarMode
  sidebarWidth: number
  workspaces: Workspace[]
  activeWs: string
  activeTabByWs: Record<string, string>
  tabs: Tab[]
  privateTabs: Tab[]
  privateActive: string
  isPrivate: boolean
  mode: ProviderMode
  cloudConsent: boolean
  paletteOpen: boolean
  recoveryBanner: boolean
  memory: MemoryItem[]
  capture: CaptureState
  status: Status | null
  motion: Motion
  profile: Profile
  ramLimit: number
  suspendAfter: string
  keepPinned: boolean
  pauseOnBattery: boolean
  graph: 'Off' | 'Light' | 'Full'
  showRam: 'always' | 'when low' | 'never'
}

const initial: S = {
  theme: 'dark',
  accent: 'indigo',
  newTabBg: 'glow',
  sidebarMode: 'expanded',
  sidebarWidth: 248,
  workspaces: initialWs,
  activeWs: 'ws-research',
  activeTabByWs: { 'ws-research': 't-1', 'ws-build': 't-b1', 'ws-personal': 't-c1' },
  tabs: initialTabs,
  privateTabs: [{ id: 'pv-1', wsId: 'private', kind: 'newtab', title: 'New tab', url: 'switchback://newtab' }],
  privateActive: 'pv-1',
  isPrivate: false,
  mode: 'Local',
  cloudConsent: false,
  paletteOpen: false,
  recoveryBanner: true,
  memory: initialMemory,
  capture: 'captured',
  status: null,
  motion: 'Full',
  profile: 'Balanced',
  ramLimit: 2048,
  suspendAfter: '20 minutes',
  keepPinned: true,
  pauseOnBattery: true,
  graph: 'Off',
  showRam: 'when low',
}

const pageMeta: Record<Exclude<PageKind, 'web'>, { title: string; url: string }> = {
  newtab: { title: 'New tab', url: 'switchback://newtab' },
  memory: { title: 'Memory', url: 'switchback://memory' },
  settings: { title: 'Settings', url: 'switchback://settings' },
}

let uid = 100

function useStoreImpl() {
  const [s, setS] = useState<S>(initial)
  const set = useCallback((patch: Partial<S> | ((s: S) => Partial<S>)) => {
    setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }, [])
  const statusTimer = useRef<number | undefined>(undefined)

  const visibleTabs = s.isPrivate ? s.privateTabs : s.tabs.filter((t) => t.wsId === s.activeWs)
  const activeTabId = s.isPrivate ? s.privateActive : s.activeTabByWs[s.activeWs]
  const activeTab = visibleTabs.find((t) => t.id === activeTabId) ?? visibleTabs[0]

  const showStatus = useCallback(
    (text: string, undo?: () => void, ms = undo ? 8000 : 2400) => {
      window.clearTimeout(statusTimer.current)
      const id = ++uid
      set({ status: { id, text, undo } })
      statusTimer.current = window.setTimeout(() => set((p) => (p.status?.id === id ? { status: null } : {})), ms)
    },
    [set],
  )

  const updateTabs = useCallback(
    (fn: (tabs: Tab[]) => Tab[]) =>
      set((p) => (p.isPrivate ? { privateTabs: fn(p.privateTabs) } : { tabs: fn(p.tabs) })),
    [set],
  )

  const selectTab = useCallback(
    (id: string) => {
      set((p) => {
        const list = p.isPrivate ? p.privateTabs : p.tabs
        const t = list.find((x) => x.id === id)
        const woke = t?.suspended
        const mapped = list.map((x) => (x.id === id && x.suspended ? { ...x, suspended: false, loading: true } : x))
        if (woke) {
          window.setTimeout(() => updateTabs((tabs) => tabs.map((x) => (x.id === id ? { ...x, loading: false } : x))), 900)
        }
        return p.isPrivate
          ? { privateActive: id, privateTabs: mapped }
          : { activeTabByWs: { ...p.activeTabByWs, [p.activeWs]: id }, tabs: mapped, capture: 'captured' }
      })
    },
    [set, updateTabs],
  )

  const openTab = useCallback(
    (kind: PageKind, title?: string, url?: string, background = false) => {
      const meta = kind === 'web' ? { title: title ?? url ?? '', url: url ?? '' } : pageMeta[kind]
      const id = `t-${++uid}`
      set((p) => {
        const tab: Tab = { id, wsId: p.isPrivate ? 'private' : p.activeWs, kind, ...meta, loading: kind === 'web' }
        if (p.isPrivate) return { privateTabs: [...p.privateTabs, tab], privateActive: background ? p.privateActive : id }
        return {
          tabs: [...p.tabs, tab],
          activeTabByWs: background ? p.activeTabByWs : { ...p.activeTabByWs, [p.activeWs]: id },
          capture: kind === 'web' ? 'dwelling' : p.capture,
        }
      })
      if (kind === 'web') {
        window.setTimeout(() => updateTabs((tabs) => tabs.map((x) => (x.id === id ? { ...x, loading: false } : x))), 800)
        window.setTimeout(() => set((p) => (p.capture === 'dwelling' ? { capture: 'captured' } : {})), 5000)
      }
      return id
    },
    [set, updateTabs],
  )

  /** Open an internal page, reusing an existing tab of that kind. */
  const openInternal = useCallback(
    (kind: 'memory' | 'settings') => {
      const existing = visibleTabs.find((t) => t.kind === kind)
      if (existing) selectTab(existing.id)
      else openTab(kind)
    },
    [visibleTabs, selectTab, openTab],
  )

  const navigate = useCallback(
    (url: string, title?: string) => {
      const id = activeTab?.id
      if (!id) return
      if (url.startsWith('switchback://')) {
        const kind = url.slice(13) as PageKind
        if (kind in pageMeta) {
          const m = pageMeta[kind as Exclude<PageKind, 'web'>]
          updateTabs((tabs) => tabs.map((t) => (t.id === id ? { ...t, kind, ...m, loading: false } : t)))
          return
        }
      }
      updateTabs((tabs) =>
        tabs.map((t) => (t.id === id ? { ...t, kind: 'web', url, title: title ?? url, loading: true, suspended: false } : t)),
      )
      set({ capture: 'dwelling' })
      window.setTimeout(() => updateTabs((tabs) => tabs.map((t) => (t.id === id ? { ...t, loading: false } : t))), 800)
      window.setTimeout(() => set((p) => (p.capture === 'dwelling' ? { capture: 'captured' } : {})), 5000)
    },
    [activeTab?.id, updateTabs, set],
  )

  const closeTab = useCallback(
    (id: string) => {
      set((p) => {
        const list = p.isPrivate ? p.privateTabs : p.tabs
        const ws = p.isPrivate ? 'private' : p.activeWs
        const inWs = list.filter((t) => t.wsId === ws)
        const idx = inWs.findIndex((t) => t.id === id)
        let next = list.filter((t) => t.id !== id)
        let nextActive = p.isPrivate ? p.privateActive : p.activeTabByWs[ws]
        if (nextActive === id) {
          const remaining = inWs.filter((t) => t.id !== id)
          nextActive = remaining[Math.min(idx, remaining.length - 1)]?.id
        }
        // Closing the last tab opens a new-tab page (§5.1).
        if (!next.some((t) => t.wsId === ws)) {
          const nt: Tab = { id: `t-${++uid}`, wsId: ws, kind: 'newtab', ...pageMeta.newtab }
          next = [...next, nt]
          nextActive = nt.id
        }
        return p.isPrivate
          ? { privateTabs: next, privateActive: nextActive }
          : { tabs: next, activeTabByWs: { ...p.activeTabByWs, [ws]: nextActive } }
      })
    },
    [set],
  )

  const forgetMemory = useCallback(
    (ids: string[]) => {
      let removed: MemoryItem[] = []
      set((p) => {
        removed = p.memory.filter((m) => ids.includes(m.id))
        return { memory: p.memory.filter((m) => !ids.includes(m.id)) }
      })
      const n = ids.length
      showStatus(`Forgot ${n} ${n === 1 ? 'page' : 'pages'}.`, () => {
        set((p) => ({ memory: [...p.memory, ...removed].sort((a, b) => initialMemory.findIndex((m) => m.id === a.id) - initialMemory.findIndex((m) => m.id === b.id)) }))
        showStatus('Restored.')
      })
    },
    [set, showStatus],
  )

  const cycleSidebar = useCallback(() => {
    set((p) => ({ sidebarMode: p.sidebarMode === 'expanded' ? 'rail' : p.sidebarMode === 'rail' ? 'hidden' : 'expanded' }))
  }, [set])

  const addWorkspace = useCallback(() => {
    set((p) => {
      if (p.workspaces.length >= 6) return {}
      const id = `ws-${++uid}`
      const names = ['Reading', 'Travel', 'Errands']
      const name = names[(p.workspaces.length - 3) % names.length] ?? 'Workspace'
      const hue = [1, 2, 4, 5][p.workspaces.length % 4]
      const tab: Tab = { id: `t-${++uid}`, wsId: id, kind: 'newtab', ...pageMeta.newtab }
      return {
        workspaces: [...p.workspaces, { id, name, hue }],
        tabs: [...p.tabs, tab],
        activeWs: id,
        activeTabByWs: { ...p.activeTabByWs, [id]: tab.id },
      }
    })
  }, [set])

  return {
    s,
    set,
    visibleTabs,
    activeTab,
    showStatus,
    updateTabs,
    selectTab,
    openTab,
    openInternal,
    navigate,
    closeTab,
    forgetMemory,
    cycleSidebar,
    addWorkspace,
  }
}

type Store = ReturnType<typeof useStoreImpl>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStoreImpl()
  const value = useMemo(() => store, [store])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore outside provider')
  return v
}
