import { Lock, Mail, MailOpen, Plus } from 'lucide-react'
import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Button, Card, Chips, Empty, Field, Page, Section } from '../../components/ui'
import { useProfile } from '../../lib/app'
import { addDays, diffDays, dkey, fmtLong } from '../../lib/date'
import { renderMarkdown } from '../../lib/md'
import { patch, put, useColl } from '../../lib/store'
import type { Letter } from '../../lib/types'

export default function Letters() {
  const letters = useColl<Letter>('letters').sort((a, b) => (a.openOn < b.openOn ? -1 : 1))
  const [writing, setWriting] = useState(false)
  const [reading, setReading] = useState<Letter | null>(null)
  const today = dkey()
  const ready = letters.filter((l) => l.openOn <= today)
  const sealed = letters.filter((l) => l.openOn > today)

  return (
    <Page accent="me" back="/me" title="Letters" actions={<Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => setWriting(true)}>Write</Button>}>
      <p className="mt-1 px-1 text-[14px] leading-relaxed text-ink2">
        Write to the person you will be. The letter stays sealed until the day you choose — then it appears on your Today screen.
      </p>
      {ready.length > 0 && (
        <Section title="Ready to open">
          <div className="space-y-2.5">
            {ready.map((l) => (
              <Card
                key={l.id}
                onClick={() => {
                  setReading(l)
                  if (!l.opened) patch<Letter>('letters', l.id, { opened: true })
                }}
              >
                <div className="flex items-center gap-3">
                  {l.opened ? <MailOpen size={20} className="text-ink3" /> : <Mail size={20} className="text-acc" />}
                  <div className="flex-1">
                    <div className="text-[15.5px] font-semibold">{l.title || 'A letter to myself'}</div>
                    <div className="text-[12.5px] text-ink3">
                      written {fmtLong(l.writtenOn)} · {l.opened ? 'opened' : 'new'}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}
      <Section title="Sealed">
        {sealed.length ? (
          <div className="space-y-2.5">
            {sealed.map((l) => (
              <Card key={l.id}>
                <div className="flex items-center gap-3">
                  <Lock size={18} className="text-ink3" />
                  <div className="flex-1">
                    <div className="text-[15.5px] font-semibold">{l.title || 'A letter to myself'}</div>
                    <div className="text-[12.5px] text-ink3">
                      opens {fmtLong(l.openOn)} · in {diffDays(l.openOn, today)} days
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty icon={<Mail size={24} />} title="No sealed letters" body="What do you hope is true by the end of this plan? Write it down and find out." action={<Button onClick={() => setWriting(true)}>Write a letter</Button>} />
        )}
      </Section>
      <Write open={writing} onClose={() => setWriting(false)} />
      <Sheet open={!!reading} onClose={() => setReading(null)} title={reading?.title || 'A letter to myself'} accent="me" full>
        {reading && (
          <>
            <div className="text-[13px] text-ink3">Written {fmtLong(reading.writtenOn)}</div>
            <div className="prose-forme mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(reading.body) }} />
          </>
        )}
      </Sheet>
    </Page>
  )
}

function Write({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useProfile()
  const today = dkey()
  const presets = [
    { value: addDays(today, 30), label: '1 month' },
    { value: profile.milestoneDate ?? addDays(today, 120), label: 'End of the plan' },
    { value: addDays(today, 182), label: '6 months' },
    { value: addDays(today, 365), label: '1 year' },
  ]
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [openOn, setOpenOn] = useState(presets[1].value)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Letter to future me"
      accent="me"
      full
      footer={
        <Button
          full
          size="lg"
          disabled={!body.trim()}
          onClick={() => {
            put<Letter>('letters', { title: title.trim() || undefined, body: body.trim(), writtenOn: today, openOn })
            toast(`Sealed until ${fmtLong(openOn)} ✉️`)
            setTitle('')
            setBody('')
            onClose()
          }}
        >
          Seal until {fmtLong(openOn)}
        </Button>
      }
    >
      <div className="space-y-4 pb-4">
        <Field label="Open on">
          <Chips options={presets} value={openOn} onChange={setOpenOn} />
          <input type="date" className="field mt-2" min={addDays(today, 1)} value={openOn} onChange={(e) => e.target.value && setOpenOn(e.target.value)} />
        </Field>
        <Field label="Title (optional)">
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dear future me…" />
        </Field>
        <textarea rows={12} className="field font-serif text-[16.5px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Right now I am… I hope that by the time you read this…" aria-label="Letter" />
      </div>
    </Sheet>
  )
}
