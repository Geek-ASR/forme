import { ClipboardCopy, Pill as PillIcon, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CheckIn } from '../../components/CheckIn'
import { Columns } from '../../components/charts'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Button, Card, Page, Pill, Section, Slider, Stat } from '../../components/ui'
import { patchDay, useByDate, useProfile } from '../../lib/app'
import { basdai } from '../../lib/calc'
import { dkey, dowShort, fmtLong, fmtRel, hm, lastNDays, weekday } from '../../lib/date'
import { put, remove, useColl, useDoc } from '../../lib/store'
import type { Basdai, Day, MedLog } from '../../lib/types'

const QUESTIONS = [
  'Overall level of fatigue or tiredness',
  'Overall level of neck, back or hip pain',
  'Pain or swelling in joints other than neck, back or hips',
  'Discomfort from areas tender to touch or pressure',
  'Overall level of morning stiffness from when you wake up',
  'How long morning stiffness lasts (0 = none, 10 = 2 hours or more)',
]

const FLARE = [
  'Switch today to Flare care — rest from intensity, not from movement.',
  'Heat: a warm shower or hot-water bag on the stiff area for 15–20 minutes.',
  'Get up and move gently every 45–60 minutes; stillness makes stiffness worse.',
  'Keep logging pain and stiffness — patterns show up within a few weeks.',
  'Take medicines only as prescribed. Needing painkillers most days is a reason to review treatment.',
  'A flare that lasts more than a few days, or new symptoms, means call your rheumatologist.',
]

const SLEEP = [
  'A firm, supportive mattress; a thin pillow (or none) so your neck stays straight.',
  'Sleep on your back or front rather than curled up — it protects your posture over years.',
  'A warm shower and five minutes of gentle stretching before bed loosen night stiffness.',
  'Same bedtime and wake time every day, screens away 30 minutes before.',
  'Night pain that wakes you regularly is worth mentioning to your doctor — it is a disease-activity signal.',
]

const RED_FLAGS = [
  ['Eye pain, redness, light sensitivity or blurred vision', 'Could be uveitis — get an eye exam the same day.'],
  ['Numbness, weakness or tingling in the legs, or loss of bladder/bowel control', 'Emergency — go to hospital.'],
  ['Sudden severe back or neck pain after a fall or jolt', 'Stiff spines fracture more easily — get it checked.'],
  ['Chest pain or breathlessness', 'Needs prompt medical review.'],
  ['Fever with back pain, persistent diarrhoea or blood in stool, unexplained weight loss', 'See your doctor soon.'],
]

