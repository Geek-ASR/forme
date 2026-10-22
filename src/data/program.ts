// 17-week home program: four phases + a test week. Every day starts with 10 minutes of mobility.
// Values are per phase: [Foundation, Build, Burn, Define].

import { diffDays, weekday } from '../lib/date'
import { EX } from './exercises'

export type Phase = { n: 1 | 2 | 3 | 4; name: string; weeks: [number, number]; focus: string; steps: number }

export const PHASES: Phase[] = [
  { n: 1, name: 'Foundation', weeks: [1, 4], focus: 'Learn the movements, build the habit, wake the spine up. Easy is the point.', steps: 7000 },
  { n: 2, name: 'Build', weeks: [5, 8], focus: 'More rounds, harder variations. Strength starts to show.', steps: 8000 },
  { n: 3, name: 'Burn', weeks: [9, 12], focus: 'Shorter rests, more volume — the fat-loss engine.', steps: 9000 },
  { n: 4, name: 'Define', weeks: [13, 17], focus: 'Hardest variations, slow tempo, then retest everything in week 17.', steps: 10000 },
]
export const PLAN_WEEKS = 17
export const BENCHMARK_WEEKS = [1, 5, 9, 13, 17]

type Block = { ex: string | string[]; amt?: number[] }
export type Session = {
  id: string
  name: string
  kind: 'mobility' | 'strength' | 'circuit' | 'cardio' | 'walk' | 'rest' | 'flare' | 'core'
  mode: 'sets' | 'interval' | 'walk' | 'rest'
  met: number
  desc: string
  rounds?: number[]
  rest?: number[]
  roundRest?: number
  work?: number[]
  walkMin?: number[]
  items: Block[]
}

const at = <T,>(arr: T[] | undefined, phase: number, fallback: T): T => (arr?.length ? arr[Math.min(phase - 1, arr.length - 1)] : fallback)

export const SESSIONS: Record<string, Session> = {
  mobility: {
    id: 'mobility', name: 'Morning mobility', kind: 'mobility', mode: 'sets', met: 2.3,
    desc: 'Ten minutes that set up the whole day. Best after a warm shower, before stiffness settles in.',
    rounds: [1], rest: [8], roundRest: 0,
    items: [
      { ex: 'breath', amt: [6] }, { ex: 'chin-tuck', amt: [10] }, { ex: 'shoulder-roll', amt: [10] },
      { ex: 'cat-cow', amt: [8] }, { ex: 'thread-needle', amt: [5] }, { ex: 'prone-pressup', amt: [8] },
      { ex: 'hip-flexor', amt: [30] }, { ex: 'hamstring', amt: [30] }, { ex: 'wall-angel', amt: [8] },
      { ex: 'standing-ext', amt: [5] },
    ],
  },
  flare: {
    id: 'flare', name: 'Flare care', kind: 'flare', mode: 'sets', met: 1.8,
    desc: 'For high-pain days: rest from intensity, not from movement. Gentle range, slow breathing, warmth after.',
    rounds: [1], rest: [10], roundRest: 0,
    items: [
      { ex: 'breath', amt: [8] }, { ex: 'chin-tuck', amt: [8] }, { ex: 'cat-cow', amt: [6] },
      { ex: 'supine-twist', amt: [10] }, { ex: 'heel-slide', amt: [8] }, { ex: 'towel-ext', amt: [60] },
    ],
  },
  strengthA: {
    id: 'strengthA', name: 'Strength A · legs, push, posture', kind: 'strength', mode: 'sets', met: 4.5,
    desc: 'Squat, push, bridge and the upper-back work that keeps you upright.',
    rounds: [2, 3, 3, 4], rest: [45, 40, 30, 30], roundRest: 75,
    items: [
      { ex: ['chair-squat', 'squat', 'tempo-squat', 'split-squat'], amt: [10, 12, 10, 10] },
      { ex: ['wall-pushup', 'incline-pushup', 'knee-pushup', 'pushup'], amt: [10, 10, 10, 8] },
      { ex: ['glute-bridge', 'glute-bridge', 'sl-bridge', 'hip-thrust'], amt: [12, 15, 10, 15] },
      { ex: 'bird-dog', amt: [6, 8, 8, 10] },
      { ex: 'prone-yt', amt: [8, 10, 12, 12] },
      { ex: ['plank-knee', 'plank', 'plank', 'plank'], amt: [20, 25, 35, 45] },
    ],
  },
  strengthB: {
    id: 'strengthB', name: 'Strength B · hinge, pull, core', kind: 'strength', mode: 'sets', met: 4.5,
    desc: 'Hip hinge, rows and a strong, steady core — the back-friendly half of the week.',
    rounds: [2, 3, 3, 4], rest: [45, 40, 30, 30], roundRest: 75,
    items: [
      { ex: ['hinge', 'backpack-rdl', 'backpack-rdl', 'backpack-rdl'], amt: [10, 10, 12, 12] },
      { ex: ['door-row', 'backpack-row', 'backpack-row', 'backpack-row'], amt: [10, 10, 12, 12] },
      { ex: ['wall-sit', 'split-squat', 'reverse-lunge', 'reverse-lunge'], amt: [25, 8, 8, 10] },
      { ex: 'superman', amt: [15, 20, 25, 30] },
      { ex: 'dead-bug', amt: [6, 8, 10, 10] },
      { ex: ['side-plank-knee', 'side-plank-knee', 'side-plank', 'side-plank'], amt: [15, 20, 20, 30] },
      { ex: 'calf-raise', amt: [12, 15, 20, 25] },
    ],
  },
  circuit: {
    id: 'circuit', name: 'Full-body circuit', kind: 'circuit', mode: 'interval', met: 5,
    desc: 'Timed intervals that keep the heart rate up. Low-impact: one foot always on the floor.',
    rounds: [2, 3, 3, 4], work: [30, 35, 40, 45], rest: [30, 25, 20, 15], roundRest: 60,
    items: [
      { ex: ['chair-squat', 'squat', 'squat', 'tempo-squat'] }, { ex: ['wall-pushup', 'incline-pushup', 'incline-pushup', 'knee-pushup'] },
      { ex: 'march' }, { ex: 'glute-bridge' }, { ex: 'standing-crunch' }, { ex: 'shadow-box' }, { ex: 'bird-dog' }, { ex: 'step-jack' },
    ],
  },
  cardio: {
    id: 'cardio', name: 'Low-impact cardio', kind: 'cardio', mode: 'interval', met: 5,
    desc: 'Sweaty but kind to the joints — no jumps, no stairs.',
    rounds: [3, 3, 4, 4], work: [40, 45, 50, 50], rest: [20, 15, 15, 10], roundRest: 45,
    items: [{ ex: 'march' }, { ex: 'shadow-box' }, { ex: 'step-jack' }, { ex: 'skater' }, { ex: 'heel-tap' }, { ex: 'front-kick' }],
  },
  posture: {
    id: 'posture', name: 'Posture & core', kind: 'core', mode: 'sets', met: 2.5,
    desc: 'Short and precise: the exercises that keep a spine tall and mobile.',
    rounds: [1, 2, 2, 2], rest: [15], roundRest: 30,
    items: [
      { ex: 'wall-angel', amt: [10] }, { ex: 'chin-tuck', amt: [10] }, { ex: 'prone-pressup', amt: [10] },
      { ex: 'open-book', amt: [8] }, { ex: 'bird-dog', amt: [8] }, { ex: 'dead-bug', amt: [8] }, { ex: 'towel-ext', amt: [60] },
    ],
  },
  walk: {
    id: 'walk', name: 'Brisk walk', kind: 'walk', mode: 'walk', met: 4.3, walkMin: [30, 35, 40, 45], items: [],
    desc: 'Talk-but-not-sing pace on a flat route. Walking is medicine for a stiff spine.',
  },
  longwalk: {
    id: 'longwalk', name: 'Long walk', kind: 'walk', mode: 'walk', met: 4.3, walkMin: [40, 45, 50, 60], items: [],
    desc: 'Your longest, easiest effort of the week. Cycling or swimming is a great swap if you have access.',
  },
  rest: {
    id: 'rest', name: 'Rest & reset', kind: 'rest', mode: 'rest', met: 1, items: [],
    desc: 'Morning mobility, an easy walk, weigh-in and your weekly review. Recovery is part of the plan.',
  },
}

