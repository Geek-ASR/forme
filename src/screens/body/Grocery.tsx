// The week's grocery list, from the meal plan: by aisle, rounded up to what you'd buy, ticked off as
// you shop (ticks sync, so the list works from any device), and shareable to WhatsApp or anywhere.

import { Check, Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from '../../components/Toasts'
import { Button, Card, Empty, Page, Section, Segmented, cx } from '../../components/ui'
import { PANTRY } from '../../data/mealplan'
import { addDays, dkey, fmtLong, rangeKeys, weekStart } from '../../lib/date'
import { groceries } from '../../lib/mealplan'
import { go, useRoute } from '../../lib/router'
import { patch, useDoc } from '../../lib/store'
import type { MealPlan } from '../../lib/types'

export default function Grocery() {
  const { query } = useRoute()
  const today = dkey()
  const week = query.get('w') || weekStart(today)
  const end = addDays(week, 6)
  const plan = useDoc<MealPlan>('mealPlans', week)
  const midweek = today > week && today <= end
  const [range, setRange] = useState<'week' | 'rest'>(midweek ? 'rest' : 'week')
  const from = range === 'rest' && midweek ? today : week
  const list = useMemo(() => (plan ? groceries(plan, rangeKeys(from, end)) : []), [plan, from, end])
  const got = new Set(plan?.got ?? [])
  const left = list.reduce((a, g) => a + g.items.filter((i) => !got.has(i.id)).length, 0)

  function toggle(id: string) {
    const next = got.has(id) ? [...got].filter((x) => x !== id) : [...got, id]
    patch<MealPlan>('mealPlans', week, { got: next })
  }

  async function share() {
    const lines = list.flatMap((g) => {
      const items = g.items.filter((i) => !got.has(i.id))
      return items.length ? [`*${g.aisle}*`, ...items.map((i) => `• ${i.name} — ${i.amount}`), ''] : []
    })
    const text = `Groceries · ${fmtLong(from)} – ${fmtLong(end)}\n\n${lines.join('\n')}`.trim()
    try {
      if (navigator.share) await navigator.share({ title: 'Groceries', text })
      else {
        await navigator.clipboard.writeText(text)
        toast('List copied')
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  if (!plan) {
    return (
      <Page accent="body" back="/body/meals" title="Grocery list">
        <Empty title="No meal plan for this week yet" body="Plan the week first — the grocery list comes from it." action={<Button onClick={() => go(`/body/meals?w=${week}`)}>Plan the week</Button>} />
      </Page>
    )
  }

  return (
    <Page
      accent="body"
      back="/body/meals"
      title="Grocery list"
      actions={
        <Button size="sm" variant="soft" icon={<Share2 size={15} />} onClick={share}>
          Share
        </Button>
      }
    >
      {midweek && (
        <div className="mt-1">
          <Segmented
            options={[
              { value: 'rest', label: 'From today' },
              { value: 'week', label: 'Whole week' },
            ]}
            value={range}
            onChange={setRange}
          />
        </div>
      )}
      <div className="mt-3 px-1 text-[13.5px] text-ink3">
        {fmtLong(from)} – {fmtLong(end)} · {left ? `${left} item${left === 1 ? '' : 's'} to get` : 'all ticked off ✓'}
      </div>

      {list.map((g) => (
        <Section key={g.aisle} title={g.aisle} className="mt-4">
          <div className="overflow-hidden rounded-3xl border border-line bg-card">
            {[...g.items]
              .sort((a, b) => Number(got.has(a.id)) - Number(got.has(b.id)))
              .map((i) => {
                const have = got.has(i.id)
                return (
                  <button key={i.id} onClick={() => toggle(i.id)} aria-pressed={have} className="press flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0">
                    <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', have ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2 text-transparent')}>
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span className={cx('min-w-0 flex-1 text-[15px]', have && 'text-ink3 line-through decoration-1')}>{i.name}</span>
                    <span className={cx('num shrink-0 text-[14px] font-semibold', have ? 'text-ink3' : 'text-ink2')}>{i.amount}</span>
                  </button>
                )
              })}
          </div>
        </Section>
      ))}

      <Card className="mt-5">
        <p className="text-[13px] leading-relaxed text-ink3">{PANTRY} Amounts are home-recipe estimates, rounded up.</p>
        {got.size > 0 && (
          <button onClick={() => patch<MealPlan>('mealPlans', week, { got: [] })} className="press mt-2 text-[13px] font-semibold text-acc">
            Clear all ticks
          </button>
        )}
      </Card>
    </Page>
  )
}
