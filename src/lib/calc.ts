// Energy & health maths. All estimates — shown with their method so they can be trusted for what they are.
//
// Burn model (per day):
//   base     = BMR (Mifflin–St Jeor) × 1.2       — resting + everyday living ("sedentary")
//   walking  = steps beyond 3,000 × net cost      — the first ~3k steps are already inside the 1.2 factor
//   workouts = Σ (MET − 1) × kg × hours           — net of resting, so nothing is counted twice

import { addDays, diffDays, dkey, parseKey } from './date'
import type { Activity, BodyEntry, Profile } from './types'

export function ageOn(birth: string | undefined, on = dkey()): number {
  if (!birth) return 25
  const [y, m, d] = birth.split('-').map(Number)
  const t = parseKey(on)
  let age = t.getFullYear() - y
  const mm = m || 1
  const dd = d || 1
  if (t.getMonth() + 1 < mm || (t.getMonth() + 1 === mm && t.getDate() < dd)) age--
  return age
}

export function bmr(p: Pick<Profile, 'sex' | 'heightCm' | 'birth'>, kg: number, on = dkey()): number {
  const base = 10 * kg + 6.25 * p.heightCm - 5 * ageOn(p.birth, on)
  return Math.round(p.sex === 'female' ? base - 161 : base + 5)
}

export const baseBurn = (b: number) => Math.round(b * 1.2)

/** Stride ≈ 0.415 × height; walking ≈ 3.5 MET at ~4.8 km/h → net (MET−1) cost per km */
export function stepsKcal(steps: number, kg: number, heightCm: number): number {
  const extra = Math.max(0, steps - 3000)
  const km = (extra * heightCm * 0.415) / 100 / 1000
  return Math.round(km * ((3.5 - 1) * kg) / 4.8)
}

export function metKcal(met: number, kg: number, minutes: number): number {
  return Math.round(Math.max(0, met - 1) * kg * (minutes / 60))
}

export function stepsToKm(steps: number, heightCm: number) {
  return (steps * heightCm * 0.415) / 100 / 1000
}

export function dayBurn(profile: Profile, kg: number, date: string, steps: number, acts: Activity[]) {
  const b = bmr(profile, kg, date)
  const base = baseBurn(b)
  const walk = stepsKcal(steps, kg, profile.heightCm)
  const work = acts.reduce((s, a) => s + (a.kcal || 0), 0)
  return { bmr: b, base, walk, work, total: base + walk + work }
}

export const bmi = (kg: number, cm: number) => kg / (cm / 100) ** 2

export function bmiLabel(v: number) {
  if (v < 18.5) return 'Under'
  if (v < 25) return 'Healthy'
  if (v < 30) return 'Over'
  return 'Obese'
}

/** Latest known weight on or before `on` */
export function weightOn(entries: BodyEntry[], on: string, fallback: number): number {
  let best: BodyEntry | undefined
  for (const e of entries) if (e.kg && e.date <= on && (!best || e.date > best.date)) best = e
  return best?.kg ?? fallback
}

/**
 * Smoothed weight trend (exponential moving average over interpolated daily values, α = 0.1).
 * Daily scale weight swings 1–2 kg with water and food; the trend shows real change.
 */
export function weightTrend(entries: BodyEntry[]): { date: string; kg: number; trend: number; raw?: number }[] {
  const pts = entries.filter((e) => e.kg).sort((a, b) => (a.date < b.date ? -1 : 1))
  if (!pts.length) return []
  const byDate = new Map<string, number>()
  for (const p of pts) byDate.set(p.date, p.kg!)
  const out: { date: string; kg: number; trend: number; raw?: number }[] = []
  let trend = pts[0].kg!
  let prevDate = pts[0].date
  let prevKg = pts[0].kg!
  const end = pts[pts.length - 1].date
  for (let d = pts[0].date; d <= end; d = addDays(d, 1)) {
    let kg: number
    const raw = byDate.get(d)
    if (raw !== undefined) {
      kg = raw
      prevDate = d
      prevKg = raw
    } else {
      const next = pts.find((p) => p.date > d)!
      const span = diffDays(next.date, prevDate)
      kg = prevKg + ((next.kg! - prevKg) * diffDays(d, prevDate)) / span
    }
    trend = trend + 0.1 * (kg - trend)
    out.push({ date: d, kg, trend, raw })
  }
  return out
}

/**
 * Adaptive TDEE: what your body actually burns, inferred from what you ate and how your trend moved.
 * TDEE ≈ average intake − (Δtrend kg × 7700 / days). Needs ≥14 days with ≥70% of days food-logged.
 */
export function adaptiveTdee(intakeByDay: Map<string, number>, trend: { date: string; trend: number }[], days = 21) {
  const end = dkey()
  const start = addDays(end, -days)
  const tr = trend.filter((t) => t.date >= start && t.date <= end)
  const logged = [...intakeByDay.entries()].filter(([d, k]) => d > start && d <= end && k > 600)
  if (tr.length < 14 || logged.length < days * 0.7) return null
  const avgIntake = logged.reduce((s, [, k]) => s + k, 0) / logged.length
  const span = diffDays(tr[tr.length - 1].date, tr[0].date) || 1
  const deltaKg = tr[tr.length - 1].trend - tr[0].trend
  return { tdee: Math.round(avgIntake - (deltaKg * 7700) / span), avgIntake: Math.round(avgIntake), weeklyKg: (deltaKg / span) * 7, days: logged.length }
}

/** BASDAI = (Q1 + Q2 + Q3 + Q4 + (Q5 + Q6) / 2) / 5. Q6 (stiffness duration) is on 0–10 where 10 = 2+ hours. */
export function basdai(q: number[]): number {
  if (q.length < 6) return 0
  return Math.round(((q[0] + q[1] + q[2] + q[3] + (q[4] + q[5]) / 2) / 5) * 10) / 10
}

/**
 * Days present in the set, counting back from today (or yesterday if today isn't done yet).
 * Forgiving: `grace` missed days in a row don't end the streak (life happens); one more does.
 */
export function streak(days: Set<string>, today = dkey(), grace = 1): number {
  let n = 0
  let miss = 0
  for (let d = days.has(today) ? today : addDays(today, -1); ; d = addDays(d, -1)) {
    if (days.has(d)) {
      n++
      miss = 0
    } else if (++miss > grace) break
  }
  return n
}

export const round1 = (v: number) => Math.round(v * 10) / 10
export const kfmt = (v: number) => Math.round(v).toLocaleString('en-IN')
