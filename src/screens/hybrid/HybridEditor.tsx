import { useState } from 'react'
import { toast } from '../../components/Toasts'
import { Button, Chips, Field, Page, Toggle } from '../../components/ui'
import { go, useRoute } from '../../lib/router'
import { get, put } from '../../lib/store'
import type { HBook, HKind, HybridNote } from '../../lib/types'
import { BOOK_ORDER, KINDS, defaultStatus, statusesFor, useBooks } from './common'

export default function HybridEditor({ id }: { id?: string }) {
  const { query } = useRoute()
  const books = useBooks()
  const existing = id ? get<HybridNote>('hybrid', id) : undefined
  const [n, setN] = useState<Partial<HybridNote>>(
    existing ?? { kind: 'idea', book: (query.get('book') as HBook) || 'b1', status: 'NEW', title: '', body: '' },
  )
  const kind = (n.kind ?? 'idea') as HKind
  const isIdea = kind === 'idea'

  function save() {
    if (!n.title?.trim()) return toast('Give it a title')
    const rec = put<HybridNote>('hybrid', {
      ...(n as HybridNote),
      title: n.title.trim(),
      createdAt: n.createdAt ?? Date.now(),
      exported: existing && existing.body !== n.body ? false : n.exported,
    })
    toast('Saved')
    go(`/hybrid/n/${rec.id}`, true)
  }

  const area = (key: keyof HybridNote, label: string, placeholder: string, rows = 3) => (
    <Field label={label}>
      <textarea rows={rows} className="field font-serif text-[16px]" value={String(n[key] ?? '')} onChange={(e) => setN({ ...n, [key]: e.target.value })} placeholder={placeholder} />
    </Field>
  )

  return (
    <Page accent="hybrid" back="/hybrid" title={existing ? 'Edit note' : 'New note'} actions={<Button size="sm" onClick={save}>Save</Button>}>
      <div className="mt-1 space-y-4 pb-8">
        <Field label="Kind">
          <Chips
            options={KINDS}
            value={kind}
            onChange={(k) => setN({ ...n, kind: k, status: statusesFor(k).includes(n.status ?? '') ? n.status : defaultStatus(k) })}
          />
        </Field>
        <Field label="Book">
          <Chips options={BOOK_ORDER.map((b) => ({ value: b, label: books[b] }))} value={(n.book ?? 'b1') as HBook} onChange={(b) => setN({ ...n, book: b })} />
        </Field>
        <Field label="Status" hint={isIdea ? 'Ideas stay in the inbox until you promote them.' : 'Only you promote anything to CANON.'}>
          <Chips scroll={false} options={statusesFor(kind).map((s) => ({ value: s, label: s }))} value={n.status ?? defaultStatus(kind)} onChange={(s) => setN({ ...n, status: s })} />
        </Field>
        <Field label="Title">
          <input className="field text-[17px] font-semibold" value={n.title ?? ''} onChange={(e) => setN({ ...n, title: e.target.value })} placeholder={isIdea ? 'The idea in one line' : 'Title'} />
        </Field>
        {area('body', isIdea ? 'Description' : 'Notes', isIdea ? 'What is the idea, concretely?' : 'Write freely…', 7)}
        {isIdea && (
          <>
            {area('why', 'Why it is interesting', 'What does it unlock for the story?')}
            {area('related', 'Related canon', 'IDs, characters, questions it touches (e.g. Q-37, REL-003)', 2)}
            {area('problems', 'Potential problems', 'Continuity risks, what it weakens…')}
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reference" hint="e.g. Q-37, D-026, I-069">
            <input className="field font-mono" value={n.ref ?? ''} onChange={(e) => setN({ ...n, ref: e.target.value || undefined })} />
          </Field>
          <Field label="Pin">
            <div className="flex h-[50px] items-center">
              <Toggle label="Pin" checked={!!n.pinned} onChange={(v) => setN({ ...n, pinned: v || undefined })} />
            </div>
          </Field>
        </div>
      </div>
    </Page>
  )
}
