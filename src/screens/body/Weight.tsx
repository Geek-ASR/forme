import { Plus, Ruler, Trash, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LineChart, type LinePoint } from '../../components/charts'
import { NumberSheet } from '../../components/NumberSheet'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Button, Card, Chips, Field, Page, Section, Stat } from '../../components/ui'
import { useProfile } from '../../lib/app'
import { bmi, bmiLabel, weightTrend } from '../../lib/calc'
import { addDays, diffDays, dkey, fmtLong, fmtRel } from '../../lib/date'
import { useRoute } from '../../lib/router'
import { patch, put, remove, useColl } from '../../lib/store'
import type { BodyEntry } from '../../lib/types'

const MEASURES: { k: keyof BodyEntry; label: string; unit: string; hint?: string }[] = [
  { k: 'waist', label: 'Waist (at navel)', unit: 'cm' },
  { k: 'chest', label: 'Chest', unit: 'cm' },
  { k: 'hips', label: 'Hips', unit: 'cm' },
  { k: 'arm', label: 'Upper arm', unit: 'cm' },
  { k: 'thigh', label: 'Thigh', unit: 'cm' },
  { k: 'bf', label: 'Body fat (estimate)', unit: '%' },
  { k: 'chestExp', label: 'Chest expansion', unit: 'cm', hint: 'Tape around the chest at nipple line: full breath in minus full breath out. A key spine-health number.' },
  { k: 'wallHead', label: 'Wall-to-head distance', unit: 'cm', hint: 'Heels and back against a wall, chin level: gap between wall and back of head. Lower is better.' },
]
const BENCH: { k: keyof BodyEntry; label: string; unit: string; hint: string }[] = [
  { k: 'pushups', label: 'Push-ups (max, any variation)', unit: 'reps', hint: 'Note which variation in your head — wall, incline, knee or full.' },
  { k: 'plank', label: 'Plank hold', unit: 'sec', hint: 'Forearm or knee plank, until form breaks.' },
  { k: 'wallSit', label: 'Wall sit', unit: 'sec', hint: 'Thighs as close to parallel as comfortable.' },
  { k: 'chairStand', label: '30-second chair stands', unit: 'reps', hint: 'Sit-to-stand from a chair, arms crossed, as many as possible in 30 s.' },
]

