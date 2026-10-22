import { Check, ChevronRight, ClipboardList, Flame, HeartPulse, PersonStanding } from 'lucide-react'
import { Bar, Card, Page, Pill, Section, cx } from '../../components/ui'
import { PHASES, SESSIONS, WEEK_PLAN, programDay, sessionMinutes } from '../../data/program'
import { useByDate, useProfile } from '../../lib/app'
import { addDays, dkey, dowShort, fmtDay, weekday, weekStart } from '../../lib/date'
import type { Activity } from '../../lib/types'

const PRINCIPLES = [
  ['Movement is medicine', 'For a stiff, inflamed spine, regular movement is one of the most effective treatments there is. Consistency beats intensity, every time.'],
  ['The pain traffic light', '0–3/10 during exercise is fine. 4–5: switch to the easier variation. 6+ or pain that is worse the next morning: do Flare care instead and tell your doctor or physio if it keeps happening.'],
  ['Nothing leaves the floor', 'No jumping, no stairs-as-cardio. Joints that hurt on stairs or fast walking get strength first, impact much later (if ever).'],
  ['Warm up the spine first', 'Morning mobility works best after a warm shower, before stiffness sets for the day.'],
  ['Posture is trained, not held', 'Upper-back extension, chin tucks and deep rib breathing protect your posture and chest expansion over the years.'],
  ['Recovery counts', 'Sleep, protein and rest days are when muscle is actually built and fat actually lost.'],
]

export default function Plan() {
  const { profile } = useProfile()
  const today = dkey()
  const p = programDay(profile.planStart, today)
  const acts = useByDate<Activity>('activity')
  const mon = weekStart(today)
  const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i))

  return (
    <Page accent="body" back="/body" title="Workout plan">
      <Card className="mt-1">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-acc">
          Phase {p.phase.n} · weeks {p.phase.weeks[0]}–{p.phase.weeks[1]}
        </div>
        <div className="mt-1 text-[24px] font-bold">{p.phase.name}</div>
        <p className="mt-1 text-[14px] leading-relaxed text-ink2">{p.phase.focus}</p>
        <div className="mt-3 flex items-center justify-between text-[13px] text-ink3">
          <span>
            {p.before ? 'Starts ' + fmtDay(profile.planStart) : `Day ${Math.min(p.day, p.totalDays)} of ${p.totalDays} · week ${p.week}`}
          </span>
          <span>{p.phase.steps.toLocaleString('en-IN')} steps/day</span>
        </div>
        <Bar className="mt-2" value={Math.max(0, p.day)} max={p.totalDays} height={6} />
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {PHASES.map((ph) => (
            <div key={ph.n} className={cx('rounded-xl px-2 py-2 text-center', ph.n === p.phase.n ? 'bg-acc-fill text-acc-on' : 'bg-card2 text-ink3')}>
              <div className="text-[12px] font-semibold">{ph.name}</div>
              <div className="text-[10.5px] opacity-80">
                wk {ph.weeks[0]}–{ph.weeks[1]}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {p.benchmark && (
        <Card className="mt-3" href="#/body/weight?bench=1">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-acc" size={22} />
            <div className="flex-1">
              <div className="text-[15px] font-semibold">Benchmark week</div>
              <div className="text-[13px] text-ink3">Log push-ups, plank, wall sit, 30-s chair stands, waist & chest expansion to see progress.</div>
            </div>
            <ChevronRight size={18} className="text-ink3" />
          </div>
        </Card>
      )}

      <Section title="This week">
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {week.map((k) => {
            const ids = WEEK_PLAN[weekday(k)]
            const done = (acts.get(k) ?? []).some((a) => a.kind !== 'mobility')
            const isToday = k === today
            return (
              <a
                key={k}
                href={ids[0] === 'rest' ? '#/body/plan' : `#/body/workout/${ids[0]}`}
                className={cx('press flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0', isToday && 'bg-acc-soft')}
              >
                <div className={cx('w-10 text-center', isToday ? 'text-acc' : 'text-ink3')}>
                  <div className="text-[12px] font-semibold uppercase">{dowShort(weekday(k))}</div>
                  <div className="text-[16px] font-bold text-ink">{Number(k.slice(8))}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{ids.map((id) => SESSIONS[id].name.split(' · ')[0]).join(' + ')}</div>
                  <div className="text-[12.5px] text-ink3">
                    {ids[0] === 'rest' ? 'mobility · easy walk · review' : `${ids.reduce((s, id) => s + sessionMinutes(SESSIONS[id], p.phase.n), 0)} min`}
                  </div>
                </div>
                {done ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-acc-fill text-acc-on">
                    <Check size={15} strokeWidth={3} />
                  </span>
                ) : (
                  <ChevronRight size={18} className="text-ink3" />
                )}
              </a>
            )
          })}
        </div>
      </Section>

      <Section title="Every day">
        <div className="space-y-2.5">
          <Card href="#/body/workout/mobility">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc-soft text-acc">
                <PersonStanding size={21} />
              </div>
              <div className="flex-1">
                <div className="text-[15.5px] font-semibold">Morning mobility</div>
                <div className="text-[13px] text-ink3">{sessionMinutes(SESSIONS.mobility, 1)} min · ten moves for the whole spine</div>
              </div>
              <Pill>Start</Pill>
            </div>
          </Card>
          <Card href="#/body/workout/flare">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc-soft text-acc">
                <HeartPulse size={21} />
              </div>
              <div className="flex-1">
                <div className="text-[15.5px] font-semibold">Flare care</div>
                <div className="text-[13px] text-ink3">For high-pain days — replaces the workout</div>
              </div>
              <ChevronRight size={18} className="text-ink3" />
            </div>
          </Card>
        </div>
      </Section>

      <Section title="All sessions">
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {['strengthA', 'strengthB', 'circuit', 'cardio', 'posture', 'walk', 'longwalk'].map((id) => {
            const s = SESSIONS[id]
            return (
              <a key={id} href={`#/body/workout/${id}`} className="press flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <Flame size={18} className="text-acc" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{s.name}</div>
                  <div className="truncate text-[12.5px] text-ink3">{s.desc}</div>
                </div>
                <span className="text-[13px] text-ink3">{sessionMinutes(s, p.phase.n)}′</span>
              </a>
            )
          })}
        </div>
      </Section>

      <Section title="Principles">
        <div className="space-y-2.5">
          {PRINCIPLES.map(([t, d]) => (
            <Card key={t}>
              <div className="text-[15px] font-semibold">{t}</div>
              <div className="mt-1 text-[13.5px] leading-relaxed text-ink2">{d}</div>
            </Card>
          ))}
          <p className="px-1 text-[12.5px] leading-relaxed text-ink3">
            This plan is general guidance, not medical advice. Check it with your rheumatologist or a physiotherapist — especially if pain is getting worse.
          </p>
        </div>
      </Section>
    </Page>
  )
}
