import { ChevronLeft, ChevronRight, Copy, Plus, Save, Trash } from 'lucide-react'
import { useState } from 'react'
import { MacroBar } from '../../components/charts'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Button, Card, Chips, Empty, Field, IconButton, Page, Ring, Section, Stepper } from '../../components/ui'
import { useByDate, useDayData } from '../../lib/app'
import { kfmt } from '../../lib/calc'
import { addDays, dkey, fmtRel } from '../../lib/date'
import { fmtQty, portionText, sumEntries } from '../../lib/food'
import { go, useRoute } from '../../lib/router'
import { put, remove } from '../../lib/store'
import type { FoodEntry, Meal, MealTemplate } from '../../lib/types'

export const MEALS: { value: Meal; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'snack', label: 'Snacks' },
  { value: 'dinner', label: 'Dinner' },
]

export default function Food() {
  const { query } = useRoute()
  const today = dkey()
  const date = query.get('d') || today
  const d = useDayData(date)
  const foodBy = useByDate<FoodEntry>('food')
  const [edit, setEdit] = useState<FoodEntry | null>(null)
  const t = d.settings.targets
  const setDate = (k: string) => go(`/body/food${k === today ? '' : `?d=${k}`}`, true)

  function copyFrom(meal: Meal) {
    const prev = (foodBy.get(addDays(date, -1)) ?? []).filter((e) => e.meal === meal)
    for (const e of prev) {
      const { id: _id, updatedAt: _u, ...rest } = e
      put<FoodEntry>('food', { ...rest, date, at: Date.now() })
    }
    toast(`Copied ${prev.length} item${prev.length === 1 ? '' : 's'} from yesterday`)
  }

  function saveTemplate(meal: Meal) {
    const items = d.food.filter((e) => e.meal === meal && e.foodId)
    const name = prompt('Name this meal (e.g. "My usual breakfast")', `My ${meal}`)
    if (!name) return
    put<MealTemplate>('meals', { name, items: items.map((e) => ({ foodId: e.foodId!, name: e.name, qty: e.qty })) })
    toast('Saved to My meals')
  }

  return (
    <Page accent="body" back="/body" title="Food log">
      <div className="mt-1 flex items-center justify-between">
        <IconButton label="Previous day" onClick={() => setDate(addDays(date, -1))}>
          <ChevronLeft size={22} />
        </IconButton>
        <div className="text-[16px] font-semibold">{fmtRel(date, today)}</div>
        <IconButton label="Next day" onClick={() => date < today && setDate(addDays(date, 1))}>
          <ChevronRight size={22} className={date >= today ? 'opacity-30' : ''} />
        </IconButton>
      </div>

      <Card className="mt-2">
        <div className="flex items-center gap-4">
          <Ring value={d.totals.kcal} max={t.kcal} size={96} stroke={9} label={`${kfmt(d.totals.kcal)} of ${kfmt(t.kcal)} kcal`}>
            <div className="text-[18px] font-bold leading-none">{kfmt(d.totals.kcal)}</div>
            <div className="text-[11px] text-ink3">of {kfmt(t.kcal)}</div>
          </Ring>
          <div className="flex-1 text-[13.5px] leading-relaxed text-ink2">
            <div>
              Protein <b className="text-ink">{Math.round(d.totals.p)}</b> / {t.protein} g
            </div>
            <div>
              Fibre <b className="text-ink">{Math.round(d.totals.fb)}</b> g
            </div>
            <div>
              Burn ≈ <b className="text-ink">{kfmt(d.burn.total)}</b> kcal
            </div>
          </div>
        </div>
        <div className="mt-4">
          <MacroBar p={d.totals.p} c={d.totals.c} f={d.totals.f} />
        </div>
      </Card>

      {MEALS.map((m) => {
        const items = d.food.filter((e) => e.meal === m.value)
        const kcal = sumEntries(items).kcal
        return (
          <Section
            key={m.value}
            title={`${m.label}${items.length ? ` · ${kfmt(kcal)} kcal` : ''}`}
            action={
              <button onClick={() => go(`/body/food/add?meal=${m.value}${date !== today ? `&d=${date}` : ''}`)} className="press flex items-center gap-1 text-[14px] font-semibold text-acc">
                <Plus size={16} /> Add
              </button>
            }
          >
            {items.length ? (
              <div className="overflow-hidden rounded-3xl border border-line bg-card">
                {items.map((e) => (
                  <button key={e.id} onClick={() => setEdit(e)} className="press flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">{e.name}</div>
                      <div className="text-[12.5px] text-ink3">
                        {portionText(e.qty, e.unit)} · P {Math.round(e.p)} · C {Math.round(e.c)} · F {Math.round(e.f)}
                      </div>
                    </div>
                    <div className="num text-[15px] font-semibold">{kfmt(e.kcal)}</div>
                  </button>
                ))}
                <div className="flex gap-1 px-2 py-1.5">
                  <button onClick={() => saveTemplate(m.value)} className="press flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12.5px] font-semibold text-ink3">
                    <Save size={14} /> Save as my meal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => copyFrom(m.value)}
                className="press flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-line2 py-3.5 text-[13.5px] font-medium text-ink3"
              >
                <Copy size={15} /> Copy yesterday's {m.label.toLowerCase()}
              </button>
            )}
          </Section>
        )
      })}

      {!d.food.length && (
        <Empty
          title="Nothing logged yet"
          body="Type or say what you ate — like “2 roti, 1 katori dal and chaas” — and Forme works out the calories."
          action={<Button onClick={() => go('/body/food/add')}>Log food</Button>}
        />
      )}

      <EditEntry entry={edit} onClose={() => setEdit(null)} />
    </Page>
  )
}

