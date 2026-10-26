import { Plus, Trash, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Button, Chips, Field, Page, Section, Segmented } from '../../components/ui'
import { useSettings } from '../../lib/app'
import { dkey } from '../../lib/date'
import { useRoute } from '../../lib/router'
import { speak } from '../../lib/speech'
import { ART_COLOR, loadDeck, type Card } from '../../lib/srs'
import { get, put, remove, useColl } from '../../lib/store'
import type { CustomWord, Level, SrsState } from '../../lib/types'

export default function Words() {
  const { query } = useRoute()
  const g = useSettings().german
  const words = useColl<CustomWord>('words')
  const srs = useColl<SrsState>('srs')
  const [tab, setTab] = useState<'mine' | 'deck'>('mine')
  const [lvl, setLvl] = useState<Level>(g.level)
  const [deck, setDeck] = useState<Card[]>([])
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(query.get('add') === '1')
  const known = useMemo(() => new Map(srs.map((s) => [s.id, s])), [srs])

  useEffect(() => {
    loadDeck(lvl).then(setDeck)
  }, [lvl])

  const needle = q.trim().toLowerCase()
  const list = deck.filter((c) => !needle || c.d.toLowerCase().includes(needle) || c.e.toLowerCase().includes(needle)).slice(0, 150)

  return (
    <Page accent="de" back="/deutsch" title="Words" actions={<Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => setAdding(true)}>Add</Button>}>
      <div className="mt-1">
        <Segmented
          options={[
            { value: 'mine', label: `My words · ${words.length}` },
            { value: 'deck', label: 'Browse decks' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'mine' ? (
        <Section>
          {words.length ? (
            <div className="overflow-hidden rounded-3xl border border-line bg-card">
              {[...words]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((w) => (
                  <div key={w.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <button aria-label={`Hear ${w.de}`} onClick={() => speak(`${w.art ? w.art + ' ' : ''}${w.de}`)} className="press text-acc">
                      <Volume2 size={17} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15.5px] font-semibold">
                        {w.art && <span className={ART_COLOR[w.art]}>{w.art} </span>}
                        {w.de}
                      </div>
                      <div className="truncate text-[13px] text-ink3">
                        {w.en}
                        {w.pl ? ` · pl. ${w.pl}` : ''}
                      </div>
                    </div>
                    <button
                      aria-label="Delete word"
                      onClick={() => {
                        remove('words', w.id)
                        toast('Word removed', { label: 'Undo', run: () => put<CustomWord>('words', w) })
                      }}
                      className="press p-1.5 text-ink3"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-line2 px-5 py-8 text-center text-[14px] leading-relaxed text-ink3">
              Heard a word in a video, a class, or on the street? Add it here — it joins your daily review.
            </div>
          )}
        </Section>
      ) : (
        <Section>
          <Chips options={(['A1', 'A2', 'B1', 'B2', 'C1'] as Level[]).map((l) => ({ value: l, label: l }))} value={lvl} onChange={setLvl} />
          <input className="field mt-3" placeholder="Search German or English…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search words" />
          <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-card">
            {list.map((c) => {
              const s = known.get(c.i)
              return (
                <div key={c.i} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                  <button aria-label={`Hear ${c.d}`} onClick={() => speak(`${c.a ? c.a + ' ' : ''}${c.d}${c.x ? '. ' + c.x : ''}`)} className="press text-acc">
                    <Volume2 size={16} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">
                      {c.a && <span className={ART_COLOR[c.a]}>{c.a} </span>}
                      {c.d}
                    </div>
                    <div className="truncate text-[12.5px] text-ink3">{c.e}</div>
                  </div>
                  {s ? (
                    <span className="text-[12px] font-medium text-ink3">{s.ivl >= 21 ? 'mature' : `due ${s.due.slice(5)}`}</span>
                  ) : (
                    <button
                      onClick={() => {
                        const today = dkey()
                        put<SrsState>('srs', { id: c.i, ease: 2.5, ivl: 0, reps: 0, lapses: 0, due: today, intro: today })
                        toast(`${c.d} added to today's review`)
                      }}
                      className="press rounded-full bg-acc-soft px-2.5 py-1 text-[12px] font-semibold text-acc"
                    >
                      Learn
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-2 px-1 text-[12px] text-ink3">Deutschpfad vocabulary · CC BY-SA 4.0</p>
        </Section>
      )}

      <AddWord open={adding} onClose={() => setAdding(false)} level={g.level} initial={query.get('de') ?? ''} />
    </Page>
  )
}

function AddWord({ open, onClose, level, initial = '' }: { open: boolean; onClose: () => void; level: Level; initial?: string }) {
  const [w, setW] = useState({ de: initial, art: '', en: '', pl: '', ex: '' })
  function save() {
    if (!w.de.trim() || !w.en.trim()) return toast('German and English are both needed')
    const de = w.de.trim().replace(/^(der|die|das)\s+/i, (m) => {
      if (!w.art) w.art = m.trim().toLowerCase()
      return ''
    })
    const rec = put<CustomWord>('words', { de, en: w.en.trim(), art: w.art || undefined, pl: w.pl.trim() || undefined, ex: w.ex.trim() || undefined, lvl: level, createdAt: Date.now() })
    const id = 'w:' + rec.id
    if (!get<SrsState>('srs', id)) put<SrsState>('srs', { id, ease: 2.5, ivl: 0, reps: 0, lapses: 0, due: dkey(), intro: dkey() })
    toast(`${de} added — it's in today's review`)
    setW({ de: '', art: '', en: '', pl: '', ex: '' })
    onClose()
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a word"
      accent="de"
      footer={
        <Button full size="lg" onClick={save}>
          Save word
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <Field label="German">
          <input className="field text-[17px]" value={w.de} onChange={(e) => setW({ ...w, de: e.target.value })} placeholder="die Gelassenheit" autoCapitalize="off" />
        </Field>
        <Field label="Article (nouns)">
          <div className="flex gap-2">
            {['', 'der', 'die', 'das'].map((a) => (
              <button key={a || 'none'} onClick={() => setW({ ...w, art: a })} aria-pressed={w.art === a} className={`press h-10 flex-1 rounded-xl border text-[14px] font-semibold ${w.art === a ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2 text-ink2'}`}>
                {a || '—'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="English">
          <input className="field" value={w.en} onChange={(e) => setW({ ...w, en: e.target.value })} placeholder="composure" />
        </Field>
        <Field label="Plural (optional)">
          <input className="field" value={w.pl} onChange={(e) => setW({ ...w, pl: e.target.value })} placeholder="—" />
        </Field>
        <Field label="Example sentence (optional)">
          <input className="field" value={w.ex} onChange={(e) => setW({ ...w, ex: e.target.value })} placeholder="Mit Gelassenheit geht alles leichter." />
        </Field>
      </div>
    </Sheet>
  )
}
