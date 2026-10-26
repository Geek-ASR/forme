// Close the day — the 30-second evening check-in that the night reminder opens.
// Meals ("same as usual?"), water, steps, today's training, how you felt, one line about the day.
// Everything saves as you tap; "Close the day" just marks it done and shows the day back to you.

import { Check, Mic, MicOff, Moon, PenLine, Plus, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckIn } from '../components/CheckIn'
import { toast } from '../components/Toasts'
import { Button, Card, Page, Section, cx } from '../components/ui'
import { PLAN_DAYS, SESSIONS, challengeSpan, programDay } from '../data/program'
import { NIGHT_LABEL, skinNight } from '../data/skincare'
import { evaluateRoutine, patchDay, useDayData, type DayData } from '../lib/app'
import { kfmt, streak } from '../lib/calc'
import { addDays, dkey, fmtDay, fmtTime, hm } from '../lib/date'
import { entryFromFood, foodList, multiplier, nutrients, parseMeal, portionText } from '../lib/food'
import { applyOp } from '../lib/inbox'
import { useActiveDays } from '../lib/insights'
import { go, useRoute } from '../lib/router'
import { canListen, listen } from '../lib/speech'
import { put, remove, useColl } from '../lib/store'
import type { CustomFood, FoodEntry, Meal, Post } from '../lib/types'
import type { Food } from '../data/foods'

const MEALS: Meal[] = ['breakfast', 'lunch', 'snack', 'dinner']
const MEAL_LABEL: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snacks', dinner: 'Dinner' }
const WATER = [1000, 1500, 2000, 2500, 3000, 3500]

type Combo = { key: string; items: FoodEntry[]; kcal: number; names: string; days: number }

const signature = (items: FoodEntry[]) => items.map((e) => `${e.foodId ?? e.name}×${e.qty}`).sort().join('|')
const comboOf = (items: FoodEntry[]): Combo => ({
  key: signature(items),
  items,
  kcal: Math.round(items.reduce((s, e) => s + (e.kcal || 0), 0)),
  names: items.map((e) => e.name).join(', '),
  days: 1,
})

/** A meal you repeat — the same foods and portions on 2+ of the last four weeks (most frequent wins). */
function usualMeal(food: FoodEntry[], meal: Meal, date: string): Combo | null {
  const from = addDays(date, -28)
  const byDay = new Map<string, FoodEntry[]>()
  for (const e of food) if (e.meal === meal && e.date < date && e.date >= from) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e])
  const seen = new Map<string, Combo>()
  for (const [, items] of [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
    const c = seen.get(signature(items))
    if (c) c.days++
    else seen.set(signature(items), comboOf(items))
  }
  return [...seen.values()].filter((c) => c.days >= 2).sort((a, b) => b.days - a.days)[0] ?? null
}

function logCombo(c: Combo, date: string, meal: Meal) {
  const ids = c.items.map(({ id: _id, updatedAt: _u, deleted: _d, ...rest }) => put<FoodEntry>('food', { ...rest, date, meal, at: Date.now() }).id)
  toast(`${MEAL_LABEL[meal]} logged · ${kfmt(c.kcal)} kcal`, { label: 'Undo', run: () => ids.forEach((id) => remove('food', id)) })
}

