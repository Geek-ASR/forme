// App-level hooks: settings/profile with defaults, per-day aggregates, and the daily routine logic.

import { useMemo } from 'react'
import { DEFAULT_SETTINGS } from '../data/defaults'
import { PHASES, programDay } from '../data/program'
import { dayBurn, weightOn } from './calc'
import { dkey, fmtTime, minutesOf } from './date'
import { sumEntries } from './food'
import { get, patch, put, useColl, useDoc } from './store'
import type { Activity, BodyEntry, Day, DeLog, FoodEntry, HybridNote, Meal, Post, Profile, RoutineItem, Settings } from './types'

export function mergeSettings(s?: Settings): Settings {
  const d = DEFAULT_SETTINGS
  return {
    ...s, // keep every stored field (training, ratingCats, future additions) — never drop data on save
    id: 'main',
    updatedAt: s?.updatedAt ?? 0,
    targets: { ...d.targets, ...s?.targets },
    routine: s?.routine?.length ? s.routine : d.routine,
    reminders: s?.reminders?.length ? s.reminders : d.reminders,
    skincare: { products: s?.skincare?.products?.length ? s.skincare.products : d.skincare.products },
    german: { ...d.german, ...s?.german },
    hybrid: { nextIdea: 1, ...d.hybrid, ...s?.hybrid },
  }
}

export function useSettings(): Settings {
  const s = useDoc<Settings>('settings', 'main')
  return useMemo(() => mergeSettings(s), [s])
}

export function saveSettings(p: Partial<Omit<Settings, 'id' | 'updatedAt'>>) {
  const cur = mergeSettings(get<Settings>('settings', 'main'))
  put<Settings>('settings', { ...cur, ...p, id: 'main' })
}

export function fallbackProfile(): Profile {
  return {
    id: 'main',
    updatedAt: 0,
    name: '',
    sex: 'male',
    heightCm: 170,
    startWeightKg: 75,
    goalWeightKg: 68,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    planStart: dkey(),
    planWeeks: 17,
  }
}

export function useProfile(): { profile: Profile; missing: boolean } {
  const p = useDoc<Profile>('profile', 'main')
  return useMemo(() => ({ profile: { ...fallbackProfile(), ...p }, missing: !p?.heightCm }), [p])
}

export function useByDate<T extends { date: string }>(coll: 'food' | 'activity' | 'deLog' | 'meds' | 'posts' | 'body'): Map<string, T[]> {
  const list = useColl<T & { id: string; updatedAt: number }>(coll)
  return useMemo(() => {
    const m = new Map<string, T[]>()
    for (const r of list) {
      const a = m.get(r.date)
      if (a) a.push(r)
      else m.set(r.date, [r])
    }
    return m
  }, [list])
}

export function useWeightNow(): number {
  const { profile } = useProfile()
  const body = useColl<BodyEntry>('body')
  return useMemo(() => weightOn(body, dkey(), profile.startWeightKg), [body, profile.startWeightKg])
}

export function stepsTargetFor(settings: Settings, phaseSteps: number) {
  return settings.targets.stepsOverride || phaseSteps
}

export type DayData = ReturnType<typeof useDayData>

export function useDayData(date: string) {
  const { profile, missing } = useProfile()
  const settings = useSettings()
  const day = useDoc<Day>('days', date)
  const foodBy = useByDate<FoodEntry>('food')
  const actBy = useByDate<Activity>('activity')
  const deBy = useByDate<DeLog>('deLog')
  const postsBy = useByDate<Post>('posts')
  const hybrid = useColl<HybridNote>('hybrid')
  const body = useColl<BodyEntry>('body')

  return useMemo(() => {
    const food = (foodBy.get(date) ?? []).slice().sort((a, b) => (a.at ?? a.updatedAt) - (b.at ?? b.updatedAt))
    const acts = actBy.get(date) ?? []
    const de = deBy.get(date) ?? []
    const totals = sumEntries(food)
    const meals = new Set<Meal>(food.map((f) => f.meal))
    const kg = weightOn(body, date, profile.startWeightKg)
    const steps = day?.steps ?? 0
    const burn = dayBurn(profile, kg, date, steps, acts)
    const program = programDay(profile.planStart, date, !!settings.training?.dumbbellKg)
    const stepsTarget = stepsTargetFor(settings, program.phase.steps ?? PHASES[0].steps)
    const startOfDay = new Date(date + 'T00:00:00').getTime()
    const wrote = (postsBy.get(date)?.length ?? 0) > 0 || hybrid.some((h) => h.createdAt >= startOfDay && h.createdAt < startOfDay + 86400000)
    return {
      date,
      profile,
      profileMissing: missing,
      settings,
      day,
      food,
      totals,
      meals,
      acts,
      deMinutes: de.reduce((s, x) => s + (x.minutes || 0), 0),
      deReviewed: de.reduce((s, x) => s + (x.reviewed || 0), 0),
      wrote,
      kg,
      steps,
      burn,
      program,
      stepsTarget,
    }
  }, [date, profile, missing, settings, day, foodBy, actBy, deBy, postsBy, hybrid, body])
}

export type ItemStatus = { item: RoutineItem; done: boolean; auto: boolean; detail?: string }

