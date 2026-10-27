// Weekly meal plan: for each day, the breakfast + two mains + snack that land nearest your calorie target
// with as much protein as possible — rotating meals across the week and leaning on dishes you already eat.
// Then the week becomes a grocery list (data/mealplan.ts has the recipes).

import { FOODS } from '../data/foods'
import { AISLES, ING, RECIPE, TEMPLATES, TOP_UPS, type Aisle, type Template } from '../data/mealplan'
import { addDays } from './date'
import { entryFromFood, nutrients, portionText } from './food'
import type { DayPlan, FoodEntry, Meal, MealPlan } from './types'

const FOOD = new Map(FOODS.map((f) => [f.id, f]))
export const TPL = new Map(TEMPLATES.map((t) => [t.id, t]))
export const PLAN_MEALS: Meal[] = ['breakfast', 'lunch', 'snack', 'dinner']
const slotOf = (m: Meal) => (m === 'breakfast' ? 'breakfast' : m === 'snack' ? 'snack' : 'main')

export function itemTotals(items: [string, number][]) {
  let kcal = 0
  let p = 0
  for (const [id, q] of items) {
    const f = FOOD.get(id)
    if (!f) continue
    const n = nutrients(f, q)
    kcal += n.kcal
    p += n.p
  }
  return { kcal, p }
}
const TOTALS = new Map(TEMPLATES.map((t) => [t.id, itemTotals(t.items)]))
export const templateTotals = (id: string) => TOTALS.get(id) ?? { kcal: 0, p: 0 }

/** "2 phulka · 1 katori dal tadka · …" */
export function itemsText(items: [string, number][]): string {
  return items
    .map(([id, q]) => {
      const f = FOOD.get(id)
      return f ? `${portionText(q, f.unit)} ${f.name.split(' (')[0].split(' / ')[0].toLowerCase()}` : id
    })
    .join(' · ')
}

export function dayItems(day: DayPlan, meal: Meal): [string, number][] {
  const items = [...(TPL.get(day[meal])?.items ?? [])]
  if (meal === 'snack' && day.extra) items.push([day.extra, 1])
  return items
}

export function dayTotals(day: DayPlan) {
  const t = PLAN_MEALS.reduce((a, m) => ({ kcal: a.kcal + templateTotals(day[m]).kcal, p: a.p + templateTotals(day[m]).p }), { kcal: 0, p: 0 })
  if (day.extra) {
    const x = itemTotals([[day.extra, 1]])
    t.kcal += x.kcal
    t.p += x.p
  }
  return t
}

export type PlanOpts = { kcal: number; protein: number; whey: boolean; skip: string[]; familiar: Map<string, number>; seed: string }

/** Lower is better: distance from the calorie target (overshooting counts double) and missing protein. */
function fit(kcal: number, p: number, o: PlanOpts) {
  const d = kcal - o.kcal
  return (Math.abs(d) / o.kcal) * 6 + (d > 60 ? (d / o.kcal) * 6 : 0) + (Math.max(0, o.protein - p) / o.protein) * 14
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return h / 2 ** 32
}

const allowed = (o: PlanOpts) => TEMPLATES.filter((t) => (o.whey || !t.whey) && !o.skip.includes(t.id))

/** Share of a meal's dishes you've eaten at least twice — familiar food gets eaten. */
const familiarity = (t: Template, o: PlanOpts) => t.items.filter(([id]) => (o.familiar.get(id) ?? 0) >= 2).length / t.items.length

/** Closes a big calorie gap with one extra item, protein first — only if it makes the day fit better. */
function topUp(day: DayPlan, o: PlanOpts): DayPlan {
  const base = dayTotals({ ...day, extra: undefined })
  if (o.kcal - base.kcal < 150) return { ...day, extra: undefined }
  let best: string | undefined
  let bestScore = fit(base.kcal, base.p, o)
  for (const [id] of TOP_UPS) {
    const x = itemTotals([[id, 1]])
    const s = fit(base.kcal + x.kcal, base.p + x.p, o)
    if (s < bestScore) {
      bestScore = s
      best = id
    }
  }
  return { ...day, extra: best }
}

