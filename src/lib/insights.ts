// Cross-domain insights: a daily "showing up" score and simple, honest comparisons
// between groups of days (with minimum sample sizes, so noise isn't sold as insight).

import { useMemo } from 'react'
import { programDay } from '../data/program'
import { useByDate, useProfile, useSettings } from './app'
import { addDays, dkey, rangeKeys } from './date'
import { useColl } from './store'
import type { Activity, BodyEntry, Day, DeLog, FoodEntry, HybridNote, Post, Rating } from './types'

/** Days you showed up for yourself: logged anything, checked in, moved, wrote, practised German. */
export function useActiveDays(): Set<string> {
  const food = useColl<FoodEntry>('food')
  const acts = useColl<Activity>('activity')
  const de = useColl<DeLog>('deLog')
  const posts = useColl<Post>('posts')
  const body = useColl<BodyEntry>('body')
  const days = useColl<Day>('days')
  const hybrid = useColl<HybridNote>('hybrid')
  const ratings = useColl<Rating>('ratings')
  return useMemo(() => {
    const s = new Set<string>()
    for (const list of [food, acts, de, posts, body]) for (const r of list) s.add(r.date)
    for (const r of [...hybrid, ...ratings]) s.add(dkey(new Date(r.createdAt)))
    for (const d of days) if (d.mood || d.steps || d.waterMl || d.closedAt || Object.values(d.checks ?? {}).some(Boolean)) s.add(d.id)
    return s
  }, [food, acts, de, posts, body, days, hybrid, ratings])
}

export type DayScore = { date: string; score: number; parts: Record<string, boolean> }

export function useShowingUp(days = 119, until?: string): DayScore[] {
  const { profile } = useProfile()
  const settings = useSettings()
  const foodBy = useByDate<FoodEntry>('food')
  const actBy = useByDate<Activity>('activity')
  const deBy = useByDate<DeLog>('deLog')
  const postBy = useByDate<Post>('posts')
  const dayList = useColl<Day>('days')
  return useMemo(() => {
    const dayMap = new Map(dayList.map((d) => [d.id, d]))
    const end = until ?? dkey()
    if (days < 1) return []
    return rangeKeys(addDays(end, -(days - 1)), end).map((date) => {
      const d = dayMap.get(date)
      const steps = settings.targets.stepsOverride || programDay(profile.planStart, date).phase.steps
      const meals = new Set([...(foodBy.get(date) ?? []).map((f) => f.meal), ...(d?.skipped ?? [])]).size
      const acts = actBy.get(date) ?? []
      const parts = {
        food: meals >= 2,
        moved: acts.length > 0,
        steps: (d?.steps ?? 0) >= steps,
        water: (d?.waterMl ?? 0) >= settings.targets.waterMl * 0.8,
        german: (deBy.get(date) ?? []).reduce((s, x) => s + x.minutes, 0) >= Math.min(10, settings.targets.germanMinutes),
        wrote: (postBy.get(date)?.length ?? 0) > 0,
        checkin: !!d?.mood,
      }
      const n = Object.values(parts).filter(Boolean).length
      return { date, score: n / Object.keys(parts).length, parts }
    })
  }, [dayList, foodBy, actBy, deBy, postBy, settings, profile.planStart, days, until])
}

export const heatLevel = (s: number): 0 | 1 | 2 | 3 | 4 => (s === 0 ? 0 : s < 0.3 ? 1 : s < 0.55 ? 2 : s < 0.8 ? 3 : 4)

export type Finding = { title: string; a: { label: string; value: number; n: number }; b: { label: string; value: number; n: number }; unit: string; better: 'lower' | 'higher' }

function compare(
  label: string,
  rows: { inA: boolean | null; value: number | undefined }[],
  la: string,
  lb: string,
  unit: string,
  better: 'lower' | 'higher',
): Finding | null {
  const A = rows.filter((r) => r.inA === true && r.value !== undefined).map((r) => r.value!)
  const B = rows.filter((r) => r.inA === false && r.value !== undefined).map((r) => r.value!)
  if (A.length < 4 || B.length < 4) return null
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
  return { title: label, a: { label: la, value: avg(A), n: A.length }, b: { label: lb, value: avg(B), n: B.length }, unit, better }
}

export function useFindings(): Finding[] {
  const dayList = useColl<Day>('days')
  const actBy = useByDate<Activity>('activity')
  const settings = useSettings()
  return useMemo(() => {
    const byDate = new Map(dayList.map((d) => [d.id, d]))
    const keys = rangeKeys(addDays(dkey(), -89), dkey())
    const out: (Finding | null)[] = []
    out.push(
      compare(
        'Sleep and pain',
        keys.map((k) => {
          const d = byDate.get(k)
          return { inA: d?.sleepH === undefined ? null : d.sleepH >= 7, value: d?.pain }
        }),
        'slept 7 h+',
        'slept less',
        '/10 pain',
        'lower',
      ),
    )
    out.push(
      compare(
        'Moving and the next morning',
        keys.map((k) => {
          const moved = (actBy.get(k) ?? []).some((a) => a.kind !== 'mobility' || a.minutes >= 8)
          return { inA: byDate.has(addDays(k, 1)) ? moved : null, value: byDate.get(addDays(k, 1))?.pain }
        }),
        'after an active day',
        'after a still day',
        '/10 pain',
        'lower',
      ),
    )
    out.push(
      compare(
        'Steps and mood',
        keys.map((k) => {
          const d = byDate.get(k)
          return { inA: d?.steps === undefined ? null : d.steps >= 7000, value: d?.mood }
        }),
        '7k+ steps',
        'fewer steps',
        '/5 mood',
        'higher',
      ),
    )
    out.push(
      compare(
        'Sleep and energy',
        keys.map((k) => {
          const d = byDate.get(k)
          return { inA: d?.sleepH === undefined ? null : d.sleepH >= settings.targets.sleepHours, value: d?.energy }
        }),
        `slept ${settings.targets.sleepHours} h+`,
        'slept less',
        '/5 energy',
        'higher',
      ),
    )
    return out.filter((f): f is Finding => !!f)
  }, [dayList, actBy, settings])
}
