import { ChefHat, Plus, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Button, Chips, Field, Page, Pill, Segmented, Stepper } from '../../components/ui'
import { FOOD_CATS, type Food } from '../../data/foods'
import { foodList, fmtQty, nutrients, searchFoods } from '../../lib/food'
import { useRoute } from '../../lib/router'
import { put, remove, useColl } from '../../lib/store'
import type { CustomFood } from '../../lib/types'
import { SearchSheet } from './AddFood'

export default function Foods() {
  const { query } = useRoute()
  const custom = useColl<CustomFood>('customFoods')
  const foods = useMemo(() => foodList(custom), [custom])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('Breakfast')
  const [editing, setEditing] = useState<Partial<CustomFood> | null>(query.get('new') ? { name: query.get('new')! } : null)

  const list = q.trim() ? searchFoods(q, foods, 50).map((r) => r.food) : foods.filter((f) => (cat === 'My dishes' ? f.cat === 'My dishes' : f.cat === cat))

  return (
    <Page accent="body" back="/body" title="Dish library" actions={<Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => setEditing({})}>New</Button>}>
      <input className="field mt-1" placeholder="Search 270+ dishes…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search dishes" />
      {!q && (
        <Chips
          className="mt-3"
          options={[...(custom.length ? ['My dishes'] : []), ...FOOD_CATS].map((c) => ({ value: c, label: c }))}
          value={cat}
          onChange={setCat}
        />
      )}
      <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-card">
        {list.map((f) => (
          <FoodRow key={f.id} f={f} onEdit={f.cat === 'My dishes' ? () => setEditing(custom.find((c) => 'c:' + c.id === f.id) ?? null) : undefined} />
        ))}
        {!list.length && <div className="px-4 py-8 text-center text-[14px] text-ink3">Nothing here yet.</div>}
      </div>
      <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink3">
        Values are per typical home-style serving and are estimates — oil, ghee and portion size change them a lot. If your family recipe is richer or lighter, create your own version: it will be preferred when you log.
      </p>
      <DishEditor value={editing} onClose={() => setEditing(null)} foods={foods} />
    </Page>
  )
}

function FoodRow({ f, onEdit }: { f: Food; onEdit?: () => void }) {
  return (
    <button onClick={onEdit} disabled={!onEdit} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{f.name}</div>
        <div className="text-[12.5px] text-ink3">
          {f.unit}
          {f.g ? ` (${f.g} ${/glass|cup|ml/.test(f.unit) ? 'ml' : 'g'})` : ''} · P {f.p} · C {f.c} · F {f.f}
        </div>
      </div>
      <div className="text-right">
        <div className="num text-[15px] font-semibold">{f.kcal}</div>
        <div className="text-[11px] text-ink3">kcal</div>
      </div>
    </button>
  )
}

type Ingredient = { food: Food; qty: number }

