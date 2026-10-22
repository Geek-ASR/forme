import { Check, ChevronRight, ClipboardList, Dumbbell, ExternalLink, Flame, HeartPulse, PersonStanding } from 'lucide-react'
import { toast } from '../../components/Toasts'
import { Bar, Button, Card, Page, Pill, Section, Toggle, cx } from '../../components/ui'
import { DB_VOLUME, PHASES, SESSIONS, programDay, sessionMinutes, weekPlanFor } from '../../data/program'
import { saveSettings, useByDate, useProfile, useSettings, useWeightNow } from '../../lib/app'
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

const SCIENCE = [
  {
    t: 'Why 5 kg is enough to build muscle',
    d: 'Meta-analyses comparing light and heavy training found similar muscle growth when sets are taken close to failure — heavy loads mainly win for maximal strength. So every set here ends with only 1–3 reps left in the tank, using slow lowering, pauses and one-leg / one-arm work to make 5 kg feel heavy.',
  },
  {
    t: 'Volume and frequency',
    d: 'Muscle growth rises with weekly hard sets up to at least ~10 per muscle, and training each muscle twice a week beats once. The upper/lower split hits every muscle twice, at the volumes below.',
  },
  {
    t: 'The progression ladder (fixed dumbbells)',
    d: 'When you hit the top of the rep range on every set, climb one rung: slower lowering (4 s) → pause at the hardest point → 1½ reps → the harder variation (e.g. split squat → Bulgarian split squat) → one extra set. Forme shows last time’s reps and flags “progress” for you. When legs outgrow the ladder, adjustable dumbbells (2.5–15 kg) are the next buy.',
  },
  {
    t: 'Abs: built in the gym, revealed in the kitchen',
    d: 'Ab exercises don’t burn belly fat — spot reduction has been tested and doesn’t work. They build the muscle; a calorie deficit reveals it. A visible six-pack in men usually appears around 10–12% body fat, upper abs around 14–15%.',
  },
  {
    t: 'The V-taper look',
    d: '“Muscular and lean” is mostly wide shoulders and back over a small waist. That’s why side-delt raises and rows appear twice a week, and why the waist work is anti-rotation and anti-bending — stability, not bulk.',
  },
]

