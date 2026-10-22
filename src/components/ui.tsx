import { ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus } from 'lucide-react'
import { type ButtonHTMLAttributes, type ReactNode, useId } from 'react'
import { back, go } from '../lib/router'

export type Accent = 'today' | 'body' | 'mind' | 'hybrid' | 'de' | 'me'
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

/** Top-level screen wrapper. Sub-pages pass `back` to get a sticky bar with a back button. */
export function Page({
  title,
  subtitle,
  accent = 'today',
  back: backTo,
  actions,
  children,
  wide,
  className,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  accent?: Accent
  back?: string
  actions?: ReactNode
  children: ReactNode
  wide?: boolean
  className?: string
}) {
  return (
    <div className={cx(`acc-${accent}`, 'min-h-dvh pb-36', className)}>
      {backTo !== undefined ? (
        <div className="safe-top sticky top-0 z-30 bg-page/85 backdrop-blur-xl">
          <div className={cx('mx-auto flex h-14 items-center gap-1 px-2', wide ? 'max-w-3xl' : 'max-w-xl')}>
            <button
              aria-label="Back"
              onClick={() => back(backTo)}
              className="press flex h-11 w-11 items-center justify-center rounded-full text-ink2 hover:bg-card2"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</div>
            <div className="flex items-center gap-1 pr-1">{actions}</div>
          </div>
        </div>
      ) : (
        <div className="safe-top">
          <div className={cx('mx-auto px-5 pb-2 pt-5', wide ? 'max-w-3xl' : 'max-w-xl')}>
            <div className="flex min-h-8 items-center justify-between gap-3">
              <div className="min-w-0 truncate text-[13px] font-semibold uppercase tracking-wide text-acc">{subtitle}</div>
              <div className="flex shrink-0 items-center gap-1">{actions}</div>
            </div>
            {title && <h1 className="mt-1 text-[30px] font-bold leading-[1.15] tracking-tight">{title}</h1>}
          </div>
        </div>
      )}
      <div className={cx('mx-auto px-4', wide ? 'max-w-3xl' : 'max-w-xl')}>{children}</div>
    </div>
  )
}

export function Card({
  children,
  className,
  onClick,
  href,
  pad = true,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  href?: string
  pad?: boolean
}) {
  const cls = cx('block rounded-3xl border border-line bg-card text-left', pad && 'p-4', (onClick || href) && 'press w-full hover:border-line2', className)
  if (href) return <a href={href} className={cls}>{children}</a>
  if (onClick) return <button onClick={onClick} className={cls}>{children}</button>
  return <div className={cls}>{children}</div>
}

