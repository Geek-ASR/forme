import { Check, ChevronDown, Mic, MicOff, Plus, Search, Trash, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Button, Chips, Page, Segmented, Stepper, cx } from '../../components/ui'
import type { Food } from '../../data/foods'
import { kfmt } from '../../lib/calc'
import { dkey, fmtRel, mealFor } from '../../lib/date'
import { entryFromFood, fmtQty, foodList, multiplier, nutrients, parseMeal, portionText, searchFoods, type ParsedItem } from '../../lib/food'
import { back, go, useRoute } from '../../lib/router'
import { canListen, listen } from '../../lib/speech'
import { put, useColl } from '../../lib/store'
import type { CustomFood, FoodEntry, Meal, MealTemplate } from '../../lib/types'
import { MEALS } from './Food'

type Pick = { key: string; food: Food; mult: number; raw?: string }

export default function AddFood() {
  const { query } = useRoute()
  const date = query.get('d') || dkey()
  const [meal, setMeal] = useState<Meal>((query.get('meal') as Meal) || mealFor())
  const custom = useColl<CustomFood>('customFoods')
  const foods = useMemo(() => foodList(custom), [custom])
  const entries = useColl<FoodEntry>('food')
  const templates = useColl<MealTemplate>('meals')
  const [text, setText] = useState('')
  const [manual, setManual] = useState<Pick[]>([])
  const [overrides, setOverrides] = useState<Record<string, { foodId?: string; mult?: number; removed?: boolean }>>({})
  const [listening, setListening] = useState(false)
  const stopRef = useRef<() => void>(() => {})
  const [tab, setTab] = useState<'recent' | 'frequent' | 'meals'>('recent')
  const [search, setSearch] = useState(false)
  const [alt, setAlt] = useState<ParsedItem | null>(null)

  const parsed = useMemo(() => parseMeal(text, foods), [text, foods])
  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])

  const picks: (Pick & { parsed?: ParsedItem })[] = []
  for (const p of parsed) {
    const o = overrides[p.raw]
    if (o?.removed) continue
    const food = (o?.foodId && byId.get(o.foodId)) || (p.matches[0] && p.matches[0].score >= 0.5 ? p.matches[0].food : undefined)
    if (food) picks.push({ key: 'p:' + p.raw, food, mult: o?.mult ?? multiplier(food, p.qty, p.unit, p.size), raw: p.raw, parsed: p })
  }
  picks.push(...manual)
  const unmatched = parsed.filter((p) => !overrides[p.raw]?.removed && !overrides[p.raw]?.foodId && !(p.matches[0] && p.matches[0].score >= 0.5))
  const total = picks.reduce((s, p) => s + nutrients(p.food, p.mult).kcal, 0)

  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: { food: Food; mult: number }[] = []
    for (const e of [...entries].sort((a, b) => (b.at ?? b.updatedAt) - (a.at ?? a.updatedAt))) {
      if (!e.foodId || seen.has(e.foodId)) continue
      const f = byId.get(e.foodId)
      if (!f) continue
      seen.add(e.foodId)
      out.push({ food: f, mult: e.qty })
      if (out.length >= 15) break
    }
    return out
  }, [entries, byId])

  const frequent = useMemo(() => {
    const count = new Map<string, { n: number; qty: number }>()
    for (const e of entries) {
      if (!e.foodId) continue
      const c = count.get(e.foodId) ?? { n: 0, qty: e.qty }
      count.set(e.foodId, { n: c.n + 1, qty: e.qty })
    }
    return [...count.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 15)
      .map(([id, c]) => ({ food: byId.get(id)!, mult: c.qty, n: c.n }))
      .filter((x) => x.food)
  }, [entries, byId])

  useEffect(() => () => stopRef.current(), [])

  function mic() {
    if (listening) {
      stopRef.current()
      return
    }
    const before = text ? text.trim() + ', ' : ''
    setListening(true)
    stopRef.current = listen(
      (t) => setText(before + t),
      (err) => {
        setListening(false)
        if (err && err !== 'no-speech' && err !== 'aborted') toast(err === 'not-allowed' ? 'Microphone permission denied' : 'Could not hear that — try again')
      },
    )
  }

  function addManual(food: Food, mult = 1) {
    setManual((m) => [...m, { key: 'm:' + Date.now() + food.id, food, mult }])
    toast(`${food.name} added`)
  }

  function saveAll() {
    if (!picks.length) return
    for (const p of picks) put<FoodEntry>('food', entryFromFood(p.food, p.mult, date, meal))
    toast(`Logged ${picks.length} item${picks.length > 1 ? 's' : ''} · ${kfmt(total)} kcal`)
    back(`/body/food${date !== dkey() ? `?d=${date}` : ''}`)
  }

  return (
    <Page accent="body" back="/body/food" title={`Log food · ${fmtRel(date)}`}>
      <Chips className="mt-1" options={MEALS} value={meal} onChange={setMeal} />

      <div className="relative mt-4">
        <textarea
          autoFocus
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you eat? e.g. 2 roti, 1 katori dal tadka, half plate jeera rice and a glass of chaas"
          className="field min-h-28 pr-14 text-[16.5px]"
          aria-label="What did you eat"
        />
        {canListen() && (
          <button
            aria-label={listening ? 'Stop listening' : 'Speak your meal'}
            onClick={mic}
            className={cx('press absolute right-2.5 bottom-3 flex h-11 w-11 items-center justify-center rounded-full', listening ? 'anim-pulse bg-bad text-white' : 'bg-acc-soft text-acc')}
          >
            {listening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}
      </div>
      <div className="mt-1.5 px-1 text-[12.5px] text-ink3">
        {listening ? 'Listening… speak naturally, e.g. "do roti, ek vati dal"' : 'Separate items with commas or “and”. Portions: katori, plate, glass, piece, half, 200 g…'}
      </div>

      {(picks.length > 0 || unmatched.length > 0) && (
        <div className="mt-4 space-y-2">
          {picks.map((p) => {
            const n = nutrients(p.food, p.mult)
            return (
              <div key={p.key} className="rounded-3xl border border-line bg-card p-3.5">
                <div className="flex items-start gap-2">
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => p.parsed && setAlt(p.parsed)}
                    disabled={!p.parsed}
                  >
                    <div className="flex items-center gap-1 text-[15.5px] font-semibold">
                      <span className="truncate">{p.food.name}</span>
                      {p.parsed && p.parsed.matches.length > 1 && <ChevronDown size={16} className="shrink-0 text-ink3" />}
                    </div>
                    <div className="truncate text-[12.5px] text-ink3">
                      {p.raw ? `“${p.raw}” → ` : ''}
                      {portionText(p.mult, p.food.unit)}
                    </div>
                  </button>
                  <div className="text-right">
                    <div className="num text-[16px] font-semibold">{kfmt(n.kcal)}</div>
                    <div className="text-[11.5px] text-ink3">kcal</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-[12px] text-ink3">
                    P {n.p} · C {n.c} · F {n.f} g
                  </div>
                  <div className="flex items-center gap-1">
                    <Stepper
                      size="sm"
                      value={p.mult}
                      min={0.25}
                      max={20}
                      step={0.25}
                      format={(v) => `${fmtQty(v)}×`}
                      onChange={(v) =>
                        p.raw
                          ? setOverrides((o) => ({ ...o, [p.raw!]: { ...o[p.raw!], foodId: p.food.id, mult: v } }))
                          : setManual((m) => m.map((x) => (x.key === p.key ? { ...x, mult: v } : x)))
                      }
                    />
                    <button
                      aria-label={`Remove ${p.food.name}`}
                      onClick={() => (p.raw ? setOverrides((o) => ({ ...o, [p.raw!]: { removed: true } })) : setManual((m) => m.filter((x) => x.key !== p.key)))}
                      className="press ml-1 flex h-8 w-8 items-center justify-center rounded-full text-ink3"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {unmatched.map((u) => (
            <div key={u.raw} className="rounded-3xl border border-dashed border-line2 p-3.5">
              <div className="text-[14.5px]">
                Couldn't find <b>“{u.query}”</b>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {u.matches.slice(0, 3).map((m) => (
                  <button
                    key={m.food.id}
                    onClick={() => setOverrides((o) => ({ ...o, [u.raw]: { foodId: m.food.id, mult: multiplier(m.food, u.qty, u.unit, u.size) } }))}
                    className="press rounded-full bg-acc-soft px-3 py-1.5 text-[13px] font-semibold text-acc"
                  >
                    {m.food.name}?
                  </button>
                ))}
                <button onClick={() => go(`/body/foods?new=${encodeURIComponent(u.query)}`)} className="press rounded-full border border-line2 px-3 py-1.5 text-[13px] font-semibold text-ink2">
                  + Create “{u.query}”
                </button>
                <button onClick={() => setOverrides((o) => ({ ...o, [u.raw]: { removed: true } }))} className="press px-2 text-[13px] text-ink3">
                  Ignore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <div className="w-60">
          <Segmented
            options={[
              { value: 'recent', label: 'Recent' },
              { value: 'frequent', label: 'Frequent' },
              { value: 'meals', label: 'My meals' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        <button onClick={() => setSearch(true)} className="press flex items-center gap-1.5 text-[14px] font-semibold text-acc">
          <Search size={16} /> Search
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-card">
        {tab === 'meals' ? (
          templates.length ? (
            templates.map((t) => {
              const kcal = t.items.reduce((s, i) => s + (byId.get(i.foodId) ? nutrients(byId.get(i.foodId)!, i.qty).kcal : 0), 0)
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    for (const i of t.items) {
                      const f = byId.get(i.foodId)
                      if (f) setManual((m) => [...m, { key: 'm:' + Math.random() + f.id, food: f, mult: i.qty }])
                    }
                    toast(`${t.name} added`)
                  }}
                  className="press flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{t.name}</div>
                    <div className="truncate text-[12.5px] text-ink3">{t.items.map((i) => i.name).join(', ')}</div>
                  </div>
                  <span className="num text-[14px] font-semibold">{kfmt(kcal)}</span>
                  <Plus size={18} className="text-acc" />
                </button>
              )
            })
          ) : (
            <div className="px-4 py-6 text-center text-[13.5px] text-ink3">Save a logged meal as “my meal” from the food log to add it in one tap.</div>
          )
        ) : (tab === 'recent' ? recent : frequent).length ? (
          (tab === 'recent' ? recent : frequent).map(({ food, mult }) => (
            <QuickFood key={food.id} food={food} mult={mult} onAdd={() => addManual(food, mult)} />
          ))
        ) : (
          <div className="px-4 py-6 text-center text-[13.5px] text-ink3">Foods you log will show up here for one-tap adding.</div>
        )}
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 backdrop-blur-xl">
        <div className="mx-auto max-w-xl px-4 py-3">
          <Button full size="lg" disabled={!picks.length} onClick={saveAll} icon={<Check size={19} />}>
            {picks.length ? `Add ${picks.length} item${picks.length > 1 ? 's' : ''} · ${kfmt(total)} kcal` : 'Add items'}
          </Button>
        </div>
      </div>

      <SearchSheet open={search} onClose={() => setSearch(false)} foods={foods} onPick={(f) => addManual(f, 1)} />
      <Sheet open={!!alt} onClose={() => setAlt(null)} title={alt ? `“${alt.query}” is…` : ''} accent="body">
        {alt && (
          <div className="space-y-2 pb-2">
            {alt.matches.map((m) => (
              <button
                key={m.food.id}
                onClick={() => {
                  setOverrides((o) => ({ ...o, [alt.raw]: { foodId: m.food.id, mult: multiplier(m.food, alt.qty, alt.unit, alt.size) } }))
                  setAlt(null)
                }}
                className="press flex w-full items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-left"
              >
                <div>
                  <div className="text-[15px] font-medium">{m.food.name}</div>
                  <div className="text-[12.5px] text-ink3">
                    {m.food.unit} · {m.food.kcal} kcal
                  </div>
                </div>
                <span className="text-[12px] text-ink3">{Math.round(m.score * 100)}%</span>
              </button>
            ))}
            <button
              onClick={() => {
                setOverrides((o) => ({ ...o, [alt.raw]: { removed: true } }))
                setAlt(null)
              }}
              className="press flex w-full items-center justify-center gap-2 py-3 text-[14px] font-semibold text-bad"
            >
              <Trash size={16} /> Remove this item
            </button>
          </div>
        )}
      </Sheet>
    </Page>
  )
}

function QuickFood({ food, mult, onAdd }: { food: Food; mult: number; onAdd: () => void }) {
  return (
    <button onClick={onAdd} className="press flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{food.name}</div>
        <div className="text-[12.5px] text-ink3">
          {portionText(mult, food.unit)} · {kfmt(nutrients(food, mult).kcal)} kcal
        </div>
      </div>
      <Plus size={18} className="text-acc" />
    </button>
  )
}

export function SearchSheet({ open, onClose, foods, onPick }: { open: boolean; onClose: () => void; foods: Food[]; onPick: (f: Food) => void }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => (q.trim() ? searchFoods(q, foods, 30).map((r) => r.food) : foods.slice(0, 40)), [q, foods])
  return (
    <Sheet open={open} onClose={onClose} title="Search dishes" accent="body" full>
      <input autoFocus className="field" placeholder="poha, paneer, chai…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search dishes" />
      <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-card">
        {results.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              onPick(f)
              onClose()
              setQ('')
            }}
            className="press flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium">{f.name}</div>
              <div className="text-[12.5px] text-ink3">
                {f.unit} · {f.kcal} kcal · P {f.p} g · {f.cat}
              </div>
            </div>
            <Plus size={18} className="text-acc" />
          </button>
        ))}
        {!results.length && <div className="px-4 py-6 text-center text-[13.5px] text-ink3">No match — create it in the dish library.</div>}
      </div>
    </Sheet>
  )
}
