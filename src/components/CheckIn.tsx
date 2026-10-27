import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { patchDay } from '../lib/app'
import type { Day } from '../lib/types'
import { moodEmoji } from './charts'
import { Card, Pill, Slider, Stepper, cx } from './ui'

const MOODS = [1, 2, 3, 4, 5]
const MOOD_WORD = ['', 'Rough', 'Low', 'Okay', 'Good', 'Great']
const STIFF = [0, 15, 30, 60, 90, 120]

/** Daily check-in: mood, energy, pain, morning stiffness, sleep. Tracks how the spine and mind are doing. */
export function CheckIn({ date, day, compact }: { date: string; day?: Day; compact?: boolean }) {
  const [editing, setEditing] = useState(false)
  const done = !!day?.mood
  if (done && !editing && compact) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold">Check-in</div>
          <button aria-label="Edit check-in" onClick={() => setEditing(true)} className="press -mr-1 p-1.5 text-ink3">
            <Pencil size={16} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Pill tone="muted">
            {moodEmoji(day.mood)} {MOOD_WORD[day.mood ?? 0]}
          </Pill>
          {day.energy !== undefined && <Pill tone="muted">Energy {day.energy}/5</Pill>}
          {day.pain !== undefined && <Pill tone={day.pain >= 7 ? 'bad' : 'muted'}>Pain {day.pain}/10</Pill>}
          {day.stiffMin !== undefined && <Pill tone="muted">Stiff {day.stiffMin >= 120 ? '2h+' : `${day.stiffMin} min`}</Pill>}
          {day.sleepH !== undefined && <Pill tone="muted">Slept {day.sleepH} h</Pill>}
          {day.pain === undefined && (
            <button onClick={() => setEditing(true)} className="press text-[12.5px] font-semibold text-acc">
              + pain &amp; stiffness
            </button>
          )}
        </div>
      </Card>
    )
  }
  return (
    <Card>
      <div className="text-[15px] font-semibold">{done ? 'Update your check-in' : 'How are you today?'}</div>
      <div className="mt-3 flex justify-between">
        {MOODS.map((m) => (
          <button
            key={m}
            aria-label={MOOD_WORD[m]}
            aria-pressed={day?.mood === m}
            onClick={() => {
              // first answer of the day: keep going to pain and stiffness — today's workout adapts to them
              if (!done) setEditing(true)
              patchDay(date, { mood: m })
            }}
            className={cx('press flex h-14 w-14 flex-col items-center justify-center rounded-2xl text-[26px]', day?.mood === m ? 'bg-acc-soft ring-2 ring-acc' : 'bg-card2')}
          >
            {moodEmoji(m)}
          </button>
        ))}
      </div>
      {(done || !compact) && (
        <div className="mt-5 space-y-5">
          <div>
            <div className="mb-1 flex justify-between text-[13.5px]">
              <span className="font-semibold text-ink2">Energy</span>
              <span className="num text-ink3">{day?.energy ?? '–'}/5</span>
            </div>
            <Slider label="Energy" min={1} max={5} value={day?.energy ?? 3} onChange={(v) => patchDay(date, { energy: v })} left="drained" right="charged" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[13.5px]">
              <span className="font-semibold text-ink2">Back / joint pain</span>
              <span className={cx('num', (day?.pain ?? 0) >= 7 ? 'font-semibold text-bad' : 'text-ink3')}>{day?.pain ?? '–'}/10</span>
            </div>
            <Slider label="Pain" min={0} max={10} value={day?.pain ?? 0} onChange={(v) => patchDay(date, { pain: v })} left="none" right="worst" />
          </div>
          <div>
            <div className="mb-2 text-[13.5px] font-semibold text-ink2">Morning stiffness</div>
            <div className="flex flex-wrap gap-2">
              {STIFF.map((s) => (
                <button
                  key={s}
                  onClick={() => patchDay(date, { stiffMin: s })}
                  aria-pressed={day?.stiffMin === s}
                  className={cx('press h-9 rounded-full border px-3 text-[13.5px] font-medium', day?.stiffMin === s ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2 bg-card text-ink2')}
                >
                  {s === 0 ? 'None' : s >= 120 ? '2h+' : `${s} min`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13.5px] font-semibold text-ink2">Sleep last night</div>
              <div className="text-[12.5px] text-ink3">hours</div>
            </div>
            <Stepper value={day?.sleepH ?? 7} step={0.5} min={0} max={14} onChange={(v) => patchDay(date, { sleepH: v })} format={(v) => `${v} h`} />
          </div>
          {compact && (
            <button onClick={() => setEditing(false)} className="press w-full rounded-2xl bg-card2 py-2.5 text-[14px] font-semibold text-ink2">
              Done
            </button>
          )}
        </div>
      )}
    </Card>
  )
}
