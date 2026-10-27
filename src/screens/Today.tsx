import { Check, ChefHat, ChevronDown, ChevronRight, Droplet, Footprints, KeyRound, Mail, Moon, Plus, Scale, Sparkles, Volume2, Flame, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MacroBar, moodEmoji } from '../components/charts'
import { CheckIn } from '../components/CheckIn'
import { RoutineIcon } from '../components/icons'
import { NumberSheet } from '../components/NumberSheet'
import { PhoneSetup } from '../components/PhoneSetup'
import { ProteinIdeas } from '../components/ProteinIdeas'
import { QuickAdd } from '../components/QuickAdd'
import { SyncBadge } from '../components/SyncBadge'
import { toast } from '../components/Toasts'
import { Bar, Button, Card, Fab, Page, Pill, Ring, Section, cx } from '../components/ui'
import { wordOfDay } from '../data/german'
import { promptOfDay } from '../data/prompts'
import { SESSIONS, challengeSpan, sessionMinutes } from '../data/program'
import { NIGHT_LABEL, skinNight } from '../data/skincare'
import { addWater, evaluateRoutine, focusItems, patchDay, saveSettings, setCheck, useDayData, useWeightNow, type DayData, type ItemStatus } from '../lib/app'
import { getConn } from '../lib/auth'
import { kfmt, streak } from '../lib/calc'
import { addDays, diffDays, dkey, fmtDay, fmtLong, fmtTime, greeting, weekStart, weekday } from '../lib/date'
import { useActiveDays } from '../lib/insights'
import { PLAN_MEALS, TPL, dayTotals } from '../lib/mealplan'
import { EASY_WHAT, useReadiness } from '../lib/readiness'
import { excerpt } from '../lib/md'
import { go } from '../lib/router'
import { speak } from '../lib/speech'
import { TOKEN_HELP_URL } from '../lib/config'
import { patch, useColl, useDoc } from '../lib/store'
import type { BodyEntry, Letter, MealPlan, Post, SrsState } from '../lib/types'
import { ART_COLOR } from '../lib/srs'

const ROUTINE_OPEN = 'forme.today.routineOpen'
const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* private mode */
  }
}

/** Minutes since midnight, refreshed every minute so "Next up" moves with the day. */
function useNowMin() {
  const read = () => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  }
  const [m, setM] = useState(read)
  useEffect(() => {
    const t = setInterval(() => setM(read()), 60_000)
    return () => clearInterval(t)
  }, [])
  return m
}