const SOURCES = [
  { label: 'Low- vs high-load training: similar hypertrophy near failure (meta-analysis, JSCR 2017)', url: 'https://pubmed.ncbi.nlm.nih.gov/28834797/' },
  { label: 'Weekly sets dose-response for muscle growth (J Sports Sci 2017)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6303131/' },
  { label: 'Training each muscle 2×/week vs once (Sports Med 2016) — review', url: 'https://www.strongerbyscience.com/frequency/' },
  { label: 'Proximity to failure and hypertrophy (Sports Med 2023)', url: 'https://dro.deakin.edu.au/articles/journal_contribution/Influence_of_Resistance_Training_Proximity-to-Failure_on_Skeletal_Muscle_Hypertrophy_A_Systematic_Review_with_Meta-analysis/22030796' },
  { label: 'Protein ~1.6 g/kg/day for resistance-training gains (BJSM 2018)', url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/' },
  { label: 'High-intensity strength + cardio reduced disease activity in axSpA (BJSM 2020)', url: 'https://bjsm.bmj.com/content/54/5/292' },
  { label: 'Ab exercises alone don’t reduce belly fat (JSCR 2011)', url: 'https://nutrition-evidence.com/article/161088/the-effect-of-abdominal-exercise-on-abdominal-fat' },
  { label: 'Body fat levels for visible abs', url: 'https://inbodyusa.com/blogs/inbodyblog/what-body-fat-percentage-do-you-need-to-see-abs/' },
]

export default function Plan() {
  const { profile } = useProfile()
  const settings = useSettings()
  const kg = useWeightNow()
  const db = !!settings.training?.dumbbellKg
  const today = dkey()
  const p = programDay(profile.planStart, today, db)
  const acts = useByDate<Activity>('activity')
  const mon = weekStart(today)
  const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i))
  const plan = weekPlanFor(db)
  const proteinGoal = Math.round((kg * 1.6) / 5) * 5
  const abs = absEstimate(profile.bodyFat, kg)

  const strengthIds = db ? ['upperA', 'lowerA', 'upperB', 'lowerB', 'finisher'] : ['strengthA', 'strengthB', 'circuit']
  const otherIds = db ? ['cardio', 'posture', 'walk', 'longwalk', 'strengthA', 'strengthB'] : ['cardio', 'posture', 'walk', 'longwalk']

  return (
    <Page accent="body" back="/body" title="Workout plan">
      <Card className="mt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc-soft text-acc">
            <Dumbbell size={21} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{db ? `Dumbbells: ${settings.training?.dumbbells ?? 2} × ${settings.training?.dumbbellKg} kg` : 'Bodyweight plan'}</div>
            <div className="text-[12.5px] text-ink3">{db ? 'Upper/lower split · each muscle twice a week' : 'Got dumbbells? Switch to the strength split.'}</div>
          </div>
          <Toggle label="I have dumbbells" checked={db} onChange={(v) => saveSettings({ training: v ? { dumbbellKg: settings.training?.dumbbellKg ?? 5, dumbbells: 2 } : {} })} />
        </div>
      </Card>

      <Card className="mt-3">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-acc">
          Phase {p.phase.n} · weeks {p.phase.weeks[0]}–{p.phase.weeks[1]}
        </div>
        <div className="mt-1 text-[24px] font-bold">{p.phase.name}</div>
        <p className="mt-1 text-[14px] leading-relaxed text-ink2">{p.phase.focus}</p>
        {db && <p className="mt-2 rounded-2xl bg-acc-soft px-3 py-2 text-[13px] text-ink2">Effort: {p.phase.effort}</p>}
        <div className="mt-3 flex items-center justify-between text-[13px] text-ink3">
          <span>{p.before ? 'Starts ' + fmtDay(profile.planStart) : `Day ${Math.min(p.day, p.totalDays)} of ${p.totalDays} · week ${p.week}`}</span>
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
            const ids = plan[weekday(k)]
            const done = (acts.get(k) ?? []).some((a) => a.kind !== 'mobility')
            const isToday = k === today
            return (
              <a key={k} href={ids[0] === 'rest' ? '#/body/plan' : `#/body/workout/${ids[0]}`} className={cx('press flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0', isToday && 'bg-acc-soft')}>
                <div className={cx('w-10 text-center', isToday ? 'text-acc' : 'text-ink3')}>
                  <div className="text-[12px] font-semibold uppercase">{dowShort(weekday(k))}</div>
                  <div className="text-[16px] font-bold text-ink">{Number(k.slice(8))}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{ids.map((id) => SESSIONS[id].name.split(' · ')[0]).join(' + ')}</div>
                  <div className="truncate text-[12.5px] text-ink3">
                    {ids[0] === 'rest' ? 'mobility · easy walk · review' : `${ids.reduce((s, id) => s + sessionMinutes(SESSIONS[id], p.phase.n), 0)} min · ${SESSIONS[ids[0]].name.split(' · ')[1] ?? SESSIONS[ids[0]].desc.split('.')[0]}`}
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

      <Section title={db ? 'Strength sessions' : 'Sessions'}>
        <SessionList ids={strengthIds} phase={p.phase.n} />
      </Section>
      <Section title={db ? 'Cardio, walks & bodyweight days' : 'Cardio & walks'}>
        <SessionList ids={otherIds} phase={p.phase.n} />
      </Section>

      {db && (
        <>
          <Section title="How this plan builds muscle">
            <div className="space-y-2.5">
              {SCIENCE.map((x) => (
                <Card key={x.t}>
                  <div className="text-[15px] font-semibold">{x.t}</div>
                  <div className="mt-1 text-[13.5px] leading-relaxed text-ink2">{x.d}</div>
                </Card>
              ))}
            </div>
          </Section>

          <Section title={`Hard sets per week · phase ${p.phase.n}`}>
            <div className="overflow-hidden rounded-3xl border border-line bg-card">
              {DB_VOLUME.map((v) => (
                <div key={v.muscle} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                  <span className="w-32 shrink-0 text-[14px] font-medium">{v.muscle}</span>
                  <Bar value={v.sets[p.phase.n - 1]} max={20} height={6} className="flex-1" />
                  <span className="num w-8 text-right text-[14px] font-semibold">{v.sets[p.phase.n - 1]}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 px-1 text-[12.5px] text-ink3">Research points to ~10+ weekly hard sets per muscle for growth; abs and posture work add up across the week.</p>
          </Section>

          <Section title="Your path to visible abs">
            <Card>
              {abs ? (
                <p className="text-[14px] leading-relaxed text-ink2">
                  From about {Math.round(abs.bf * 100)}% body fat, visible abs (≈12%) means losing roughly <b>{abs.fatLoss.toFixed(0)} kg of fat</b> while keeping — ideally adding — muscle. With the muscle you’ll build, that is around <b>{abs.absKg.toFixed(0)} kg</b> on the scale; upper abs usually start showing near <b>{abs.upperKg.toFixed(0)} kg</b>. Losing 0.5–1% of bodyweight a week protects muscle, which puts it roughly <b>{abs.monthsFast}–{abs.monthsSlow} months</b> away. Faster dieting costs muscle and ends softer.
                </p>
              ) : (
                <p className="text-[14px] leading-relaxed text-ink2">Add a body-fat estimate in Me → Profile and Forme will estimate the weight and timeline for visible abs.</p>
              )}
            </Card>
          </Section>

          <Section title="Fuel for muscle">
            <Card>
              <p className="text-[14px] leading-relaxed text-ink2">
                Protein around <b>1.6 g per kg</b> a day is where extra protein stops adding muscle in studies — for you about <b>{proteinGoal} g</b>. Spread it over 3–4 meals: soya chunks, paneer, tofu, dal + rice, curd/Greek yogurt, sprouts, and whey if your skin tolerates it. Keep the calorie target, sleep 7–9 hours.
              </p>
              {settings.targets.protein < proteinGoal ? (
                <Button
                  size="sm"
                  variant="soft"
                  className="mt-3"
                  onClick={() => {
                    saveSettings({ targets: { ...settings.targets, protein: proteinGoal } })
                    toast(`Protein target set to ${proteinGoal} g`)
                  }}
                >
                  Set my protein target to {proteinGoal} g (now {settings.targets.protein} g)
                </Button>
              ) : (
                <div className="mt-2 text-[13px] font-semibold text-good">Your target is {settings.targets.protein} g ✓</div>
              )}
            </Card>
          </Section>

          <Section title="Your back comes first">
            <Card>
              <p className="text-[14px] leading-relaxed text-ink2">
                In a 100-patient randomised trial, three months of high-intensity strength and cardio training <b>reduced</b> disease activity in axial spondyloarthritis. Strength training is treatment, not risk — done right: supported rows and floor presses keep the spine neutral, hinges stop before the back rounds, nothing jumps, and a flare day always means Flare care.
              </p>
            </Card>
          </Section>
        </>
      )}

      <Section title="Principles">
        <div className="space-y-2.5">
          {PRINCIPLES.map(([t, d]) => (
            <Card key={t}>
              <div className="text-[15px] font-semibold">{t}</div>
              <div className="mt-1 text-[13.5px] leading-relaxed text-ink2">{d}</div>
            </Card>
          ))}
        </div>
      </Section>

      {db && (
        <Section title="Sources">
          <div className="overflow-hidden rounded-3xl border border-line bg-card">
            {SOURCES.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="press flex items-start gap-2.5 border-b border-line px-4 py-2.5 last:border-b-0">
                <ExternalLink size={14} className="mt-1 shrink-0 text-ink3" />
                <span className="text-[13px] leading-snug text-ink2">{s.label}</span>
              </a>
            ))}
          </div>
        </Section>
      )}
      <p className="mt-6 px-1 text-[12.5px] leading-relaxed text-ink3">General guidance, not medical advice. Check it with your rheumatologist or a physiotherapist — especially if pain is getting worse.</p>
    </Page>
  )
}

function SessionList({ ids, phase }: { ids: string[]; phase: number }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-card">
      {ids.map((id) => {
        const s = SESSIONS[id]
        return (
          <a key={id} href={`#/body/workout/${id}`} className="press flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
            {s.equipment === 'dumbbells' ? <Dumbbell size={18} className="text-acc" /> : <Flame size={18} className="text-acc" />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium">{s.name}</div>
              <div className="truncate text-[12.5px] text-ink3">{s.desc}</div>
            </div>
            <span className="text-[13px] text-ink3">{sessionMinutes(s, phase)}′</span>
          </a>
        )
      })}
    </div>
  )
}

/** Body-fat estimate (e.g. "20–25%") → weight & time to visible abs, assuming ~1.5 kg of new muscle along the way. */
function absEstimate(bodyFat: string | undefined, kg: number) {
  const nums = (bodyFat ?? '').match(/\d+(\.\d+)?/g)?.map(Number).filter((n) => n > 3 && n < 60)
  if (!nums?.length) return null
  const bf = nums.reduce((a, b) => a + b, 0) / nums.length / 100
  const lean = kg * (1 - bf) + 1.5
  const absKg = lean / 0.88
  const upperKg = lean / 0.85
  const toLose = Math.max(0, kg - absKg)
  if (!toLose) return null
  return {
    bf,
    absKg,
    upperKg,
    fatLoss: kg * bf - absKg * 0.12,
    monthsFast: Math.max(1, Math.round(toLose / (kg * 0.01) / 4.35)),
    monthsSlow: Math.max(2, Math.round(toLose / (kg * 0.005) / 4.35)),
  }
}
