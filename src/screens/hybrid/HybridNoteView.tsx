import { ClipboardCopy, Pencil, Pin, Trash } from 'lucide-react'
import { useState } from 'react'
import { toast } from '../../components/Toasts'
import { Button, Card, Empty, IconButton, Page, Section } from '../../components/ui'
import { dkey, fmtLong } from '../../lib/date'
import { renderMarkdown } from '../../lib/md'
import { back, go } from '../../lib/router'
import { patch, put, remove, useDoc } from '../../lib/store'
import type { HybridNote } from '../../lib/types'
import { StatusPill } from './Hybrid'
import { KIND_LABEL, noteMarkdown, statusesFor, useBooks } from './common'

export default function HybridNoteView({ id }: { id: string }) {
  const n = useDoc<HybridNote>('hybrid', id)
  const books = useBooks()
  const [thought, setThought] = useState('')
  if (!n)
    return (
      <Page accent="hybrid" back="/hybrid" title="">
        <Empty title="Note not found" />
      </Page>
    )

  function addThought() {
    if (!thought.trim()) return
    patch<HybridNote>('hybrid', n!.id, { body: `${(n!.body ?? '').trim()}\n\n**${fmtLong(dkey())}** — ${thought.trim()}`.trim(), exported: false })
    setThought('')
    toast('Added to the note')
  }

  return (
    <Page
      accent="hybrid"
      back="/hybrid"
      title={KIND_LABEL[n.kind]}
      actions={
        <>
          <IconButton label={n.pinned ? 'Unpin' : 'Pin'} active={n.pinned} onClick={() => patch<HybridNote>('hybrid', n.id, { pinned: !n.pinned || undefined })}>
            <Pin size={18} />
          </IconButton>
          <IconButton label="Copy as markdown" onClick={() => navigator.clipboard?.writeText(noteMarkdown(n, books)).then(() => toast('Copied as markdown'))}>
            <ClipboardCopy size={18} />
          </IconButton>
          <IconButton label="Edit" onClick={() => go(`/hybrid/edit/${n.id}`)}>
            <Pencil size={18} />
          </IconButton>
          <IconButton
            label="Delete"
            onClick={() => {
              if (!confirm('Delete this note? It stays in your GitHub history.')) return
              remove('hybrid', n.id)
              toast('Deleted', { label: 'Undo', run: () => put<HybridNote>('hybrid', n) })
              back('/hybrid')
            }}
          >
            <Trash size={18} />
          </IconButton>
        </>
      }
    >
      <div className="pt-2">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink3">
          <StatusPill s={n.status} />
          <span>{books[n.book]}</span>
          {n.ref && <span className="font-mono font-bold text-acc">{n.ref}</span>}
          {n.ideaNo && <span className="font-mono">I-{String(n.ideaNo).padStart(3, '0')}</span>}
        </div>
        <h1 className="mt-2 text-[24px] font-bold leading-tight">{n.title}</h1>
        {n.body && <div className="prose-forme mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(n.body) }} />}
        {n.why && (
          <Section title="Why it is interesting">
            <Card className="font-serif text-[15.5px] leading-relaxed">{n.why}</Card>
          </Section>
        )}
        {n.related && (
          <Section title="Related canon">
            <Card className="font-mono text-[13.5px]">{n.related}</Card>
          </Section>
        )}
        {n.problems && (
          <Section title="Potential problems">
            <Card className="font-serif text-[15.5px] leading-relaxed">{n.problems}</Card>
          </Section>
        )}

        <Section title="Status">
          <div className="flex flex-wrap gap-2">
            {statusesFor(n.kind).map((s) => (
              <button key={s} onClick={() => patch<HybridNote>('hybrid', n.id, { status: s })} aria-pressed={n.status === s} className={`press rounded-lg ${n.status === s ? 'ring-2 ring-acc' : 'opacity-70'}`}>
                <StatusPill s={s} />
              </button>
            ))}
          </div>
        </Section>

        <Section title="Add a thought">
          <textarea rows={3} value={thought} onChange={(e) => setThought(e.target.value)} className="field font-serif text-[16px]" placeholder="A new angle, an answer, an objection — dated and appended." />
          <Button className="mt-2" variant="soft" onClick={addThought} disabled={!thought.trim()}>
            Append to note
          </Button>
        </Section>
        <p className="mt-6 text-[12px] text-ink3">Created {fmtLong(new Date(n.createdAt).toISOString().slice(0, 10))}</p>
      </div>
    </Page>
  )
}