function DishEditor({ value, onClose, foods }: { value: Partial<CustomFood> | null; onClose: () => void; foods: Food[] }) {
  const [mode, setMode] = useState<'simple' | 'recipe'>('simple')
  const [form, setForm] = useState<Partial<CustomFood>>({})
  const [ings, setIngs] = useState<Ingredient[]>([])
  const [servings, setServings] = useState(4)
  const [pick, setPick] = useState(false)
  const [loadedFor, setLoadedFor] = useState<unknown>(null)
  if (value !== loadedFor) {
    setLoadedFor(value)
    setForm({ unit: '1 serving', g: 0, kcal: 0, p: 0, c: 0, f: 0, fb: 0, ...value })
    setIngs(
      (value?.recipe ?? [])
        .map((r) => ({ food: foods.find((f) => f.id === r.foodId)!, qty: r.qty }))
        .filter((x) => x.food),
    )
    setServings(value?.servings ?? 4)
    setMode(value?.recipe?.length ? 'recipe' : 'simple')
  }
  if (!value) return null

  const recipeTotals = ings.reduce(
    (a, i) => {
      const n = nutrients(i.food, i.qty)
      return { kcal: a.kcal + n.kcal, p: a.p + n.p, c: a.c + n.c, f: a.f + n.f, fb: a.fb + n.fb, g: a.g + i.food.g * i.qty }
    },
    { kcal: 0, p: 0, c: 0, f: 0, fb: 0, g: 0 },
  )
  const per = (v: number) => Math.round((v / Math.max(1, servings)) * 10) / 10
  const num = (k: keyof CustomFood) => (
    <input
      inputMode="decimal"
      className="field num"
      value={String(form[k] ?? '')}
      onChange={(e) => setForm({ ...form, [k]: Number(e.target.value.replace(',', '.')) || 0 })}
      aria-label={String(k)}
    />
  )

  function save() {
    if (!form.name?.trim()) return toast('Give the dish a name')
    const base = { ...form, name: form.name.trim(), aliases: form.aliases?.trim() } as CustomFood
    if (mode === 'recipe') {
      if (!ings.length) return toast('Add at least one ingredient')
      Object.assign(base, {
        unit: '1 serving',
        g: Math.round(recipeTotals.g / Math.max(1, servings)),
        kcal: Math.round(per(recipeTotals.kcal)),
        p: per(recipeTotals.p),
        c: per(recipeTotals.c),
        f: per(recipeTotals.f),
        fb: per(recipeTotals.fb),
        recipe: ings.map((i) => ({ foodId: i.food.id, name: i.food.name, qty: i.qty })),
        servings,
      })
    } else {
      delete base.recipe
      delete base.servings
    }
    put<CustomFood>('customFoods', base)
    toast(`${base.name} saved to your dishes`)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={value.id ? 'Edit dish' : 'New dish'}
      accent="body"
      full
      footer={
        <div className="flex gap-2">
          {value.id && (
            <Button
              variant="danger"
              icon={<Trash size={17} />}
              onClick={() => {
                remove('customFoods', value.id!)
                onClose()
              }}
            >
              Delete
            </Button>
          )}
          <Button full onClick={save}>
            Save dish
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <input className="field" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aai's pithla" />
        </Field>
        <Field label="Other names you might say" hint="Separate with | — e.g. pitla|besan curry">
          <input className="field" value={form.aliases ?? ''} onChange={(e) => setForm({ ...form, aliases: e.target.value })} />
        </Field>
        <Segmented
          options={[
            { value: 'simple', label: 'I know the calories' },
            { value: 'recipe', label: 'Build from recipe' },
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === 'simple' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serving" className="col-span-2">
              <input className="field" value={form.unit ?? ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="1 katori / 1 plate / 1 piece" />
            </Field>
            <Field label="Weight (g or ml)">{num('g')}</Field>
            <Field label="Calories (kcal)">{num('kcal')}</Field>
            <Field label="Protein (g)">{num('p')}</Field>
            <Field label="Carbs (g)">{num('c')}</Field>
            <Field label="Fat (g)">{num('f')}</Field>
            <Field label="Fibre (g)">{num('fb')}</Field>
          </div>
        ) : (
          <div>
            <div className="overflow-hidden rounded-3xl border border-line bg-card">
              {ings.map((i, idx) => (
                <div key={idx} className="flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-medium">{i.food.name}</div>
                    <div className="text-[12px] text-ink3">
                      {fmtQty(i.qty)} × {i.food.unit} · {nutrients(i.food, i.qty).kcal} kcal
                    </div>
                  </div>
                  <Stepper size="sm" value={i.qty} step={0.5} min={0.5} max={50} format={(v) => fmtQty(v)} onChange={(v) => setIngs(ings.map((x, j) => (j === idx ? { ...x, qty: v } : x)))} />
                  <button aria-label="Remove" onClick={() => setIngs(ings.filter((_, j) => j !== idx))} className="p-1.5 text-ink3">
                    <Trash size={15} />
                  </button>
                </div>
              ))}
              <button onClick={() => setPick(true)} className="press flex w-full items-center justify-center gap-2 py-3 text-[14px] font-semibold text-acc">
                <ChefHat size={17} /> Add ingredient
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-card p-3">
              <span className="text-[14px] font-medium text-ink2">Makes servings</span>
              <Stepper value={servings} min={1} max={30} onChange={setServings} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill>{Math.round(per(recipeTotals.kcal))} kcal / serving</Pill>
              <Pill tone="muted">P {per(recipeTotals.p)} g</Pill>
              <Pill tone="muted">C {per(recipeTotals.c)} g</Pill>
              <Pill tone="muted">F {per(recipeTotals.f)} g</Pill>
            </div>
            <p className="mt-2 text-[12.5px] text-ink3">Tip: add the oil and ghee you cook with (Basics → Cooking oil, 1 tsp each) — they are often half the calories.</p>
          </div>
        )}
      </div>
      <SearchSheet open={pick} onClose={() => setPick(false)} foods={foods} onPick={(f) => setIngs([...ings, { food: f, qty: 1 }])} />
    </Sheet>
  )
}
