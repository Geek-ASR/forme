import { useMemo, useState } from 'react'
import { toast } from '../../components/Toasts'
import { Button, Card, Field, Page, Section, Segmented, Stat } from '../../components/ui'
import { useByDate } from '../../lib/app'
import { kfmt, weightTrend } from '../../lib/calc'
import { addDays, dkey, fmtDay, isoWeek, weekStart } from '../../lib/date'
import { sumEntries } from '../../lib/food'
import { get, put, useColl } from '../../lib/store'
import type { Activity, BodyEntry, Day, DeLog, FoodEntry, Post, Review } from '../../lib/types'

const PROMPTS: { k: keyof Review; label: string; ph: string }[] = [
  { k: 'wins', label: 'Wins this week', ph: 'What went well — even small things?' },
  { k: 'hard', label: 'What was hard', ph: 'Where did you struggle, and why?' },
  { k: 'learned', label: 'What I learned', ph: 'About your body, your mind, your habits…' },
  { k: 'focus', label: 'Focus for next week', ph: 'One or two things that matter most.' },
]

export default function WeeklyReview() {
  const [which, setWhich] = useState<'this' | 'last'>(new Date().getDay() === 0 ? 'this' : 'last')
  const mon = weekStart(which === 'this' ? dkey() : addDays(dkey(), -7))
  const week = isoWeek(mon)
  const keys = Array.from({ length: 7 }, (_, i) => addDays(mon, i))
  const foodBy = useByDate<FoodEntry>('food')
  const actBy = useByDate<Activity>('activity')
  const deBy = useByDate<DeLog>('deLog')
  const postBy = useByDate<Post>('posts')
  const days = useColl<Day>('days')
  const body = useColl<BodyEntry>('body')
  const reviews = useColl<Review>('reviews').sort((a, b) => (a.week < b.week ? 1 : -1))
  const existing = get<Review>('reviews', week)
  const [form, setForm] = useState<Partial<Review>>(existing ?? {})
  const [loaded, setLoaded] = useState(week)
  if (loaded !== week) {
    setLoaded(week)
    setForm(get<Review>('reviews', week) ?? {})
  }

  const stats = useMemo(() => {
    const dm = new Map(days.map((d) => [d.id, d]))
    const logged = keys.filter((k) => foodBy.get(k)?.length)
    const avg = (xs: (number | undefined)[]) => {
      const v = xs.filter((x): x is number => x !== undefined)
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined
    }
    const trend = weightTrend(body)
    const at = (k: string) => trend.find((t) => t.date === k)?.trend
    const startKg = at(addDays(mon, -1)) ?? at(mon)
    const endKg = at(keys[6]) ?? trend.filter((t) => t.date <= keys[6]).pop()?.trend
    return {
      kcal: avg(logged.map((k) => sumEntries(foodBy.get(k)!).kcal)),
      protein: avg(logged.map((k) => sumEntries(foodBy.get(k)!).p)),
      logged: logged.length,
      workouts: keys.reduce((s, k) => s + (actBy.get(k) ?? []).filter((a) => a.kind !== 'mobility').length, 0),
      mobility: keys.filter((k) => (actBy.get(k) ?? []).some((a) => a.kind === 'mobility')).length,
      steps: avg(keys.map((k) => dm.get(k)?.steps)),
      sleep: avg(keys.map((k) => dm.get(k)?.sleepH)),
      pain: avg(keys.map((k) => dm.get(k)?.pain)),
      mood: avg(keys.map((k) => dm.get(k)?.mood)),
      german: keys.reduce((s, k) => s + (deBy.get(k) ?? []).reduce((a, x) => a + x.minutes, 0), 0),
      writing: keys.reduce((s, k) => s + (postBy.get(k)?.length ?? 0), 0),
      kgChange: startKg !== undefined && endKg !== undefined ? endKg - startKg : undefined,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mon, foodBy, actBy, deBy, postBy, days, body])

  const f1 = (v: number | undefined, d = 1) => (v === undefined ? '–' : v.toFixed(d))

  function save() {
    put<Review>('reviews', {
      ...form,
      id: week,
      week,
      createdAt: form.createdAt ?? Date.now(),
      stats: {
        kcal: Math.round(stats.kcal ?? 0),
        protein: Math.round(stats.protein ?? 0),
        workouts: stats.workouts,
        steps: Math.round(stats.steps ?? 0),
        sleep: Number(f1(stats.sleep)) || 0,
        pain: Number(f1(stats.pain)) || 0,
        german: stats.german,
        kgChange: Number((stats.kgChange ?? 0).toFixed(2)),
      },
    })
    toast('Weekly review saved 🌱')
  }

  return (
    <Page accent="me" back="/me" title="Weekly review">
      <div className="mt-1">
        <Segmented
          options={[
            { value: 'last', label: 'Last week' },
            { value: 'this', label: 'This week' },
          ]}
          value={which}
          onChange={setWhich}
        />
      </div>
      <div className="mt-2 px-1 text-[13px] text-ink3">
        {fmtDay(keys[0])} – {fmtDay(keys[6])} · {week}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="Weight trend" value={stats.kgChange === undefined ? '–' : `${stats.kgChange <= 0 ? '−' : '+'}${Math.abs(stats.kgChange).toFixed(1)}`} unit="kg" />
        <Stat label="Avg calories" value={stats.kcal === undefined ? '–' : kfmt(stats.kcal)} sub={`${stats.logged}/7 days logged`} />
        <Stat label="Workouts" value={stats.workouts} sub={`mobility ${stats.mobility}/7 days`} />
        <Stat label="Avg steps" value={stats.steps === undefined ? '–' : kfmt(stats.steps)} />
        <Stat label="Sleep · pain" value={`${f1(stats.sleep)} h`} sub={`pain ${f1(stats.pain)}/10 · mood ${f1(stats.mood)}/5`} />
        <Stat label="German · writing" value={`${stats.german} min`} sub={`${stats.writing} entries`} />
      </div>

      <Section title="Reflect">
        <div className="space-y-4">
          {PROMPTS.map((p) => (
            <Field key={p.k} label={p.label}>
              <textarea rows={3} className="field font-serif text-[16px]" placeholder={p.ph} value={String(form[p.k] ?? '')} onChange={(e) => setForm({ ...form, [p.k]: e.target.value })} />
            </Field>
          ))}
          <Button full size="lg" onClick={save}>
            Save review
          </Button>
        </div>
      </Section>

      {reviews.filter((r) => r.week !== week).length > 0 && (
        <Section title="Past reviews">
          <div className="space-y-2.5">
            {reviews
              .filter((r) => r.week !== week)
              .slice(0, 12)
              .map((r) => (
                <Card key={r.id}>
                  <div className="text-[13px] font-semibold text-acc">{r.week}</div>
                  {r.focus && (
                    <div className="mt-1 text-[14px]">
                      <b>Focus:</b> {r.focus}
                    </div>
                  )}
                  {r.wins && <div className="mt-1 font-serif text-[14.5px] text-ink2">{r.wins}</div>}
                  {r.stats && (
                    <div className="mt-2 text-[12.5px] text-ink3">
                      {r.stats.kgChange !== undefined && `${Number(r.stats.kgChange) <= 0 ? '−' : '+'}${Math.abs(Number(r.stats.kgChange)).toFixed(1)} kg · `}
                      {r.stats.workouts} workouts · {r.stats.german} min German
                    </div>
                  )}
                </Card>
              ))}
          </div>
        </Section>
      )}
    </Page>
  )
}
