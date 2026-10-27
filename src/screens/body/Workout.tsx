import { ChevronDown, ExternalLink, Pause, Play, SkipForward, StepBack, TrendingUp, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Button, Card, Field, Page, Pill, Ring, Section, Slider, Stepper, Toggle, cx } from '../../components/ui'
import { EX, youtubeHow } from '../../data/exercises'
import { SESSIONS, programDay, resolveItems, sessionMinutes, sessionParams, type ResolvedItem, type Session } from '../../data/program'
import { useProfile, useSettings, useWeightNow } from '../../lib/app'
import { metKcal } from '../../lib/calc'
import { dkey, fmtLong } from '../../lib/date'
import { EASY_WHAT, useReadiness } from '../../lib/readiness'
import { back, useRoute } from '../../lib/router'
import { beep, buzz } from '../../lib/speech'
import { put, useColl } from '../../lib/store'
import type { Activity, Lift } from '../../lib/types'

type Step = {
  kind: 'work' | 'rest'
  exId?: string
  label: string
  sec?: number
  reps?: number
  range?: [number, number]
  setNo?: number
  sets?: number
  tempo?: string
  note?: string
  round: number
  idx: number
}

/** Logged results per exercise, newest first. Easy-version days are left out so a sore day never lowers a target. */
function useLastLifts() {
  const lifts = useColl<Lift>('lifts')
  return useMemo(() => {
    const m = new Map<string, Lift[]>()
    for (const l of [...lifts].filter((x) => !x.easy).sort((a, b) => (a.date === b.date ? b.updatedAt - a.updatedAt : a.date < b.date ? 1 : -1))) {
      const arr = m.get(l.exId) ?? []
      arr.push(l)
      m.set(l.exId, arr)
    }
    return m
  }, [lifts])
}

const readyToProgress = (it: ResolvedItem, last?: Lift) =>
  !!(it.range && last && last.unit === 'reps' && last.reps.length >= (it.sets ?? 1) && last.reps.every((r) => r >= it.range![1]))

function buildSteps(s: Session, phase: number, easy: boolean): Step[] {
  const p = sessionParams(s, phase, easy)
  if (s.mode === 'walk') return [{ kind: 'work', exId: 'brisk-walk', label: easy ? 'Easy walk' : 'Brisk walk', sec: p.walkMin * 60, round: 1, idx: 0 }]
  const items = resolveItems(s, phase, easy)
  const steps: Step[] = []
  if (s.layout === 'straight') {
    items.forEach((it, i) => {
      const ex = EX[it.exId]
      const sets = it.sets ?? 3
      for (let k = 1; k <= sets; k++) {
        const base = { exId: it.exId, label: ex.name, setNo: k, sets, range: it.range, tempo: it.tempo, round: k, idx: i }
        if (it.unit === 'sec') {
          if (it.perSide) {
            steps.push({ kind: 'work', ...base, sec: it.amt, note: 'Left side' })
            steps.push({ kind: 'work', ...base, sec: it.amt, note: 'Right side' })
          } else steps.push({ kind: 'work', ...base, sec: it.amt })
        } else steps.push({ kind: 'work', ...base, reps: it.amt, note: it.perSide ? 'each side' : undefined })
        const lastOfAll = i === items.length - 1 && k === sets
        if (!lastOfAll) steps.push({ kind: 'rest', label: k < sets ? `Rest — set ${k + 1} next` : 'Next exercise', sec: k < sets ? it.rest ?? 60 : Math.max(it.rest ?? 60, 60), round: k, idx: i })
      }
    })
    return steps
  }
  for (let r = 1; r <= p.rounds; r++) {
    items.forEach((it, i) => {
      const ex = EX[it.exId]
      if (it.unit === 'sec' && it.perSide && s.mode !== 'interval') {
        steps.push({ kind: 'work', exId: it.exId, label: ex.name, sec: it.amt, note: 'Left side', round: r, idx: i })
        steps.push({ kind: 'work', exId: it.exId, label: ex.name, sec: it.amt, note: 'Right side', round: r, idx: i })
      } else if (it.unit === 'sec') {
        steps.push({ kind: 'work', exId: it.exId, label: ex.name, sec: it.amt, round: r, idx: i })
      } else {
        steps.push({ kind: 'work', exId: it.exId, label: ex.name, reps: it.amt, note: it.perSide ? 'each side' : undefined, round: r, idx: i })
      }
      const last = i === items.length - 1
      if (!last && p.rest) steps.push({ kind: 'rest', label: 'Rest', sec: p.rest, round: r, idx: i })
    })
    if (r < p.rounds && p.roundRest) steps.push({ kind: 'rest', label: `Round ${r} done — breathe`, sec: p.roundRest, round: r, idx: items.length })
  }
  return steps
}