export default function Today() {
  const date = dkey()
  const d = useDayData(date)
  const [add, setAdd] = useState(false)
  const [sheet, setSheet] = useState<'steps' | 'sleep' | 'weight' | 'protein' | null>(null)
  const [routineOpen, setRoutineOpen] = useState(() => lsGet(ROUTINE_OPEN) === '1')
  const kgNow = useWeightNow()
  const posts = useColl<Post>('posts')
  const letters = useColl<Letter>('letters')
  const srs = useColl<SrsState>('srs')
  const body = useColl<BodyEntry>('body')
  const active = useActiveDays()
  const nowMin = useNowMin()
  const routine = evaluateRoutine(d)
  const doneCount = routine.filter((r) => r.done).length
  const t = d.settings.targets
  const left = t.kcal - d.totals.kcal
  const balance = d.totals.kcal - d.burn.total
  const flare = !!d.day?.flare
  const sessions = flare ? [SESSIONS.flare] : d.program.sessions
  const ready = useReadiness(date)
  const menu = useDoc<MealPlan>('mealPlans', weekStart(date))?.days[date]
  const trains = !flare && sessions.some((s) => s.mode !== 'rest' && s.kind !== 'mobility')
  const skin = skinNight({ skinStart: d.profile.skinStart, date, irritated: d.day?.skinIrritated, products: d.settings.skincare.products })
  const word = wordOfDay(date)
  const due = srs.filter((s) => s.due <= date).length

  const pastSelf = useMemo(() => {
    const old = posts.filter((p) => diffDays(date, p.date) >= 7 && p.body.length > 20)
    if (!old.length) return null
    let h = 0
    for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return old[h % old.length]
  }, [posts, date])
  const letterReady = letters.find((l) => !l.opened && l.openOn <= date)
  const name = d.profile.name?.split(' ')[0]

  // Back after a break? Last day with anything logged, if it was 2+ days ago and today is still empty.
  const lastActive = useMemo(() => [...active].filter((k) => k < date).sort().pop(), [active, date])
  const away = !active.has(date) && lastActive ? diffDays(date, lastActive) : 0
  const [welcomeHidden, setWelcomeHidden] = useState(() => lsGet('forme.welcome') === date)

  // The 120-day challenge: a starting-line checklist for the first week (numbers to compare on Day 120).
  const c = challengeSpan(d.profile.planStart, date)
  const since = addDays(c.start, -3)
  const after = (b: BodyEntry) => b.date >= since
  const baseline = [
    { id: 'weigh', label: 'Weigh in', sub: 'morning, after the bathroom', done: body.some((b) => after(b) && !!b.kg), run: () => setSheet('weight') },
    { id: 'waist', label: 'Measure your waist', sub: 'at the navel, relaxed', done: body.some((b) => after(b) && !!b.waist), run: () => go('/body/weight?measure=1') },
    { id: 'fit', label: 'Fitness test', sub: 'push-ups, plank, wall sit, chair stands', done: body.some((b) => after(b) && (b.pushups ?? b.plank ?? b.wallSit ?? b.chairStand) !== undefined), run: () => go('/body/weight?bench=1') },
    { id: 'letter', label: 'Write to Day-120 you', sub: `sealed until ${fmtLong(c.finish)}`, done: letters.some((l) => l.openOn === c.finish), run: () => go('/me/letters?write=1') },
  ]
  const showBaseline = !c.before && c.dayNo <= 7 && baseline.some((b) => !b.done)

  // The GitHub token expires on a date only the person knows (browsers can't read it): ask once, warn a week ahead.
  const github = getConn()?.mode === 'github'
  const exp = d.settings.tokenExpires
  const expIn = exp && exp !== 'never' ? diffDays(exp, date) : null
  const [askLater, setAskLater] = useState(() => Number(lsGet('forme.askExpiry') ?? 0) > Date.now())
  const [expInput, setExpInput] = useState('')

  return (
    <Page
      accent="today"
      subtitle={fmtDay(date)}
      title={`${greeting()}${name ? `, ${name}` : ''}`}
      actions={<SyncBadge />}
    >
      <a href="#/challenge" className="press mt-1 block px-1">
        <div className="flex items-center justify-between gap-3 text-[13px] text-ink3">
          <span className="min-w-0 truncate">
            {c.before ? (
              <>
                120-day challenge starts <b className="text-ink">{fmtDay(c.start)}</b>
              </>
            ) : c.after ? (
              <>
                120-day challenge <b className="text-ink">complete</b> 🎉
              </>
            ) : (
              <>
                Day <b className="text-ink">{c.dayNo}</b> of 120 · Week {d.program.week} · {d.program.phase.name}
              </>
            )}
          </span>
          <span className="shrink-0 font-semibold text-acc">Challenge</span>
        </div>
        <Bar className="mt-2" value={c.before ? 0 : Math.min(c.dayNo, 120)} max={120} height={5} />
      </a>

      <PhoneSetup />

      {github && !exp && !askLater && (
        <Card className="mt-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <KeyRound size={17} className="text-acc" /> When does your GitHub key expire?
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink3">
            Forme saves to GitHub with the token you pasted. When it expires, saving stops — tell Forme the date and it warns you a week before. It's on your{' '}
            <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noreferrer" className="font-semibold text-acc">
              GitHub tokens page
            </a>
            .
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input type="date" aria-label="Token expiry date" value={expInput} onChange={(e) => setExpInput(e.target.value)} className="field num w-[160px] py-2 text-[15px]" />
            <Button size="sm" disabled={!expInput} onClick={() => saveSettings({ tokenExpires: expInput })}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => saveSettings({ tokenExpires: 'never' })}>
              It never expires
            </Button>
          </div>
          <button
            className="press mt-2 text-[12.5px] font-semibold text-ink3"
            onClick={() => {
              lsSet('forme.askExpiry', String(Date.now() + 3 * 86400000))
              setAskLater(true)
            }}
          >
            Ask me later
          </button>
        </Card>
      )}

      {github && expIn !== null && expIn <= 7 && (
        <Card className="mt-4 border-bad/40">
          <div className="text-[15px] font-semibold text-bad">{expIn < 0 ? 'Your GitHub key has expired' : expIn === 0 ? 'Your GitHub key expires today' : `Your GitHub key expires in ${expIn} day${expIn === 1 ? '' : 's'}`}</div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink2">
            Make a new token with the same settings, then <b>Settings → Change token</b> and paste it. Nothing is lost — {expIn < 0 ? 'your logs wait on this phone until then' : 'this just keeps saving uninterrupted'}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={TOKEN_HELP_URL} target="_blank" rel="noreferrer" className="press inline-flex h-9 items-center rounded-2xl bg-acc-fill px-3 text-[14px] font-semibold text-acc-on">
              Make a new token
            </a>
            <Button size="sm" variant="outline" onClick={() => go('/me/settings')}>
              Settings
            </Button>
          </div>
        </Card>
      )}

      {showBaseline && (
        <Card className="mt-4">
          <div className="text-[15.5px] font-semibold">Your starting line</div>
          <div className="mt-0.5 text-[13px] text-ink3">Day-1 numbers are what make Day 120 mean something. All of this takes about 10 minutes.</div>
          <div className="mt-3 space-y-1">
            {baseline.map((b) => (
              <button key={b.id} disabled={b.done} onClick={b.run} className="press flex w-full items-center gap-3 rounded-2xl px-1 py-1.5 text-left">
                <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2', b.done ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2 text-transparent')}>
                  <Check size={15} strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block text-[15px] font-medium', b.done && 'text-ink3 line-through decoration-1')}>{b.label}</span>
                  <span className="block truncate text-[12.5px] text-ink3">{b.sub}</span>
                </span>
                {!b.done && <ChevronRight size={17} className="shrink-0 text-ink3" />}
              </button>
            ))}
          </div>
        </Card>
      )}

      {away >= 2 && !welcomeHidden && (
        <Card className="mt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[16px] font-semibold">Welcome back{name ? `, ${name}` : ''} 👋</div>
            <button
              aria-label="Hide"
              className="press -mr-1.5 -mt-1 p-1.5 text-ink3"
              onClick={() => {
                lsSet('forme.welcome', date)
                setWelcomeHidden(true)
              }}
            >
              <X size={16} />
            </button>
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-ink2">
            {away - 1 === 1 ? 'One day off' : `${away - 1} days off`} — no catch-up needed, nothing to fill in. Today starts fresh. Pick one small thing:
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button variant="soft" size="sm" onClick={() => document.getElementById('checkin')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
              Check in
            </Button>
            <Button variant="soft" size="sm" onClick={() => go('/body/food/add')}>
              Log a meal
            </Button>
            <Button variant="soft" size="sm" onClick={() => go('/body/workout/mobility')}>
              Mobility
            </Button>
          </div>
        </Card>
      )}

      <NextUp d={d} routine={routine} nowMin={nowMin} streakDays={streak(active, date)} onProtein={() => setSheet('protein')} />

      {d.profileMissing && (
        <Card className="mt-4 border-acc/40" href="#/me/profile">
          <div className="text-[15px] font-semibold">Set up your profile</div>
          <div className="mt-1 text-[13.5px] text-ink3">Height, weight and goal make the calorie maths personal.</div>
        </Card>
      )}

      {letterReady && (
        <Card className="mt-4" href="#/me/letters">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc-soft text-acc">
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-semibold">A letter from your past self is ready</div>
              <div className="text-[13px] text-ink3">Written {fmtLong(letterReady.writtenOn)}</div>
            </div>
            <ChevronRight size={18} className="text-ink3" />
          </div>
        </Card>
      )}

      {/* Energy */}
      <Card className="mt-4">
        <div className="flex items-center gap-4">
          <Ring value={d.totals.kcal} max={t.kcal} size={124} stroke={11} color={left < 0 ? 'var(--bad-mark)' : 'var(--acc-fill)'} label={`${kfmt(d.totals.kcal)} of ${kfmt(t.kcal)} kcal eaten`}>
            <div className="text-[24px] font-bold leading-none">{kfmt(Math.abs(left))}</div>
            <div className="mt-1 text-[11.5px] font-medium text-ink3">{left >= 0 ? 'kcal left' : 'kcal over'}</div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink3">Eaten</span>
              <span className="text-[17px] font-semibold">{kfmt(d.totals.kcal)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink3">Burn ≈</span>
              <span className="text-[17px] font-semibold">{kfmt(d.burn.total)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink3">Balance</span>
              <span className={cx('text-[17px] font-semibold', balance <= 0 ? 'text-good' : 'text-bad')}>
                {balance > 0 ? '+' : '−'}
                {kfmt(Math.abs(balance))}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <MacroBar p={d.totals.p} c={d.totals.c} f={d.totals.f} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button full onClick={() => go('/body/food/add')} icon={<Plus size={18} />}>
            Log food
          </Button>
          <Button variant="outline" onClick={() => go('/body/food')}>
            Today
          </Button>
        </div>
        <div className="mt-2.5 text-[12px] leading-snug text-ink3">
          Burn = base {kfmt(d.burn.base)} + walking {kfmt(d.burn.walk)} + workouts {kfmt(d.burn.work)}. Protein{' '}
          <b className={d.totals.p >= t.protein ? 'text-good' : 'text-ink2'}>
            {Math.round(d.totals.p)}/{t.protein} g
          </b>
          {d.totals.p < t.protein ? (
            <>
              {' · '}
              <button onClick={() => setSheet('protein')} className="font-semibold text-acc">
                protein ideas
              </button>
            </>
          ) : (
            '.'
          )}
        </div>
      </Card>

      {/* Quick stats */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => setSheet('steps')} className="press rounded-3xl border border-line bg-card p-4 text-left">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink3">
            <Footprints size={14} /> Steps
          </div>
          <div className="mt-1 text-[22px] font-semibold leading-none">{d.steps.toLocaleString('en-IN')}</div>
          <Bar className="mt-2.5" value={d.steps} max={d.stepsTarget} height={5} />
          <div className="mt-1.5 text-[12px] text-ink3">goal {d.stepsTarget.toLocaleString('en-IN')}</div>
        </button>
        <div className="rounded-3xl border border-line bg-card p-4">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink3">
            <Droplet size={14} /> Water
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-[22px] font-semibold leading-none">{((d.day?.waterMl ?? 0) / 1000).toFixed(2).replace(/0$/, '')}</span>
            <span className="text-[13px] text-ink3">/ {t.waterMl / 1000} L</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => {
                addWater(date, 250)
                toast('+250 ml', { label: 'Undo', run: () => addWater(date, -250) })
              }}
              className="press h-8 flex-1 rounded-xl bg-acc-soft text-[13px] font-semibold text-acc"
            >
              +250
            </button>
            <button onClick={() => addWater(date, 500)} className="press h-8 flex-1 rounded-xl bg-acc-soft text-[13px] font-semibold text-acc">
              +500
            </button>
          </div>
        </div>
        <a href="#/body/weight" className="press rounded-3xl border border-line bg-card p-4">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink3">
            <Scale size={14} /> Weight
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-[22px] font-semibold leading-none">{kgNow.toFixed(1)}</span>
            <span className="text-[13px] text-ink3">kg</span>
          </div>
          <div className="mt-2 text-[12px] text-ink3">
            goal {d.profile.milestoneWeightKg ?? d.profile.goalWeightKg} kg · {Math.max(0, kgNow - (d.profile.milestoneWeightKg ?? d.profile.goalWeightKg)).toFixed(1)} to go
          </div>
        </a>
        <button onClick={() => setSheet('sleep')} className="press rounded-3xl border border-line bg-card p-4 text-left">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink3">
            <Moon size={14} /> Sleep
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-[22px] font-semibold leading-none">{d.day?.sleepH ?? '–'}</span>
            <span className="text-[13px] text-ink3">h</span>
          </div>
          <div className="mt-2 text-[12px] text-ink3">target {t.sleepHours} h</div>
        </button>
      </div>

      {/* Check-in */}
      <div className="mt-3 scroll-mt-24" id="checkin">
        <CheckIn date={date} day={d.day} compact />
      </div>
      {/* Plan — adjusted to this morning's check-in (lib/readiness) */}
      <Section title="Today's plan">
        <div className="space-y-2.5">
          {trains && ready.level === 'flare' && (
            <Card className="border-bad/30">
              <div className="text-[15px] font-semibold">Rough day for your back</div>
              <div className="mt-1 text-[13.5px] leading-snug text-ink3">{ready.reason} Flare care is eight gentle minutes — movement still helps. Up for a bit more? The sessions below open in their easy version.</div>
              <Button className="mt-3" size="sm" variant="soft" onClick={() => patchDay(date, { flare: true })}>
                Switch to flare care
              </Button>
            </Card>
          )}
          {trains && ready.level === 'easy' && (
            <div className="acc-de rounded-3xl border border-acc/40 bg-acc-soft px-4 py-3">
              <div className="text-[15px] font-semibold">Easy version today</div>
              <div className="mt-0.5 text-[13px] leading-snug text-ink2">
                {ready.reason} {EASY_WHAT}
              </div>
            </div>
          )}
          {trains && ready.level === 'unknown' && (
            <button
              onClick={() => document.getElementById('checkin')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="press px-1 text-left text-[13px] leading-snug text-ink3"
            >
              Check in first (pain and stiffness) — today's session adjusts to your back.
            </button>
          )}
          {sessions.map((s) => {
            const easy = (ready.level === 'easy' || ready.level === 'flare') && !flare && s.mode !== 'rest' && s.kind !== 'mobility' && s.kind !== 'flare'
            return (
              <Card key={s.id} href={s.mode === 'rest' ? '#/body/plan' : `#/body/workout/${s.id}${easy ? '?easy=1' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc-soft text-acc">
                    <Flame size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15.5px] font-semibold">{s.name}</div>
                    <div className="truncate text-[13px] text-ink3">
                      {s.mode === 'rest' ? 'Mobility + easy walk + weekly review' : `${sessionMinutes(s, d.program.phase.n, easy)} min · ${easy ? 'easy version' : d.program.phase.name}`}
                    </div>
                  </div>
                  {s.mode !== 'rest' &&
                    (easy ? (
                      <span className="acc-de">
                        <Pill>Easy</Pill>
                      </span>
                    ) : (
                      <Pill>Start</Pill>
                    ))}
                </div>
              </Card>
            )
          })}
          {flare && (
            <button onClick={() => patchDay(date, { flare: false })} className="press px-1 text-[13px] font-semibold text-acc">
              Feeling better? Restore the normal plan
            </button>
          )}
          <Card href="#/body/skin">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc-soft text-acc">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15.5px] font-semibold">Skincare tonight</div>
                <div className="text-[13px] text-ink3">{NIGHT_LABEL[skin]} · morning: vitamin C + SPF</div>
              </div>
              <ChevronRight size={18} className="text-ink3" />
            </div>
          </Card>
          {(menu || [0, 1, 6].includes(weekday(date))) && (
            <Card href="#/body/meals">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-acc-soft text-acc">
                  <ChefHat size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15.5px] font-semibold">{menu ? "Today's menu" : "Plan this week's meals"}</div>
                  <div className="line-clamp-2 text-[13px] leading-snug text-ink3">
                    {menu
                      ? `${PLAN_MEALS.map((m) => TPL.get(menu[m])?.name.split(',')[0]).join(' · ')} — ${kfmt(dayTotals(menu).kcal)} kcal, ${Math.round(dayTotals(menu).p)} g protein`
                      : 'High-protein veg meals for the week, and the grocery list'}
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-ink3" />
              </div>
            </Card>
          )}
        </div>
      </Section>

      {/* Routine — folded into one line; "Next up" already surfaces what matters now */}
      <Section title="Routine">
        <button
          aria-expanded={routineOpen}
          onClick={() => {
            lsSet(ROUTINE_OPEN, routineOpen ? '0' : '1')
            setRoutineOpen(!routineOpen)
          }}
          className={cx('press flex w-full items-center gap-3 border border-line bg-card px-4 py-3 text-left', routineOpen ? 'rounded-t-3xl border-b-0' : 'rounded-3xl')}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">
              {doneCount} of {routine.length} done
            </div>
            <Bar className="mt-2" value={doneCount} max={routine.length} height={5} />
          </div>
          <ChevronDown size={18} className={cx('shrink-0 text-ink3 transition-transform', routineOpen && 'rotate-180')} />
        </button>
        {routineOpen && (
          <div className="overflow-hidden rounded-b-3xl border border-line bg-card">
            {routine.map(({ item, done, auto, detail }) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                <button
                  aria-label={done ? `Mark ${item.label} not done` : `Mark ${item.label} done`}
                  aria-pressed={done}
                  onClick={() => setCheck(date, item.id, !done)}
                  className={cx('press flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2', done ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2 text-transparent')}
                >
                  <Check size={16} strokeWidth={3} />
                </button>
                <button className="min-w-0 flex-1 text-left" onClick={() => item.link && go(item.link.replace(/^#/, ''))}>
                  <div className={cx('flex items-center gap-1.5 text-[15px] font-medium', done && 'text-ink3 line-through decoration-1')}>
                    <span className="text-ink3">
                      <RoutineIcon name={item.icon} size={15} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="text-[12.5px] text-ink3">
                    {[item.time && fmtTime(item.time), detail, auto && done ? 'auto' : ''].filter(Boolean).join(' · ')}
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* German */}
      <Section title="Deutsch">
        <Card className="acc-de">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-acc">Wort des Tages</div>
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[22px] font-semibold leading-tight">
                {word.art && <span className={ART_COLOR[word.art]}>{word.art} </span>}
                {word.de}
              </div>
              <div className="mt-0.5 text-[14.5px] text-ink2">{word.en}</div>
            </div>
            <button aria-label="Pronounce" onClick={() => speak(`${word.art ? word.art + ' ' : ''}${word.de}. ${word.ex[0]}`)} className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-acc-soft text-acc">
              <Volume2 size={18} />
            </button>
          </div>
          <div className="mt-2 border-l-2 border-acc/40 pl-3 text-[14px] italic text-ink2">
            {word.ex[0]}
            <div className="not-italic text-ink3">{word.ex[1]}</div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button full onClick={() => go('/deutsch/review')}>
              {due ? `Review ${due} due` : 'Learn new words'}
            </Button>
            <Button variant="outline" onClick={() => go('/deutsch/speak')}>
              Speak
            </Button>
          </div>
        </Card>
      </Section>

      {/* Write */}
      <Section title="Mind">
        <Card className="acc-mind">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-acc">Prompt of the day</div>
          <div className="mt-1.5 font-serif text-[18px] leading-snug">{promptOfDay(date)}</div>
          <Button className="mt-3" variant="soft" onClick={() => go(`/mind/new?type=journal&prompt=1`)}>
            Write about it
          </Button>
        </Card>
        {pastSelf && (
          <Card className="acc-mind mt-2.5" href={`#/mind/p/${pastSelf.id}`}>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-ink3">From your past self · {fmtLong(pastSelf.date)}</div>
            <div className="mt-1.5 font-serif text-[16px] leading-relaxed text-ink2">
              {pastSelf.mood ? moodEmoji(pastSelf.mood) + ' ' : ''}
              {excerpt(pastSelf.title ? `${pastSelf.title} — ${pastSelf.body}` : pastSelf.body, 180)}
            </div>
          </Card>
        )}
        {weekday(date) === 0 && (
          <Card className="mt-2.5" href="#/me/review">
            <div className="text-[15px] font-semibold">Sunday check-in</div>
            <div className="mt-1 text-[13.5px] text-ink3">Weigh in, then look back at your week in two minutes.</div>
          </Card>
        )}
      </Section>

      <Fab label="Quick add" onClick={() => setAdd(true)}>
        <Plus size={26} />
      </Fab>
      <QuickAdd open={add} onClose={() => setAdd(false)} day={d.day} />
      <NumberSheet
        open={sheet === 'steps'}
        onClose={() => setSheet(null)}
        title="Steps today"
        unit="steps"
        accent="body"
        initial={d.day?.steps}
        hint="Copy today's count from your phone's health app."
        presets={[3000, 5000, 7000, 8000, 10000].map((v) => ({ label: v.toLocaleString('en-IN'), value: v }))}
        onSave={(v) => patchDay(date, { steps: v })}
      />
      <NumberSheet
        open={sheet === 'weight'}
        onClose={() => setSheet(null)}
        title="Weigh-in"
        unit="kg"
        decimals={1}
        accent="body"
        hint="Best: mornings, after the bathroom, before eating."
        onSave={(v) => {
          patch<BodyEntry>('body', `b-${date}`, { date, kg: v })
          toast(`Weight saved: ${v} kg`)
        }}
      />
      <ProteinIdeas open={sheet === 'protein'} onClose={() => setSheet(null)} date={date} gap={t.protein - d.totals.p} kcalLeft={t.kcal - d.totals.kcal} />
      <NumberSheet
        open={sheet === 'sleep'}
        onClose={() => setSheet(null)}
        title="Sleep last night"
        unit="hours"
        decimals={1}
        initial={d.day?.sleepH}
        presets={[5, 6, 6.5, 7, 7.5, 8].map((v) => ({ label: `${v} h`, value: v }))}
        onSave={(v) => patchDay(date, { sleepH: v })}
      />
    </Page>
  )
}

/** The three things worth doing now (see focusItems), with one-tap done / +250 ml. */
function NextUp({ d, routine, nowMin, streakDays, onProtein }: { d: DayData; routine: ItemStatus[]; nowMin: number; streakDays: number; onProtein: () => void }) {
  const { now, next } = focusItems(d, routine, nowMin)
  const closed = !!d.day?.closedAt
  return (
    <Section title="Next up" action={streakDays >= 2 ? <span className="text-[13px] font-semibold text-ink3">🔥 {streakDays} days</span> : undefined}>
      {now.length ? (
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {now.map((f) => (
            <div key={f.id} className={cx('flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0', f.id === 'close' && 'bg-acc-soft')}>
              {f.check ? (
                <button
                  aria-label={`Mark ${f.label} done`}
                  onClick={() => {
                    setCheck(d.date, f.check!, true)
                    toast(`${f.label} ✓`, { label: 'Undo', run: () => setCheck(d.date, f.check!, false) })
                  }}
                  className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-line2 text-transparent hover:text-ink3"
                >
                  <Check size={17} strokeWidth={3} />
                </button>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-acc-soft text-acc">
                  <RoutineIcon name={f.icon} size={17} />
                </span>
              )}
              <button className="min-w-0 flex-1 text-left" disabled={!f.href && !f.protein} onClick={() => (f.protein ? onProtein() : f.href && go(f.href.replace(/^#/, '')))}>
                <div className="truncate text-[15.5px] font-semibold">{f.label}</div>
                {f.detail && <div className="truncate text-[12.5px] text-ink3">{f.detail}</div>}
              </button>
              {f.water ? (
                <button
                  onClick={() => {
                    addWater(d.date, 250)
                    toast('+250 ml', { label: 'Undo', run: () => addWater(d.date, -250) })
                  }}
                  className="press h-9 shrink-0 rounded-xl bg-acc-soft px-3 text-[13.5px] font-semibold text-acc"
                >
                  +250 ml
                </button>
              ) : (
                (f.href || f.protein) && <ChevronRight size={18} className="shrink-0 text-ink3" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-[15px] font-semibold">{closed ? 'Day closed — sleep well 🌙' : 'Nothing pressing right now ✓'}</div>
          {next && !closed && (
            <div className="mt-0.5 text-[13px] text-ink3">
              Next: {next.label} at {fmtTime(routine.find((r) => r.item.id === next.id)?.item.time)}
            </div>
          )}
          {closed && (
            <a href="#/evening" className="mt-0.5 block text-[13px] font-semibold text-acc">
              Review today
            </a>
          )}
        </Card>
      )}
    </Section>
  )
}