export function evaluateRoutine(d: DayData): ItemStatus[] {
  const t = d.settings.targets
  const checks = d.day?.checks ?? {}
  const restDay = d.program.sessions.every((s) => s.mode === 'rest')
  return d.settings.routine
    .filter((i) => i.enabled && (!i.days || i.days.includes(new Date(d.date + 'T12:00:00').getDay())))
    .map((item) => {
      let auto = false
      let detail: string | undefined
      switch (item.auto) {
        case 'water':
          auto = (d.day?.waterMl ?? 0) >= t.waterMl
          detail = `${((d.day?.waterMl ?? 0) / 1000).toFixed(1)} / ${(t.waterMl / 1000).toFixed(1)} L`
          break
        case 'steps':
          auto = d.steps >= d.stepsTarget
          detail = `${d.steps.toLocaleString('en-IN')} / ${d.stepsTarget.toLocaleString('en-IN')}`
          break
        case 'workout':
          auto = restDay || d.acts.some((a) => a.kind === 'workout' || a.kind === 'walk' || a.kind === 'activity')
          detail = restDay ? 'Rest day' : d.program.sessions.map((s) => s.name.split(' · ')[0]).join(' + ')
          break
        case 'mobility':
          auto = d.acts.some((a) => a.kind === 'mobility')
          detail = '10 min'
          break
        case 'german':
          auto = d.deMinutes >= t.germanMinutes
          detail = `${d.deMinutes} / ${t.germanMinutes} min`
          break
        case 'meals': {
          const n = new Set([...d.meals, ...(d.day?.skipped ?? [])]).size
          auto = n >= 3
          detail = `${n} of 3+ meals`
          break
        }
        case 'protein':
          auto = d.totals.p >= t.protein
          detail = `${Math.round(d.totals.p)} / ${t.protein} g`
          break
        case 'write':
          auto = d.wrote
          break
        case 'checkin':
          auto = !!d.day?.mood
          break
      }
      const manual = checks[item.id]
      return { item, done: manual === true || (manual !== false && auto), auto: auto && manual !== true, detail }
    })
}

export type Focus = { id: string; label: string; detail?: string; icon: string; href?: string; check?: string; water?: boolean; protein?: boolean; at: number }

/**
 * "Next up" on Today: at most three things worth doing now. Timed habits show from an hour before
 * until three hours after their time (then they quietly drop off — no guilt list), meals nudge during
 * the day, protein in the afternoon if it's well short, water only when well behind pace, and from
 * 7 pm the evening check-in takes over.
 */
export function focusItems(d: DayData, routine: ItemStatus[], nowMin: number): { now: Focus[]; next?: Focus } {
  const items: Focus[] = []
  const later: Focus[] = []
  const evening = nowMin >= 19 * 60
  for (const r of routine) {
    if (r.done || !r.item.time) continue
    const t = minutesOf(r.item.time)
    const f: Focus = { id: r.item.id, label: r.item.label, detail: [fmtTime(r.item.time), r.detail].filter(Boolean).join(' · '), icon: r.item.icon, href: r.item.link, check: r.item.id, at: t }
    if (nowMin >= t - 60 && nowMin <= t + 180) items.push(f)
    else if (t - 60 > nowMin) later.push(f)
  }
  if (!evening) {
    const had = (m: Meal) => d.meals.has(m) || !!d.day?.skipped?.includes(m)
    if (nowMin >= 10 * 60 && !had('breakfast')) items.push({ id: 'breakfast', label: 'Log breakfast', icon: 'utensils', href: '#/body/food/add?meal=breakfast', at: 10 * 60 })
    if (nowMin >= 14 * 60 && !had('lunch')) items.push({ id: 'lunch', label: 'Log lunch', icon: 'utensils', href: '#/body/food/add?meal=lunch', at: 14 * 60 })
  }
  const target = d.settings.targets.waterMl
  const ml = d.day?.waterMl ?? 0
  const pace = target * Math.min(1, Math.max(0, (nowMin - 9 * 60) / (12 * 60)))
  if (ml < target && ml < pace - 500) {
    items.push({ id: 'water', label: 'Have a glass of water', detail: `${(ml / 1000).toFixed(1)} of ${target / 1000} L so far`, icon: 'droplet', water: true, at: nowMin })
  }
  const pt = d.settings.targets.protein
  if (nowMin >= 15 * 60 && nowMin < 21 * 60 && d.totals.p < pt * 0.6) {
    items.push({ id: 'protein', label: 'Get some protein in', detail: `${Math.round(d.totals.p)} of ${pt} g so far · ideas`, icon: 'zap', protein: true, at: 15 * 60 })
  }
  if (evening && !d.day?.closedAt) {
    items.push({ id: 'close', label: 'Close the day', detail: '30 seconds · meals, water, steps', icon: 'moon', href: '#/evening', at: nowMin >= 21 * 60 ? -1 : 21 * 60 })
  }
  return { now: items.sort((a, b) => a.at - b.at).slice(0, 3), next: later.sort((a, b) => a.at - b.at)[0] }
}

export function setCheck(date: string, id: string, value: boolean) {
  const day = get<Day>('days', date)
  patch<Day>('days', date, { checks: { ...(day?.checks ?? {}), [id]: value } })
}

export function patchDay(date: string, p: Partial<Day>) {
  patch<Day>('days', date, p)
}

export function addWater(date: string, ml: number) {
  const day = get<Day>('days', date)
  patch<Day>('days', date, { waterMl: Math.max(0, (day?.waterMl ?? 0) + ml) })
}
