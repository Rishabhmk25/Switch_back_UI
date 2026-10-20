import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { hueVar, tileHue } from '../mock/data'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function LetterTile({ host, size = 20 }: { host: string; size?: number }) {
  const hue = tileHue(host)
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-[5px] font-semibold uppercase"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        color: hueVar(hue),
        background: `color-mix(in srgb, ${hueVar(hue)} 16%, transparent)`,
      }}
    >
      {host.replace(/^www\./, '')[0]}
    </span>
  )
}

type Tone = 'ok' | 'warn' | 'err' | 'neutral' | 'accent' | 'private'
const toneCls: Record<Tone, string> = {
  ok: 'bg-ok-sub text-ok',
  warn: 'bg-warn-sub text-warn',
  err: 'bg-err-sub text-err',
  neutral: 'bg-bg-3 text-text-2',
  accent: 'bg-accent-sub text-accent',
  private: 'bg-private-bg text-private',
}

export function Pill({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] leading-[14px] font-medium tracking-[0.02em]', toneCls[tone], className)}>
      {children}
    </span>
  )
}

export function MockTag() {
  return (
    <span className="inline-flex h-4 items-center rounded-[4px] border border-dashed border-line-strong px-1 font-mono text-[10px] text-text-3" title="Not covered by the spec — plain browser convention">
      Mock
    </span>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const variantCls: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-110',
  secondary: 'bg-bg-2 text-text-1 border border-line-strong hover:bg-bg-3',
  ghost: 'text-text-2 hover:bg-bg-3 hover:text-text-1',
  danger: 'bg-err text-bg-0 hover:brightness-110',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-[6px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-6 px-2 text-[12px]' : size === 'lg' ? 'h-8 px-3.5' : 'h-7 px-3',
        variantCls[variant],
        className,
      )}
    />
  )
}

export function IconButton({ label, className, children, active, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-text-2 transition-colors hover:bg-bg-3 hover:text-text-1 disabled:opacity-40 disabled:hover:bg-transparent',
        active && 'bg-bg-3 text-text-1',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[8px] border border-line bg-bg-1 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={cx(
            'h-6 rounded-[6px] px-3 text-[12px] font-medium transition-colors',
            o === value ? 'bg-bg-3 text-text-1 shadow-[inset_0_0_0_1px_var(--line-strong)]' : 'text-text-2 hover:text-text-1',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-line bg-bg-1 px-1 font-sans text-[11px] text-text-3">{children}</kbd>
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-[18px] w-8 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-bg-3 shadow-[inset_0_0_0_1px_var(--line-strong)]')}
    >
      <span className={cx('absolute top-[2px] left-0 h-[14px] w-[14px] rounded-full transition-transform', checked ? 'translate-x-[16px] bg-accent-fg' : 'translate-x-[2px] bg-text-2')} />
    </button>
  )
}
