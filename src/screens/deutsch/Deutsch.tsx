import { BookA, BookOpenText, ExternalLink, GraduationCap, Plus, Swords } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Columns } from '../../components/charts'
import { SyncBadge } from '../../components/SyncBadge'
import { toast } from '../../components/Toasts'
import { Button, Card, Chips, Page, Ring, Section, Stat, cx } from '../../components/ui'
import { RESOURCES } from '../../data/german'
import { saveSettings, useByDate, useSettings } from '../../lib/app'
import { streak } from '../../lib/calc'
import { diffDays, dkey, dowShort, fmtLong, lastNDays, weekday } from '../../lib/date'
import { go } from '../../lib/router'
import { LEVELS, loadDeck } from '../../lib/srs'
import { put, useColl } from '../../lib/store'
import type { DeLog, Level, SrsState } from '../../lib/types'

const KINDS = ['Course', 'YouTube', 'Podcast', 'Class', 'Reading', 'Speaking', 'App']

export default function Deutsch() {
  const today = dkey()
  const settings = useSettings()
  const g = settings.german
  const srs = useColl<SrsState>('srs')
  const logBy = useByDate<DeLog>('deLog')
  const [kind, setKind] = useState('Course')
  const [deckSize, setDeckSize] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    loadDeck(g.level).then((c) => alive && setDeckSize(c.length))
    return () => {
      alive = false
    }
  }, [g.level])

  const minutesToday = (logBy.get(today) ?? []).reduce((s, x) => s + x.minutes, 0)
  const due = srs.filter((s) => s.due <= today).length
  const newToday = srs.filter((s) => s.intro === today).length
  const newLeft = Math.max(0, g.newPerDay - newToday)
  const mature = srs.filter((s) => s.ivl >= 21).length
  const learning = srs.length - mature
  const days = useMemo(() => new Set([...logBy.keys()]), [logBy])
  const st = streak(days, today)
  const week = lastNDays(7).map((k) => ({ key: k, label: dowShort(weekday(k)).slice(0, 2), value: (logBy.get(k) ?? []).reduce((s, x) => s + x.minutes, 0), tip: k }))
  const goalDays = g.goalDate ? diffDays(g.goalDate, today) : null

  function logMinutes(m: number) {
    put<DeLog>('deLog', { date: today, minutes: m, kind: kind.toLowerCase() })
    toast(`+${m} min of German (${kind}) 🇩🇪`)
  }

  return (
    <Page accent="de" subtitle="Deutsch lernen" title="German" actions={<SyncBadge />}>
      {g.goalLabel && goalDays !== null && (
        <Card className="mt-1 overflow-hidden" pad={false}>
          <div className="flex h-1.5">
            <span className="flex-1 bg-[#3a3a37]" />
            <span className="flex-1 bg-[#d03b3b]" />
            <span className="flex-1 bg-[#eda100]" />
          </div>
          <div className="p-4">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-acc">🇩🇪 Goal</div>
            <div className="mt-0.5 text-[18px] font-semibold">{g.goalLabel}</div>
            <div className="mt-0.5 text-[13.5px] text-ink3">
              {goalDays > 0 ? `${goalDays} days to go · ${fmtLong(g.goalDate!)}` : `Since ${fmtLong(g.goalDate!)}`}
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-3">
        <div className="flex items-center gap-4">
          <Ring value={minutesToday} max={settings.targets.germanMinutes} size={104} stroke={10} label={`${minutesToday} of ${settings.targets.germanMinutes} minutes today`}>
            <div className="text-[22px] font-bold leading-none">{minutesToday}</div>
            <div className="text-[11px] text-ink3">of {settings.targets.germanMinutes} min</div>
          </Ring>
          <div className="flex-1 space-y-1.5 text-[14px]">
            <div className="flex justify-between">
              <span className="text-ink3">Due now</span>
              <b>{due}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-ink3">New today</span>
              <b>{newLeft}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-ink3">Streak</span>
              <b>
                {st} day{st === 1 ? '' : 's'}
              </b>
            </div>
          </div>
        </div>
        <Button full size="lg" className="mt-4" icon={<GraduationCap size={19} />} onClick={() => go('/deutsch/review')}>
          {due + newLeft ? `Study · ${due} due + ${newLeft} new` : 'All done — practise anyway'}
        </Button>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Card href="#/deutsch/sprint" className="text-center">
          <Swords size={20} className="mx-auto text-acc" />
          <div className="mt-1.5 text-[13.5px] font-semibold">der·die·das</div>
        </Card>
        <Card href="#/deutsch/grammar" className="text-center">
          <BookOpenText size={20} className="mx-auto text-acc" />
          <div className="mt-1.5 text-[13.5px] font-semibold">Grammar</div>
        </Card>
        <Card href="#/deutsch/words" className="text-center">
          <BookA size={20} className="mx-auto text-acc" />
          <div className="mt-1.5 text-[13.5px] font-semibold">Words</div>
        </Card>
      </div>

      <Section title="Level for new words">
        <Chips options={LEVELS.map((l) => ({ value: l, label: l }))} value={g.level} onChange={(l: Level) => saveSettings({ german: { ...g, level: l } })} />
        <div className="mt-2 flex items-center justify-between px-1 text-[13px] text-ink3">
          <span>{deckSize !== null ? `${deckSize} words in ${g.level}` : 'Loading deck…'}</span>
          <span className="flex items-center gap-2">
            New per day
            {[5, 10, 15, 20].map((n) => (
              <button key={n} onClick={() => saveSettings({ german: { ...g, newPerDay: n } })} className={cx('press rounded-lg px-2 py-0.5 font-semibold', g.newPerDay === n ? 'bg-acc-soft text-acc' : '')}>
                {n}
              </button>
            ))}
          </span>
        </div>
      </Section>

      <Section title="Other practice">
        <Card>
          <Chips options={KINDS.map((k) => ({ value: k, label: k }))} value={kind} onChange={setKind} />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[10, 15, 20, 30].map((m) => (
              <Button key={m} variant="soft" icon={<Plus size={15} />} onClick={() => logMinutes(m)}>
                {m}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-ink3">Log minutes from courses, videos, classes or conversation — it all counts toward your daily goal.</p>
        </Card>
      </Section>

      <Section title="Minutes · last 7 days">
        <Card>
          <Columns data={week} target={settings.targets.germanMinutes} highlight={today} unit="min" label="German minutes per day" color="var(--s2)" />
        </Card>
      </Section>

      <Section title="Your vocabulary">
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Learning" value={learning} />
          <Stat label="Mature (3 wk+)" value={mature} />
          <Stat label="Total seen" value={srs.length} />
        </div>
      </Section>

      <Section title="Free resources">
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {RESOURCES.map((r) => (
            <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="press flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium">{r.name}</div>
                <div className="text-[12.5px] text-ink3">{r.what}</div>
              </div>
              <ExternalLink size={16} className="text-ink3" />
            </a>
          ))}
        </div>
        <p className="mt-2 px-1 text-[12px] text-ink3">Flashcards: Deutschpfad vocabulary (CC BY-SA 4.0), A1–C1.</p>
      </Section>
    </Page>
  )
}
