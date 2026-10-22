import { useMemo, useState } from 'react'
import { MoodMonth } from '../../components/charts'
import { Card, IconButton, Page, Section, Segmented, Stat } from '../../components/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useByDate, useProfile } from '../../lib/app'
import { adaptiveTdee, bmr, kfmt, weightTrend } from '../../lib/calc'
import { lastNDays, monShort } from '../../lib/date'
import { sumEntries } from '../../lib/food'
import { useFindings } from '../../lib/insights'
import { useColl } from '../../lib/store'
import type { Activity, BodyEntry, Day, DeLog, FoodEntry, Post } from '../../lib/types'

export default function Insights() {
  const { profile } = useProfile()
  const foodBy = useByDate<FoodEntry>('food')
  const actBy = useByDate<Activity>('activity')
  const deBy = useByDate<DeLog>('deLog')
  const postBy = useByDate<Post>('posts')
  const days = useColl<Day>('days')
  const body = useColl<BodyEntry>('body')
  const findings = useFindings()
  const [span, setSpan] = useState<'7' | '30'>('7')
  const [monthOffset, setMonthOffset] = useState(0)

  const trend = useMemo(() => weightTrend(body), [body])
  const intake = useMemo(() => new Map([...foodBy.entries()].map(([d, list]) => [d, sumEntries(list).kcal])), [foodBy])
  const tdee = adaptiveTdee(intake, trend)
  const lastKg = trend[trend.length - 1]?.trend ?? profile.startWeightKg
  const formula = Math.round(bmr(profile, lastKg) * 1.2)

  const keys = lastNDays(Number(span))
  const dayMap = new Map(days.map((d) => [d.id, d]))
  const avg = (xs: (number | undefined)[]) => {
    const v = xs.filter((x): x is number => x !== undefined)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const loggedDays = keys.filter((k) => (foodBy.get(k)?.length ?? 0) > 0)
  const kcalAvg = avg(loggedDays.map((k) => intake.get(k)))
  const protAvg = avg(loggedDays.map((k) => sumEntries(foodBy.get(k) ?? []).p))
  const stepsAvg = avg(keys.map((k) => dayMap.get(k)?.steps))
  const sleepAvg = avg(keys.map((k) => dayMap.get(k)?.sleepH))
  const painAvg = avg(keys.map((k) => dayMap.get(k)?.pain))
  const moodAvg = avg(keys.map((k) => dayMap.get(k)?.mood))
  const workouts = keys.reduce((s, k) => s + (actBy.get(k) ?? []).filter((a) => a.kind !== 'mobility').length, 0)
  const deMin = keys.reduce((s, k) => s + (deBy.get(k) ?? []).reduce((a, x) => a + x.minutes, 0), 0)
  const entries = keys.reduce((s, k) => s + (postBy.get(k)?.length ?? 0), 0)
  const f1 = (v: number | null, d = 1) => (v === null ? '–' : v.toFixed(d))

  const m = new Date()
  m.setDate(1)
  m.setMonth(m.getMonth() + monthOffset)
  const moods = new Map(days.filter((d) => d.mood).map((d) => [d.id, d.mood!]))

  return (
    <Page accent="me" back="/me" title="Insights">
      <Section title="Your real burn" className="mt-2">
        <Card>
          {tdee ? (
            <>
              <div className="text-[30px] font-bold leading-none">
                {kfmt(tdee.tdee)} <span className="text-[14px] font-medium text-ink3">kcal / day</span>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink2">
                Over the last {tdee.days} logged days you ate {kfmt(tdee.avgIntake)} kcal on average and your trend moved {tdee.weeklyKg <= 0 ? '−' : '+'}
                {Math.abs(tdee.weeklyKg).toFixed(2)} kg/week. That implies your body actually burns about {kfmt(tdee.tdee)} kcal a day (formula estimate: {kfmt(formula)} + activity).
              </p>
            </>
          ) : (
            <p className="text-[14px] leading-relaxed text-ink2">
              After about three weeks of logging food most days and weighing in regularly, Forme will estimate what your body really burns — usually more accurate than any formula.
            </p>
          )}
        </Card>
      </Section>

      <Section title="Averages" action={<div className="w-36"><Segmented options={[{ value: '7', label: '7 d' }, { value: '30', label: '30 d' }]} value={span} onChange={setSpan} /></div>}>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Calories (logged days)" value={kcalAvg === null ? '–' : kfmt(kcalAvg)} unit="kcal" sub={`${loggedDays.length} of ${keys.length} days logged`} />
          <Stat label="Protein" value={f1(protAvg, 0)} unit="g" />
          <Stat label="Steps" value={stepsAvg === null ? '–' : kfmt(stepsAvg)} />
          <Stat label="Sleep" value={f1(sleepAvg)} unit="h" />
          <Stat label="Pain" value={f1(painAvg)} unit="/10" />
          <Stat label="Mood" value={f1(moodAvg)} unit="/5" />
          <Stat label="Workouts" value={workouts} />
          <Stat label="German" value={deMin} unit="min" sub={`${entries} writing entr${entries === 1 ? 'y' : 'ies'}`} />
        </div>
      </Section>

      <Section title="What your data says">
        {findings.length ? (
          <div className="space-y-2.5">
            {findings.map((f) => {
              const diff = f.a.value - f.b.value
              const good = f.better === 'lower' ? diff < 0 : diff > 0
              return (
                <Card key={f.title}>
                  <div className="text-[15px] font-semibold">{f.title}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-2xl bg-card2 p-2.5">
                      <div className="text-[20px] font-bold">{f.a.value.toFixed(1)}</div>
                      <div className="text-[12px] text-ink3">
                        {f.a.label} · {f.a.n} d
                      </div>
                    </div>
                    <div className="rounded-2xl bg-card2 p-2.5">
                      <div className="text-[20px] font-bold">{f.b.value.toFixed(1)}</div>
                      <div className="text-[12px] text-ink3">
                        {f.b.label} · {f.b.n} d
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-[13px] text-ink2">
                    {Math.abs(diff) < 0.3 ? 'No real difference yet.' : `${good ? 'Better' : 'Worse'} by ${Math.abs(diff).toFixed(1)}${f.unit} when ${f.a.label}.`} Correlation, not proof — but worth noticing.
                  </p>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <p className="text-[14px] leading-relaxed text-ink2">
              Keep doing the daily check-in (mood, pain, sleep). After a few weeks, Forme compares your good and bad days — sleep vs pain, movement vs next-morning stiffness, steps vs mood — so you learn what actually helps your body.
            </p>
          </Card>
        )}
      </Section>

      <Section
        title={`Mood · ${monShort(m.getMonth())} ${m.getFullYear()}`}
        action={
          <div className="flex">
            <IconButton label="Previous month" onClick={() => setMonthOffset(monthOffset - 1)}>
              <ChevronLeft size={18} />
            </IconButton>
            <IconButton label="Next month" onClick={() => setMonthOffset(Math.min(0, monthOffset + 1))}>
              <ChevronRight size={18} />
            </IconButton>
          </div>
        }
      >
        <Card>
          <MoodMonth year={m.getFullYear()} month={m.getMonth()} moods={moods} label="Mood calendar" />
        </Card>
      </Section>
    </Page>
  )
}
