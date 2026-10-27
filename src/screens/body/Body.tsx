import { Activity, BookOpenText, ChefHat, Dumbbell, HeartPulse, Scale, Sparkles, Utensils } from 'lucide-react'
import { useMemo } from 'react'
import { Columns, Sparkline } from '../../components/charts'
import { SyncBadge } from '../../components/SyncBadge'
import { Button, Card, Page, Section } from '../../components/ui'
import { sessionMinutes } from '../../data/program'
import { useByDate, useDayData, useProfile } from '../../lib/app'
import { kfmt, weightTrend } from '../../lib/calc'
import { dkey, dowShort, lastNDays, weekday } from '../../lib/date'
import { sumEntries } from '../../lib/food'
import { go } from '../../lib/router'
import { useColl } from '../../lib/store'
import type { BodyEntry, FoodEntry } from '../../lib/types'

const TILES = [
  { href: '#/body/food', label: 'Food log', sub: 'Indian dishes, by voice or text', Icon: Utensils },
  { href: '#/body/plan', label: 'Workout plan', sub: '120-day challenge, home, low-impact', Icon: Dumbbell },
  { href: '#/body/move', label: 'Steps & activity', sub: 'Walks, sports, burn', Icon: Activity },
  { href: '#/body/weight', label: 'Weight & body', sub: 'Trend, measurements, tests', Icon: Scale },
  { href: '#/body/spine', label: 'Spine care', sub: 'Pain, stiffness, BASDAI, meds', Icon: HeartPulse },
  { href: '#/body/skin', label: 'Skincare', sub: 'AM / PM routine, shelf', Icon: Sparkles },
  { href: '#/body/foods', label: 'Dish library', sub: '270+ dishes · add your own', Icon: BookOpenText },
  { href: '#/body/meals', label: 'Meal plan', sub: 'A week of high-protein veg meals + groceries', Icon: ChefHat },
]

export default function Body() {
  const date = dkey()
  const d = useDayData(date)
  const { profile } = useProfile()
  const foodBy = useByDate<FoodEntry>('food')
  const body = useColl<BodyEntry>('body')
  const days = lastNDays(7)
  const cols = days.map((k) => ({ key: k, label: dowShort(weekday(k)).slice(0, 2), value: sumEntries(foodBy.get(k) ?? []).kcal, tip: k }))
  const trend = useMemo(() => weightTrend(body), [body])
  const recent = trend.slice(-30)
  const weekAgo = trend.length > 7 ? trend[trend.length - 8].trend : undefined
  const last = trend[trend.length - 1]

  return (
    <Page accent="body" subtitle="Fitness & health" title="Body" actions={<SyncBadge />}>
      <Card className="mt-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[13px] text-ink3">Today</div>
            <div className="mt-0.5 text-[26px] font-bold leading-none">
              {kfmt(d.totals.kcal)} <span className="text-[14px] font-medium text-ink3">/ {kfmt(d.settings.targets.kcal)} kcal</span>
            </div>
            <div className="mt-1.5 text-[13px] text-ink3">
              Burn ≈ {kfmt(d.burn.total)} · {d.steps.toLocaleString('en-IN')} steps · protein {Math.round(d.totals.p)} g
            </div>
          </div>
          <Button size="sm" onClick={() => go('/body/food/add')}>
            Log food
          </Button>
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <div className="text-[13px] text-ink3">Workout today</div>
          {(d.day?.flare ? [] : d.program.sessions).map((s) => (
            <a key={s.id} href={s.mode === 'rest' ? '#/body/plan' : `#/body/workout/${s.id}`} className="mt-1 flex items-center justify-between text-[15px] font-semibold">
              {s.name}
              <span className="text-[13px] font-medium text-acc">{s.mode === 'rest' ? 'Rest day' : `${sessionMinutes(s, d.program.phase.n)} min →`}</span>
            </a>
          ))}
          {d.day?.flare && (
            <a href="#/body/workout/flare" className="mt-1 flex items-center justify-between text-[15px] font-semibold">
              Flare care <span className="text-[13px] font-medium text-acc">8 min →</span>
            </a>
          )}
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {TILES.map(({ href, label, sub, Icon }) => (
          <Card key={href} href={href}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-acc-soft text-acc">
              <Icon size={20} />
            </div>
            <div className="mt-3 text-[15px] font-semibold">{label}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-ink3">{sub}</div>
          </Card>
        ))}
      </div>

      <Section title="Calories · last 7 days">
        <Card>
          <Columns data={cols} target={d.settings.targets.kcal} highlight={date} unit="kcal" label="Calories eaten in the last 7 days" />
        </Card>
      </Section>

      {last && (
        <Section title="Weight trend">
          <Card href="#/body/weight">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[26px] font-bold leading-none">
                  {last.trend.toFixed(1)} <span className="text-[14px] font-medium text-ink3">kg</span>
                </div>
                <div className="mt-1.5 text-[13px] text-ink3">
                  {weekAgo !== undefined ? `${last.trend - weekAgo <= 0 ? '−' : '+'}${Math.abs(last.trend - weekAgo).toFixed(1)} kg this week · ` : ''}
                  {(profile.startWeightKg - last.trend).toFixed(1)} kg since start
                </div>
              </div>
              <Sparkline values={recent.map((r) => r.trend)} width={100} height={36} />
            </div>
          </Card>
        </Section>
      )}
    </Page>
  )
}
