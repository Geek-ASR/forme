import { ArrowUpRight, ClipboardCopy, Clock, Plus, Repeat2, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Button, Card, Chips, Empty, Fab, Field, Page, Section, cx } from '../../components/ui'
import { useSettings } from '../../lib/app'
import { dkey, fmtLong, lastNDays } from '../../lib/date'
import { excerpt } from '../../lib/md'
import { go } from '../../lib/router'
import { put, useColl } from '../../lib/store'
import type { HBook, HKind, HybridNote, WritingSession } from '../../lib/types'
import { BOOK_ORDER, KINDS, KIND_LABEL, STATUS_TONE, exportIdeas, useBooks } from './common'

export function StatusPill({ s }: { s: string }) {
  return <span className={cx('inline-flex rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-bold tracking-wide', STATUS_TONE[s] ?? 'bg-card2 text-ink3')}>{s}</span>
}

export default function Hybrid() {
  const notes = useColl<HybridNote>('hybrid').filter((n) => n.kind !== 'loop')
  const sessions = useColl<WritingSession>('sessions')
  const settings = useSettings()
  const books = useBooks()
  const [book, setBook] = useState<'all' | HBook>('all')
  const [kind, setKind] = useState<'all' | HKind>('all')
  const [capture, setCapture] = useState('')
  const [logOpen, setLogOpen] = useState(false)

  const inBook = (n: HybridNote) => book === 'all' || n.book === book
  const world = notes.filter((n) => (n.kind === 'world' || n.kind === 'character') && n.pinned && inBook(n))
  const questions = notes.filter((n) => n.status === 'UNRESOLVED' && inBook(n))
  const inbox = notes.filter((n) => n.kind === 'idea' && ['NEW', 'EXPLORING', 'PROPOSED'].includes(n.status) && inBook(n))
  const unexported = inbox.filter((n) => !n.exported)
  const all = useMemo(
    () => notes.filter((n) => inBook(n) && (kind === 'all' || n.kind === kind)).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes, book, kind],
  )
  const week = new Set(lastNDays(7))
  const weekMin = sessions.filter((s) => week.has(s.date)).reduce((a, s) => a + s.minutes, 0)
  const weekWords = sessions.filter((s) => week.has(s.date)).reduce((a, s) => a + s.words, 0)

  function quickCapture() {
    const text = capture.trim()
    if (!text) return
    const [first, ...rest] = text.split('\n')
    put<HybridNote>('hybrid', {
      kind: 'idea',
      book: book === 'all' ? 'b1' : book,
      status: 'NEW',
      title: first.length > 90 ? first.slice(0, 87) + '…' : first,
      body: first.length > 90 ? text : rest.join('\n').trim() || undefined,
      createdAt: Date.now(),
    })
    setCapture('')
    toast('Idea captured in the inbox ✨')
  }

  function exportInbox() {
    if (!unexported.length) return toast('No new ideas to export')
    const { md } = exportIdeas(unexported, settings.hybrid?.nextIdea ?? 1)
    navigator.clipboard?.writeText(md).then(
      () => toast(`${unexported.length} idea${unexported.length > 1 ? 's' : ''} copied in IDEAS_INBOX format`),
      () => toast('Could not copy'),
    )
  }

  return (
    <Page accent="hybrid" back="/mind" title="The Hybrid World">
      <div className="starfield mt-1 overflow-hidden rounded-3xl p-5">
        <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-hero-gold">Writer's notebook</div>
        <div className="font-display mt-1 text-[30px] font-semibold leading-tight">The Hybrid World</div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-hero-ink2">
          <span>{notes.length} notes</span>
          <span>{questions.length} unresolved</span>
          <span>{inbox.length} ideas in inbox</span>
        </div>
        <div className="mt-4 rounded-2xl bg-[#fff4de]/10 p-1.5 backdrop-blur">
          <textarea
            rows={2}
            value={capture}
            onChange={(e) => setCapture(e.target.value)}
            placeholder="Capture an idea before it disappears…"
            className="w-full resize-none bg-transparent px-2.5 py-1.5 font-serif text-[16px] text-hero-ink outline-none placeholder:text-hero-ink/50"
            aria-label="Capture an idea"
          />
          <div className="flex justify-end">
            <button onClick={quickCapture} disabled={!capture.trim()} className="press flex items-center gap-1.5 rounded-xl bg-hero-gold px-3 py-1.5 text-[13px] font-bold text-[#22170f] disabled:opacity-40">
              <Send size={14} /> Capture
            </button>
          </div>
        </div>
      </div>

      <Chips
        className="mt-4"
        options={[{ value: 'all' as const, label: 'All books' }, ...BOOK_ORDER.map((b) => ({ value: b, label: books[b] }))]}
        value={book}
        onChange={setBook}
      />

      {world.length > 0 && (
        <Section title="World at a glance">
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {world.map((n) => (
              <a key={n.id} href={`#/hybrid/n/${n.id}`} className="press w-60 shrink-0 rounded-3xl border border-line bg-card p-4">
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-acc">
                  {KIND_LABEL[n.kind]} · {books[n.book]}
                </div>
                <div className="mt-1 text-[16px] font-semibold leading-snug">{n.title}</div>
                <div className="mt-1 line-clamp-4 text-[13px] leading-relaxed text-ink2">{excerpt(n.body ?? '', 160)}</div>
              </a>
            ))}
          </div>
        </Section>
      )}

      <Section title="Tools">
        <div className="grid grid-cols-2 gap-2.5">
          <Card href="#/hybrid/loop">
            <Repeat2 size={20} className="text-acc" />
            <div className="mt-2 text-[15px] font-semibold">Mirror outline</div>
            <div className="text-[12.5px] text-ink3">Chapter titles that return, changed</div>
          </Card>
          <Card onClick={() => setLogOpen(true)}>
            <Clock size={20} className="text-acc" />
            <div className="mt-2 text-[15px] font-semibold">Writing session</div>
            <div className="text-[12.5px] text-ink3">
              This week: {weekMin} min · {weekWords.toLocaleString('en-IN')} words
            </div>
          </Card>
        </div>
      </Section>

      {questions.length > 0 && (
        <Section title={`Unresolved · ${questions.length}`}>
          <div className="overflow-hidden rounded-3xl border border-line bg-card">
            {questions.slice(0, 8).map((n) => (
              <a key={n.id} href={`#/hybrid/n/${n.id}`} className="press flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                {n.ref && <span className="mt-0.5 shrink-0 font-mono text-[12px] font-bold text-acc">{n.ref}</span>}
                <span className="min-w-0 flex-1 text-[14.5px] leading-snug">{n.title}</span>
                <ArrowUpRight size={16} className="mt-0.5 shrink-0 text-ink3" />
              </a>
            ))}
            {questions.length > 8 && (
              <button onClick={() => setKind('question')} className="press w-full py-2.5 text-[13.5px] font-semibold text-acc">
                See all {questions.length}
              </button>
            )}
          </div>
        </Section>
      )}

      <Section
        title={`Ideas inbox · ${inbox.length}`}
        action={
          <button onClick={exportInbox} className="press flex items-center gap-1 text-[13.5px] font-semibold text-acc">
            <ClipboardCopy size={15} /> Export {unexported.length || ''}
          </button>
        }
      >
        {inbox.length ? (
          <div className="space-y-2">
            {inbox.slice(0, 6).map((n) => (
              <NoteCard key={n.id} n={n} book={books[n.book]} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line2 px-4 py-5 text-center text-[13.5px] text-ink3">
            Captured ideas wait here. “Export” copies them in your IDEAS_INBOX.md format, numbered from I-{String(settings.hybrid?.nextIdea ?? 1).padStart(3, '0')}.
          </div>
        )}
      </Section>

      <Section title="All notes">
        <Chips options={[{ value: 'all' as const, label: 'All' }, ...KINDS.map((k) => ({ value: k.value, label: k.label }))]} value={kind} onChange={setKind} />
        <div className="mt-3 space-y-2">
          {all.map((n) => (
            <NoteCard key={n.id} n={n} book={books[n.book]} />
          ))}
          {!all.length && <Empty title="No notes here yet" body="Ideas, questions, characters, scenes, lines of dialogue — capture them as they come." />}
        </div>
      </Section>

      <Fab label="New note" onClick={() => go(`/hybrid/new${book !== 'all' ? `?book=${book}` : ''}`)}>
        <Plus size={26} />
      </Fab>
      <SessionSheet open={logOpen} onClose={() => setLogOpen(false)} />
    </Page>
  )
}

export function NoteCard({ n, book }: { n: HybridNote; book: string }) {
  return (
    <a href={`#/hybrid/n/${n.id}`} className="press block rounded-3xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink3">
        <StatusPill s={n.status} />
        <span>{KIND_LABEL[n.kind]}</span>
        <span>·</span>
        <span>{book}</span>
        {n.ref && <span className="font-mono font-bold text-acc">{n.ref}</span>}
        <span className="flex-1" />
        <span>{fmtLong(new Date(n.createdAt).toISOString().slice(0, 10))}</span>
      </div>
      <div className="mt-1.5 text-[15.5px] font-semibold leading-snug">{n.title}</div>
      {n.body && <div className="mt-1 font-serif text-[14.5px] leading-relaxed text-ink2">{excerpt(n.body, 140)}</div>}
    </a>
  )
}

function SessionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [minutes, setMinutes] = useState('30')
  const [words, setWords] = useState('')
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log a writing session"
      accent="hybrid"
      footer={
        <Button
          full
          size="lg"
          onClick={() => {
            put<WritingSession>('sessions', { date: dkey(), project: 'hybrid', minutes: Number(minutes) || 0, words: Number(words) || 0 })
            toast('Writing session logged ✍️')
            setWords('')
            onClose()
          }}
        >
          Save
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 pb-2">
        <Field label="Minutes">
          <input inputMode="numeric" className="field num" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="Words (roughly)">
          <input inputMode="numeric" className="field num" value={words} onChange={(e) => setWords(e.target.value.replace(/\D/g, ''))} placeholder="0" />
        </Field>
      </div>
    </Sheet>
  )
}