export default function Workout({ id }: { id: string }) {
  const { query } = useRoute()
  const s = SESSIONS[id] ?? SESSIONS.mobility
  const { profile } = useProfile()
  const settings = useSettings()
  const phase = programDay(profile.planStart, dkey(), !!settings.training?.dumbbellKg).phase
  const r = useReadiness(dkey())
  const canEase = s.kind !== 'mobility' && s.kind !== 'flare' && s.mode !== 'rest'
  const [easy, setEasy] = useState(() => canEase && query.get('easy') === '1')
  const [playing, setPlaying] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const items = resolveItems(s, phase.n, easy)
  const p = sessionParams(s, phase.n, easy)
  const lastBy = useLastLifts()
  const acts = useColl<Activity>('activity')
  const lastTime = useMemo(() => acts.filter((a) => a.session === s.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0], [acts, s.id])
  const straight = s.layout === 'straight'
  const suggestEasy = canEase && !easy && (r.level === 'easy' || r.level === 'flare')

  if (playing) return <Player session={s} phase={phase.n} easy={easy} onExit={() => setPlaying(false)} />

  return (
    <Page accent="body" back="/body/plan" title={s.name}>
      <Card className="mt-1">
        <p className="text-[14.5px] leading-relaxed text-ink2">{s.desc}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {easy && (
            <span className="acc-de">
              <Pill>Easy version</Pill>
            </span>
          )}
          <Pill>{sessionMinutes(s, phase.n, easy)} min</Pill>
          {straight && <Pill tone="muted">{items.reduce((a, it) => a + (it.sets ?? 0), 0)} sets</Pill>}
          {!straight && s.mode !== 'walk' && s.mode !== 'rest' && <Pill tone="muted">{p.rounds} round{p.rounds > 1 ? 's' : ''}</Pill>}
          {s.mode === 'interval' && (
            <Pill tone="muted">
              {p.work}s on / {p.rest}s off
            </Pill>
          )}
          <Pill tone="muted">
            Phase {phase.n} · {phase.name}
          </Pill>
          {s.equipment === 'dumbbells' && settings.training?.dumbbellKg && (
            <Pill tone="muted">
              🏋️ {settings.training.dumbbells ?? 2} × {settings.training.dumbbellKg} kg
            </Pill>
          )}
        </div>
        {straight && (
          <p className="mt-3 rounded-2xl bg-acc-soft px-3 py-2 text-[13px] leading-relaxed text-ink2">
            {easy ? 'Easy day: stop every set with 3–4 reps left in the tank.' : `Effort this phase: ${phase.effort}`}
          </p>
        )}
        {canEase && (
          <div className={cx('acc-de mt-3 rounded-2xl border px-3 py-2.5', suggestEasy ? 'border-acc/40 bg-acc-soft' : 'border-line')}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold">{suggestEasy ? 'Easy version suggested today' : 'Easy version'}</div>
                <div className="text-[12.5px] leading-snug text-ink3">{easy ? EASY_WHAT : suggestEasy ? r.reason : 'For sore or stiff days — same session, gentler.'}</div>
              </div>
              <Toggle label="Easy version" checked={easy} onChange={setEasy} />
            </div>
          </div>
        )}
        {canEase && (lastTime?.pain ?? 0) >= 6 && (
          <p className="mt-2 text-[12.5px] leading-snug text-ink3">
            Last time ({fmtLong(lastTime!.date)}) this hurt {lastTime!.pain}/10 during. If one exercise was the culprit, try its easier variation below or skip it.
          </p>
        )}
        {s.mode !== 'rest' && (
          <Button full size="lg" className="mt-4" icon={<Play size={18} />} onClick={() => setPlaying(true)}>
            Start {s.mode === 'walk' ? 'walk timer' : 'session'}
          </Button>
        )}
      </Card>

      {items.length > 0 && (
        <Section title="Exercises">
          <div className="overflow-hidden rounded-3xl border border-line bg-card">
            {items.map((it, i) => {
              const ex = EX[it.exId]
              const isOpen = open === it.exId + i
              const hist = lastBy.get(it.exId) ?? []
              const last = hist[0]
              const ready = readyToProgress(it, last)
              return (
                <div key={i} className="border-b border-line last:border-b-0">
                  <button onClick={() => setOpen(isOpen ? null : it.exId + i)} className="press flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card2 text-[12px] font-bold text-ink3">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">{ex.name}</div>
                      {it.from && <div className="acc-de truncate text-[12px] font-medium text-acc">instead of {EX[it.from].name}</div>}
                      <div className="text-[12.5px] text-ink3">
                        {straight && it.range
                          ? `${it.sets} × ${it.range[0]}–${it.range[1]} ${it.unit === 'sec' ? 's' : 'reps'}${it.perSide ? ' each side' : ''} · rest ${it.rest}s`
                          : `${s.mode === 'interval' ? `${p.work} s` : it.unit === 'sec' ? `${it.amt} s` : `${it.amt} reps`}${it.perSide && s.mode !== 'interval' ? ' each side' : ''}`}
                      </div>
                      {last && straight && (
                        <div className="text-[12px] text-ink3">
                          Last: {last.reps.join(' · ')} · {fmtLong(last.date)}
                        </div>
                      )}
                    </div>
                    {ready && (
                      <span className="flex items-center gap-1 rounded-full bg-[#0ca30c]/15 px-2 py-0.5 text-[11.5px] font-semibold text-good">
                        <TrendingUp size={12} /> progress
                      </span>
                    )}
                    <ChevronDown size={18} className={cx('shrink-0 text-ink3 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-[14px] leading-relaxed">
                      {it.tempo && <p className="mb-2 text-[13px] font-semibold text-acc">Tempo: {it.tempo}</p>}
                      <ol className="list-decimal space-y-1 pl-5 text-ink2">
                        {ex.how.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ol>
                      {ex.cue && (
                        <p className="mt-2 text-ink2">
                          <b>Cue:</b> {ex.cue}
                        </p>
                      )}
                      {ex.spine && <p className="mt-2 rounded-2xl bg-acc-soft px-3 py-2 text-[13.5px] text-ink">🦴 {ex.spine}</p>}
                      {ready && (
                        <p className="mt-2 rounded-2xl bg-[#0ca30c]/10 px-3 py-2 text-[13.5px] text-ink">
                          You hit the top of the range on every set last time. Next step on the ladder: slower lowering → 1½ reps → the harder variation → an extra set.
                        </p>
                      )}
                      {(ex.easier || ex.harder) && (
                        <p className="mt-2 text-[13px] text-ink3">
                          {ex.easier && <>Easier: {ex.easier} </>}
                          {ex.harder && <>Harder: {ex.harder}</>}
                        </p>
                      )}
                      {hist.length > 1 && (
                        <div className="mt-2 text-[12.5px] text-ink3">
                          History:{' '}
                          {hist
                            .slice(0, 4)
                            .map((h) => `${h.reps.join('·')} (${h.date.slice(5)})`)
                            .join('  →  ')}
                        </div>
                      )}
                      <a href={youtubeHow(ex.name)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-semibold text-acc">
                        Watch how <ExternalLink size={13} />
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </Page>
  )
}

function Player({ session, phase, easy, onExit }: { session: Session; phase: number; easy: boolean; onExit: () => void }) {
  const steps = useMemo(() => buildSteps(session, phase, easy), [session, phase, easy])
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [left, setLeft] = useState(steps[0]?.sec ?? 0)
  const [finished, setFinished] = useState(false)
  const [logged, setLogged] = useState<Record<string, number[]>>({})
  const [repsNow, setRepsNow] = useState(0)
  const started = useRef(Date.now())
  const endsAt = useRef<number | null>(null)
  const lastBeep = useRef(-1)
  const step = steps[i]
  const next = steps.slice(i + 1).find((x) => x.kind === 'work')
  const kg = useWeightNow()
  const lastBy = useLastLifts()
  const straight = session.layout === 'straight'

  const lastSet = step?.exId && step.setNo ? lastBy.get(step.exId)?.[0]?.reps[step.setNo - 1] : undefined
  // easy day: the bottom of the range, never a push for progress
  const target = step?.range ? (easy ? step.range[0] : Math.min(step.range[1], Math.max(step.range[0], (lastSet ?? step.range[0] - 1) + 1))) : step?.reps ?? 0

  // keep the screen awake while training
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => void lock?.release().catch(() => {})
  }, [])

  // preset the rep counter to the target for each rep-based work step
  useEffect(() => {
    if (step?.kind === 'work' && step.reps !== undefined) setRepsNow(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // (re)start the countdown for timed steps
  useEffect(() => {
    if (!step) return
    lastBeep.current = -1
    if (step.sec && !paused) endsAt.current = Date.now() + (left > 0 ? left : step.sec) * 1000
    else endsAt.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, paused])

  useEffect(() => {
    const t = setInterval(() => {
      if (!endsAt.current) return
      const remain = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000))
      setLeft(remain)
      if (remain <= 3 && remain > 0 && lastBeep.current !== remain) {
        lastBeep.current = remain
        beep(660, 90)
      }
      if (remain === 0) {
        endsAt.current = null
        if (step?.kind === 'work' && step.sec && step.exId && straight) record(step.exId, step.sec)
        advance()
      }
    }, 200)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  function record(exId: string, value: number) {
    setLogged((l) => ({ ...l, [exId]: [...(l[exId] ?? []), value] }))
  }

  function go(to: number) {
    if (to >= steps.length) {
      beep(990, 300)
      buzz([60, 60, 60])
      setFinished(true)
      return
    }
    const nextStep = steps[Math.max(0, to)]
    setI(Math.max(0, to))
    setLeft(nextStep.sec ?? 0)
    beep(nextStep.kind === 'work' ? 880 : 520, 150)
    buzz(25)
  }
  function advance() {
    go(i + 1)
  }

  const minutes = Math.max(1, Math.round((Date.now() - started.current) / 60000))
  if (finished || !step) return <Finish session={session} easy={easy} minutes={minutes} kg={kg} logged={logged} lastBy={lastBy} onDone={onExit} />

  const ex = step.exId ? EX[step.exId] : undefined
  const workIdx = steps.filter((x, k) => x.kind === 'work' && k <= i).length
  const workTotal = steps.filter((x) => x.kind === 'work').length
  const rounds = sessionParams(session, phase, easy).rounds
  const exCount = straight ? new Set(steps.map((x) => x.idx)).size : 0
  const lastLift = step.exId ? lastBy.get(step.exId)?.[0] : undefined

  return (
    <div className={cx('acc-body safe-top fixed inset-0 z-50 flex flex-col', step.kind === 'rest' ? 'bg-card2' : 'bg-page')}>
      <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-3 pt-2">
        <button aria-label="End session" onClick={() => (confirm('End this session?') ? setFinished(true) : null)} className="press flex h-11 w-11 items-center justify-center rounded-full text-ink2">
          <X size={22} />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
          <div className="h-full rounded-full bg-acc-fill transition-all" style={{ width: `${(i / steps.length) * 100}%` }} />
        </div>
        <div className="w-16 text-right text-[13px] font-semibold text-ink3">{straight ? `${step.idx + 1}/${exCount}` : `${workIdx}/${workTotal}`}</div>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-acc">
          {step.kind === 'rest'
            ? 'Rest'
            : session.mode === 'walk'
              ? 'Walk'
              : straight
                ? `Set ${step.setNo} of ${step.sets}${step.range ? ` · ${step.range[0]}–${step.range[1]} ${step.sec ? 's' : 'reps'}` : ''}`
                : `Round ${step.round} of ${rounds}`}
        </div>
        <div className="mt-2 text-[30px] font-bold leading-tight">{step.label}</div>
        {step.note && <div className="mt-1 text-[16px] font-medium text-ink2">{step.note}</div>}
        {step.kind === 'work' && step.tempo && <div className="mt-1 text-[14px] font-semibold text-acc">{step.tempo}</div>}

        <div className="mt-7">
          {step.sec ? (
            <Ring value={left} max={step.sec} size={210} stroke={12} label={`${left} seconds left`}>
              <div className="num text-[54px] font-bold leading-none">{left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : left}</div>
              <div className="mt-1 text-[13px] text-ink3">{left >= 60 ? 'min' : 'sec'}</div>
            </Ring>
          ) : (
            <div className="flex h-52.5 w-52.5 flex-col items-center justify-center rounded-full bg-acc-soft">
              <div className="num text-[64px] font-bold leading-none text-acc">{straight ? repsNow : step.reps}</div>
              <div className="mt-1 text-[14px] font-medium text-ink2">
                {ex?.kind === 'breath' ? 'breaths' : 'reps'}
                {step.note ? ` ${step.note}` : ''}
              </div>
            </div>
          )}
        </div>

        {straight && step.kind === 'work' && step.reps !== undefined && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <Stepper value={repsNow} onChange={setRepsNow} min={0} max={60} format={(v) => `${v} done`} />
            <div className="text-[13px] text-ink3">
              {easy ? `Easy day · about ${target}, with 3–4 reps left in the tank` : lastSet !== undefined ? `Last time: ${lastSet} · aim for ${target}` : `Aim for ${target}+ with 1–3 reps left in the tank`}
            </div>
          </div>
        )}
        {ex && step.kind === 'work' && !straight && <p className="mt-6 max-w-sm text-[14.5px] leading-relaxed text-ink2">{ex.cue ?? ex.how[0]}</p>}
        {ex && step.kind === 'work' && straight && step.setNo === 1 && <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-ink3">{ex.cue ?? ex.how[1] ?? ex.how[0]}</p>}
        {step.kind === 'rest' && next && (
          <p className="mt-6 text-[15px] text-ink2">
            Next: <b className="text-ink">{next.label}</b>
            {next.setNo ? ` · set ${next.setNo} of ${next.sets}` : next.reps ? ` · ${next.reps} reps` : next.sec ? ` · ${next.sec}s` : ''}
          </p>
        )}
        {step.kind === 'rest' && straight && lastLift && next?.exId === step.exId && <p className="mt-1 text-[13px] text-ink3">Last time on this exercise: {lastLift.reps.join(' · ')}</p>}
      </div>

      <div className="safe-bottom mx-auto w-full max-w-xl px-5 pb-4">
        {step.reps !== undefined && step.kind === 'work' ? (
          <Button
            full
            size="lg"
            onClick={() => {
              if (straight && step.exId) record(step.exId, repsNow)
              advance()
            }}
          >
            {straight ? `Done — log ${repsNow}` : 'Done — next'}
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-5">
            <button aria-label="Previous" onClick={() => go(i - 1)} className="press flex h-14 w-14 items-center justify-center rounded-full bg-card text-ink2">
              <StepBack size={22} />
            </button>
            <button aria-label={paused ? 'Resume' : 'Pause'} onClick={() => setPaused(!paused)} className="press flex items-center justify-center rounded-full bg-acc-fill text-acc-on" style={{ height: 72, width: 72 }}>
              {paused ? <Play size={28} /> : <Pause size={28} />}
            </button>
            <button aria-label="Skip" onClick={advance} className="press flex h-14 w-14 items-center justify-center rounded-full bg-card text-ink2">
              <SkipForward size={22} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Finish({
  session,
  easy,
  minutes,
  kg,
  logged,
  lastBy,
  onDone,
}: {
  session: Session
  easy: boolean
  minutes: number
  kg: number
  logged: Record<string, number[]>
  lastBy: Map<string, Lift[]>
  onDone: () => void
}) {
  const settings = useSettings()
  const [rpe, setRpe] = useState(7)
  const [pain, setPain] = useState(2)
  const [mins, setMins] = useState(minutes)
  const kcal = metKcal(session.met, kg, mins)
  const entries = Object.entries(logged).filter(([, v]) => v.length)
  const bests = entries
    .filter(([exId]) => !easy && EX[exId]?.unit === 'reps')
    .map(([exId, reps]) => {
      const prev = lastBy.get(exId) ?? []
      const prevBest = Math.max(0, ...prev.map((p) => p.reps.reduce((a, b) => a + b, 0)))
      const total = reps.reduce((a, b) => a + b, 0)
      return { exId, total, prevBest, isBest: prev.length > 0 && total > prevBest }
    })
    .filter((b) => b.isBest)

  function save() {
    const date = dkey()
    const kind: Activity['kind'] = session.kind === 'mobility' || session.kind === 'flare' ? 'mobility' : session.kind === 'walk' ? 'walk' : 'workout'
    put<Activity>('activity', { date, kind, session: session.id, title: easy ? `${session.name} (easy)` : session.name, minutes: mins, met: session.met, kcal, rpe, pain, easy: easy || undefined })
    for (const [exId, reps] of entries) {
      put<Lift>('lifts', { date, session: session.id, exId, reps, unit: EX[exId]?.unit ?? 'reps', kg: session.equipment === 'dumbbells' ? settings.training?.dumbbellKg : undefined, easy: easy || undefined })
    }
    toast(`${session.name.split(' · ')[0]} logged · +${kcal} kcal 💪`)
    onDone()
    back('/body/plan')
  }
  return (
    <Sheet
      open
      onClose={onDone}
      title="Session complete"
      accent="body"
      full={entries.length > 0}
      footer={
        <Button full size="lg" onClick={save}>
          Save · +{kcal} kcal
        </Button>
      }
    >
      <div className="py-2 text-center text-[44px]">{bests.length ? '🏆' : '🎉'}</div>
      {bests.length > 0 && (
        <div className="mb-4 rounded-2xl bg-[#0ca30c]/10 p-3 text-[14px]">
          <div className="font-semibold text-good">New personal bests</div>
          {bests.map((b) => (
            <div key={b.exId} className="text-ink2">
              {EX[b.exId].name}: {b.total} total reps (was {b.prevBest})
            </div>
          ))}
        </div>
      )}
      {entries.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-line bg-card">
          {entries.map(([exId, reps]) => (
            <div key={exId} className="flex justify-between border-b border-line px-3 py-2 text-[13.5px] last:border-b-0">
              <span className="truncate pr-2">{EX[exId]?.name}</span>
              <span className="num shrink-0 font-semibold">
                {reps.join(' · ')}
                {EX[exId]?.unit === 'sec' ? ' s' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      <Field label={`Duration: ${mins} min`}>
        <Slider label="Duration" min={1} max={120} value={mins} onChange={setMins} />
      </Field>
      <Field label={`How hard was it? ${rpe}/10`} className="mt-4">
        <Slider label="Effort" min={1} max={10} value={rpe} onChange={setRpe} left="easy" right="max" />
      </Field>
      <Field
        label={`Pain during: ${pain}/10`}
        className="mt-4"
        hint={pain >= 6 ? 'That’s past the comfortable zone — if it’s still up tomorrow morning, Forme suggests the easy version.' : 'Tracking this shows which exercises your back likes — and which it doesn’t.'}
      >
        <Slider label="Pain" min={0} max={10} value={pain} onChange={setPain} left="none" right="worst" />
      </Field>
    </Sheet>
  )
}