function EditEntry({ entry, onClose }: { entry: FoodEntry | null; onClose: () => void }) {
  const [qty, setQty] = useState(1)
  const [meal, setMeal] = useState<Meal>('lunch')
  const [lastId, setLastId] = useState<string | null>(null)
  if (entry && entry.id !== lastId) {
    setLastId(entry.id)
    setQty(entry.qty)
    setMeal(entry.meal)
  }
  if (!entry) return null
  const per = (v: number) => v / (entry.qty || 1)
  const save = () => {
    put<FoodEntry>('food', {
      ...entry,
      qty,
      meal,
      kcal: Math.round(per(entry.kcal) * qty),
      p: Math.round(per(entry.p) * qty * 10) / 10,
      c: Math.round(per(entry.c) * qty * 10) / 10,
      f: Math.round(per(entry.f) * qty * 10) / 10,
      fb: Math.round(per(entry.fb ?? 0) * qty * 10) / 10,
    })
    onClose()
  }
  return (
    <Sheet
      open
      onClose={onClose}
      title={entry.name}
      accent="body"
      footer={
        <div className="flex gap-2">
          <Button
            variant="danger"
            icon={<Trash size={17} />}
            onClick={() => {
              remove('food', entry.id)
              toast('Removed', { label: 'Undo', run: () => put<FoodEntry>('food', entry) })
              onClose()
            }}
          >
            Delete
          </Button>
          <Button full onClick={save}>
            Save · {kfmt(per(entry.kcal) * qty)} kcal
          </Button>
        </div>
      }
    >
      <Field label="Portion">
        <div className="flex items-center justify-between rounded-2xl bg-card p-3">
          <span className="text-[15px] text-ink2">{portionText(qty, entry.unit)}</span>
          <Stepper value={qty} onChange={setQty} step={0.25} min={0.25} max={20} format={(v) => `${fmtQty(v)}×`} />
        </div>
      </Field>
      <Field label="Meal" className="mt-4">
        <Chips options={MEALS} value={meal} onChange={setMeal} />
      </Field>
    </Sheet>
  )
}
