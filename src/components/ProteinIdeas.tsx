import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { kfmt } from '../lib/calc'
import { mealFor } from '../lib/date'
import { entryFromFood, foodList, proteinIdeas } from '../lib/food'
import { put, remove, useColl } from '../lib/store'
import type { CustomFood, FoodEntry } from '../lib/types'
import { Sheet } from './Sheet'
import { toast } from './Toasts'

/** "How do I close the protein gap?" — a few vegetarian (egg-free) options that fit today's calories. */
export function ProteinIdeas({ open, onClose, date, gap, kcalLeft }: { open: boolean; onClose: () => void; date: string; gap: number; kcalLeft: number }) {
  const custom = useColl<CustomFood>('customFoods')
  const history = useColl<FoodEntry>('food')
  const ideas = useMemo(() => proteinIdeas(foodList(custom), history, kcalLeft), [custom, history, kcalLeft])
  return (
    <Sheet open={open} onClose={onClose} title={`${Math.round(gap)} g protein to go`} accent="body">
      <p className="text-[13.5px] leading-relaxed text-ink3">
        {kcalLeft >= 150 ? `These fit in the ${kfmt(kcalLeft)} kcal you have left` : "You're at your calories, so only the leanest options"} — foods you already eat come first. Tap to log one.
      </p>
      <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-card">
        {ideas.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              const rec = put<FoodEntry>('food', entryFromFood(f, 1, date, mealFor()))
              toast(`${f.name} logged · +${f.p} g protein`, { label: 'Undo', run: () => remove('food', rec.id) })
              onClose()
            }}
            className="press flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{f.name}</span>
              <span className="block text-[12.5px] text-ink3">
                {f.unit} · {f.kcal} kcal
              </span>
            </span>
            <span className="num shrink-0 text-[15px] font-semibold text-good">+{f.p} g</span>
            <Plus size={17} className="shrink-0 text-acc" />
          </button>
        ))}
        {!ideas.length && <div className="px-4 py-5 text-center text-[14px] text-ink3">Nothing fits today — tomorrow, start the day with protein.</div>}
      </div>
    </Sheet>
  )
}