export default function Spine() {
  const date = dkey()
  const { profile } = useProfile()
  const day = useDoc<Day>('days', date)
  const days = useColl<Day>('days')
  const scores = useColl<Basdai>('basdai').sort((a, b) => (a.date < b.date ? -1 : 1))
  const medsBy = useByDate<MedLog>('meds')
  const [quiz, setQuiz] = useState(false)
  const byDate = useMemo(() => new Map(days.map((d) => [d.id, d])), [days])
  const last14 = lastNDays(14)
  const painCols = last14.map((k) => ({ key: k, label: dowShort(weekday(k)).slice(0, 2), value: byDate.get(k)?.pain ?? 0, tip: `${fmtRel(k)} · stiffness ${byDate.get(k)?.stiffMin ?? '–'} min` }))
  const logged = last14.map((k) => byDate.get(k)).filter((d): d is Day => d?.pain !== undefined)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const painAvg = avg(logged.map((d) => d.pain!))
  const stiffAvg = avg(last14.map((k) => byDate.get(k)?.stiffMin).filter((v): v is number => v !== undefined))
  const lastScore = scores[scores.length - 1]
  const meds = profile.medications ?? []
  const medHistory = lastNDays(14)
    .reverse()
    .flatMap((k) => (medsBy.get(k) ?? []).map((m) => ({ ...m })))

  function summary() {
    const d30 = lastNDays(30).map((k) => byDate.get(k)).filter(Boolean) as Day[]
    const a = (f: (d: Day) => number | undefined) => {
      const v = d30.map(f).filter((x): x is number => x !== undefined)
      return v.length ? (v.reduce((s, x) => s + x, 0) / v.length).toFixed(1) : '–'
    }
    const medCount = lastNDays(30).reduce((s, k) => s + (medsBy.get(k)?.length ?? 0), 0)
    const text = [
      `Symptom summary — last 30 days (to ${fmtLong(date)})`,
      `Average pain: ${a((d) => d.pain)}/10 · morning stiffness: ${a((d) => d.stiffMin)} min · sleep: ${a((d) => d.sleepH)} h`,
      `Days with pain ≥ 7: ${d30.filter((d) => (d.pain ?? 0) >= 7).length} · flare days: ${d30.filter((d) => d.flare).length}`,
      `BASDAI: ${scores.slice(-6).map((s) => `${s.score} (${s.date})`).join(', ') || 'not recorded'}`,
      `Pain medication doses logged: ${medCount}`,
    ].join('\n')
    navigator.clipboard?.writeText(text).then(
      () => toast('Summary copied — paste it into a note for your doctor'),
      () => toast('Could not copy'),
    )
  }

  return (
    <Page accent="body" back="/body" title="Spine care">
      <div className="mt-1">
        <CheckIn date={date} day={day} />
      </div>
      <div className="mt-3 flex items-center justify-between rounded-3xl border border-line bg-card px-4 py-3">
        <div>
          <div className="text-[15px] font-semibold">Flare mode today</div>
          <div className="text-[12.5px] text-ink3">Swaps the workout for gentle flare care</div>
        </div>
        <Button size="sm" variant={day?.flare ? 'primary' : 'outline'} onClick={() => patchDay(date, { flare: !day?.flare })}>
          {day?.flare ? 'On' : 'Off'}
        </Button>
      </div>

      <Section title="Pain · last 14 days">
        <Card>
          <div className="mb-2 flex gap-4 text-[13px] text-ink3">
            <span>
              avg pain <b className="text-ink">{painAvg?.toFixed(1) ?? '–'}</b>/10
            </span>
            <span>
              avg stiffness <b className="text-ink">{stiffAvg !== null ? Math.round(stiffAvg) : '–'}</b> min
            </span>
          </div>
          <Columns data={painCols} highlight={date} unit="/ 10" label="Pain scores for the last 14 days" color="var(--s1)" />
        </Card>
      </Section>

      <Section title="BASDAI · weekly">
        <Card>
          <div className="flex items-center gap-4">
            <Stat className="flex-1 border-0 p-0" label={lastScore ? `Last: ${fmtRel(lastScore.date)}` : 'No score yet'} value={lastScore ? lastScore.score.toFixed(1) : '–'} unit="/ 10" />
            <Button onClick={() => setQuiz(true)}>Take it</Button>
          </div>
          {lastScore && (
            <div className="mt-3">
              {lastScore.score >= 4 ? <Pill tone="bad">≥ 4 — suggests active disease; discuss with your rheumatologist</Pill> : <Pill tone="good">Below 4 — lower disease activity</Pill>}
            </div>
          )}
          {scores.length > 1 && (
            <div className="mt-4">
              <Columns
                data={scores.slice(-12).map((s) => ({ key: s.id, label: s.date.slice(5).replace('-', '/'), value: s.score, tip: fmtLong(s.date) }))}
                target={4}
                unit="BASDAI"
                label="BASDAI scores over time"
                color="var(--s1)"
              />
            </div>
          )}
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink3">
            Six questions about the past week, the standard measure rheumatologists use. Taking it every Sunday turns “I feel worse lately” into a trend you can show your doctor.
          </p>
        </Card>
      </Section>

      <Section title="Medication">
        <Card>
          {meds.length ? (
            <div className="space-y-2">
              {meds.map((m) => (
                <div key={m.name} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium">{m.name}</div>
                    {m.note && <div className="text-[12.5px] text-ink3">{m.note}</div>}
                  </div>
                  <Button
                    size="sm"
                    variant="soft"
                    icon={<PillIcon size={15} />}
                    onClick={() => {
                      const r = put<MedLog>('meds', { date, time: hm(), name: m.name })
                      toast(`Logged ${m.name}`, { label: 'Undo', run: () => remove('meds', r.id) })
                    }}
                  >
                    Took it
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[14px] text-ink3">Add your medicines in Me → Profile to log doses with one tap.</div>
          )}
          {medHistory.length > 0 && (
            <div className="mt-3 border-t border-line pt-3 text-[13px] text-ink2">
              {medHistory.slice(0, 8).map((m) => (
                <div key={m.id} className="flex justify-between py-0.5">
                  <span>{m.name}</span>
                  <span className="text-ink3">
                    {fmtRel(m.date)} · {m.time}
                  </span>
                </div>
              ))}
              <div className="mt-1 text-ink3">
                {medHistory.length} dose{medHistory.length === 1 ? '' : 's'} in 14 days
              </div>
            </div>
          )}
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink3">Only take medicines as prescribed. If you need painkillers most days, ask your rheumatologist about treatment options rather than pushing through.</p>
        </Card>
      </Section>

      <Section title="When it flares">
        <Card>
          <ol className="list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink2">
            {FLARE.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ol>
        </Card>
      </Section>

      <Section title="Sleep that helps the spine">
        <Card>
          <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink2">
            {SLEEP.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section title="Get help promptly if">
        <Card className="border-bad/30">
          <div className="space-y-2.5">
            {RED_FLAGS.map(([t, d]) => (
              <div key={t} className="flex gap-2.5">
                <TriangleAlert size={17} className="mt-0.5 shrink-0 text-bad" />
                <div className="text-[14px] leading-snug">
                  <b>{t}.</b> <span className="text-ink2">{d}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Doctor visit">
        <Card>
          <p className="text-[14px] leading-relaxed text-ink2">Copy a 30-day summary of pain, stiffness, sleep, BASDAI and medication — so the appointment is about data, not memory.</p>
          <Button className="mt-3" variant="soft" icon={<ClipboardCopy size={16} />} onClick={summary}>
            Copy summary
          </Button>
        </Card>
      </Section>

      <BasdaiSheet open={quiz} onClose={() => setQuiz(false)} />
      <p className="mt-6 px-1 text-[12px] leading-relaxed text-ink3">Forme helps you track and notice patterns. It is not medical advice — your rheumatologist knows your case.</p>
    </Page>
  )
}

function BasdaiSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState<number[]>([5, 5, 3, 3, 5, 5])
  const score = basdai(q)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="BASDAI · the past week"
      accent="body"
      full
      footer={
        <Button
          full
          size="lg"
          onClick={() => {
            const date = dkey()
            put<Basdai>('basdai', { id: `bd-${date}`, date, q, score })
            toast(`BASDAI saved: ${score}`)
            onClose()
          }}
        >
          Save · score {score.toFixed(1)}
        </Button>
      }
    >
      <div className="space-y-6 pb-4">
        {QUESTIONS.map((text, i) => (
          <div key={i}>
            <div className="mb-1 flex justify-between gap-3 text-[14.5px]">
              <span className="font-medium">
                {i + 1}. {text}
              </span>
              <span className="num shrink-0 font-semibold text-acc">{q[i]}</span>
            </div>
            <Slider
              label={text}
              min={0}
              max={10}
              step={i === 5 ? 2.5 : 1}
              value={q[i]}
              onChange={(v) => setQ(q.map((x, j) => (j === i ? v : x)))}
              left={i === 5 ? '0 h' : 'none'}
              right={i === 5 ? '2 h+' : 'very severe'}
            />
          </div>
        ))}
      </div>
    </Sheet>
  )
}
