import { Check, ChevronRight, Droplet, Footprints, Mail, Moon, Plus, Scale, Sparkles, Volume2, Flame } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MacroBar, moodEmoji } from '../components/charts'
import { CheckIn } from '../components/CheckIn'
import { RoutineIcon } from '../components/icons'
import { NumberSheet } from '../components/NumberSheet'
import { QuickAdd } from '../components/QuickAdd'
import { SyncBadge } from '../components/SyncBadge'
import { toast } from '../components/Toasts'
import { Bar, Button, Card, Fab, Page, Pill, Ring, Section, cx } from '../components/ui'
import { wordOfDay } from '../data/german'
import { promptOfDay } from '../data/prompts'
import { SESSIONS, sessionMinutes } from '../data/program'
import { TONIGHT_LABEL, tonight } from '../data/skincare'
import { addWater, evaluateRoutine, patchDay, setCheck, useDayData, useWeightNow } from '../lib/app'
import { kfmt } from '../lib/calc'
import { diffDays, dkey, fmtDay, fmtLong, fmtTime, greeting, weekday } from '../lib/date'
import { excerpt } from '../lib/md'
import { go } from '../lib/router'
import { speak } from '../lib/speech'
import { useColl } from '../lib/store'
import type { Letter, Post, SrsState } from '../lib/types'
import { ART_COLOR } from '../lib/srs'

