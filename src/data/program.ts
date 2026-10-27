// The 120-day challenge: a home program in four phases over 17 weeks, then day 120 — the finish line.
// Every day starts with 10 minutes of mobility.
// Values are per phase: [Foundation, Build, Burn, Define].
//
// Two weekly templates: bodyweight-only, and dumbbells (upper/lower split, each muscle twice a week,
// ~10+ hard sets per muscle per week, sets taken to 1–3 reps short of failure — see PRINCIPLES/SOURCES).

import { addDays, diffDays, weekday } from '../lib/date'
import { EX } from './exercises'

export type Phase = { n: 1 | 2 | 3 | 4; name: string; weeks: [number, number]; focus: string; steps: number; effort: string }

export const PHASES: Phase[] = [
  { n: 1, name: 'Foundation', weeks: [1, 4], focus: 'Learn the movements, build the habit, wake the spine up. Easy is the point.', steps: 7000, effort: 'Stop every set with 2–3 good reps left in the tank.' },
  { n: 2, name: 'Build', weeks: [5, 8], focus: 'More sets, slower lowering. Strength starts to show.', steps: 8000, effort: '1–2 reps left; the last set of small exercises can go to failure.' },
  { n: 3, name: 'Burn', weeks: [9, 12], focus: 'Shorter rests, more volume — the fat-loss engine.', steps: 9000, effort: '0–2 reps left. Use 1½ reps or half-reps to finish isolation sets.' },
  { n: 4, name: 'Define', weeks: [13, 17], focus: 'Hardest variations, slow tempo, then retest everything in week 17.', steps: 10000, effort: '0–2 reps left, hardest variations. Week 17: retest.' },
]
export const PLAN_WEEKS = 17
export const PLAN_DAYS = 120 // weeks 1–17 + the finish-line day (counted in week 17)
export const BENCHMARK_WEEKS = [1, 5, 9, 13, 17]

