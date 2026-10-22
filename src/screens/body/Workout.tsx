import { ChevronDown, ExternalLink, Pause, Play, SkipForward, StepBack, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Button, Card, Field, Page, Pill, Ring, Section, Slider, cx } from '../../components/ui'
import { EX, youtubeHow } from '../../data/exercises'
import { SESSIONS, programDay, resolveItems, sessionMinutes, sessionParams, type Session } from '../../data/program'
import { useProfile, useWeightNow } from '../../lib/app'
import { metKcal } from '../../lib/calc'
import { dkey } from '../../lib/date'
import { back } from '../../lib/router'
import { beep, buzz } from '../../lib/speech'
import { put } from '../../lib/store'
import type { Activity } from '../../lib/types'

type Step = { kind: 'work' | 'rest'; exId?: string; label: string; sec?: number; reps?: number; note?: string; round: number; idx: number }

function buildSteps(s: Session, phase: number): Step[] {
  const p = sessionParams(s, phase)
  if (s.mode === 'walk') return [{ kind: 'work', exId: 'brisk-walk', label: 'Brisk walk', sec: p.walkMin * 60, round: 1, idx: 0 }]
  const items = resolveItems(s, phase)
  const steps: Step[] = []
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
  const s = SESSIONS[id] ?? SESSIONS.mobility
  const { profile } = useProfile()
  const phase = programDay(profile.planStart, dkey()).phase.n
  const [playing, setPlaying] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const items = resolveItems(s, phase)
  const p = sessionParams(s, phase)

  if (playing) return <Player session={s} phase={phase} onExit={() => setPlaying(false)} />

  return (
    <Page accent="body" back="/body/plan" title={s.name}>
      <Card className="mt-1">
        <p className="text-[14.5px] leading-relaxed text-ink2">{s.desc}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill>{sessionMinutes(s, phase)} min</Pill>
          {s.mode !== 'walk' && s.mode !== 'rest' && <Pill tone="muted">{p.rounds} round{p.rounds > 1 ? 's' : ''}</Pill>}
          {s.mode === 'interval' && (
            <Pill tone="muted">
              {p.work}s on / {p.rest}s off
            </Pill>
          )}
          <Pill tone="muted">Phase {phase}</Pill>
        </div>
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
              return (
                <div key={i} className="border-b border-line last:border-b-0">
                  <button onClick={() => setOpen(isOpen ? null : it.exId + i)} className="press flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card2 text-[12px] font-bold text-ink3">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">{ex.name}</div>
                      <div className="text-[12.5px] text-ink3">
                        {s.mode === 'interval' ? `${p.work} s` : it.unit === 'sec' ? `${it.amt} s` : `${it.amt} reps`}
                        {it.perSide && s.mode !== 'interval' ? ' each side' : ''}
                      </div>
                    </div>
                    <ChevronDown size={18} className={cx('text-ink3 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-[14px] leading-relaxed">
                      <ol className="list-decimal space-y-1 pl-5 text-ink2">
                        {ex.how.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ol>
                      {ex.cue && <p className="mt-2 text-ink2"><b>Cue:</b> {ex.cue}</p>}
                      {ex.spine && <p className="mt-2 rounded-2xl bg-acc-soft px-3 py-2 text-[13.5px] text-ink">🦴 {ex.spine}</p>}
                      {(ex.easier || ex.harder) && (
                        <p className="mt-2 text-[13px] text-ink3">
                          {ex.easier && <>Easier: {ex.easier} </>}
                          {ex.harder && <>Harder: {ex.harder}</>}
                        </p>
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

function Player({ session, phase, onExit }: { session: Session; phase: number; onExit: () => void }) {
  const steps = useMemo(() => buildSteps(session, phase), [session, phase])
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [left, setLeft] = useState(steps[0]?.sec ?? 0)
  const [finished, setFinished] = useState(false)
  const started = useRef(Date.now())
  const endsAt = useRef<number | null>(null)
  const lastBeep = useRef(-1)
  const step = steps[i]
  const next = steps.slice(i + 1).find((x) => x.kind === 'work')
  const kg = useWeightNow()

  // keep the screen awake while training
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => void lock?.release().catch(() => {})
  }, [])

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
        advance()
      }
    }, 200)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  function go(to: number) {
    if (to >= steps.length) {
      beep(990, 300)
      buzz([60, 60, 60])
      setFinished(true)
      return
    }
    const target = steps[Math.max(0, to)]
    setI(Math.max(0, to))
    setLeft(target.sec ?? 0)
    beep(target.kind === 'work' ? 880 : 520, 150)
    buzz(25)
  }
  function advance() {
    go(i + 1)
  }

  const minutes = Math.max(1, Math.round((Date.now() - started.current) / 60000))
  if (finished || !step) return <Finish session={session} minutes={minutes} kg={kg} onDone={onExit} />

  const ex = step.exId ? EX[step.exId] : undefined
  const workIdx = steps.filter((x, k) => x.kind === 'work' && k <= i).length
  const workTotal = steps.filter((x) => x.kind === 'work').length
  const rounds = sessionParams(session, phase).rounds

  return (
    <div className={cx('acc-body safe-top fixed inset-0 z-50 flex flex-col', step.kind === 'rest' ? 'bg-card2' : 'bg-page')}>
      <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-3 pt-2">
        <button aria-label="End session" onClick={() => (confirm('End this session?') ? setFinished(true) : null)} className="press flex h-11 w-11 items-center justify-center rounded-full text-ink2">
          <X size={22} />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
          <div className="h-full rounded-full bg-acc-fill transition-all" style={{ width: `${(i / steps.length) * 100}%` }} />
        </div>
        <div className="w-16 text-right text-[13px] font-semibold text-ink3">
          {workIdx}/{workTotal}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-acc">
          {step.kind === 'rest' ? 'Rest' : session.mode === 'walk' ? 'Walk' : `Round ${step.round} of ${rounds}`}
        </div>
        <div className="mt-2 text-[30px] font-bold leading-tight">{step.kind === 'rest' ? step.label : step.label}</div>
        {step.note && <div className="mt-1 text-[16px] font-medium text-ink2">{step.note}</div>}

        <div className="mt-8">
          {step.sec ? (
            <Ring value={left} max={step.sec} size={210} stroke={12} label={`${left} seconds left`}>
              <div className="num text-[54px] font-bold leading-none">
                {left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : left}
              </div>
              <div className="mt-1 text-[13px] text-ink3">{left >= 60 ? 'min' : 'sec'}</div>
            </Ring>
          ) : (
            <div className="flex h-52.5 w-52.5 flex-col items-center justify-center rounded-full bg-acc-soft">
              <div className="num text-[64px] font-bold leading-none text-acc">{step.reps}</div>
              <div className="mt-1 text-[14px] font-medium text-ink2">
                {ex?.kind === 'breath' ? 'breaths' : 'reps'}
                {step.note ? ` ${step.note}` : ''}
              </div>
            </div>
          )}
        </div>

        {ex && step.kind === 'work' && <p className="mt-6 max-w-sm text-[14.5px] leading-relaxed text-ink2">{ex.cue ?? ex.how[0]}</p>}
        {step.kind === 'rest' && next && (
          <p className="mt-6 text-[15px] text-ink2">
            Next: <b className="text-ink">{next.label}</b>
            {next.reps ? ` · ${next.reps} reps` : next.sec ? ` · ${next.sec}s` : ''}
          </p>
        )}
      </div>

      <div className="safe-bottom mx-auto w-full max-w-xl px-5 pb-4">
        {step.reps && step.kind === 'work' ? (
          <Button full size="lg" onClick={advance}>
            Done — next
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-5">
            <button aria-label="Previous" onClick={() => go(i - 1)} className="press flex h-14 w-14 items-center justify-center rounded-full bg-card text-ink2">
              <StepBack size={22} />
            </button>
            <button
              aria-label={paused ? 'Resume' : 'Pause'}
              onClick={() => setPaused(!paused)}
              className="press flex h-18 w-18 items-center justify-center rounded-full bg-acc-fill text-acc-on"
              style={{ height: 72, width: 72 }}
            >
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

function Finish({ session, minutes, kg, onDone }: { session: Session; minutes: number; kg: number; onDone: () => void }) {
  const [rpe, setRpe] = useState(5)
  const [pain, setPain] = useState(2)
  const [mins, setMins] = useState(minutes)
  const kcal = metKcal(session.met, kg, mins)
  function save() {
    const kind: Activity['kind'] = session.kind === 'mobility' || session.kind === 'flare' ? 'mobility' : session.kind === 'walk' ? 'walk' : 'workout'
    put<Activity>('activity', { date: dkey(), kind, session: session.id, title: session.name, minutes: mins, met: session.met, kcal, rpe, pain })
    toast(`${session.name} logged · +${kcal} kcal 💪`)
    onDone()
    back('/body/plan')
  }
  return (
    <Sheet
      open
      onClose={onDone}
      title="Session complete"
      accent="body"
      footer={
        <Button full size="lg" onClick={save}>
          Save · +{kcal} kcal
        </Button>
      }
    >
      <div className="py-2 text-center text-[44px]">🎉</div>
      <Field label={`Duration: ${mins} min`}>
        <Slider label="Duration" min={1} max={120} value={mins} onChange={setMins} />
      </Field>
      <Field label={`How hard was it? ${rpe}/10`} className="mt-4">
        <Slider label="Effort" min={1} max={10} value={rpe} onChange={setRpe} left="easy" right="max" />
      </Field>
      <Field label={`Pain during: ${pain}/10`} className="mt-4" hint="Tracking this shows which exercises your back likes — and which it doesn't.">
        <Slider label="Pain" min={0} max={10} value={pain} onChange={setPain} left="none" right="worst" />
      </Field>
    </Sheet>
  )
}