/** Weekday → sessions (0 = Sunday). Mobility happens every morning on top of this. */
export const WEEK_PLAN: Record<number, string[]> = {
  1: ['strengthA'], 2: ['cardio'], 3: ['strengthB'], 4: ['walk', 'posture'], 5: ['circuit'], 6: ['longwalk'], 0: ['rest'],
}

export type ResolvedItem = { exId: string; amt: number; unit: 'reps' | 'sec'; perSide: boolean }

export function resolveItems(s: Session, phase: number): ResolvedItem[] {
  return s.items.map((b) => {
    const exId = Array.isArray(b.ex) ? at(b.ex, phase, b.ex[0]) : b.ex
    const ex = EX[exId]
    if (s.mode === 'interval') return { exId, amt: at(s.work, phase, 30), unit: 'sec', perSide: false }
    return { exId, amt: at(b.amt, phase, 10), unit: ex.unit, perSide: !!ex.perSide }
  })
}

export function sessionParams(s: Session, phase: number) {
  return {
    rounds: at(s.rounds, phase, 1),
    rest: at(s.rest, phase, 20),
    roundRest: s.roundRest ?? 60,
    work: at(s.work, phase, 30),
    walkMin: at(s.walkMin, phase, 30),
  }
}

/** Rough duration in minutes */
export function sessionMinutes(s: Session, phase: number): number {
  const p = sessionParams(s, phase)
  if (s.mode === 'walk') return p.walkMin
  if (s.mode === 'rest') return 0
  const items = resolveItems(s, phase)
  let sec = 0
  for (const it of items) {
    const side = it.perSide ? 2 : 1
    sec += (it.unit === 'sec' ? it.amt : it.amt * 3.2) * side + p.rest
  }
  return Math.max(5, Math.round((sec * p.rounds + p.roundRest * (p.rounds - 1) + (s.mode === 'interval' ? 120 : 60)) / 60))
}

export function programDay(planStart: string, date: string) {
  const idx = diffDays(date, planStart)
  const week = Math.floor(idx / 7) + 1
  const clampedWeek = Math.min(Math.max(week, 1), PLAN_WEEKS)
  const phaseObj = PHASES.find((p) => clampedWeek >= p.weeks[0] && clampedWeek <= p.weeks[1]) ?? PHASES[3]
  return {
    day: idx + 1,
    week: clampedWeek,
    totalDays: PLAN_WEEKS * 7,
    phase: phaseObj,
    before: idx < 0,
    after: idx >= PLAN_WEEKS * 7,
    benchmark: BENCHMARK_WEEKS.includes(clampedWeek),
    sessions: (WEEK_PLAN[weekday(date)] ?? ['rest']).map((id) => SESSIONS[id]),
  }
}