export default function Evening() {
  const { query } = useRoute()
  // After midnight you're still closing the day you lived.
  const date = query.get('d') || (new Date().getHours() < 4 ? addDays(dkey(), -1) : dkey())
  const d = useDayData(date)
  const food = useColl<FoodEntry>('food')
  const custom = useColl<CustomFood>('customFoods')
  const foods = useMemo(() => foodList(custom), [custom])
  const active = useActiveDays()
  const [stepsText, setStepsText] = useState(d.day?.steps ? String(d.day.steps) : '')
  const [note, setNote] = useState('')
  const [summary, setSummary] = useState(false)

  const saveSteps = () => {
    const v = Math.round(Number(stepsText))
    if (stepsText !== '' && Number.isFinite(v) && v >= 0 && v !== d.day?.steps) patchDay(date, { steps: v })
  }

  function close() {
    saveSteps()
    if (note.trim()) put<Post>('posts', { date, type: 'journal', body: note.trim(), tags: ['evening'], createdAt: Date.now() })
    patchDay(date, { closedAt: Date.now() })
    setNote('')
    setSummary(true)
    window.scrollTo(0, 0)
  }

  if (summary) return <Closed d={d} streakDays={streak(active, date)} />

  const planned = (d.day?.flare ? [SESSIONS.flare] : d.program.sessions).filter((s) => s.mode !== 'rest')
  const mobilityDone = d.acts.some((a) => a.kind === 'mobility')
  const ml = d.day?.waterMl ?? 0
  const waterPick = WATER.reduce((best, v) => (Math.abs(v - ml) < Math.abs(best - ml) ? v : best), WATER[0])

  return (
    <Page accent="today" back="/" title="Close the day">
      <div className="mt-1 px-1 text-[14px] text-ink3">
        {fmtDay(date)}
        {d.day?.closedAt ? ` · closed at ${fmtTime(hm(new Date(d.day.closedAt)))} — change anything` : ' · about 30 seconds'}
      </div>

      <Section title="Meals" action={<span className="num text-[13px] font-semibold text-ink3">{kfmt(d.totals.kcal)} kcal</span>} className="mt-4">
        <div className="space-y-2.5">
          {MEALS.map((m) => (
            <MealRow key={m} meal={m} date={date} d={d} food={food} foods={foods} />
          ))}
        </div>
      </Section>

      <Section title="Water">
        <Card>
          <div className="flex items-baseline justify-between">
            <div className="text-[13.5px] text-ink3">Roughly how much today?</div>
            <div className="num text-[14px] font-semibold">
              {(ml / 1000).toFixed(1)} <span className="font-normal text-ink3">/ {d.settings.targets.waterMl / 1000} L</span>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-6 gap-1.5">
            {WATER.map((v) => (
              <button
                key={v}
                aria-pressed={ml > 0 && v === waterPick}
                onClick={() => patchDay(date, { waterMl: v })}
                className={cx('press h-10 rounded-xl text-[14px] font-semibold', ml > 0 && v === waterPick ? 'bg-acc-fill text-acc-on' : 'bg-card2 text-ink2')}
              >
                {v / 1000}
              </button>
            ))}
          </div>
          <div className="mt-1.5 text-right text-[12px] text-ink3">litres</div>
        </Card>
      </Section>

      <Section title="Steps">
        <Card>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              enterKeyHint="done"
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onBlur={saveSteps}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="0"
              aria-label="Steps today"
              className="field num w-32 text-[18px] font-semibold"
            />
            <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
              {[3000, 5000, 7000, 10000].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setStepsText(String(v))
                    patchDay(date, { steps: v })
                  }}
                  className="press h-10 shrink-0 rounded-xl bg-card2 px-2.5 text-[13.5px] font-semibold text-ink2"
                >
                  {v / 1000}k
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 text-[12.5px] leading-snug text-ink3">
            From your phone's step counter (Google Fit, Samsung Health, Fitbit…) · goal {d.stepsTarget.toLocaleString('en-IN')}
          </div>
        </Card>
      </Section>

      <Section title="Movement">
        <Card>
          {d.acts.length > 0 && (
            <div className="space-y-1.5">
              {d.acts.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-[14.5px]">
                  <Check size={16} strokeWidth={3} className="shrink-0 text-good" />
                  <span className="min-w-0 flex-1 truncate">{a.title}</span>
                  <span className="num text-[13px] text-ink3">{a.minutes} min</span>
                </div>
              ))}
            </div>
          )}
          {planned.length > 0 && !d.acts.some((a) => planned.some((s) => s.id === a.session)) && (
            <div className={cx(d.acts.length > 0 && 'mt-3 border-t border-line pt-3')}>
              <div className="text-[14.5px]">
                Today's plan: <b>{planned.map((s) => s.name.split(' · ')[0]).join(' + ')}</b>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  icon={<Check size={15} />}
                  onClick={() => {
                    const done = planned.flatMap((s) => applyOp({ type: 'session', id: s.id, date }) ?? [])
                    if (done.length) toast(done.map((r) => r.text).join(' · '), { label: 'Undo', run: () => done.forEach((r) => r.undo()) })
                  }}
                >
                  Did it
                </Button>
                <Button size="sm" variant="soft" onClick={() => go('/body/move?add=1')}>
                  Something else
                </Button>
              </div>
            </div>
          )}
          {!planned.length && !d.acts.length && <div className="text-[14.5px] text-ink2">Rest day — nothing planned. 🌿</div>}
          {!mobilityDone && (
            <button
              onClick={() => {
                const r = applyOp({ type: 'session', id: 'mobility', date })
                if (r) toast(r.text, { label: 'Undo', run: r.undo })
              }}
              className="press mt-3 flex w-full items-center gap-2 rounded-2xl bg-card2 px-3 py-2.5 text-left text-[14px]"
            >
              <Plus size={16} className="text-acc" />
              <span className="flex-1">I did my 10-minute mobility</span>
            </button>
          )}
        </Card>
      </Section>

      <Section>
        <CheckIn date={date} day={d.day} />
      </Section>

      <Section title="One line about today">
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional — what stood out? It goes to your journal."
          className="field font-serif text-[16px]"
          aria-label="One line about today"
        />
      </Section>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 backdrop-blur-xl">
        <div className="mx-auto max-w-xl px-4 py-3">
          <Button full size="lg" icon={<Moon size={18} />} onClick={close}>
            {d.day?.closedAt ? 'Update' : 'Close the day'}
          </Button>
        </div>
      </div>
    </Page>
  )
}

