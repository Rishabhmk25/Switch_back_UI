import { RotateCw, TriangleAlert } from 'lucide-react'
import type { Tab } from '../mock/data'
import { hostOf } from '../mock/data'
import { Button, LetterTile, MockTag } from '../components/ui'
import { useStore } from '../state'

/** Stand-in for the native, untrusted content view. Not a real website. */
export function WebPage({ tab }: { tab: Tab }) {
  const { updateTabs } = useStore()
  const host = hostOf(tab.url)
  if (tab.crashed)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg-0 text-center">
        <TriangleAlert size={24} className="text-err" />
        <p className="max-w-[360px] text-text-1">This tab stopped working. Switchback closed it to keep your other tabs safe.</p>
        <Button variant="primary" onClick={() => updateTabs((ts) => ts.map((t) => (t.id === tab.id ? { ...t, crashed: false } : t)))}>
          <RotateCw size={14} /> Reload
        </Button>
      </div>
    )
  // Neutral page palette — the page is never themed by the browser.
  return (
    <div className="h-full overflow-y-auto bg-white text-[#1d1f23]" style={{ opacity: tab.loading ? 0.55 : 1, transition: 'opacity 200ms' }}>
      <div className="flex h-14 items-center gap-3 border-b border-[#e8e8e8] px-10">
        <LetterTile host={host} size={24} />
        <span className="font-semibold">{host}</span>
        <span className="ml-6 flex gap-5 text-[13px] text-[#666]">
          <span>Docs</span>
          <span>Guides</span>
          <span>Community</span>
        </span>
        <span className="ml-auto">
          <MockTag />
        </span>
      </div>
      <article className="mx-auto max-w-[720px] px-10 py-14">
        <p className="mb-3 text-[12px] font-medium tracking-wide text-[#888] uppercase">{host}</p>
        <h1 className="text-[34px] leading-[42px] font-semibold tracking-[-0.02em]">{tab.title}</h1>
        <p className="mt-2 font-mono text-[12px] text-[#888]">{tab.url}</p>
        <div className="mt-10 space-y-4 text-[15px] leading-[26px] text-[#3a3d42]">
          <p>This is a placeholder page standing in for the real website. Switchback draws only the browser chrome around it; the page itself is a separate, untrusted view.</p>
          <div className="h-[180px] rounded-[10px] bg-[#f1f2f4]" />
          {[0.95, 0.88, 0.92, 0.6].map((w, i) => (
            <div key={i} className="h-3 rounded-full bg-[#eceef0]" style={{ width: `${w * 100}%` }} />
          ))}
          <div className="h-2" />
          {[0.9, 0.97, 0.75].map((w, i) => (
            <div key={i} className="h-3 rounded-full bg-[#eceef0]" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
      </article>
    </div>
  )
}