export function Section({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mt-6', className)}>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink3">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'soft' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  full?: boolean
  loading?: boolean
}
export function Button({ variant = 'primary', size = 'md', icon, full, loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'press inline-flex items-center justify-center gap-2 rounded-2xl font-semibold disabled:opacity-50',
        size === 'sm' && 'h-9 px-3 text-[14px]',
        size === 'md' && 'h-11 px-4 text-[15px]',
        size === 'lg' && 'h-14 px-5 text-[16px]',
        variant === 'primary' && 'bg-acc-fill text-acc-on',
        variant === 'soft' && 'bg-acc-soft text-acc',
        variant === 'ghost' && 'text-ink2 hover:bg-card2',
        variant === 'outline' && 'border border-line2 bg-card text-ink',
        variant === 'danger' && 'bg-bad/10 text-bad',
        full && 'w-full',
        className,
      )}
    >
      {loading ? <LoaderCircle size={18} className="anim-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ label, children, onClick, className, active }: { label: string; children: ReactNode; onClick?: () => void; className?: string; active?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx('press flex h-10 w-10 items-center justify-center rounded-full', active ? 'bg-acc-soft text-acc' : 'text-ink2 hover:bg-card2', className)}
    >
      {children}
    </button>
  )
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  className,
  scroll = true,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  className?: string
  scroll?: boolean
}) {
  return (
    <div className={cx('-mx-4 flex gap-2 px-4', scroll ? 'no-scrollbar overflow-x-auto' : 'flex-wrap', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cx(
            'press h-9 shrink-0 rounded-full border px-3.5 text-[14px] font-medium',
            value === o.value ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2 bg-card text-ink2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-2xl bg-card2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cx('press h-9 flex-1 rounded-xl text-[14px] font-semibold', value === o.value ? 'bg-card text-ink shadow-sm' : 'text-ink3')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Progress ring. Track is a lighter step of the same hue (meter spec). */
export function Ring({
  value,
  max,
  size = 120,
  stroke = 10,
  color = 'var(--acc-fill)',
  track = 'var(--acc-soft)',
  children,
  label,
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
  label?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(frac * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.2,0.9,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function Bar({ value, max, color = 'var(--acc-fill)', track = 'var(--track)', height = 8, className }: { value: number; max: number; color?: string; track?: string; height?: number; className?: string }) {
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <div className={cx('w-full overflow-hidden rounded-full', className)} style={{ height, background: track }}>
      <div className="h-full rounded-full" style={{ width: `${frac * 100}%`, background: color, transition: 'width 0.5s ease' }} />
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  format = (v: number) => String(v),
  size = 'md',
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  format?: (v: number) => string
  size?: 'sm' | 'md'
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)))
  const btn = cx('press flex items-center justify-center rounded-full bg-card2 text-ink', size === 'sm' ? 'h-8 w-8' : 'h-10 w-10')
  return (
    <div className="flex items-center gap-2">
      <button aria-label="Decrease" className={btn} onClick={() => set(value - step)}>
        <Minus size={size === 'sm' ? 15 : 18} />
      </button>
      <div className={cx('num min-w-12 text-center font-semibold', size === 'sm' ? 'text-[15px]' : 'text-[17px]')}>{format(value)}</div>
      <button aria-label="Increase" className={btn} onClick={() => set(value + step)}>
        <Plus size={size === 'sm' ? 15 : 18} />
      </button>
    </div>
  )
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <label htmlFor={id} className={cx('block', className)}>
      <div className="mb-1.5 px-1 text-[13px] font-semibold text-ink2">{label}</div>
      {children}
      {hint && <div className="mt-1.5 px-1 text-[12.5px] leading-snug text-ink3">{hint}</div>}
    </label>
  )
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  left,
  right,
  label,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  left?: string
  right?: string
  label?: string
}) {
  return (
    <div>
      <input
        aria-label={label}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {(left || right) && (
        <div className="mt-0.5 flex justify-between text-[12px] text-ink3">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('press relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-acc-fill' : 'bg-line2')}
    >
      <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-acc-soft text-acc">{icon}</div>}
      <div className="text-[17px] font-semibold">{title}</div>
      {body && <div className="mt-1 max-w-xs text-[14.5px] leading-relaxed text-ink3">{body}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, unit, sub, onClick, className }: { label: ReactNode; value: ReactNode; unit?: ReactNode; sub?: ReactNode; onClick?: () => void; className?: string }) {
  const inner = (
    <>
      <div className="text-[12.5px] font-medium text-ink3">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-none">{value}</span>
        {unit && <span className="text-[13px] text-ink3">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-[12.5px] text-ink3">{sub}</div>}
    </>
  )
  const cls = cx('rounded-3xl border border-line bg-card p-4 text-left', onClick && 'press', className)
  return onClick ? <button onClick={onClick} className={cls}>{inner}</button> : <div className={cls}>{inner}</div>
}

export function Row({
  icon,
  title,
  sub,
  right,
  onClick,
  href,
  chevron,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
  onClick?: () => void
  href?: string
  chevron?: boolean
  className?: string
}) {
  const body = (
    <>
      {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-acc-soft text-acc">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15.5px] font-medium">{title}</div>
        {sub && <div className="truncate text-[13px] text-ink3">{sub}</div>}
      </div>
      {right}
      {chevron && <ChevronRight size={18} className="shrink-0 text-ink3" />}
    </>
  )
  const cls = cx('flex w-full items-center gap-3 px-4 py-3 text-left', (onClick || href) && 'press hover:bg-card2/60', className)
  if (href) return <a href={href} className={cls}>{body}</a>
  if (onClick) return <button onClick={onClick} className={cls}>{body}</button>
  return <div className={cls}>{body}</div>
}

export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card', className)}>{children}</div>
}

export function Pill({ children, className, tone = 'acc' }: { children: ReactNode; className?: string; tone?: 'acc' | 'muted' | 'good' | 'bad' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold',
        tone === 'acc' && 'bg-acc-soft text-acc',
        tone === 'muted' && 'bg-card2 text-ink3',
        tone === 'good' && 'bg-[color-mix(in_srgb,var(--good-mark)_15%,transparent)] text-good',
        tone === 'bad' && 'bg-bad/10 text-bad',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cx('anim-spin text-ink3', className)} size={22} />
}

export function LinkButton({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <button onClick={() => go(to)} className={cx('press text-[14px] font-semibold text-acc', className)}>
      {children}
    </button>
  )
}

export function Fab({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="press fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-acc-fill text-acc-on shadow-lg shadow-black/20"
      style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
    >
      {children}
    </button>
  )
}
