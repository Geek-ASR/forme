import { Feather, Globe, Pin, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { moodEmoji } from '../../components/charts'
import { Sheet } from '../../components/Sheet'
import { SyncBadge } from '../../components/SyncBadge'
import { Card, Chips, Empty, Fab, IconButton, Page, Pill, Section, Stat } from '../../components/ui'
import { promptOfDay } from '../../data/prompts'
import { streak } from '../../lib/calc'
import { dkey, fmtLong } from '../../lib/date'
import { excerpt, wordCount } from '../../lib/md'
import { go } from '../../lib/router'
import { useColl } from '../../lib/store'
import type { HybridNote, Post, PostType } from '../../lib/types'
import { useBooks } from '../hybrid/common'

export const TYPES: { value: PostType; label: string; hint: string }[] = [
  { value: 'thought', label: 'Thought', hint: 'A quick line, an observation' },
  { value: 'journal', label: 'Journal', hint: 'Private, about your day' },
  { value: 'philosophy', label: 'Philosophy', hint: 'A view, a belief, an argument' },
  { value: 'blog', label: 'Blog post', hint: 'Long-form, maybe for the world' },
  { value: 'quote', label: 'Quote', hint: 'Words worth keeping' },
  { value: 'poem', label: 'Poem', hint: 'Lines and line breaks' },
]
export const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label])) as Record<PostType, string>

export default function Mind() {
  const posts = useColl<Post>('posts')
  const hybrid = useColl<HybridNote>('hybrid')
  const books = useBooks()
  const [filter, setFilter] = useState<'all' | PostType>('all')
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [chooser, setChooser] = useState(false)
  const today = dkey()

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return posts
      .filter((p) => filter === 'all' || p.type === filter)
      .filter((p) => !needle || `${p.title ?? ''} ${p.body} ${(p.tags ?? []).join(' ')}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt - a.createdAt)
  }, [posts, filter, q])

  const month = today.slice(0, 7)
  const wordsMonth = posts.filter((p) => p.date.startsWith(month)).reduce((s, p) => s + wordCount(p.body), 0)
  const days = new Set(posts.map((p) => p.date))
  const s = streak(days, today)
  const openQuestions = hybrid.filter((h) => h.status === 'UNRESOLVED').length

  return (
    <Page accent="mind" subtitle="Thoughts · views · philosophy" title="Mind" actions={<SyncBadge />}>
      <a href="#/hybrid" className="starfield press mt-2 block overflow-hidden rounded-3xl p-5">
        <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#9fe7dc]">The book</div>
        <div className="mt-1 font-serif text-[26px] leading-tight">The Hybrid World</div>
        <div className="mt-1 text-[13.5px] text-white/75">
          {books.b1} · {books.b2} · {books.b3} — {hybrid.filter((h) => h.kind !== 'loop').length} notes · {openQuestions} unresolved
        </div>
      </a>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Stat label="Entries" value={posts.length} />
        <Stat label="Words this month" value={wordsMonth.toLocaleString('en-IN')} />
        <Stat label="Streak" value={s} unit={s === 1 ? 'day' : 'days'} />
      </div>

      <Card className="mt-3" onClick={() => go('/mind/new?type=journal&prompt=1')}>
        <div className="text-[12px] font-semibold uppercase tracking-wide text-acc">Today's prompt</div>
        <div className="mt-1 font-serif text-[17px] leading-snug">{promptOfDay(today)}</div>
      </Card>

      <Section
        title="Your writing"
        action={
          <IconButton label={searching ? 'Close search' : 'Search'} onClick={() => (setSearching(!searching), setQ(''))}>
            {searching ? <X size={18} /> : <Search size={18} />}
          </IconButton>
        }
      >
        {searching && <input autoFocus className="field mb-3" placeholder="Search your writing…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search your writing" />}
        <Chips options={[{ value: 'all' as const, label: 'All' }, ...TYPES.map((t) => ({ value: t.value, label: t.label }))]} value={filter} onChange={setFilter} />
        <div className="mt-3 space-y-2.5">
          {list.map((p) => (
            <Card key={p.id} href={`#/mind/p/${p.id}`}>
              <div className="flex items-center gap-1.5 text-[12px] text-ink3">
                <Pill tone="muted">{TYPE_LABEL[p.type]}</Pill>
                <span>{fmtLong(p.date)}</span>
                {p.mood ? <span>{moodEmoji(p.mood)}</span> : null}
                <span className="flex-1" />
                {p.public && <Globe size={14} className="text-acc" aria-label="Published" />}
                {p.pinned && <Pin size={14} className="text-acc" aria-label="Pinned" />}
              </div>
              {p.title && <div className="mt-2 text-[17px] font-semibold leading-snug">{p.title}</div>}
              <div className={`mt-1.5 font-serif leading-relaxed text-ink2 ${p.type === 'quote' ? 'text-[16.5px] italic' : 'text-[15.5px]'}`}>{excerpt(p.body, p.title ? 150 : 220)}</div>
              {!!p.tags?.length && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span key={t} className="text-[12px] font-medium text-acc">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
          {!list.length && (
            <Empty
              icon={<Feather size={24} />}
              title={posts.length ? 'Nothing matches' : 'Your first page is blank'}
              body={posts.length ? 'Try another filter or search.' : 'Write a thought, a belief you hold, a question you keep returning to. Only you can see it.'}
            />
          )}
        </div>
      </Section>

      <Fab label="New writing" onClick={() => setChooser(true)}>
        <Plus size={26} />
      </Fab>
      <Sheet open={chooser} onClose={() => setChooser(false)} title="Write…" accent="mind">
        <div className="grid grid-cols-2 gap-2.5 pb-2">
          {TYPES.map((t) => (
            <button key={t.value} onClick={() => go(`/mind/new?type=${t.value}`)} className="press rounded-3xl border border-line bg-card p-4 text-left">
              <div className="text-[15.5px] font-semibold">{t.label}</div>
              <div className="mt-0.5 text-[12.5px] text-ink3">{t.hint}</div>
            </button>
          ))}
        </div>
      </Sheet>
    </Page>
  )
}
