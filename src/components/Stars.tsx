import { useRef } from 'react'
import { buzz } from '../lib/speech'

const STAR = 'M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96z'
const GOLD = '#f5b000'

function Star({ fill, size }: { fill: number; size: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0" aria-hidden>
        <path d={STAR} fill="none" stroke="var(--line2)" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
      {fill > 0 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
            <path d={STAR} fill={GOLD} stroke={GOLD} strokeWidth={1.6} strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </span>
  )
}

/** Read-only stars (supports halves). */
export function Stars({ value = 0, size = 16, className }: { value?: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[2px] ${className ?? ''}`} role="img" aria-label={`${value} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} fill={Math.max(0, Math.min(1, value - i))} />
      ))}
    </span>
  )
}

/** Tap or drag across the stars; left half of a star = half a star. Arrow keys work too. */
export function StarInput({ value, onChange, size = 44 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const last = useRef(value)

  const fromX = (clientX: number) => {
    const box = ref.current!.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
    return Math.max(0.5, Math.ceil(frac * 10) / 2)
  }
  const set = (v: number) => {
    if (v !== last.current) {
      last.current = v
      buzz(8)
      onChange(v)
    }
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Rating"
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuenow={value}
      aria-valuetext={`${value} stars`}
      className="inline-flex touch-none select-none items-center gap-1.5 rounded-xl outline-none"
      onPointerDown={(e) => {
        dragging.current = true
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        set(fromX(e.clientX))
      }}
      onPointerMove={(e) => dragging.current && set(fromX(e.clientX))}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(Math.min(5, (value || 0) + 0.5))
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(Math.max(0.5, (value || 1) - 0.5))
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} fill={Math.max(0, Math.min(1, value - i))} />
      ))}
    </div>
  )
}

export const fmtStars = (v?: number) => (v === undefined ? '–' : Number.isInteger(v) ? `${v}.0` : String(v))