function MealRow({ meal, date, d, food, foods }: { meal: Meal; date: string; d: DayData; food: FoodEntry[]; foods: Food[] }) {
  const [typing, setTyping] = useState(false)
  const logged = d.food.filter((e) => e.meal === meal)
  const skipped = !!d.day?.skipped?.includes(meal)
  const usual = useMemo(() => usualMeal(food, meal, date), [food, meal, date])
  const yesterday = useMemo(() => {
    const items = food.filter((e) => e.meal === meal && e.date === addDays(date, -1))
    return items.length ? comboOf(items) : null
  }, [food, meal, date])
  const setSkipped = (on: boolean) => {
    const rest = (d.day?.skipped ?? []).filter((m) => m !== meal)
    patchDay(date, { skipped: on ? [...rest, meal] : rest })
  }

  if (logged.length) {
    return (
      <a href={`#/body/food${date !== dkey() ? `?d=${date}` : ''}`} className="press flex items-center gap-3 rounded-3xl border border-line bg-card px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-acc-fill text-acc-on">
          <Check size={15} strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{MEAL_LABEL[meal]}</span>
          <span className="block truncate text-[13px] text-ink3">{logged.map((e) => e.name).join(', ')}</span>
        </span>
        <span className="num text-[15px] font-semibold">{kfmt(logged.reduce((s, e) => s + (e.kcal || 0), 0))}</span>
      </a>
    )
  }
  if (skipped) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-line bg-card px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card2 text-ink3">–</span>
        <span className="flex-1 text-[15px] font-semibold text-ink3">
          {MEAL_LABEL[meal]} · {meal === 'snack' ? 'none' : 'skipped'}
        </span>
        <button onClick={() => setSkipped(false)} className="press text-[13px] font-semibold text-acc">
          Undo
        </button>
      </div>
    )
  }
  const options = [usual && { label: `Usual · ${usual.days} times`, combo: usual }, yesterday && yesterday.key !== usual?.key && { label: 'Like yesterday', combo: yesterday }].filter(
    (o): o is { label: string; combo: Combo } => !!o,
  )
  return (
    <div className="rounded-3xl border border-line bg-card p-3">
      <div className="px-1 text-[15px] font-semibold">{MEAL_LABEL[meal]}</div>
      {options.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {options.map((o) => (
            <button key={o.label} onClick={() => logCombo(o.combo, date, meal)} className="press flex w-full items-center gap-3 rounded-2xl bg-card2 px-3 py-2.5 text-left">
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-semibold uppercase tracking-wide text-acc">{o.label}</span>
                <span className="block truncate text-[14px]">{o.combo.names}</span>
              </span>
              <span className="num text-[14px] font-semibold">{kfmt(o.combo.kcal)}</span>
              <Plus size={17} className="shrink-0 text-acc" />
            </button>
          ))}
        </div>
      )}
      {typing ? (
        <TypeMeal meal={meal} date={date} foods={foods} onDone={() => setTyping(false)} />
      ) : (
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="soft" icon={<PenLine size={15} />} onClick={() => setTyping(true)}>
            Type or say it
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSkipped(true)}>
            {meal === 'snack' ? 'No snacks' : 'Skipped it'}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Inline meal entry: the same parser as Log food ("2 roti, 1 katori dal"), voice included. */
function TypeMeal({ meal, date, foods, onDone }: { meal: Meal; date: string; foods: Food[]; onDone: () => void }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const stop = useRef<() => void>(() => {})
  useEffect(() => () => stop.current(), [])
  const parsed = useMemo(() => parseMeal(text, foods), [text, foods])
  const picks = parsed.flatMap((p) => {
    const m = p.matches[0]
    return m && m.score >= 0.5 ? [{ raw: p.raw, food: m.food, mult: multiplier(m.food, p.qty, p.unit, p.size) }] : []
  })
  const missed = parsed.filter((p) => !(p.matches[0] && p.matches[0].score >= 0.5))
  const kcal = picks.reduce((s, x) => s + nutrients(x.food, x.mult).kcal, 0)

  function mic() {
    if (listening) return stop.current()
    const before = text ? text.trim() + ', ' : ''
    setListening(true)
    stop.current = listen(
      (t) => setText(before + t),
      (err) => {
        setListening(false)
        if (err && err !== 'no-speech' && err !== 'aborted') toast(err === 'not-allowed' ? 'Microphone permission denied' : 'Could not hear that — try again')
      },
    )
  }

  function save() {
    if (!picks.length) return
    const ids = picks.map((x) => put<FoodEntry>('food', entryFromFood(x.food, x.mult, date, meal)).id)
    toast(`${MEAL_LABEL[meal]} logged · ${kfmt(kcal)} kcal`, { label: 'Undo', run: () => ids.forEach((id) => remove('food', id)) })
    onDone()
  }

  return (
    <div className="mt-2">
      <div className="relative">
        <input
          autoFocus
          enterKeyHint="done"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="e.g. 2 roti, 1 katori dal, salad"
          aria-label={`What did you have for ${MEAL_LABEL[meal].toLowerCase()}`}
          className="field pr-12"
        />
        {canListen() && (
          <button
            aria-label={listening ? 'Stop listening' : 'Say it'}
            onClick={mic}
            className={cx('press absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full', listening ? 'anim-pulse bg-bad text-white' : 'bg-acc-soft text-acc')}
          >
            {listening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
        )}
      </div>
      {picks.length > 0 && (
        <div className="mt-2 space-y-1 px-1 text-[13.5px]">
          {picks.map((x) => (
            <div key={x.raw} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {x.food.name} <span className="text-ink3">· {portionText(x.mult, x.food.unit)}</span>
              </span>
              <span className="num shrink-0">{nutrients(x.food, x.mult).kcal}</span>
            </div>
          ))}
        </div>
      )}
      {missed.length > 0 && (
        <div className="mt-1.5 px-1 text-[12.5px] leading-snug text-ink3">
          Not found: {missed.map((m) => `“${m.query}”`).join(', ')} ·{' '}
          <a href={`#/body/food/add?d=${date}&meal=${meal}&text=${encodeURIComponent(text)}`} className="font-semibold text-acc">
            fix it in Log food
          </a>
        </div>
      )}
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" disabled={!picks.length} onClick={save}>
          {picks.length ? `Add · ${kfmt(kcal)} kcal` : 'Add'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/** The day, handed back to you: energy balance, the basics, the streak, and what's next. */
function Closed({ d, streakDays }: { d: DayData; streakDays: number }) {
  const t = d.settings.targets
  const balance = Math.round(d.totals.kcal - d.burn.total)
  const routine = evaluateRoutine(d)
  const tonight = NIGHT_LABEL[skinNight({ skinStart: d.profile.skinStart, date: d.date, irritated: d.day?.skinIrritated, products: d.settings.skincare.products })]
  const tomorrow = programDay(d.profile.planStart, addDays(d.date, 1), !!d.settings.training?.dumbbellKg).sessions.map((s) => s.name.split(' · ')[0]).join(' + ')
  const ate = d.totals.kcal > 0
  const challenge = challengeSpan(d.profile.planStart, d.date)
  const rows: [string, string, boolean][] = [
    ['Protein', `${Math.round(d.totals.p)} / ${t.protein} g`, d.totals.p >= t.protein],
    ['Water', `${((d.day?.waterMl ?? 0) / 1000).toFixed(1)} / ${t.waterMl / 1000} L`, (d.day?.waterMl ?? 0) >= t.waterMl],
    ['Steps', `${d.steps.toLocaleString('en-IN')} / ${d.stepsTarget.toLocaleString('en-IN')}`, d.steps >= d.stepsTarget],
    ['Routine', `${routine.filter((r) => r.done).length} of ${routine.length}`, routine.every((r) => r.done)],
  ]
  return (
    <Page accent="today" back="/" title="Day closed">
      <div className="flex flex-col items-center pt-4 text-center">
        <div className="anim-pop flex h-16 w-16 items-center justify-center rounded-full bg-acc-fill text-acc-on">
          <Check size={32} strokeWidth={3} />
        </div>
        <div className="mt-3 text-[22px] font-bold">That's the day.</div>
        <div className="text-[14px] text-ink3">
          {fmtDay(d.date)}
          {challenge.dayNo >= 1 && challenge.dayNo <= PLAN_DAYS ? ` · Day ${challenge.dayNo} of ${PLAN_DAYS}` : ''}
        </div>
      </div>

      <Card className="mt-5">
        <div className="grid grid-cols-3 text-center">
          <div>
            <div className="num text-[20px] font-semibold">{kfmt(d.totals.kcal)}</div>
            <div className="text-[12px] text-ink3">eaten</div>
          </div>
          <div>
            <div className="num text-[20px] font-semibold">{kfmt(d.burn.total)}</div>
            <div className="text-[12px] text-ink3">burned ≈</div>
          </div>
          <div>
            <div className={cx('num text-[20px] font-semibold', ate && (balance <= 0 ? 'text-good' : 'text-bad'))}>
              {ate ? `${balance > 0 ? '+' : '−'}${kfmt(Math.abs(balance))}` : '–'}
            </div>
            <div className="text-[12px] text-ink3">balance</div>
          </div>
        </div>
        <div className="mt-3 text-center text-[13.5px] leading-snug text-ink2">
          {!ate
            ? 'No food logged today — that’s fine, tomorrow counts too.'
            : balance <= -300
              ? `About ${kfmt(-balance)} kcal under — that’s the gap that moves the scale.`
              : balance < 300
                ? 'Roughly even today.'
                : 'Over today. One day changes nothing — tomorrow is a fresh page.'}
        </div>
      </Card>

      <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-card">
        {rows.map(([label, value, ok]) => (
          <div key={label} className="flex items-center justify-between border-b border-line px-4 py-2.5 last:border-b-0">
            <span className="text-[14.5px] text-ink2">{label}</span>
            <span className={cx('num text-[14.5px] font-semibold', ok && 'text-good')}>
              {value}
              {ok ? ' ✓' : ''}
            </span>
          </div>
        ))}
      </div>

      {streakDays >= 2 && (
        <Card className="mt-3">
          <div className="text-[15px] font-semibold">🔥 {streakDays} days of showing up</div>
          <div className="mt-0.5 text-[13px] text-ink3">A single day off never breaks it.</div>
        </Card>
      )}

      <Card className="mt-3" href="#/body/skin">
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="shrink-0 text-acc" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">Tonight: {tonight}</div>
            <div className="truncate text-[13px] text-ink3">Tomorrow: {tomorrow}</div>
          </div>
        </div>
      </Card>

      <Button full size="lg" className="mt-5" onClick={() => go('/', true)}>
        Done
      </Button>
    </Page>
  )
}