export default function Weight() {
  const { query } = useRoute()
  const { profile } = useProfile()
  const body = useColl<BodyEntry>('body')
  const [range, setRange] = useState<'30' | '90' | 'all'>('90')
  const [weigh, setWeigh] = useState(false)
  const [form, setForm] = useState<'measure' | 'bench' | null>(query.get('bench') ? 'bench' : query.get('measure') ? 'measure' : null)
  const today = dkey()
  const trend = useMemo(() => weightTrend(body), [body])
  const from = range === 'all' ? '0000' : addDays(today, -Number(range))
  const shown = trend.filter((t) => t.date >= from)
  const last = trend[trend.length - 1]
  const current = last?.trend ?? profile.startWeightKg
  const milestone = profile.milestoneWeightKg ?? profile.goalWeightKg
  const milestoneDate = profile.milestoneDate ?? addDays(profile.planStart, profile.planWeeks * 7)
  const plan: LinePoint[] = [
    { x: profile.planStart, y: profile.startWeightKg },
    { x: milestoneDate, y: milestone },
  ].filter((p) => p.x >= from)

  const slope = useMemo(() => {
    const recent = trend.slice(-15)
    if (recent.length < 8) return null
    return ((recent[recent.length - 1].trend - recent[0].trend) / (recent.length - 1)) * 7
  }, [trend])
  const eta = slope && slope < -0.05 ? addDays(today, Math.round(((current - milestone) / -slope) * 7)) : null
  const weighIns = body.filter((b) => b.kg).sort((a, b) => (a.date < b.date ? 1 : -1))
  const latest = (k: keyof BodyEntry) => [...body].filter((b) => b[k] !== undefined).sort((a, b) => (a.date < b.date ? 1 : -1))
  const b = bmi(current, profile.heightCm)

  return (
    <Page accent="body" back="/body" title="Weight & body" actions={<Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => setWeigh(true)}>Weigh in</Button>}>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <Stat label="Trend weight" value={current.toFixed(1)} unit="kg" sub={`${(profile.startWeightKg - current >= 0 ? '−' : '+')}${Math.abs(profile.startWeightKg - current).toFixed(1)} kg since start`} />
        <Stat label={`To ${milestone} kg`} value={Math.max(0, current - milestone).toFixed(1)} unit="kg" sub={`by ${fmtLong(milestoneDate)}`} />
        <Stat label="BMI" value={b.toFixed(1)} sub={bmiLabel(b)} />
        <Stat
          label="Pace"
          value={slope === null ? '–' : `${slope <= 0 ? '−' : '+'}${Math.abs(slope).toFixed(2)}`}
          unit={slope === null ? '' : 'kg/wk'}
          sub={eta ? `reach ${milestone} kg ≈ ${fmtLong(eta)}` : 'needs ~2 weeks of weigh-ins'}
        />
      </div>

      <Section title="Trend" action={<Chips scroll={false} className="mx-0! px-0!" options={[{ value: '30', label: '30d' }, { value: '90', label: '90d' }, { value: 'all', label: 'All' }]} value={range} onChange={setRange} />}>
        <Card>
          {shown.length > 1 ? (
            <LineChart
              label="Weight trend"
              trend={shown.map((t) => ({ x: t.date, y: Math.round(t.trend * 10) / 10 }))}
              raw={shown.filter((t) => t.raw !== undefined).map((t) => ({ x: t.date, y: t.raw! }))}
              plan={plan}
              goal={milestone}
            />
          ) : (
            <div className="py-8 text-center text-[14px] text-ink3">Weigh in a few times to see your trend. Daily is ideal — the trend line smooths out water-weight noise.</div>
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-ink3">
            Blue = smoothed trend (what really matters), grey dots = scale readings, grey line = the plan to {milestone} kg. Long-term goal: {profile.goalWeightKg} kg.
          </p>
        </Card>
      </Section>

      <Section title="Measurements" action={<button onClick={() => setForm('measure')} className="press flex items-center gap-1 text-[14px] font-semibold text-acc"><Ruler size={15} /> Add</button>}>
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {MEASURES.map((m) => {
            const list = latest(m.k)
            const first = list[list.length - 1]
            const cur = list[0]
            return (
              <div key={m.k} className="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
                <div>
                  <div className="text-[14.5px] font-medium">{m.label}</div>
                  {cur && <div className="text-[12px] text-ink3">{fmtRel(cur.date)}</div>}
                </div>
                <div className="text-right">
                  <div className="num text-[15px] font-semibold">{cur ? `${cur[m.k]} ${m.unit}` : '–'}</div>
                  {first && cur && first !== cur && (
                    <div className="text-[12px] text-ink3">
                      from {String(first[m.k])} {m.unit}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Fitness benchmarks" action={<button onClick={() => setForm('bench')} className="press flex items-center gap-1 text-[14px] font-semibold text-acc"><Trophy size={15} /> Test</button>}>
        <div className="grid grid-cols-2 gap-3">
          {BENCH.map((m) => {
            const list = latest(m.k)
            const first = list[list.length - 1]
            const cur = list[0]
            return (
              <Stat
                key={m.k}
                label={m.label.replace(' (max, any variation)', '')}
                value={cur ? String(cur[m.k]) : '–'}
                unit={m.unit}
                sub={first && cur && first !== cur ? `first: ${first[m.k]} ${m.unit}` : 'retest every 4 weeks'}
              />
            )
          })}
        </div>
      </Section>

      <Section title="Weigh-ins">
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {weighIns.slice(0, 30).map((w) => (
            <div key={w.id} className="flex items-center justify-between border-b border-line px-4 py-2.5 last:border-b-0">
              <span className="text-[14.5px]">{fmtRel(w.date)}</span>
              <span className="flex items-center gap-2">
                <span className="num text-[15px] font-semibold">{w.kg} kg</span>
                <button
                  aria-label="Delete weigh-in"
                  onClick={() => {
                    const { kg: _kg, ...rest } = w
                    if (Object.keys(rest).some((k) => !['id', 'date', 'updatedAt'].includes(k))) put<BodyEntry>('body', rest)
                    else remove('body', w.id)
                    toast('Weigh-in removed')
                  }}
                  className="p-1 text-ink3"
                >
                  <Trash size={14} />
                </button>
              </span>
            </div>
          ))}
          {!weighIns.length && <div className="px-4 py-6 text-center text-[14px] text-ink3">Start weight: {profile.startWeightKg} kg (from your profile)</div>}
        </div>
      </Section>

      <NumberSheet
        open={weigh}
        onClose={() => setWeigh(false)}
        title="Weigh-in"
        unit="kg"
        decimals={1}
        accent="body"
        initial={last?.raw}
        hint="Same time daily: mornings, after the bathroom, before food."
        onSave={(v) => patch<BodyEntry>('body', `b-${today}`, { date: today, kg: v })}
      />
      <EntryForm open={form !== null} kind={form ?? 'measure'} onClose={() => setForm(null)} />
      <p className="mt-6 px-1 text-[12px] text-ink3">Plan started {fmtLong(profile.planStart)} · {Math.max(0, diffDays(today, profile.planStart))} days in.</p>
    </Page>
  )
}

function EntryForm({ open, kind, onClose }: { open: boolean; kind: 'measure' | 'bench'; onClose: () => void }) {
  const today = dkey()
  const fields = kind === 'measure' ? MEASURES : BENCH
  const [vals, setVals] = useState<Record<string, string>>({})
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={kind === 'measure' ? 'Measurements' : 'Benchmark test'}
      accent="body"
      footer={
        <Button
          full
          size="lg"
          onClick={() => {
            const p: Partial<BodyEntry> = { date: today }
            for (const f of fields) {
              const v = Number((vals[f.k as string] ?? '').replace(',', '.'))
              if (vals[f.k as string] && Number.isFinite(v)) (p as Record<string, number | string>)[f.k as string] = v
            }
            patch<BodyEntry>('body', `b-${today}`, p)
            setVals({})
            toast('Saved')
            onClose()
          }}
        >
          Save
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        {fields.map((f) => (
          <Field key={f.k as string} label={`${f.label} (${f.unit})`} hint={f.hint}>
            <input inputMode="decimal" className="field num" value={vals[f.k as string] ?? ''} onChange={(e) => setVals({ ...vals, [f.k as string]: e.target.value })} />
          </Field>
        ))}
      </div>
    </Sheet>
  )
}
