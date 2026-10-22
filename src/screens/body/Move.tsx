import { Footprints, Plus, Trash } from 'lucide-react'
import { useState } from 'react'
import { Columns } from '../../components/charts'
import { NumberSheet } from '../../components/NumberSheet'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Bar, Button, Card, Empty, Field, Page, Section, Stepper, cx } from '../../components/ui'
import { ACTIVITIES } from '../../data/foods'
import { patchDay, useByDate, useDayData } from '../../lib/app'
import { kfmt, metKcal, stepsToKm } from '../../lib/calc'
import { addDays, dkey, dowShort, fmtRel, lastNDays, weekday } from '../../lib/date'
import { useRoute } from '../../lib/router'
import { put, remove, useColl } from '../../lib/store'
import type { Activity, Day } from '../../lib/types'

export default function Move() {
  const { query } = useRoute()
  const date = dkey()
  const d = useDayData(date)
  const acts = useByDate<Activity>('activity')
  const days = useColl<Day>('days')
  const [steps, setSteps] = useState(false)
  const [add, setAdd] = useState(query.get('add') === '1')
  const stepsBy = new Map(days.map((x) => [x.id, x.steps ?? 0]))
  const week = lastNDays(7).map((k) => ({ key: k, label: dowShort(weekday(k)).slice(0, 2), value: stepsBy.get(k) ?? 0, tip: k }))
  const history = lastNDays(14)
    .reverse()
    .map((k) => ({ k, list: acts.get(k) ?? [] }))
    .filter((x) => x.list.length)
  const km = stepsToKm(d.steps, d.profile.heightCm)

  return (
    <Page accent="body" back="/body" title="Steps & activity" actions={<Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => setAdd(true)}>Log</Button>}>
      <Card className="mt-1" onClick={() => setSteps(true)}>
        <div className="flex items-center gap-2 text-[13px] text-ink3">
          <Footprints size={15} /> Steps today · tap to update
        </div>
        <div className="mt-1 text-[34px] font-bold leading-none">{d.steps.toLocaleString('en-IN')}</div>
        <Bar className="mt-3" value={d.steps} max={d.stepsTarget} />
        <div className="mt-2 flex justify-between text-[13px] text-ink3">
          <span>
            {km.toFixed(1)} km · +{kfmt(d.burn.walk)} kcal
          </span>
          <span>goal {d.stepsTarget.toLocaleString('en-IN')} ({d.program.phase.name})</span>
        </div>
      </Card>

      <Section title="Steps · last 7 days">
        <Card>
          <Columns data={week} target={d.stepsTarget} highlight={date} unit="steps" label="Steps in the last 7 days" />
        </Card>
      </Section>

      <Section title="Activity log">
        {history.length ? (
          <div className="space-y-3">
            {history.map(({ k, list }) => (
              <div key={k}>
                <div className="mb-1.5 px-1 text-[13px] font-semibold text-ink3">{fmtRel(k)}</div>
                <div className="overflow-hidden rounded-3xl border border-line bg-card">
                  {list.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium">{a.title}</div>
                        <div className="text-[12.5px] text-ink3">
                          {a.minutes} min{a.rpe ? ` · effort ${a.rpe}/10` : ''}
                          {a.pain !== undefined ? ` · pain ${a.pain}/10` : ''}
                        </div>
                      </div>
                      <div className="num text-[14px] font-semibold">+{a.kcal}</div>
                      <button
                        aria-label="Delete activity"
                        onClick={() => {
                          remove('activity', a.id)
                          toast('Removed', { label: 'Undo', run: () => put<Activity>('activity', a) })
                        }}
                        className="press p-1.5 text-ink3"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No activity logged yet" body="Workouts from your plan are logged automatically when you finish them. Add walks, sports or anything else here." />
        )}
      </Section>

      <Section title="How burn is estimated">
        <Card>
          <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-ink2">
            <li>
              <b>Base</b> — your BMR (Mifflin–St Jeor: age, height, weight) × 1.2 for everyday living: <b>{kfmt(d.burn.base)} kcal</b>.
            </li>
            <li>
              <b>Walking</b> — steps beyond the first 3,000 (already inside the base), converted with your stride (≈{Math.round(d.profile.heightCm * 0.415)} cm).
            </li>
            <li>
              <b>Activities</b> — MET values from the Compendium of Physical Activities, counting only the energy above resting, so nothing is double-counted.
            </li>
            <li>After 3 weeks of logging, Me → Insights estimates your real burn from your weight trend.</li>
          </ul>
        </Card>
      </Section>

      <NumberSheet
        open={steps}
        onClose={() => setSteps(false)}
        title="Steps today"
        unit="steps"
        initial={d.day?.steps}
        hint="Copy today's count from Google Fit / Apple Health / Samsung Health."
        presets={[3000, 5000, 7000, 8000, 10000].map((v) => ({ label: v.toLocaleString('en-IN'), value: v }))}
        onSave={(v) => patchDay(date, { steps: v })}
      />
      <AddActivity open={add} onClose={() => setAdd(false)} kg={d.kg} />
    </Page>
  )
}

function AddActivity({ open, onClose, kg }: { open: boolean; onClose: () => void; kg: number }) {
  const [type, setType] = useState(ACTIVITIES[1])
  const [minutes, setMinutes] = useState(30)
  const [when, setWhen] = useState<'today' | 'yesterday'>('today')
  const kcal = metKcal(type.met, kg, minutes)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log activity"
      accent="body"
      footer={
        <Button
          full
          size="lg"
          onClick={() => {
            const date = when === 'today' ? dkey() : addDays(dkey(), -1)
            put<Activity>('activity', { date, kind: type.id.startsWith('walk') ? 'walk' : type.id === 'mobility' || type.id === 'yoga' ? 'mobility' : 'activity', title: type.name, minutes, met: type.met, kcal })
            toast(`${type.name} logged · +${kcal} kcal`)
            onClose()
          }}
        >
          Save · +{kcal} kcal
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {ACTIVITIES.map((a) => (
          <button
            key={a.id}
            onClick={() => setType(a)}
            aria-pressed={type.id === a.id}
            className={cx('press rounded-2xl border px-3 py-2.5 text-left text-[14px] font-medium', type.id === a.id ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line bg-card')}
          >
            {a.name}
          </button>
        ))}
      </div>
      <Field label="Duration" className="mt-5">
        <div className="flex items-center justify-between rounded-2xl bg-card p-3">
          <span className="text-[15px] text-ink2">{minutes} minutes</span>
          <Stepper value={minutes} step={5} min={5} max={300} onChange={setMinutes} format={(v) => `${v}′`} />
        </div>
      </Field>
      <Field label="When" className="mt-4">
        <div className="flex gap-2">
          {(['today', 'yesterday'] as const).map((w) => (
            <button key={w} onClick={() => setWhen(w)} aria-pressed={when === w} className={cx('press h-10 flex-1 rounded-xl border text-[14px] font-semibold capitalize', when === w ? 'border-transparent bg-acc-soft text-acc' : 'border-line2 text-ink2')}>
              {w}
            </button>
          ))}
        </div>
      </Field>
    </Sheet>
  )
}