/** Plans the week from Monday. Days in `keep` stay as they are (e.g. the days already lived). */
export function planWeek(weekStart: string, o: PlanOpts, keep: Record<string, DayPlan> = {}): Record<string, DayPlan> {
  const pool = allowed(o)
  const B = pool.filter((t) => t.slot === 'breakfast')
  const M = pool.filter((t) => t.slot === 'main')
  const S = pool.filter((t) => t.slot === 'snack')
  const uses = new Map<string, number>()
  const out: Record<string, DayPlan> = {}
  const recent: string[][] = []
  for (let d = 0; d < 7; d++) {
    const date = addDays(weekStart, d)
    let day = keep[date]
    if (!day) {
      const y = new Set(recent[recent.length - 1] ?? [])
      const y2 = new Set(recent[recent.length - 2] ?? [])
      // repeats matter for lunch and dinner; the same breakfast or snack most days is normal
      const cost = (t: Template) => {
        const k = t.slot === 'main' ? 1 : 0.5
        return k * ((y.has(t.id) ? 1.2 : 0) + (y2.has(t.id) ? 0.5 : 0) + (uses.get(t.id) ?? 0) * 0.2) - familiarity(t, o) * 0.25 + hash(`${o.seed}|${d}|${t.id}`) * 0.35
      }
      let bestScore = Infinity
      let pick: [Template, Template, Template, Template] | null = null
      for (const b of B)
        for (const l of M)
          for (const s of S)
            for (const n of M) {
              if (n === l) continue
              const kcal = TOTALS.get(b.id)!.kcal + TOTALS.get(l.id)!.kcal + TOTALS.get(s.id)!.kcal + TOTALS.get(n.id)!.kcal
              const p = TOTALS.get(b.id)!.p + TOTALS.get(l.id)!.p + TOTALS.get(s.id)!.p + TOTALS.get(n.id)!.p
              const score = fit(kcal, p, o) + cost(b) + cost(l) + cost(s) + cost(n)
              if (score < bestScore) {
                bestScore = score
                pick = [b, l, s, n]
              }
            }
      if (!pick) break
      day = topUp({ breakfast: pick[0].id, lunch: pick[1].id, snack: pick[2].id, dinner: pick[3].id }, o)
    }
    out[date] = day
    const ids = PLAN_MEALS.map((m) => day[m])
    for (const id of ids) uses.set(id, (uses.get(id) ?? 0) + 1)
    recent.push(ids)
  }
  return out
}

/** Other meals for one slot of a day, best fit first (the rest of the day held fixed). */
export function alternatives(day: DayPlan, meal: Meal, o: PlanOpts): string[] {
  const rest = PLAN_MEALS.filter((m) => m !== meal).map((m) => templateTotals(day[m]))
  const base = rest.reduce((a, t) => ({ kcal: a.kcal + t.kcal, p: a.p + t.p }), { kcal: 0, p: 0 })
  const others = new Set(PLAN_MEALS.filter((m) => m !== meal).map((m) => day[m]))
  return allowed(o)
    .filter((t) => t.slot === slotOf(meal) && t.id !== day[meal] && !others.has(t.id))
    .map((t) => ({ id: t.id, s: fit(base.kcal + templateTotals(t.id).kcal, base.p + templateTotals(t.id).p, o) - familiarity(t, o) * 0.25 }))
    .sort((a, b) => a.s - b.s)
    .map((x) => x.id)
}

export function swapMeal(day: DayPlan, meal: Meal, id: string, o: PlanOpts): DayPlan {
  return topUp({ ...day, [meal]: id }, o)
}

/** Food-log entries for a planned meal. */
export function plannedEntries(day: DayPlan, meal: Meal, date: string): Omit<FoodEntry, 'id' | 'updatedAt'>[] {
  return dayItems(day, meal).flatMap(([id, q]) => {
    const f = FOOD.get(id)
    return f ? [entryFromFood(f, q, date, meal)] : []
  })
}

function amountText(v: number, unit: 'g' | 'ml' | 'pc' | 'slice') {
  if (unit === 'pc') return `${Math.ceil(v - 0.01)}`
  if (unit === 'slice') return `${Math.ceil(v - 0.01)} slices`
  if (unit === 'ml') return v < 1000 ? `${Math.ceil(v / 250) * 250} ml` : `${(Math.ceil(v / 500) / 2).toString()} L`
  return v < 1000 ? `${Math.ceil(v / 50) * 50} g` : `${(Math.ceil(v / 100) / 10).toFixed(1).replace(/\.0$/, '')} kg`
}

export type GroceryItem = { id: string; name: string; amount: string }

/** Everything the planned meals on these dates need, by aisle, rounded up to what you'd buy. */
export function groceries(plan: MealPlan, dates: string[]): { aisle: Aisle; items: GroceryItem[] }[] {
  const need = new Map<string, number>()
  for (const date of dates) {
    const day = plan.days[date]
    if (!day) continue
    for (const meal of PLAN_MEALS)
      for (const [foodId, q] of dayItems(day, meal)) for (const [ing, amt] of RECIPE[foodId] ?? []) need.set(ing, (need.get(ing) ?? 0) + amt * q)
  }
  return AISLES.map((aisle) => ({
    aisle,
    items: [...need.entries()]
      .filter(([id]) => ING[id]?.aisle === aisle)
      .map(([id, v]) => ({ id, name: ING[id].name, amount: amountText(v, ING[id].unit) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.items.length)
}
