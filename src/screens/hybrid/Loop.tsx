import { useState } from 'react'
import { toast } from '../../components/Toasts'
import { Button, Card, Chips, Page, Section, Stepper } from '../../components/ui'
import { get, put, useDoc } from '../../lib/store'
import type { HBook, HybridNote } from '../../lib/types'
import { BOOK_ORDER, useBooks } from './common'

type Pair = { title: string; first?: string; second?: string }

/**
 * Mirror outline: chapter k and chapter N+1−k share a title. The device only works if the
 * second appearance means something different — so each pair records both meanings.
 */
export default function Loop() {
  const books = useBooks()
  const [book, setBook] = useState<HBook>('b1')
  const id = `loop-${book}`
  const doc = useDoc<HybridNote>('hybrid', id)
  const n = doc?.chapters ?? 21
  const pairs: Pair[] = doc?.pairs ?? []
  const half = Math.ceil(n / 2)
  const odd = n % 2 === 1
  const [open, setOpen] = useState<number | null>(0)

  function save(next: { chapters?: number; pairs?: Pair[] }) {
    const cur = get<HybridNote>('hybrid', id)
    put<HybridNote>('hybrid', {
      ...(cur ?? { kind: 'loop', book, status: 'PROPOSED', title: 'Mirror outline', createdAt: Date.now() }),
      id,
      chapters: next.chapters ?? n,
      pairs: next.pairs ?? pairs,
    } as HybridNote)
  }
  const setPair = (i: number, p: Partial<Pair>) => {
    const list = Array.from({ length: half }, (_, k) => pairs[k] ?? { title: '' })
    list[i] = { ...list[i], ...p }
    save({ pairs: list })
  }
  const filled = Array.from({ length: half }, (_, k) => pairs[k]?.title?.trim()).filter(Boolean).length

  return (
    <Page accent="hybrid" back="/hybrid" title="Mirror outline">
      <Chips className="mt-1" options={BOOK_ORDER.filter((b) => b !== 'series').map((b) => ({ value: b, label: books[b] }))} value={book} onChange={setBook} />
      <Card className="mt-3">
        <p className="text-[14px] leading-relaxed text-ink2">
          Chapter 1 shares its title with the last chapter, chapter 2 with the second-to-last, and so on. The same words return — changed by everything in between. {odd ? 'With an odd count, the centre chapter is the only one without a mirror.' : 'With an even count, the centre is a hinge between two chapters.'}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[14.5px] font-semibold">Chapters</span>
          <Stepper value={n} min={3} max={99} onChange={(v) => save({ chapters: v })} />
        </div>
        <div className="mt-2 text-[12.5px] text-ink3">
          {filled} of {half} titles drafted
        </div>
      </Card>

      <Section title="Pairs">
        <div className="space-y-2">
          {Array.from({ length: half }, (_, i) => {
            const a = i + 1
            const b = n - i
            const centre = odd && a === b
            const p = pairs[i] ?? { title: '' }
            const isOpen = open === i
            return (
              <div key={i} className={`rounded-3xl border bg-card ${centre ? 'border-acc/50' : 'border-line'}`}>
                <button onClick={() => setOpen(isOpen ? null : i)} className="press flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="w-16 shrink-0 font-mono text-[12.5px] font-bold text-acc">{centre ? `${a} ◆` : `${a} ↔ ${b}`}</span>
                  <span className={`min-w-0 flex-1 truncate font-serif text-[16px] ${p.title ? '' : 'text-ink3'}`}>{p.title || (centre ? 'The unmirrored centre' : 'Untitled pair')}</span>
                </button>
                {isOpen && (
                  <div className="space-y-3 px-4 pb-4">
                    <input className="field font-serif text-[17px]" placeholder={centre ? 'Centre chapter title' : 'Shared title'} value={p.title} onChange={(e) => setPair(i, { title: e.target.value })} />
                    <textarea rows={2} className="field text-[14.5px]" placeholder={centre ? 'Why nothing can return after this chapter' : `What it means in chapter ${a}`} value={p.first ?? ''} onChange={(e) => setPair(i, { first: e.target.value })} />
                    {!centre && (
                      <textarea rows={2} className="field text-[14.5px]" placeholder={`What it means when it returns in chapter ${b}`} value={p.second ?? ''} onChange={(e) => setPair(i, { second: e.target.value })} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Full order">
        <Card>
          <ol className="space-y-1 font-serif text-[15px]">
            {Array.from({ length: n }, (_, k) => {
              const i = k < half ? k : n - 1 - k
              const t = pairs[i]?.title
              return (
                <li key={k} className="flex gap-3">
                  <span className="w-7 shrink-0 text-right font-mono text-[12.5px] text-ink3">{k + 1}</span>
                  <span className={t ? '' : 'text-ink3'}>{t || '—'}</span>
                </li>
              )
            })}
          </ol>
          <Button
            className="mt-4"
            variant="soft"
            onClick={() => {
              const md = Array.from({ length: n }, (_, k) => {
                const i = k < half ? k : n - 1 - k
                return `${k + 1}. ${pairs[i]?.title || '—'}`
              }).join('\n')
              navigator.clipboard?.writeText(md).then(() => toast('Chapter list copied'))
            }}
          >
            Copy chapter list
          </Button>
        </Card>
      </Section>
    </Page>
  )
}
