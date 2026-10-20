export type PageKind = 'web' | 'newtab' | 'memory' | 'settings'

export interface Workspace {
  id: string
  name: string
  hue: number // 1..5 chart token index
}

export interface Tab {
  id: string
  wsId: string
  kind: PageKind
  title: string
  url: string
  pinned?: boolean
  suspended?: boolean
  suspendReason?: string
  audible?: boolean
  muted?: boolean
  loading?: boolean
  crashed?: boolean
}

export interface MemoryItem {
  id: string
  title: string
  host: string
  url: string
  day: 'Today' | 'Yesterday' | 'Earlier this week'
  time: string
  ago: string
  snippet: string
  words: number
  chunks: number
  dwell: number
  rule: string
  match: ('meaning' | 'words' | 'title')[]
}

export const workspaces: Workspace[] = [
  { id: 'ws-research', name: 'Research', hue: 1 },
  { id: 'ws-build', name: 'Build', hue: 2 },
  { id: 'ws-personal', name: 'Personal', hue: 4 },
]

export const initialTabs: Tab[] = [
  { id: 't-p1', wsId: 'ws-research', kind: 'web', title: 'GitHub', url: 'https://github.com/Rishabhmk25', pinned: true },
  { id: 't-p2', wsId: 'ws-research', kind: 'web', title: 'Mail — Inbox', url: 'https://mail.proton.me/inbox', pinned: true },
  { id: 't-p3', wsId: 'ws-research', kind: 'web', title: 'Calendar', url: 'https://calendar.proton.me/week', pinned: true },
  { id: 't-1', wsId: 'ws-research', kind: 'web', title: 'Rishabhmk25/chronicleos', url: 'https://github.com/Rishabhmk25/chronicleos' },
  { id: 't-2', wsId: 'ws-research', kind: 'web', title: 'Nomic Embed Text v1.5 — model card', url: 'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5' },
  { id: 't-3', wsId: 'ws-research', kind: 'web', title: 'Electron security checklist', url: 'https://www.electronjs.org/docs/latest/tutorial/security' },
  { id: 't-4', wsId: 'ws-research', kind: 'web', title: 'Lo-fi beats to focus to', url: 'https://music.example.com/focus', audible: true },
  { id: 't-5', wsId: 'ws-research', kind: 'web', title: 'SQLite FTS5 extension', url: 'https://sqlite.org/fts5.html', suspended: true, suspendReason: 'Suspended after 20 minutes unused to save RAM.' },
  { id: 't-6', wsId: 'ws-research', kind: 'web', title: 'DBSCAN — scikit-learn docs', url: 'https://scikit-learn.org/stable/modules/clustering.html', suspended: true, suspendReason: 'Suspended because RAM use was above your 2.0 GB limit.' },
  { id: 't-b1', wsId: 'ws-build', kind: 'web', title: 'ChronicleOS dashboard', url: 'http://localhost:5173/dashboard' },
  { id: 't-b2', wsId: 'ws-build', kind: 'web', title: 'anime.js v4 documentation', url: 'https://animejs.com/documentation' },
  { id: 't-b3', wsId: 'ws-build', kind: 'web', title: 'WebContentsView | Electron', url: 'https://www.electronjs.org/docs/latest/api/web-contents-view' },
  { id: 't-c1', wsId: 'ws-personal', kind: 'web', title: 'Trail map — Switchback Pass', url: 'https://trails.example.org/switchback-pass' },
  { id: 't-c2', wsId: 'ws-personal', kind: 'newtab', title: 'New tab', url: 'switchback://newtab' },
]

