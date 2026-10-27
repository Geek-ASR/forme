// The 120-day challenge at a glance: every day as a square, the milestones, and how far you've come.

import { Check, Lock, Mail } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, Card, Page, Section, cx } from '../components/ui'
import { MILESTONES, PHASES, PLAN_DAYS, challengeSpan } from '../data/program'
import { useProfile } from '../lib/app'
import { streak, weightOn } from '../lib/calc'
import { addDays, dkey, fmtDay, fmtLong, rangeKeys } from '../lib/date'
import { heatLevel, useActiveDays, useShowingUp } from '../lib/insights'
import { useColl } from '../lib/store'
import type { Activity, BodyEntry, Letter } from '../lib/types'

const PART_LABEL: Record<string, string> = { food: 'food', moved: 'moved', steps: 'steps', water: 'water', german: 'German', wrote: 'wrote', checkin: 'check-in' }

/** Longest run of active days where a single missed day is forgiven (same rule as `streak`). */
function bestRun(dates: string[], active: Set<string>): number {
  let best = 0
  let run = 0
  let miss = 0
  for (const d of dates) {
    if (active.has(d)) {
      run++
      miss = 0
      best = Math.max(best, run)
    } else if (++miss > 1) run = 0
  }
  return best
}

export default function Challenge() {
  const { profile } = useProfile()
  const today = dkey()
  const c = challengeSpan(profile.planStart, today)
  const shownDays = c.before ? 0 : Math.min(c.dayNo, PLAN_DAYS)
  const scores = useShowingUp(shownDays, c.after ? c.finish : today)
  const acts = useColl<Activity>('activity')
  const body = useColl<BodyEntry>('body')
  const letters = useColl<Letter>('letters')
  const [sel, setSel] = useState<number | null>(null)

  const logged = useActiveDays()
  const byDate = useMemo(() => new Map(scores.map((s) => [s.date, s])), [scores])
  const days = useMemo(() => rangeKeys(c.start, c.finish), [c.start, c.finish])
  const lastDay = c.after ? c.finish : today
  // Showing up = logging anything that day (same rule as Today's streak); the score only sets the shade.
  const active = useMemo(() => new Set(days.filter((d) => d <= lastDay && logged.has(d))), [days, lastDay, logged])
  const workouts = acts.filter((a) => a.date >= c.start && a.date <= lastDay && a.kind !== 'mobility').length
  const startKg = useMemo(() => {
    const first = body.filter((b) => b.kg && b.date >= addDays(c.start, -3)).sort((a, b) => (a.date < b.date ? -1 : 1))[0]
    return first?.kg ?? profile.startWeightKg
  }, [body, c.start, profile.startWeightKg])
  const nowKg = weightOn(body, lastDay, startKg)
  const letter = letters.find((l) => l.openOn === c.finish)
  const s = sel !== null ? days[sel] : null
  const sScore = s ? byDate.get(s) : undefined

  return (
    <Page accent="today" back="/" title="120-day challenge">
      <div className="hero mt-1 rounded-3xl p-4">
        {c.before ? (
          <>
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-hero-gold">Starts {fmtDay(c.start)}</div>
            <div className="font-display mt-1 text-[30px] font-semibold leading-tight">{1 - c.dayNo === 1 ? 'Tomorrow' : `In ${1 - c.dayNo} days`}</div>
          </>
        ) : (
          <>
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-hero-gold">{c.after ? 'Finished' : `Day ${c.dayNo} of ${PLAN_DAYS}`}</div>
            <div className="font-display mt-1 text-[30px] font-semibold leading-tight">{c.after ? `${active.size} of ${PLAN_DAYS} days 🎉` : c.left === 0 ? 'Finish line today 🏁' : `${c.left} day${c.left === 1 ? '' : 's'} to go`}</div>
          </>
        )}
        <div className="mt-0.5 text-[13.5px] text-hero-ink2">
          {fmtLong(c.start)} → {fmtLong(c.finish)}
        </div>
        <Bar className="mt-3" value={shownDays} max={PLAN_DAYS} height={6} color="var(--sheen)" track="var(--hero-track)" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card>
          <div className="text-[12.5px] font-medium text-ink3">Showed up</div>
          <div className="mt-1 text-[22px] font-semibold leading-none">
            {active.size}
            <span className="text-[13px] font-normal text-ink3"> / {shownDays} days</span>
          </div>
        </Card>
        <Card>
          <div className="text-[12.5px] font-medium text-ink3">Streak</div>
          <div className="mt-1 text-[22px] font-semibold leading-none">
            {streak(active, today)}
            <span className="text-[13px] font-normal text-ink3"> · best {bestRun(days.filter((d) => d <= lastDay), active)}</span>
          </div>
        </Card>
        <Card>
          <div className="text-[12.5px] font-medium text-ink3">Workouts &amp; walks</div>
          <div className="mt-1 text-[22px] font-semibold leading-none">{workouts}</div>
        </Card>
        <Card href="#/body/weight">
          <div className="text-[12.5px] font-medium text-ink3">Weight</div>
          <div className="mt-1 text-[22px] font-semibold leading-none">
            {nowKg.toFixed(1)}
            {Math.abs(nowKg - startKg) >= 0.1 ? (
              <span className={cx('text-[13px] font-semibold', nowKg < startKg ? 'text-good' : 'text-ink3')}>
                {' '}
                {nowKg < startKg ? '−' : '+'}
                {Math.abs(nowKg - startKg).toFixed(1)} kg
              </span>
            ) : (
              <span className="text-[13px] font-normal text-ink3"> kg</span>
            )}
          </div>
        </Card>
      </div>

      <Section title="Every day" action={<span className="text-[12.5px] text-ink3">one day off never breaks a streak</span>}>
        <Card>
          <div className="grid grid-cols-10 gap-1.5" role="group" aria-label="The 120 days">
            {days.map((d, i) => {
              const n = i + 1
              const sc = byDate.get(d)
              const past = d <= lastDay
              const level = active.has(d) ? Math.max(1, sc ? heatLevel(sc.score) : 1) : 0
              const milestone = MILESTONES.some((m) => m.day === n)
              return (
                <button
                  key={d}
                  disabled={!past}
                  onClick={() => setSel(i)}
                  aria-label={`Day ${n}, ${fmtLong(d)}${past ? `, ${Math.round((sc?.score ?? 0) * 100)}%` : ''}`}
                  className={cx(
                    'flex aspect-square items-center justify-center rounded-[6px] text-[9.5px] font-bold',
                    !past && 'border border-dashed border-line2 text-ink3',
                    d === today && 'ring-2 ring-acc ring-offset-1 ring-offset-card',
                    sel === i && 'outline outline-2 outline-[var(--ink)]',
                    level >= 3 ? 'text-[var(--heat-on)]' : 'text-ink2',
                  )}
                  style={past ? { background: `var(--heat${level})` } : undefined}
                >
                  {milestone ? n : ''}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex min-h-[38px] items-start justify-between gap-3 text-[12.5px] text-ink3">
            {s ? (
              <span>
                <b className="text-ink2">
                  Day {sel! + 1} · {fmtDay(s)}
                </b>
                <br />
                {Object.entries(sScore?.parts ?? {})
                  .filter(([, v]) => v)
                  .map(([k]) => PART_LABEL[k] ?? k)
                  .join(', ') || (active.has(s) ? 'Showed up' : 'Nothing logged')}{' '}
                ·{' '}
                <a href={`#/evening?d=${s}`} className="font-semibold text-acc">
                  open this day
                </a>
              </span>
            ) : (
              <span>Tap a day. Darker = more of food, movement, steps, water, German, writing and check-in.</span>
            )}
            <span className="flex shrink-0 items-center gap-1 pt-0.5">
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className="inline-block h-[10px] w-[10px] rounded-[3px]" style={{ background: `var(--heat${l})` }} />
              ))}
            </span>
          </div>
        </Card>
      </Section>

      <Section title="Milestones">
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {MILESTONES.map((m) => {
            const date = addDays(c.start, m.day - 1)
            const done = !c.before && c.dayNo > m.day
            const now = c.dayNo === m.day
            return (
              <div key={m.day} className={cx('flex gap-3 border-b border-line px-4 py-3 last:border-b-0', now && 'bg-acc-soft')}>
                <span
                  className={cx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                    done ? 'bg-acc-fill text-acc-on' : now ? 'border-2 border-acc text-acc' : 'border-2 border-line2 text-ink3',
                  )}
                >
                  {done ? <Check size={16} strokeWidth={3} /> : m.day}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">
                    Day {m.day} · {m.title}
                  </div>
                  <div className="text-[12.5px] text-ink3">{fmtDay(date)}</div>
                  <div className="mt-0.5 text-[13.5px] leading-snug text-ink2">{m.what}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Phases">
        <div className="space-y-2">
          {PHASES.map((ph) => {
            const from = (ph.weeks[0] - 1) * 7 + 1
            const to = ph.n === 4 ? PLAN_DAYS : ph.weeks[1] * 7
            const cur = !c.before && !c.after && c.dayNo >= from && c.dayNo <= to
            return (
              <div key={ph.n} className={cx('flex items-center gap-3 rounded-2xl border px-4 py-2.5', cur ? 'border-acc bg-acc-soft' : 'border-line bg-card')}>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold">{ph.name}</div>
                  <div className="truncate text-[12.5px] text-ink3">{ph.focus}</div>
                </div>
                <div className="shrink-0 text-right text-[12px] text-ink3">
                  Day {from}–{to}
                  <br />
                  {fmtDay(addDays(c.start, from - 1)).replace(/^\w+, /, '')}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Day 120">
        {letter ? (
          <Card>
            <div className="flex items-center gap-3">
              <Lock size={18} className="shrink-0 text-ink3" />
              <div className="text-[14.5px]">
                Your letter is sealed until <b>{fmtLong(c.finish)}</b>.
              </div>
            </div>
          </Card>
        ) : (
          <Card href="#/me/letters?write=1">
            <div className="flex items-center gap-3">
              <Mail size={20} className="shrink-0 text-acc" />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">Write to Day-120 you</div>
                <div className="text-[13px] text-ink3">Why you started, what you hope has changed. Sealed until {fmtLong(c.finish)}.</div>
              </div>
            </div>
          </Card>
        )}
      </Section>
    </Page>
  )
}