export default function Today() {
  const date = dkey()
  const d = useDayData(date)
  const [add, setAdd] = useState(false)
  const [sheet, setSheet] = useState<'steps' | 'sleep' | null>(null)
  const kgNow = useWeightNow()
  const posts = useColl<Post>('posts')
  const letters = useColl<Letter>('letters')
  const srs = useColl<SrsState>('srs')
  const routine = evaluateRoutine(d)
  const doneCount = routine.filter((r) => r.done).length
  const t = d.settings.targets
  const left = t.kcal - d.totals.kcal
  const balance = d.totals.kcal - d.burn.total
  const flare = !!d.day?.flare
  const sessions = flare ? [SESSIONS.flare] : d.program.sessions
  const skin = tonight(d.profile.skinStart, date, d.day?.skinIrritated)
  const word = wordOfDay(date)
  const due = srs.filter((s) => s.due <= date).length

  const pastSelf = useMemo(() => {
    const old = posts.filter((p) => diffDays(date, p.date) >= 7 && p.body.length > 20)
    if (!old.length) return null
    let h = 0
    for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return old[h % old.length]
  }, [posts, date])
  const letterReady = letters.find((l) => !l.opened && l.openOn <= date)
  const name = d.profile.name?.split(' ')[0]

  return (
    <Page
      accent="today"
      subtitle={fmtDay(date)}
      title={`${greeting()}${name ? `, ${name}` : ''}`}
      actions={<SyncBadge />}
    >
      {!d.program.before && !d.program.after && (
        <div className="mt-1 px-1">
          <div className="flex items-center justify-between text-[13px] text-ink3">
            <span>
              Day <b className="text-ink">{d.program.day}</b> of {d.program.totalDays} · Week {d.program.week} · {d.program.phase.name}
            </span>
            <a href="#/body/plan" className="font-semibold text-acc">
              Plan
            </a>
          </div>
          <Bar className="mt-2" value={d.program.day} max={d.program.totalDays} height={5} />
        </div>
      )}

      {d.profileMissing && (
        <Card className="mt-4 border-acc/40" href="#/me/profile">
          <div className="text-[15px] font-semibold">Set up your profile</div>
          <div className="mt-1 text-[13.5px] text-ink3">Height, weight and goal make the calorie maths personal.</div>
        </Card>
      )}

      {letterReady && (
        <Card className="mt-4" href="#/me/letters">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc-soft text-acc">
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-semibold">A letter from your past self is ready</div>
              <div className="text-[13px] text-ink3">Written {fmtLong(letterReady.writtenOn)}</div>
            </div>
            <ChevronRight size={18} className="text-ink3" />
          </div>
        </Card>
      )}

      {/* Energy */}
      <Card className="mt-4">
        <div className="flex items-center gap-4">
          <Ring value={d.totals.kcal} max={t.kcal} size={124} stroke={11} color={left < 0 ? 'var(--bad-mark)' : 'var(--acc-fill)'} label={`${kfmt(d.totals.kcal)} of ${kfmt(t.kcal)} kcal eaten`}>
            <div className="text-[24px] font-bold leading-none">{kfmt(Math.abs(left))}</div>
            <div className="mt-1 text-[11.5px] font-medium text-ink3">{left >= 0 ? 'kcal left' : 'kcal over'}</div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink3">Eaten</span>
              <span className="text-[17px] font-semibold">{kfmt(d.totals.kcal)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink3">Burn ≈</span>
              <span className="text-[17px] font-semibold">{kfmt(d.burn.total)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink3">Balance</span>
              <span className={cx('text-[17px] font-semibold', balance <= 0 ? 'text-good' : 'text-bad')}>
                {balance > 0 ? '+' : '−'}
                {kfmt(Math.abs(balance))}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <MacroBar p={d.totals.p} c={d.totals.c} f={d.totals.f} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button full onClick={() => go('/body/food/add')} icon={<Plus size={18} />}>
            Log food
          </Button>
          <Button variant="outline" onClick={() => go('/body/food')}>
            Today
          </Button>
        </div>
        <div className="mt-2.5 text-[12px] leading-snug text-ink3">
          Burn = base {kfmt(d.burn.base)} + walking {kfmt(d.burn.walk)} + workouts {kfmt(d.burn.work)}. Protein{' '}
          <b className={d.totals.p >= t.protein ? 'text-good' : 'text-ink2'}>
            {Math.round(d.totals.p)}/{t.protein} g
          </b>
          .
        </div>
      </Card>

      {/* Quick stats */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => setSheet('steps')} className="press rounded-3xl border border-line bg-card p-4 text-left">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink3">
            <Footprints size={14} /> Steps
          </div>
          <div className="mt-1 text-[22px] font-semibold leading-none">{d.steps.toLocaleString('en-IN')}</div>
          <Bar className="mt-2.5" value={d.steps} max={d.stepsTarget} height={5} />
          <div className="mt-1.5 text-[12px] text-ink3">goal {d.stepsTarget.toLocaleString('en-IN')}</div>
        </button>
        <div className="rounded-3xl border border-line bg-card p-4">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink3">
            <Droplet size={14} /> Water
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-[22px] font-semibold leading-none">{((d.day?.waterMl ?? 0) / 1000).toFixed(2).replace(/0$/, '')}</span>
            <span className="text-[13px] text-ink3">/ {t.waterMl / 1000} L</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => {
                addWater(date, 250)
                toast('+250 ml', { label: 'Undo', run: () => addWater(date, -250) })
              }}
              className="press h-8 flex-1 rounded-xl bg-acc-soft text-[13px] font-semibold text-acc"
            >
              +250
            </button>
            <button onClick={() => addWater(date, 500)} className="press h-8 flex-1 rounded-xl bg-acc-soft text-[13px] font-semibold text-acc">
              +500
            </button>
          </div>
        </div>
        <a href="#/body/weight" className="press rounded-3xl border border-line bg-card p-4">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink3">
            <Scale size={14} /> Weight
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-[22px] font-semibold leading-none">{kgNow.toFixed(1)}</span>
            <span className="text-[13px] text-ink3">kg</span>
          </div>
          <div className="mt-2 text-[12px] text-ink3">
            goal {d.profile.milestoneWeightKg ?? d.profile.goalWeightKg} kg · {Math.max(0, kgNow - (d.profile.milestoneWeightKg ?? d.profile.goalWeightKg)).toFixed(1)} to go
          </div>
        </a>
        <button onClick={() => setSheet('sleep')} className="press rounded-3xl border border-line bg-card p-4 text-left">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink3">
            <Moon size={14} /> Sleep
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-[22px] font-semibold leading-none">{d.day?.sleepH ?? '–'}</span>
            <span className="text-[13px] text-ink3">h</span>
          </div>
          <div className="mt-2 text-[12px] text-ink3">target {t.sleepHours} h</div>
        </button>
      </div>

      {/* Check-in */}
      <div className="mt-3">
        <CheckIn date={date} day={d.day} compact />
      </div>
      {(d.day?.pain ?? 0) >= 7 && !flare && (
        <Card className="mt-3 border-bad/30">
          <div className="text-[15px] font-semibold">Rough day for your back?</div>
          <div className="mt-1 text-[13.5px] text-ink3">Switch today to Flare care — gentle movement, no intensity. Movement still helps.</div>
          <Button className="mt-3" variant="soft" onClick={() => patchDay(date, { flare: true })}>
            Switch to flare care
          </Button>
        </Card>
      )}

      {/* Plan */}
      <Section title="Today's plan">
        <div className="space-y-2.5">
          {sessions.map((s) => (
            <Card key={s.id} href={s.mode === 'rest' ? '#/body/plan' : `#/body/workout/${s.id}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc-soft text-acc">
                  <Flame size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15.5px] font-semibold">{s.name}</div>
                  <div className="truncate text-[13px] text-ink3">
                    {s.mode === 'rest' ? 'Mobility + easy walk + weekly review' : `${sessionMinutes(s, d.program.phase.n)} min · ${d.program.phase.name}`}
                  </div>
                </div>
                {s.mode !== 'rest' && <Pill>Start</Pill>}
              </div>
            </Card>
          ))}
          {flare && (
            <button onClick={() => patchDay(date, { flare: false })} className="press px-1 text-[13px] font-semibold text-acc">
              Feeling better? Restore the normal plan
            </button>
          )}
          <Card href="#/body/skin">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc-soft text-acc">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15.5px] font-semibold">Skincare tonight</div>
                <div className="text-[13px] text-ink3">{TONIGHT_LABEL[skin]} · morning: vitamin C + SPF</div>
              </div>
              <ChevronRight size={18} className="text-ink3" />
            </div>
          </Card>
        </div>
      </Section>

      {/* Routine */}
      <Section title="Routine" action={<span className="text-[13px] font-semibold text-ink3">{doneCount}/{routine.length}</span>}>
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {routine.map(({ item, done, auto, detail }) => (
            <div key={item.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
              <button
                aria-label={done ? `Mark ${item.label} not done` : `Mark ${item.label} done`}
                aria-pressed={done}
                onClick={() => setCheck(date, item.id, !done)}
                className={cx('press flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2', done ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2 text-transparent')}
              >
                <Check size={16} strokeWidth={3} />
              </button>
              <button className="min-w-0 flex-1 text-left" onClick={() => item.link && go(item.link.replace(/^#/, ''))}>
                <div className={cx('flex items-center gap-1.5 text-[15px] font-medium', done && 'text-ink3 line-through decoration-1')}>
                  <span className="text-ink3">
                    <RoutineIcon name={item.icon} size={15} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="text-[12.5px] text-ink3">
                  {[item.time && fmtTime(item.time), detail, auto && done ? 'auto' : ''].filter(Boolean).join(' · ')}
                </div>
              </button>
            </div>
          ))}
        </div>
        <Bar className="mt-3" value={doneCount} max={routine.length} height={6} />
      </Section>

      {/* German */}
      <Section title="Deutsch">
        <Card className="acc-de">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-acc">Wort des Tages</div>
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[22px] font-semibold leading-tight">
                {word.art && <span className={ART_COLOR[word.art]}>{word.art} </span>}
                {word.de}
              </div>
              <div className="mt-0.5 text-[14.5px] text-ink2">{word.en}</div>
            </div>
            <button aria-label="Pronounce" onClick={() => speak(`${word.art ? word.art + ' ' : ''}${word.de}. ${word.ex[0]}`)} className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-acc-soft text-acc">
              <Volume2 size={18} />
            </button>
          </div>
          <div className="mt-2 border-l-2 border-acc/40 pl-3 text-[14px] italic text-ink2">
            {word.ex[0]}
            <div className="not-italic text-ink3">{word.ex[1]}</div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button full onClick={() => go('/deutsch/review')}>
              {due ? `Review ${due} due` : 'Learn new words'}
            </Button>
            <Button variant="outline" onClick={() => go('/deutsch/sprint')}>
              der·die·das
            </Button>
          </div>
        </Card>
      </Section>

      {/* Write */}
      <Section title="Mind">
        <Card className="acc-mind">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-acc">Prompt of the day</div>
          <div className="mt-1.5 font-serif text-[18px] leading-snug">{promptOfDay(date)}</div>
          <Button className="mt-3" variant="soft" onClick={() => go(`/mind/new?type=journal&prompt=1`)}>
            Write about it
          </Button>
        </Card>
        {pastSelf && (
          <Card className="acc-mind mt-2.5" href={`#/mind/p/${pastSelf.id}`}>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-ink3">From your past self · {fmtLong(pastSelf.date)}</div>
            <div className="mt-1.5 font-serif text-[16px] leading-relaxed text-ink2">
              {pastSelf.mood ? moodEmoji(pastSelf.mood) + ' ' : ''}
              {excerpt(pastSelf.title ? `${pastSelf.title} — ${pastSelf.body}` : pastSelf.body, 180)}
            </div>
          </Card>
        )}
        {weekday(date) === 0 && (
          <Card className="mt-2.5" href="#/me/review">
            <div className="text-[15px] font-semibold">Sunday check-in</div>
            <div className="mt-1 text-[13.5px] text-ink3">Weigh in, then look back at your week in two minutes.</div>
          </Card>
        )}
      </Section>

      <Fab label="Quick add" onClick={() => setAdd(true)}>
        <Plus size={26} />
      </Fab>
      <QuickAdd open={add} onClose={() => setAdd(false)} day={d.day} />
      <NumberSheet
        open={sheet === 'steps'}
        onClose={() => setSheet(null)}
        title="Steps today"
        unit="steps"
        accent="body"
        initial={d.day?.steps}
        hint="Copy today's count from your phone's health app."
        presets={[3000, 5000, 7000, 8000, 10000].map((v) => ({ label: v.toLocaleString('en-IN'), value: v }))}
        onSave={(v) => patchDay(date, { steps: v })}
      />
      <NumberSheet
        open={sheet === 'sleep'}
        onClose={() => setSheet(null)}
        title="Sleep last night"
        unit="hours"
        decimals={1}
        initial={d.day?.sleepH}
        presets={[5, 6, 6.5, 7, 7.5, 8].map((v) => ({ label: `${v} h`, value: v }))}
        onSave={(v) => patchDay(date, { sleepH: v })}
      />
    </Page>
  )
}
