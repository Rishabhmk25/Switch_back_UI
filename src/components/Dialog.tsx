import { useEffect, useRef, type ReactNode } from 'react'

export function Dialog({ title, children, actions, onClose, width = 440 }: { title: string; children: ReactNode; actions: ReactNode; onClose: () => void; width?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Focus Cancel (first button in actions) by default (§6.6).
    ref.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus()
  }, [])
  return (
    <div className="sb-fade absolute inset-0 z-[60] flex items-center justify-center" style={{ background: 'var(--scrim)' }} onMouseDown={onClose}>
      <div
        ref={ref}
        role="alertdialog"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        className="sb-in rounded-[12px] border border-line-strong bg-bg-2 p-5 shadow-overlay"
        style={{ width }}
      >
        <h2 className="text-[16px] leading-[22px] font-semibold tracking-[-0.01em] text-text-1">{title}</h2>
        <div className="mt-2 text-text-2">{children}</div>
        <div className="mt-5 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  )
}
