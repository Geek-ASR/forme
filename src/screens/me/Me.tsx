import { BookHeart, ChartLine, ClipboardList, Mail, Settings as SettingsIcon, Star, Target, UserRound, CalendarCheck } from 'lucide-react'
import { useMemo } from 'react'
import { Heatmap, MoodMonth } from '../../components/charts'
import { SyncBadge } from '../../components/SyncBadge'
import { Bar, Card, Page, Section } from '../../components/ui'
import { useProfile, useWeightNow } from '../../lib/app'
import { ageOn, bmi, bmiLabel } from '../../lib/calc'
import { fmtLong } from '../../lib/date'
import { heatLevel, useShowingUp } from '../../lib/insights'
import { useColl } from '../../lib/store'
import type { Day } from '../../lib/types'

const LINKS = [
  { href: '#/me/insights', label: 'Insights', sub: 'What your data says', Icon: ChartLine },
  { href: '#/me/review', label: 'Weekly review', sub: 'Two minutes every Sunday', Icon: CalendarCheck },
  { href: '#/me/goals', label: 'Goals', sub: 'Body, German, book, life', Icon: Target },
  { href: '#/me/manual', label: 'Manual of me', sub: 'Values, energy, principles', Icon: BookHeart },
  { href: '#/me/letters', label: 'Letters', sub: 'To your future self', Icon: Mail },
  { href: '#/ratings', label: 'Ratings', sub: 'Your taste, rated', Icon: Star },
  { href: '#/me/routine', label: 'Routine & reminders', sub: 'Checklist, notifications', Icon: ClipboardList },
  { href: '#/me/profile', label: 'Profile & targets', sub: 'Body stats, calories, protein', Icon: UserRound },
  { href: '#/me/settings', label: 'Settings & sync', sub: 'GitHub, lock, backup', Icon: SettingsIcon },
]

export default function Me() {
  const { profile } = useProfile()
  const kg = useWeightNow()
  const days = useColl<Day>('days')
  const scores = useShowingUp(119)
  const moods = useMemo(() => new Map(days.filter((d) => d.mood).map((d) => [d.id, d.mood!])), [days])
  const now = new Date()
  const target = profile.milestoneWeightKg ?? profile.goalWeightKg
  const lost = profile.startWeightKg - kg
  const need = profile.startWeightKg - target
  const b = bmi(kg, profile.heightCm)

  return (
    <Page accent="me" subtitle="Know yourself" title={profile.name || 'Me'} actions={<SyncBadge />}>
      <Card className="mt-2">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-acc-soft text-[26px] font-bold text-acc">{(profile.name || 'M').slice(0, 1)}</div>
          <div className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink2">
            <div>
              {profile.birth ? `${ageOn(profile.birth)} years · ` : ''}
              {profile.heightCm} cm · {kg.toFixed(1)} kg
            </div>
            <div>
              BMI {b.toFixed(1)} ({bmiLabel(b)}){profile.diet ? ` · ${profile.diet}` : ''}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[13px]">
            <span className="text-ink3">
              {profile.startWeightKg} → {target} kg
            </span>
            <span className="font-semibold">
              {Math.max(0, lost).toFixed(1)} of {need.toFixed(1)} kg
            </span>
          </div>
          <Bar value={Math.max(0, lost)} max={need} />
          {profile.milestoneDate && <div className="mt-1.5 text-[12.5px] text-ink3">Milestone by {fmtLong(profile.milestoneDate)} · final goal {profile.goalWeightKg} kg</div>}
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {LINKS.map(({ href, label, sub, Icon }) => (
          <Card key={href} href={href}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-acc-soft text-acc">
              <Icon size={20} />
            </div>
            <div className="mt-3 text-[15px] font-semibold">{label}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-ink3">{sub}</div>
          </Card>
        ))}
      </div>

      <Section title="Showing up · last 17 weeks" action={<a href="#/challenge" className="text-[13px] font-semibold text-acc">Challenge →</a>}>
        <Card>
          <Heatmap
            label="Daily consistency over the plan"
            days={scores.map((s) => ({ date: s.date, level: heatLevel(s.score), tip: `${fmtLong(s.date)} · ${Math.round(s.score * 100)}% (${Object.entries(s.parts).filter(([, v]) => v).map(([k]) => k).join(', ') || 'nothing logged'})` }))}
          />
          <p className="mt-2 text-[12.5px] text-ink3">Food, movement, steps, water, German, writing and check-in — each day scored by how many you showed up for.</p>
        </Card>
      </Section>

      <Section title={`Mood · ${now.toLocaleString('en', { month: 'long' })}`}>
        <Card>
          <MoodMonth year={now.getFullYear()} month={now.getMonth()} moods={moods} label="Mood calendar for this month" />
        </Card>
      </Section>
    </Page>
  )
}