type Block = { ex: string | string[]; amt?: number[]; sets?: number[]; range?: [number, number]; rest?: number; tempo?: string }
export type Session = {
  id: string
  name: string
  kind: 'mobility' | 'strength' | 'circuit' | 'cardio' | 'walk' | 'rest' | 'flare' | 'core'
  mode: 'sets' | 'interval' | 'walk' | 'rest'
  layout?: 'circuit' | 'straight'
  equipment?: 'dumbbells'
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

  // ── Dumbbell split (2 × 5 kg) ──
  upperA: {
    id: 'upperA', name: 'Upper A · chest, shoulders, rows', kind: 'strength', mode: 'sets', layout: 'straight', equipment: 'dumbbells', met: 5,
    desc: 'Pressing and rowing for a broad, upright upper body. Straight sets: finish all sets of one exercise, then move on.',
    items: [
      { ex: 'db-floor-press', sets: [3, 3, 4, 4], range: [12, 20], rest: 75, tempo: '3 s down · 1 s pause' },
      { ex: ['incline-pushup', 'knee-pushup', 'pushup', 'pushup'], sets: [3, 3, 3, 3], range: [8, 15], rest: 75 },
      { ex: 'db-row', sets: [3, 3, 4, 4], range: [12, 20], rest: 60, tempo: '1 s squeeze · 3 s down' },
      { ex: 'db-ohp', sets: [3, 3, 3, 4], range: [10, 15], rest: 75 },
      { ex: 'lat-raise', sets: [3, 3, 4, 4], range: [15, 25], rest: 45, tempo: '3 s down' },
      { ex: 'db-oh-ext', sets: [2, 3, 3, 3], range: [12, 20], rest: 45 },
    ],
  },
  lowerA: {
    id: 'lowerA', name: 'Lower A · squat, hinge + abs', kind: 'strength', mode: 'sets', layout: 'straight', equipment: 'dumbbells', met: 5,
    desc: 'Legs and glutes with slow, controlled reps — light dumbbells made hard — then anti-extension ab work.',
    items: [
      { ex: 'goblet-squat', sets: [3, 3, 4, 4], range: [15, 20], rest: 75, tempo: '3 s down · 1 s pause' },
      { ex: 'db-rdl', sets: [3, 3, 4, 4], range: [15, 20], rest: 75, tempo: '3 s down' },
      { ex: ['db-reverse-lunge', 'db-reverse-lunge', 'bss', 'bss'], sets: [2, 3, 3, 3], range: [10, 15], rest: 60 },
      { ex: 'db-hip-thrust', sets: [3, 3, 3, 4], range: [15, 25], rest: 60, tempo: '2 s squeeze' },
      { ex: 'db-calf', sets: [2, 2, 3, 3], range: [12, 20], rest: 45 },
      { ex: 'weighted-dead-bug', sets: [2, 3, 3, 3], range: [8, 12], rest: 45 },
      { ex: ['plank-knee', 'plank', 'plank', 'plank'], sets: [2, 2, 3, 3], range: [20, 45], rest: 45 },
      { ex: 'mcgill-curlup', sets: [2, 2, 3, 3], range: [5, 8], rest: 30 },
    ],
  },
  upperB: {
    id: 'upperB', name: 'Upper B · back, arms, shoulders', kind: 'strength', mode: 'sets', layout: 'straight', equipment: 'dumbbells', met: 5,
    desc: 'Back width, rear shoulders and arms — the V-taper that makes the waist look smaller.',
    items: [
      { ex: 'seal-row', sets: [3, 3, 4, 4], range: [12, 20], rest: 60, tempo: '1 s squeeze · 3 s down' },
      { ex: 'db-pullover', sets: [3, 3, 3, 3], range: [12, 20], rest: 60 },
      { ex: ['incline-pushup', 'knee-pushup', 'close-pushup', 'close-pushup'], sets: [3, 3, 3, 3], range: [8, 15], rest: 60 },
      { ex: 'lat-raise', sets: [3, 3, 4, 4], range: [15, 25], rest: 45, tempo: '3 s down' },
      { ex: 'reverse-fly', sets: [3, 3, 3, 4], range: [15, 25], rest: 45 },
      { ex: 'db-curl', sets: [3, 3, 3, 4], range: [12, 20], rest: 45, tempo: '3 s down' },
    ],
  },
  lowerB: {
    id: 'lowerB', name: 'Lower B · single-leg + abs', kind: 'strength', mode: 'sets', layout: 'straight', equipment: 'dumbbells', met: 5,
    desc: 'One leg at a time doubles what 5 kg can do. Then side-to-side core work for a strong, narrow waist.',
    items: [
      { ex: ['db-reverse-lunge', 'bss', 'bss', 'bss'], sets: [3, 3, 4, 4], range: [8, 15], rest: 75 },
      { ex: ['db-rdl', 'sl-rdl', 'sl-rdl', 'sl-rdl'], sets: [3, 3, 3, 4], range: [10, 15], rest: 60 },
      { ex: 'goblet-squat', sets: [2, 3, 3, 3], range: [15, 20], rest: 60, tempo: '1½ reps from phase 3' },
      { ex: ['db-hip-thrust', 'sl-hip-thrust', 'sl-hip-thrust', 'sl-hip-thrust'], sets: [3, 3, 3, 3], range: [12, 20], rest: 60 },
      { ex: ['side-plank-knee', 'side-plank-knee', 'side-plank', 'side-plank'], sets: [2, 3, 3, 3], range: [20, 40], rest: 30 },
      { ex: 'suitcase-carry', sets: [2, 2, 3, 3], range: [30, 45], rest: 30 },
      { ex: 'reverse-crunch', sets: [2, 3, 3, 3], range: [10, 15], rest: 45 },
    ],
  },
  finisher: {
    id: 'finisher', name: 'Abs & arms finisher', kind: 'core', mode: 'interval', equipment: 'dumbbells', met: 4,
    desc: 'Optional, ten minutes after the long walk: arms and abs, low impact, high pump.',
    rounds: [2, 2, 3, 3], work: [30, 35, 40, 40], rest: [20, 20, 15, 15], roundRest: 45,
    items: [{ ex: 'hammer-curl' }, { ex: 'db-oh-ext' }, { ex: 'hollow-hold' }, { ex: 'lat-raise' }, { ex: 'bird-dog' }],
  },

  // ── Bodyweight template (no equipment) ──
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
/** With dumbbells: upper/lower split, each muscle twice a week, cardio and walks for fat loss. */
export const WEEK_PLAN_DB: Record<number, string[]> = {
  1: ['upperA'], 2: ['lowerA'], 3: ['cardio', 'posture'], 4: ['upperB'], 5: ['lowerB'], 6: ['longwalk', 'finisher'], 0: ['rest'],
}

export type ResolvedItem = {
  exId: string
  amt: number
  unit: 'reps' | 'sec'
  perSide: boolean
  sets?: number
  range?: [number, number]
  rest?: number
  tempo?: string
  from?: string // the exercise this one stands in for (easy version)
}

/**
 * The easy version, for sore or stiff days (NASS: in a flare keep moving — little and often, lower
 * intensity, nothing high-impact). Swaps take load off the spine and drop deep loaded flexion and
 * anything ballistic. A swap must measure the same way (reps vs seconds) unless the session is timed.
 */
export const EASY_SWAP: Record<string, string> = {
  'goblet-squat': 'chair-squat', squat: 'chair-squat', 'tempo-squat': 'chair-squat', 'split-squat': 'chair-squat',
  bss: 'split-squat', 'db-reverse-lunge': 'reverse-lunge',
  'db-rdl': 'hinge', 'sl-rdl': 'hinge', 'backpack-rdl': 'hinge',
  'sl-hip-thrust': 'db-hip-thrust', 'sl-bridge': 'glute-bridge', 'hip-thrust': 'glute-bridge',
  pushup: 'incline-pushup', 'close-pushup': 'incline-pushup', 'knee-pushup': 'incline-pushup', 'pike-pushup': 'incline-pushup',
  'weighted-dead-bug': 'dead-bug', 'reverse-crunch': 'bird-dog', 'hollow-hold': 'dead-bug',
  plank: 'plank-knee', 'side-plank': 'side-plank-knee',
  skater: 'march', 'step-jack': 'march', 'heel-tap': 'march', 'front-kick': 'shadow-box',
}

/** Mobility and flare care are already gentle — the easy version leaves them alone. */
const softens = (s: Session, easy: boolean) => easy && s.kind !== 'mobility' && s.kind !== 'flare'

export function resolveItems(s: Session, phase: number, easy = false): ResolvedItem[] {
  const soft = softens(s, easy)
  return s.items.map((b) => {
    let exId = Array.isArray(b.ex) ? at(b.ex, phase, b.ex[0]) : b.ex
    let from: string | undefined
    const alt = soft ? EASY_SWAP[exId] : undefined
    if (alt && EX[alt] && (s.mode === 'interval' || EX[alt].unit === EX[exId].unit)) {
      from = exId
      exId = alt
    }
    const ex = EX[exId]
    if (s.mode === 'interval') return { exId, amt: Math.round(at(s.work, phase, 30) * (soft ? 0.75 : 1)), unit: 'sec', perSide: false, from }
    if (s.layout === 'straight' && b.range) {
      const sets = at(b.sets, phase, 3)
      return {
        exId,
        amt: ex.unit === 'sec' ? (phase <= 2 || soft ? b.range[0] : b.range[1]) : b.range[0],
        unit: ex.unit,
        perSide: !!ex.perSide,
        sets: soft ? Math.max(1, sets - 1) : sets,
        range: b.range,
        rest: (b.rest ?? 60) + (soft ? 30 : 0),
        tempo: b.tempo,
        from,
      }
    }
    const amt = at(b.amt, phase, 10)
    return { exId, amt: soft ? Math.max(3, Math.round(amt * 0.75)) : amt, unit: ex.unit, perSide: !!ex.perSide, from }
  })
}

export function sessionParams(s: Session, phase: number, easy = false) {
  const soft = softens(s, easy)
  const rounds = at(s.rounds, phase, 1)
  const walkMin = at(s.walkMin, phase, 30)
  return {
    rounds: soft && rounds > 1 ? rounds - 1 : rounds,
    rest: at(s.rest, phase, 20) + (soft ? 10 : 0),
    roundRest: s.roundRest ?? 60,
    work: Math.round(at(s.work, phase, 30) * (soft ? 0.75 : 1)),
    walkMin: soft ? Math.max(15, Math.round((walkMin * 0.67) / 5) * 5) : walkMin,
  }
}

/** Rough duration in minutes */
export function sessionMinutes(s: Session, phase: number, easy = false): number {
  const p = sessionParams(s, phase, easy)
  if (s.mode === 'walk') return p.walkMin
  if (s.mode === 'rest') return 0
  const items = resolveItems(s, phase, easy)
  if (s.layout === 'straight') {
    let sec = 0
    for (const it of items) {
      const side = it.perSide ? 2 : 1
      const work = it.unit === 'sec' ? it.amt : ((it.range?.[0] ?? 12) + (it.range?.[1] ?? 12)) / 2 * 3.5
      sec += (it.sets ?? 3) * (work * side + (it.rest ?? 60))
    }
    return Math.round((sec + 180) / 60)
  }
  let sec = 0
  for (const it of items) {
    const side = it.perSide ? 2 : 1
    sec += (it.unit === 'sec' ? it.amt : it.amt * 3.2) * side + p.rest
  }
  return Math.max(5, Math.round((sec * p.rounds + p.roundRest * (p.rounds - 1) + (s.mode === 'interval' ? 120 : 60)) / 60))
}

export function programDay(planStart: string, date: string, dumbbells = false) {
  const idx = diffDays(date, planStart)
  const week = Math.floor(idx / 7) + 1
  const clampedWeek = Math.min(Math.max(week, 1), PLAN_WEEKS)
  const phaseObj = PHASES.find((p) => clampedWeek >= p.weeks[0] && clampedWeek <= p.weeks[1]) ?? PHASES[3]
  const plan = dumbbells ? WEEK_PLAN_DB : WEEK_PLAN
  return {
    day: idx + 1,
    week: clampedWeek,
    totalDays: PLAN_DAYS,
    phase: phaseObj,
    before: idx < 0,
    after: idx >= PLAN_DAYS,
    benchmark: BENCHMARK_WEEKS.includes(clampedWeek),
    sessions: (plan[weekday(date)] ?? ['rest']).map((id) => SESSIONS[id]),
  }
}

export const weekPlanFor = (dumbbells: boolean) => (dumbbells ? WEEK_PLAN_DB : WEEK_PLAN)

/** Where today sits in the 120-day challenge. */
export function challengeSpan(planStart: string, today: string) {
  const dayNo = diffDays(today, planStart) + 1
  return { start: planStart, finish: addDays(planStart, PLAN_DAYS - 1), dayNo, before: dayNo < 1, after: dayNo > PLAN_DAYS, left: PLAN_DAYS - Math.min(Math.max(dayNo, 0), PLAN_DAYS) }
}

/** Checkpoints of the challenge; each lines up with a retest week of the plan. */
export const MILESTONES = [
  { day: 1, title: 'Starting line', what: 'Weigh in, measure your waist, take the fitness test, and write to Day-120 you.' },
  { day: 30, title: 'One month', what: 'Retest week — push-ups, plank, wall sit, chair stands. Compare with Day 1.' },
  { day: 60, title: 'Halfway', what: 'Measure again and check the weight trend. Stalled for two weeks? Trim 100–150 kcal.' },
  { day: 90, title: 'Three months', what: 'Retest week. The hardest variations start now.' },
  { day: 120, title: 'Finish line', what: 'Final weigh-in, measurements and fitness test — then open your letter.' },
]

/** Weekly hard sets per muscle in the dumbbell template, by phase (shown in the plan). */
export const DB_VOLUME = [
  { muscle: 'Chest', sets: [9, 9, 10, 10] },
  { muscle: 'Back & lats', sets: [12, 12, 14, 15] },
  { muscle: 'Side shoulders', sets: [9, 9, 11, 12] },
  { muscle: 'Arms', sets: [8, 9, 9, 10] },
  { muscle: 'Quads & glutes', sets: [13, 15, 17, 17] },
  { muscle: 'Hamstrings', sets: [6, 6, 7, 8] },
  { muscle: 'Abs & core', sets: [12, 15, 18, 18] },
]
