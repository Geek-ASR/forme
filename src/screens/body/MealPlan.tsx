// This week's meals: seven days of home-style vegetarian (egg-free) food near your calorie target with
// as much protein as the menu allows. Swap any meal, log it in one tap, and turn the week into groceries.

import { Ban, Check, RefreshCw, Shuffle, ShoppingBasket } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from '../../components/Toasts'
import { Bar, Button, Card, Page, Section, Segmented, Toggle, cx } from '../../components/ui'
import { saveSettings, useByDate, useSettings } from '../../lib/app'
import { kfmt } from '../../lib/calc'
import { addDays, dkey, dowShort, rangeKeys, weekStart, weekday } from '../../lib/date'
import { PLAN_MEALS, TPL, alternatives, dayItems, dayTotals, itemTotals, itemsText, planWeek, plannedEntries, swapMeal, type PlanOpts } from '../../lib/mealplan'
import { go, useRoute } from '../../lib/router'
import { patch, put, remove, useColl } from '../../lib/store'
import type { FoodEntry, Meal, MealPlan as Plan } from '../../lib/types'

const LABEL: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' }

export default function MealPlan() {
  const { query } = useRoute()
  const today = dkey()
  const settings = useSettings()
  const t = settings.targets
  const pref = settings.mealPlan ?? {}
  const history = useColl<FoodEntry>('food')
  const foodBy = useByDate<FoodEntry>('food')
  const plans = useColl<Plan>('mealPlans')
  const thisWeek = weekStart(today)
  const [week, setWeek] = useState(query.get('w') || thisWeek)
  const plan = plans.find((p) => p.id === week)
  const dates = rangeKeys(week, addDays(week, 6))
  const [sel, setSel] = useState(() => (dates.includes(today) ? today : week))
  const day = plan?.days[sel]
  const [swapN, setSwapN] = useState<Record<string, number>>({})

  const familiar = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of history) if (e.foodId) m.set(e.foodId, (m.get(e.foodId) ?? 0) + 1)
    return m
  }, [history])
  const opts = (seed = week, skip = pref.skip ?? []): PlanOpts => ({ kcal: t.kcal, protein: t.protein, whey: !!pref.whey, skip, familiar, seed })

  function changeWeek(w: string) {
    setWeek(w)
    setSel(w === thisWeek ? today : w)
  }

  function makePlan(fresh: boolean) {
    // re-planning keeps the days already lived
    const keep = fresh && plan ? Object.fromEntries(Object.entries(plan.days).filter(([d]) => d < today)) : {}
    put<Plan>('mealPlans', { id: week, days: planWeek(week, opts(fresh ? `${week}-${Date.now()}` : week), keep), got: plan?.got ?? [], createdAt: plan?.createdAt ?? Date.now() })
    toast(fresh ? 'New plan for the rest of the week' : 'Your week is planned 🍽️')
  }

  function setDay(date: string, next: Plan['days'][string]) {
    patch<Plan>('mealPlans', week, { days: { ...plan!.days, [date]: next } })
  }

  function swap(meal: Meal, skip?: string[]) {
    if (!day) return
    const alts = alternatives(day, meal, opts(week, skip))
    if (!alts.length) return toast('No other option for this meal')
    const key = `${sel}|${meal}`
    const n = swapN[key] ?? 0
    setSwapN({ ...swapN, [key]: n + 1 })
    setDay(sel, swapMeal(day, meal, alts[n % alts.length], opts(week, skip)))
  }

  function notForMe(meal: Meal) {
    const skip = [...(pref.skip ?? []), day![meal]]
    saveSettings({ mealPlan: { ...pref, skip } })
    swap(meal, skip)
    toast(`Won't suggest “${TPL.get(day![meal])?.name}” again`)
  }

  function logMeal(meal: Meal) {
    const ids = plannedEntries(day!, meal, sel).map((e) => put<FoodEntry>('food', e).id)
    toast(`${LABEL[meal]} logged · ${kfmt(itemTotals(dayItems(day!, meal)).kcal)} kcal`, { label: 'Undo', run: () => ids.forEach((id) => remove('food', id)) })
  }

  const weekPicker = (
    <Segmented
      options={[
        { value: thisWeek, label: 'This week' },
        { value: addDays(thisWeek, 7), label: 'Next week' },
      ]}
      value={week}
      onChange={changeWeek}
    />
  )
  const wheyToggle = (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold">Include a whey shake</div>
        <div className="text-[12.5px] leading-snug text-ink3">Makes 100 g of protein a day easy. Without it, the plan reaches about 85–100 g.</div>
      </div>
      <Toggle label="Include a whey shake" checked={!!pref.whey} onChange={(v) => saveSettings({ mealPlan: { ...pref, whey: v } })} />
    </div>
  )

  if (!plan) {
    return (
      <Page accent="body" back="/body" title="Meal plan">
        <div className="mt-1">{weekPicker}</div>
        <Card className="mt-4">
          <div className="text-[17px] font-semibold">Plan the week in one tap</div>
          <p className="mt-1 text-[14px] leading-relaxed text-ink2">
            Seven days of home-style vegetarian meals — no eggs — each day close to {kfmt(t.kcal)} kcal with as much protein as possible: chilla, dal, paneer, soya, sprouts, bhakri. Dishes you already eat come first, lunches and dinners rotate, and you get the grocery list.
          </p>
          <div className="mt-4">{wheyToggle}</div>
          <Button full size="lg" className="mt-4" onClick={() => makePlan(false)}>
            Plan {week === thisWeek ? 'this' : 'next'} week
          </Button>
        </Card>
      </Page>
    )
  }

  const tot = day ? dayTotals(day) : { kcal: 0, p: 0 }
  return (
    <Page
      accent="body"
      back="/body"
      title="Meal plan"
      actions={
        <Button size="sm" variant="soft" icon={<ShoppingBasket size={15} />} onClick={() => go(`/body/grocery?w=${week}`)}>
          Groceries
        </Button>
      }
    >
      <div className="mt-1">{weekPicker}</div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4">
        {dates.map((d) => (
          <button
            key={d}
            onClick={() => setSel(d)}
            aria-pressed={sel === d}
            className={cx('press flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border text-[12px] font-semibold', sel === d ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line bg-card text-ink2', d === today && sel !== d && 'border-acc')}
          >
            {dowShort(weekday(d)).slice(0, 3)}
            <span className="text-[16px]">{Number(d.slice(8))}</span>
          </button>
        ))}
      </div>

      {day && (
        <>
          <Card className="mt-3">
            <div className="flex items-baseline justify-between text-[13.5px]">
              <span className="text-ink3">Calories</span>
              <span>
                <b>{kfmt(tot.kcal)}</b> <span className="text-ink3">/ {kfmt(t.kcal)}</span>
              </span>
            </div>
            <Bar className="mt-1.5" value={tot.kcal} max={t.kcal} height={5} />
            <div className="mt-2.5 flex items-baseline justify-between text-[13.5px]">
              <span className="text-ink3">Protein</span>
              <span>
                <b className={tot.p >= t.protein * 0.95 ? 'text-good' : ''}>{Math.round(tot.p)} g</b> <span className="text-ink3">/ {t.protein} g</span>
              </span>
            </div>
            <Bar className="mt-1.5" value={tot.p} max={t.protein} height={5} />
          </Card>

          <div className="mt-3 space-y-2.5">
            {PLAN_MEALS.map((meal) => {
              const tpl = TPL.get(day[meal])
              const n = itemTotals(dayItems(day, meal))
              const logged = (foodBy.get(sel) ?? []).filter((e) => e.meal === meal)
              return (
                <Card key={meal}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-acc">{LABEL[meal]}</div>
                      <div className="mt-0.5 text-[15.5px] font-semibold leading-snug">{tpl?.name ?? day[meal]}</div>
                      <div className="mt-0.5 text-[12.5px] leading-snug text-ink3">{itemsText(dayItems(day, meal))}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num text-[15px] font-semibold">{kfmt(n.kcal)}</div>
                      <div className="text-[12px] text-ink3">{Math.round(n.p)} g protein</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {logged.length ? (
                      <span className="flex items-center gap-1 text-[13px] font-semibold text-good">
                        <Check size={15} strokeWidth={3} /> Logged
                      </span>
                    ) : (
                      sel <= today && (
                        <Button size="sm" onClick={() => logMeal(meal)}>
                          Log it
                        </Button>
                      )
                    )}
                    <Button size="sm" variant="soft" icon={<Shuffle size={14} />} onClick={() => swap(meal)}>
                      Swap
                    </Button>
                    <span className="flex-1" />
                    <button aria-label={`Never suggest ${tpl?.name}`} onClick={() => notForMe(meal)} className="press flex items-center gap-1 px-1 text-[12.5px] font-semibold text-ink3">
                      <Ban size={13} /> Not for me
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Section title="Plan settings">
        <Card>
          {wheyToggle}
          {(pref.skip?.length ?? 0) > 0 && (
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[13.5px]">
              <span className="text-ink3">
                {pref.skip!.length} meal{pref.skip!.length === 1 ? '' : 's'} hidden
              </span>
              <button onClick={() => saveSettings({ mealPlan: { ...pref, skip: [] } })} className="press font-semibold text-acc">
                Show them again
              </button>
            </div>
          )}
        </Card>
        <Button
          full
          variant="outline"
          className="mt-3"
          icon={<RefreshCw size={16} />}
          onClick={() => confirm(week === thisWeek ? 'Plan the rest of this week again? Days already past stay as they were.' : 'Plan next week again?') && makePlan(true)}
        >
          Plan again
        </Button>
        <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-ink3">Portions follow your food library's home-style servings. Hungry on a training day? Add a katori of curd or a banana — it's built to leave room.</p>
      </Section>
    </Page>
  )
}