export const initialMemory: MemoryItem[] = [
  { id: 'm1', title: 'Nomic Embed Text v1.5 — model card', host: 'huggingface.co', url: 'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5', day: 'Today', time: '21:04', ago: '2 hours ago', snippet: '…Matryoshka representation learning allows embeddings to be truncated to 768, 512, 256…', words: 1840, chunks: 6, dwell: 12, rule: 'matches "allow" rules', match: ['meaning', 'words'] },
  { id: 'm2', title: 'Electron security checklist', host: 'electronjs.org', url: 'https://www.electronjs.org/docs/latest/tutorial/security', day: 'Today', time: '18:40', ago: '5 hours ago', snippet: '…enable context isolation, sandbox every renderer, and never enable nodeIntegration…', words: 4210, chunks: 14, dwell: 96, rule: 'default capture policy (Denylist)', match: ['words'] },
  { id: 'm3', title: 'Embedding models — Nomic Atlas docs', host: 'docs.nomic.ai', url: 'https://docs.nomic.ai/atlas/models', day: 'Today', time: '16:12', ago: '7 hours ago', snippet: '…choose the embedding dimension that fits your storage budget…', words: 980, chunks: 3, dwell: 31, rule: 'default capture policy (Denylist)', match: ['meaning', 'title'] },
  { id: 'm4', title: 'Rishabhmk25/chronicleos', host: 'github.com', url: 'https://github.com/Rishabhmk25/chronicleos', day: 'Yesterday', time: '22:15', ago: 'yesterday', snippet: '…a local-first personal memory layer that indexes what you read…', words: 1320, chunks: 5, dwell: 240, rule: 'matches "allow" rules', match: ['title', 'words'] },
  { id: 'm5', title: 'SQLite FTS5 extension', host: 'sqlite.org', url: 'https://sqlite.org/fts5.html', day: 'Yesterday', time: '19:02', ago: 'yesterday', snippet: '…the bm25() auxiliary function returns a real value indicating how well the row matches…', words: 9120, chunks: 28, dwell: 410, rule: 'default capture policy (Denylist)', match: ['words'] },
  { id: 'm6', title: 'DBSCAN — scikit-learn docs', host: 'scikit-learn.org', url: 'https://scikit-learn.org/stable/modules/clustering.html', day: 'Yesterday', time: '11:48', ago: 'yesterday', snippet: '…views clusters as areas of high density separated by areas of low density…', words: 6480, chunks: 19, dwell: 152, rule: 'default capture policy (Denylist)', match: ['meaning'] },
  { id: 'm7', title: 'Ollama — run models locally', host: 'ollama.com', url: 'https://ollama.com', day: 'Earlier this week', time: 'Mon 14:30', ago: '3 days ago', snippet: '…get up and running with large language models on your own machine…', words: 620, chunks: 2, dwell: 22, rule: 'default capture policy (Denylist)', match: ['meaning', 'words'] },
  { id: 'm8', title: 'Content Security Policy — MDN', host: 'developer.mozilla.org', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP', day: 'Earlier this week', time: 'Mon 10:05', ago: '3 days ago', snippet: '…img-src defines valid sources of images and favicons…', words: 3350, chunks: 11, dwell: 64, rule: 'default capture policy (Denylist)', match: ['words'] },
]

export const commands = [
  { id: 'c-newtab', label: 'New tab', hint: '⌘T' },
  { id: 'c-memory', label: 'Open Memory', hint: '' },
  { id: 'c-settings', label: 'Open Settings', hint: '⌘,' },
  { id: 'c-theme', label: 'Toggle light / dark theme', hint: '' },
  { id: 'c-accent', label: 'Next color theme', hint: '' },
  { id: 'c-sidebar', label: 'Cycle sidebar: Expanded / Rail / Hidden', hint: '⌘B' },
  { id: 'c-private', label: 'Open Private window', hint: '⇧⌘N' },
  { id: 'c-pause', label: 'Pause capture', hint: '' },
  { id: 'c-recovery', label: 'Show recovery banner (Mock)', hint: '' },
]

export function hostOf(url: string) {
  try {
    const u = new URL(url)
    return u.host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Split a URL into display parts: registrable domain emphasized (§3.5, PV-32). */
export function urlParts(url: string) {
  if (url.startsWith('switchback://')) return { pre: 'switchback://', domain: url.slice(13), post: '' }
  try {
    const u = new URL(url)
    const host = u.host
    const labels = host.split('.')
    const domain = labels.length > 2 ? labels.slice(-2).join('.') : host
    const sub = host.slice(0, host.length - domain.length)
    const pre = (u.protocol === 'https:' ? '' : u.protocol + '//') + sub
    const post = (u.pathname === '/' ? '' : u.pathname) + u.search
    return { pre, domain, post }
  } catch {
    return { pre: '', domain: url, post: '' }
  }
}

export function hueVar(hue: number) {
  return `var(--chart-${hue})`
}

/** Deterministic letter-tile hue from the chart tokens (§3.7). */
export function tileHue(host: string) {
  let h = 0
  for (const c of host) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (h % 5) + 1
}
