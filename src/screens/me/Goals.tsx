import { Check, Plus, Trash } from 'lucide-react'
import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Bar, Button, Card, Chips, Empty, Field, Page, Pill, cx } from '../../components/ui'
import { useWeightNow } from '../../lib/app'
import { diffDays, dkey, fmtLong } from '../../lib/date'
import { patch, put, remove, useColl } from '../../lib/store'
import type { Goal } from '../../lib/types'

const AREAS: { value: Goal['area']; label: string; emoji: string }[] = [
  { value: 'body', label: 'Body', emoji: '💪' },
  { value: 'health', label: 'Health', emoji: '🩺' },
  { value: 'german', label: 'German', emoji: '🇩🇪' },
  { value: 'book', label: 'Book', emoji: '📖' },
  { value: 'mind', label: 'Mind', emoji: '🧠' },
  { value: 'life', label: 'Life', emoji: '🌱' },
]
const EMOJI = Object.fromEntries(AREAS.map((a) => [a.value, a.emoji]))

export default function Goals() {
  const goals = useColl<Goal>('goals').sort((a, b) => Number(!!a.done) - Number(!!b.done) || a.createdAt - b.createdAt)
  const kg = useWeightNow()
  const [edit, setEdit] = useState<Partial<Goal> | null>(null)
  const today = dkey()

  function progress(g: Goal): number | null {
    if (g.metric === 'weight' && g.start !== undefined && g.target !== undefined) return Math.max(0, Math.min(1, (g.start - kg) / (g.start - g.target)))
    if (g.milestones?.length) return g.milestones.filter((m) => m.done).length / g.milestones.length
    return null
  }

  return (
    <Page accent="me" back="/me" title="Goals" actions={<Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => setEdit({ area: 'life', milestones: [] })}>New</Button>}>
      <div className="mt-1 space-y-3">
        {goals.map((g) => {
          const p = progress(g)
          return (
            <Card key={g.id} className={g.done ? 'opacity-60' : ''}>
              <div className="flex items-start gap-3">
                <span className="text-[24px] leading-none">{EMOJI[g.area]}</span>
                <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(g)}>
                  <div className={cx('text-[16px] font-semibold leading-snug', g.done && 'line-through')}>{g.title}</div>
                  {g.why && <div className="mt-0.5 text-[13px] text-ink3">{g.why}</div>}
                  {g.due && (
                    <div className="mt-1 text-[12.5px] text-ink3">
                      by {fmtLong(g.due)} · {diffDays(g.due, today) >= 0 ? `${diffDays(g.due, today)} days left` : 'past due'}
                    </div>
                  )}
                </button>
                {g.done && <Pill tone="good">done</Pill>}
              </div>
              {p !== null && (
                <div className="mt-3">
                  <Bar value={p} max={1} />
                  <div className="mt-1 text-[12px] text-ink3">
                    {g.metric === 'weight' ? `${kg.toFixed(1)} kg now · target ${g.target} kg` : `${Math.round(p * 100)}%`}
                  </div>
                </div>
              )}
              {!!g.milestones?.length && (
                <div className="mt-3 space-y-1.5">
                  {g.milestones.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => patch<Goal>('goals', g.id, { milestones: g.milestones!.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })}
                      className="press flex w-full items-center gap-2.5 text-left"
                    >
                      <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2', m.done ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2')}>
                        {m.done && <Check size={12} strokeWidth={3.5} />}
                      </span>
                      <span className={cx('text-[14px]', m.done && 'text-ink3 line-through')}>{m.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
        {!goals.length && <Empty title="No goals yet" body="Name what you are working toward — then break it into milestones you can tick off." />}
      </div>
      <GoalSheet goal={edit} onClose={() => setEdit(null)} />
      <p className="mt-6 px-1 text-[12.5px] text-ink3">Weight goals update automatically from your weigh-in trend.</p>
    </Page>
  )
}

function GoalSheet({ goal, onClose }: { goal: Partial<Goal> | null; onClose: () => void }) {
  const [g, setG] = useState<Partial<Goal> | null>(null)
  const [ms, setMs] = useState('')
  const [src, setSrc] = useState<Partial<Goal> | null>(null)
  if (goal !== src) {
    setSrc(goal)
    setG(goal)
    setMs((goal?.milestones ?? []).map((m) => m.text).join('\n'))
  }
  if (!goal || !g) return null
  function save() {
    if (!g?.title?.trim()) return toast('Name the goal')
    const lines = ms.split('\n').map((l) => l.trim()).filter(Boolean)
    const old = g.milestones ?? []
    put<Goal>('goals', {
      ...(g as Goal),
      title: g.title.trim(),
      createdAt: g.createdAt ?? Date.now(),
      milestones: lines.map((text) => ({ text, done: old.find((o) => o.text === text)?.done ?? false })),
    })
    setG(null)
    onClose()
  }
  return (
    <Sheet
      open
      onClose={() => {
        setG(null)
        onClose()
      }}
      title={g.id ? 'Edit goal' : 'New goal'}
      accent="me"
      full
      footer={
        <div className="flex gap-2">
          {g.id && (
            <Button
              variant="danger"
              icon={<Trash size={16} />}
              onClick={() => {
                remove('goals', g.id!)
                setG(null)
                onClose()
              }}
            >
              Delete
            </Button>
          )}
          {g.id && (
            <Button variant="outline" onClick={() => setG({ ...g, done: !g.done })}>
              {g.done ? 'Reopen' : 'Mark done'}
            </Button>
          )}
          <Button full onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-4">
        <Field label="Goal">
          <input className="field text-[17px] font-semibold" value={g.title ?? ''} onChange={(e) => setG({ ...g, title: e.target.value })} placeholder="Reach B1 German" />
        </Field>
        <Field label="Area">
          <Chips options={AREAS.map((a) => ({ value: a.value, label: `${a.emoji} ${a.label}` }))} value={g.area ?? 'life'} onChange={(a) => setG({ ...g, area: a })} />
        </Field>
        <Field label="Why it matters">
          <input className="field" value={g.why ?? ''} onChange={(e) => setG({ ...g, why: e.target.value })} />
        </Field>
        <Field label="By when (optional)">
          <input type="date" className="field" value={g.due ?? ''} onChange={(e) => setG({ ...g, due: e.target.value || undefined })} />
        </Field>
        <Field label="Milestones" hint="One per line — tick them off as you go.">
          <textarea rows={5} className="field" value={ms} onChange={(e) => setMs(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  )
}
