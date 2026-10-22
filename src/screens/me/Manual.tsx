import { Check, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Card, Page } from '../../components/ui'
import { renderMarkdown } from '../../lib/md'
import { get, put, useDoc } from '../../lib/store'
import type { MeDoc } from '../../lib/types'

const SECTIONS: { id: string; title: string; prompt: string }[] = [
  { id: 'values', title: 'My values', prompt: 'The few things you will not trade. Rank them if you can.' },
  { id: 'energy', title: 'What gives me energy', prompt: 'People, places, activities, times of day that charge you.' },
  { id: 'drains', title: 'What drains me', prompt: 'Be specific. Naming it is how you protect yourself from it.' },
  { id: 'strengths', title: 'My strengths', prompt: 'What do people come to you for? What feels easy to you but not to others?' },
  { id: 'principles', title: 'Principles I live by', prompt: 'Rules you have learned the hard way.' },
  { id: 'working', title: 'What I am working on', prompt: 'The patterns you are trying to change, gently.' },
  { id: 'body', title: 'How my body works', prompt: 'What helps your back, your sleep, your energy. What makes flares worse. Your own field notes.' },
  { id: 'love', title: 'Things I love', prompt: 'Books, music, food, places, ideas.' },
  { id: 'dreams', title: 'Dreams', prompt: 'Big and small. The things you would regret not trying.' },
]

/** A living "user manual" — the answers change as you do, and git keeps every version. */
export default function Manual() {
  const doc = useDoc<MeDoc>('profile', 'me')
  const [editing, setEditing] = useState<string | null>(null)
  const [text, setText] = useState('')
  const sections = doc?.sections ?? {}

  function save(id: string) {
    const cur = get<MeDoc>('profile', 'me')
    put<MeDoc>('profile', { id: 'me', sections: { ...(cur?.sections ?? {}), [id]: text.trim() } })
    setEditing(null)
  }

  return (
    <Page accent="me" back="/me" title="Manual of me">
      <p className="mt-1 px-1 text-[14px] leading-relaxed text-ink2">
        Knowing yourself is a practice, not a fact. Answer these slowly, and come back to them — your GitHub history keeps every past version of who you were.
      </p>
      <div className="mt-4 space-y-3">
        {SECTIONS.map((s) => {
          const isEdit = editing === s.id
          const value = sections[s.id]
          return (
            <Card key={s.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[16px] font-semibold">{s.title}</div>
                {isEdit ? (
                  <button aria-label="Save" onClick={() => save(s.id)} className="press flex h-9 w-9 items-center justify-center rounded-full bg-acc-fill text-acc-on">
                    <Check size={17} />
                  </button>
                ) : (
                  <button
                    aria-label={`Edit ${s.title}`}
                    onClick={() => {
                      setEditing(s.id)
                      setText(value ?? '')
                    }}
                    className="press flex h-9 w-9 items-center justify-center rounded-full text-ink3 hover:bg-card2"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              {isEdit ? (
                <>
                  <div className="mt-1 text-[13px] text-ink3">{s.prompt}</div>
                  <textarea autoFocus rows={6} className="field mt-3 font-serif text-[16px]" value={text} onChange={(e) => setText(e.target.value)} />
                </>
              ) : value ? (
                <div className="prose-forme mt-2 text-[1rem]" dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }} />
              ) : (
                <div className="mt-1 text-[14px] text-ink3">{s.prompt}</div>
              )}
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
