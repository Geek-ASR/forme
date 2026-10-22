// Small SVG charts. Specs: 2px lines, ≤24px bars with 4px rounded data-ends, hairline solid grid,
// selective direct labels, crosshair/tooltip on interaction, text in ink tokens (never series colour).

import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { fmtDay, monShort, parseKey } from '../lib/date'

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(320)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setW(Math.max(200, el.clientWidth || 320))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1
  const raw = span / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const start = Math.ceil(min / step) * step
  const out: number[] = []
  for (let v = start; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

const fmtTick = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}K` : String(Math.round(v * 10) / 10))

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x - 70, 0), width - 140)
  return (
    <div className="pointer-events-none absolute top-0 z-10 w-[140px] rounded-xl border border-line bg-card px-3 py-2 text-[12.5px] shadow-lg" style={{ left }}>
      {children}
    </div>
  )
}

// ── Line chart (weight trend) ──
export type LinePoint = { x: string; y: number }
export function LineChart({
  trend,
  raw = [],
  plan = [],
  goal,
  height = 190,
  unit = 'kg',
  label,
}: {
  trend: LinePoint[]
  raw?: LinePoint[]
  plan?: LinePoint[]
  goal?: number
  height?: number
  unit?: string
  label: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 36, r: 40, t: 14, b: 24 }
  const all = [...trend, ...raw, ...plan]
  const xs = all.map((p) => parseKey(p.x).getTime())
  const ys = [...all.map((p) => p.y), ...(goal ? [goal] : [])]
  if (!trend.length) return null
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs, x0 + 86400000)
  const yMin = Math.floor(Math.min(...ys) - 0.5)
  const yMax = Math.ceil(Math.max(...ys) + 0.5)
  const sx = (d: string) => pad.l + ((parseKey(d).getTime() - x0) / (x1 - x0)) * (width - pad.l - pad.r)
  const sy = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (height - pad.t - pad.b)
  const path = (pts: LinePoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('')
  const ticks = niceTicks(yMin, yMax, 4)
  const last = trend[trend.length - 1]
  const h = hover !== null ? trend[hover] : null
  const rawAt = h ? raw.find((r) => r.x === h.x) : null

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    let best = 0
    let bd = Infinity
    trend.forEach((p, i) => {
      const d = Math.abs(sx(p.x) - px)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    setHover(best)
  }

  return (
    <div ref={ref} className="relative select-none">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        style={{ touchAction: 'pan-y' }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={pad.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="var(--axis-ink)" className="num">
              {fmtTick(t)}
            </text>
          </g>
        ))}
        {goal !== undefined && goal >= yMin && goal <= yMax && (
          <g>
            <line x1={pad.l} x2={width - pad.r} y1={sy(goal)} y2={sy(goal)} stroke="var(--good-mark)" strokeWidth={1} />
            <text x={width - pad.r + 4} y={sy(goal) + 4} fontSize={11} fill="var(--axis-ink)">Goal</text>
          </g>
        )}
        {plan.length > 1 && (
          <g>
            <path d={path(plan)} fill="none" stroke="var(--axis)" strokeWidth={1.5} />
            <text x={sx(plan[plan.length - 1].x) + 4} y={sy(plan[plan.length - 1].y) + 4} fontSize={11} fill="var(--axis-ink)">Plan</text>
          </g>
        )}
        {raw.map((p) => (
          <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3} fill="var(--axis)" />
        ))}
        <path d={path(trend)} fill="none" stroke="var(--s1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={sx(last.x)} cy={sy(last.y)} r={4.5} fill="var(--s1)" stroke="var(--card)" strokeWidth={2} />
        <text x={sx(last.x) + 8} y={sy(last.y) + 4} fontSize={12} fontWeight={600} fill="var(--ink)">
          {last.y.toFixed(1)}
        </text>
        <text x={pad.l} y={height - 6} fontSize={11} fill="var(--axis-ink)">
          {fmtDay(trend[0].x)}
        </text>
        <text x={width - pad.r} y={height - 6} fontSize={11} fill="var(--axis-ink)" textAnchor="end">
          {fmtDay(last.x)}
        </text>
        {h && (
          <g>
            <line x1={sx(h.x)} x2={sx(h.x)} y1={pad.t} y2={height - pad.b} stroke="var(--ink3)" strokeWidth={1} />
            <circle cx={sx(h.x)} cy={sy(h.y)} r={4.5} fill="var(--s1)" stroke="var(--card)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {h && (
        <Tooltip x={sx(h.x)} width={width}>
          <div className="text-ink3">{fmtDay(h.x)}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="inline-block h-0.5 w-3 rounded bg-s1" />
            <span className="font-semibold">{h.y.toFixed(1)} {unit}</span>
            <span className="text-ink3">trend</span>
          </div>
          {rawAt && <div className="mt-0.5 text-ink3">Scale: {rawAt.y.toFixed(1)} {unit}</div>}
        </Tooltip>
      )}
    </div>
  )
}

// ── Columns (daily calories, minutes…) ──
export type Col = { key: string; label: string; value: number; tip?: string }
export function Columns({
  data,
  target,
  height = 160,
  highlight,
  unit = '',
  label,
  color = 'var(--s1)',
}: {
  data: Col[]
  target?: number
  height?: number
  highlight?: string
  unit?: string
  label: string
  color?: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 34, r: 8, t: 18, b: 22 }
  const max = Math.max(1, ...data.map((d) => d.value), target ?? 0) * 1.08
  const ticks = niceTicks(0, max, 3)
  const band = (width - pad.l - pad.r) / Math.max(1, data.length)
  const bw = Math.min(24, band * 0.62)
  const sy = (v: number) => pad.t + (1 - v / max) * (height - pad.t - pad.b)
  const base = sy(0)
  const r = 4
  const barPath = (x: number, y: number) => {
    const h = base - y
    if (h <= 0.5) return ''
    const rr = Math.min(r, h, bw / 2)
    return `M${x},${base}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + bw - rr}Q${x + bw},${y} ${x + bw},${y + rr}V${base}Z`
  }
  const hv = hover !== null ? data[hover] : null
  return (
    <div ref={ref} className="relative select-none">
      <svg width={width} height={height} role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={pad.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="var(--axis-ink)" className="num">
              {fmtTick(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + band * i + (band - bw) / 2
          const y = sy(d.value)
          const isHi = d.key === highlight
          return (
            <g key={d.key}>
              <path d={barPath(x, y)} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
              {isHi && d.value > 0 && (
                <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--ink)" className="num">
                  {Math.round(d.value).toLocaleString('en-IN')}
                </text>
              )}
              <text x={x + bw / 2} y={height - 6} textAnchor="middle" fontSize={11} fill={isHi ? 'var(--ink)' : 'var(--axis-ink)'} fontWeight={isHi ? 600 : 400}>
                {d.label}
              </text>
              <rect
                x={pad.l + band * i}
                y={pad.t}
                width={band}
                height={height - pad.t}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onPointerDown={() => setHover(i)}
              />
            </g>
          )
        })}
        {target !== undefined && (
          <g pointerEvents="none">
            <line x1={pad.l} x2={width - pad.r} y1={sy(target)} y2={sy(target)} stroke="var(--ink3)" strokeWidth={1} />
            <text x={width - pad.r} y={sy(target) - 4} textAnchor="end" fontSize={10.5} fill="var(--axis-ink)">
              target {Math.round(target).toLocaleString('en-IN')}
            </text>
          </g>
        )}
        <line x1={pad.l} x2={width - pad.r} y1={base} y2={base} stroke="var(--axis)" strokeWidth={1} />
      </svg>
      {hv && (
        <Tooltip x={pad.l + band * hover! + band / 2} width={width}>
          <div className="text-ink3">{hv.tip ?? hv.label}</div>
          <div className="mt-0.5 font-semibold">
            {Math.round(hv.value).toLocaleString('en-IN')} {unit}
          </div>
        </Tooltip>
      )}
    </div>
  )
}

// ── Heatmap (GitHub-style consistency) ──
export function Heatmap({ days, label, weeks = 17 }: { days: { date: string; level: 0 | 1 | 2 | 3 | 4; tip: string }[]; label: string; weeks?: number }) {
  const [sel, setSel] = useState<number | null>(null)
  const cols = useMemo(() => {
    const out: (typeof days[number] | null)[][] = []
    if (!days.length) return out
    const firstDow = (parseKey(days[0].date).getDay() + 6) % 7 // Monday = 0
    let col: (typeof days[number] | null)[] = Array(firstDow).fill(null)
    for (const d of days) {
      col.push(d)
      if (col.length === 7) {
        out.push(col)
        col = []
      }
    }
    if (col.length) out.push([...col, ...Array(7 - col.length).fill(null)])
    return out.slice(-weeks)
  }, [days, weeks])
  const flat = cols.flat()
  const s = sel !== null ? flat[sel] : null
  return (
    <div>
      <div className="no-scrollbar flex gap-[3px] overflow-x-auto" role="img" aria-label={label}>
        {cols.map((c, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {c.map((d, ri) =>
              d ? (
                <button
                  key={ri}
                  aria-label={d.tip}
                  onClick={() => setSel(ci * 7 + ri)}
                  className="h-[15px] w-[15px] rounded-[4px]"
                  style={{ background: `var(--heat${d.level})`, outline: sel === ci * 7 + ri ? '2px solid var(--ink)' : undefined }}
                />
              ) : (
                <div key={ri} className="h-[15px] w-[15px]" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[12px] text-ink3">
        <span className="min-h-[18px]">{s ? s.tip : 'Tap a day'}</span>
        <span className="flex items-center gap-1">
          less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="inline-block h-[10px] w-[10px] rounded-[3px]" style={{ background: `var(--heat${l})` }} />
          ))}
          more
        </span>
      </div>
    </div>
  )
}

// ── Mood month grid ──
const MOOD_EMOJI = ['', '😣', '😕', '😐', '🙂', '😄']
export const moodEmoji = (m?: number) => (m ? MOOD_EMOJI[m] : '')
export function MoodMonth({ year, month, moods, label }: { year: number; month: number; moods: Map<string, number>; label: string }) {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  return (
    <div role="img" aria-label={label}>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-ink3">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const m = moods.get(k)
          return (
            <div
              key={i}
              title={m ? `${k}: ${moodEmoji(m)}` : k}
              className="flex aspect-square items-center justify-center rounded-lg text-[11px] font-medium"
              style={{ background: m ? `var(--mood${m})` : 'var(--heat0)', color: m && (m === 1 || m === 5) ? '#fff' : 'var(--ink2)' }}
            >
              {d}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-[12px] text-ink3">
        {[1, 2, 3, 4, 5].map((m) => (
          <span key={m} className="flex items-center gap-1">
            <span className="inline-block h-[10px] w-[10px] rounded-[3px]" style={{ background: `var(--mood${m})` }} />
            {MOOD_EMOJI[m]}
          </span>
        ))}
      </div>
      <div className="sr-only">{monShort(month)}</div>
    </div>
  )
}

// ── Sparkline ──
export function Sparkline({ values, width = 90, height = 28, color = 'var(--s1)' }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (width - 4) + 2},${height - 2 - ((v - min) / (max - min || 1)) * (height - 4)}`)
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ── Macro split (stacked bar, part-to-whole of calories) ──
export function MacroBar({ p, c, f }: { p: number; c: number; f: number }) {
  const kp = p * 4
  const kc = c * 4
  const kf = f * 9
  const total = kp + kc + kf
  const parts = [
    { name: 'Protein', g: p, k: kp, color: 'var(--s1)' },
    { name: 'Carbs', g: c, k: kc, color: 'var(--s2)' },
    { name: 'Fat', g: f, k: kf, color: 'var(--s3)' },
  ]
  return (
    <div>
      <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`Protein ${Math.round(p)} g, carbs ${Math.round(c)} g, fat ${Math.round(f)} g`}>
        {total > 0 ? (
          parts.map((x) => <div key={x.name} style={{ width: `${(x.k / total) * 100}%`, background: x.color }} className="first:rounded-l-full last:rounded-r-full" />)
        ) : (
          <div className="w-full bg-track" />
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {parts.map((x) => (
          <div key={x.name} className="min-w-0">
            <div className="flex items-center gap-1.5 text-[12px] text-ink3">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: x.color }} />
              {x.name}
            </div>
            <div className="mt-0.5 text-[14px] font-semibold text-ink">
              {Math.round(x.g)} g{total > 0 && <span className="ml-1 text-[12px] font-medium text-ink3">{Math.round((x.k / total) * 100)}%</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
