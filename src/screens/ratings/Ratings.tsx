import { Dices, Heart, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Columns } from '../../components/charts'
import { Sheet } from '../../components/Sheet'
import { Stars, fmtStars } from '../../components/Stars'
import { toast } from '../../components/Toasts'
import { Button, Card, Chips, Empty, Fab, IconButton, Page, Section, Segmented, Stat, cx } from '../../components/ui'
import { DEFAULT_RATING_CATS, STAR_WORD } from '../../data/ratings'
import { saveSettings, useSettings } from '../../lib/app'
import { fmtLong } from '../../lib/date'
import { go } from '../../lib/router'
import { useColl } from '../../lib/store'
import type { Rating, RatingCat } from '../../lib/types'

export function useRatingCats(): RatingCat[] {
  const s = useSettings()
  return useMemo(() => {
    const custom = s.ratingCats ?? []
    const ids = new Set(custom.map((c) => c.id))
    return [...DEFAULT_RATING_CATS.filter((c) => !ids.has(c.id)), ...custom].filter((c) => !c.hidden)
  }, [s.ratingCats])
}

export function catOf(cats: RatingCat[], id: string): RatingCat {
  return cats.find((c) => c.id === id) ?? { id, label: id, emoji: '⭐' }
}

type Tab = 'rated' | 'lists' | 'favs'
type Sort = 'recent' | 'top' | 'az'

export default function Ratings() {
  const all = useColl<Rating>('ratings')
  const cats = useRatingCats()
  const [tab, setTab] = useState<Tab>('rated')
  const [cat, setCat] = useState<string>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [picker, setPicker] = useState(false)
  const [newCat, setNewCat] = useState(false)

  const rated = all.filter((r) => r.status === 'done' && r.stars)
  const inCat = (r: Rating) => cat === 'all' || r.cat === cat
  const needle = q.trim().toLowerCase()
  const matches = (r: Rating) => !needle || `${r.title} ${r.by ?? ''} ${r.where ?? ''} ${(r.tags ?? []).join(' ')} ${r.notes ?? ''}`.toLowerCase().includes(needle)

  const list = useMemo(() => {
    const base = all.filter((r) => inCat(r) && matches(r)).filter((r) => (tab === 'rated' ? r.status === 'done' : tab === 'lists' ? r.status !== 'done' : r.fav))
    const by: Record<Sort, (a: Rating, b: Rating) => number> = {
      recent: (a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.createdAt - a.createdAt,
      top: (a, b) => (b.stars ?? 0) - (a.stars ?? 0) || (b.date ?? '').localeCompare(a.date ?? ''),
      az: (a, b) => a.title.localeCompare(b.title),
    }
    return base.sort(by[sort])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, cat, tab, sort, needle])

  const top = rated.filter(inCat).sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0)).slice(0, 8)
  const avg = rated.length ? rated.reduce((s, r) => s + (r.stars ?? 0), 0) / rated.length : 0
  const lists = all.filter((r) => r.status !== 'done')
  const counts = new Map<string, number>()
  for (const r of all) counts.set(r.cat, (counts.get(r.cat) ?? 0) + 1)
  const orderedCats = [...cats].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))

  const dist = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((v) => ({
    key: String(v),
    label: Number.isInteger(v) ? `${v}★` : v === 0.5 ? '½' : '',
    value: rated.filter(inCat).filter((r) => r.stars === v).length,
    tip: `${v} ★ · ${STAR_WORD[String(v)]}`,
  }))
  const perCat = cats
    .map((c) => {
      const rs = rated.filter((r) => r.cat === c.id)
      return { c, n: rs.length, avg: rs.length ? rs.reduce((s, r) => s + (r.stars ?? 0), 0) / rs.length : 0 }
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.avg - a.avg)

  function surprise() {
    const pool = all.filter((r) => r.status === 'want' && inCat(r))
    if (!pool.length) return toast('Your list is empty here — add things you want to try')
    const pick = pool[Math.floor(Math.random() * pool.length)]
    toast(`🎲 ${pick.title}`, { label: 'Open', run: () => go(`/ratings/r/${pick.id}`) }, 5000)
  }

  const startNew = (c?: string) => go(`/ratings/new${c && c !== 'all' ? `?cat=${c}` : ''}`)

  return (
    <Page
      accent="mind"
      back="/mind"
      title="Ratings"
      actions={
        <IconButton label={searching ? 'Close search' : 'Search'} onClick={() => (setSearching(!searching), setQ(''))}>
          {searching ? <X size={18} /> : <Search size={18} />}
        </IconButton>
      }
    >
      <div className="mt-1 grid grid-cols-3 gap-2.5">
        <Stat label="Rated" value={rated.length} />
        <Stat label="Average" value={rated.length ? avg.toFixed(1) : '–'} unit="★" />
        <Stat label="On your lists" value={lists.length} />
      </div>

      {searching && <input autoFocus className="field mt-3" placeholder="Search titles, notes, tags…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search ratings" />}

      <div className="mt-3">
        <Segmented
          options={[
            { value: 'rated', label: 'Rated' },
            { value: 'lists', label: 'Lists' },
            { value: 'favs', label: '♥ Favourites' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <Chips
        className="mt-3"
        options={[{ value: 'all', label: `All · ${all.length}` }, ...orderedCats.map((c) => ({ value: c.id, label: `${c.emoji} ${c.label}${counts.get(c.id) ? ` · ${counts.get(c.id)}` : ''}` }))]}
        value={cat}
        onChange={setCat}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {(
            [
              ['recent', 'Recent'],
              ['top', 'Top'],
              ['az', 'A–Z'],
            ] as [Sort, string][]
          ).map(([v, l]) => (
            <button key={v} onClick={() => setSort(v)} aria-pressed={sort === v} className={cx('press rounded-lg px-2.5 py-1 text-[13px] font-semibold', sort === v ? 'bg-acc-soft text-acc' : 'text-ink3')}>
              {l}
            </button>
          ))}
        </div>
        {tab === 'lists' && (
          <button onClick={surprise} className="press flex items-center gap-1.5 text-[13.5px] font-semibold text-acc">
            <Dices size={16} /> Pick one for me
          </button>
        )}
      </div>

      {tab === 'rated' && top.length >= 3 && !needle && (
        <Section title={cat === 'all' ? 'Your top rated' : `Top ${catOf(cats, cat).label.toLowerCase()}`}>
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {top.map((r, i) => (
              <a key={r.id} href={`#/ratings/r/${r.id}`} className="press w-40 shrink-0 rounded-3xl border border-line bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[24px]">{catOf(cats, r.cat).emoji}</span>
                  <span className="text-[12px] font-bold text-ink3">#{i + 1}</span>
                </div>
                <div className="mt-2 line-clamp-2 text-[14.5px] font-semibold leading-snug">{r.title}</div>
                <Stars value={r.stars} size={13} className="mt-1.5" />
              </a>
            ))}
          </div>
        </Section>
      )}

      <div className="mt-4 space-y-2">
        {list.map((r) => {
          const c = catOf(cats, r.cat)
          return (
            <a key={r.id} href={`#/ratings/r/${r.id}`} className="press flex items-center gap-3 rounded-3xl border border-line bg-card p-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card2 text-[24px]">{c.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[15.5px] font-semibold">{r.title}</span>
                  {r.fav && <Heart size={13} className="shrink-0 fill-current text-fav" aria-label="Favourite" />}
                </span>
                <span className="block truncate text-[12.5px] text-ink3">{[r.by, r.year, r.where].filter(Boolean).join(' · ') || c.label}</span>
                {r.status === 'done' ? (
                  <span className="mt-1 flex items-center gap-2">
                    <Stars value={r.stars} size={13} />
                    <span className="text-[12px] text-ink3">{r.date ? fmtLong(r.date) : ''}</span>
                  </span>
                ) : (
                  <span className="mt-1 block text-[12px] font-semibold text-acc">
                    {r.status === 'doing' ? `${c.doing ?? 'In progress'}${r.progress ? ` · ${r.progress}` : ''}` : c.want ?? 'Want to try'}
                  </span>
                )}
              </span>
              {r.status === 'done' && <span className="text-[17px] font-bold">{fmtStars(r.stars)}</span>}
            </a>
          )
        })}
        {!list.length && (
          <Empty
            title={tab === 'lists' ? 'Nothing on your lists' : tab === 'favs' ? 'No favourites yet' : needle ? 'No matches' : 'Rate your first thing'}
            body={tab === 'lists' ? 'Add movies to watch, places to visit, chocolates to try — then let Forme pick one when you can’t decide.' : 'A movie last night, a chai somewhere new, a place you loved. Your taste, kept forever.'}
            action={<Button onClick={() => setPicker(true)}>Add</Button>}
          />
        )}
      </div>

      {tab === 'rated' && rated.filter(inCat).length >= 5 && (
        <>
          <Section title="How you rate">
            <Card>
              <Columns data={dist} unit="ratings" label="How many things you gave each star rating" />
              <p className="mt-2 text-[12.5px] text-ink3">{avg >= 3.8 ? 'You are generous — most things get 4 stars or more.' : avg <= 2.8 ? 'You are a tough critic.' : 'A balanced critic.'}</p>
            </Card>
          </Section>
          {cat === 'all' && perCat.length > 1 && (
            <Section title="Average by category">
              <div className="overflow-hidden rounded-3xl border border-line bg-card">
                {perCat.map(({ c, n, avg: a }) => (
                  <button key={c.id} onClick={() => setCat(c.id)} className="press flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left last:border-b-0">
                    <span className="text-[20px]">{c.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{c.label}</span>
                    <span className="text-[12px] text-ink3">{n}</span>
                    <Stars value={Math.round(a * 2) / 2} size={12} />
                    <span className="w-8 text-right text-[13.5px] font-semibold">{a.toFixed(1)}</span>
                  </button>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      <Fab label="Rate something" onClick={() => (cat !== 'all' ? startNew(cat) : setPicker(true))}>
        <Plus size={26} />
      </Fab>
      <Sheet open={picker} onClose={() => setPicker(false)} title="What are you rating?" accent="mind">
        <div className="grid grid-cols-3 gap-2 pb-2">
          {cats.map((c) => (
            <button key={c.id} onClick={() => startNew(c.id)} className="press flex flex-col items-center gap-1 rounded-3xl border border-line bg-card px-2 py-3 text-center">
              <span className="text-[28px]">{c.emoji}</span>
              <span className="text-[12.5px] font-semibold leading-tight">{c.label}</span>
            </button>
          ))}
          <button onClick={() => (setPicker(false), setNewCat(true))} className="press flex flex-col items-center justify-center gap-1 rounded-3xl border border-dashed border-line2 px-2 py-3 text-center text-ink3">
            <Plus size={24} />
            <span className="text-[12.5px] font-semibold">New category</span>
          </button>
        </div>
      </Sheet>
      <NewCategory open={newCat} onClose={() => setNewCat(false)} onCreated={(id) => startNew(id)} />
    </Page>
  )
}

export function NewCategory({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const settings = useSettings()
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState('⭐')
  const [by, setBy] = useState('')
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New category"
      accent="mind"
      footer={
        <Button
          full
          size="lg"
          disabled={!label.trim()}
          onClick={() => {
            const id = 'c-' + label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '-' + Date.now().toString(36).slice(-4)
            saveSettings({ ratingCats: [...(settings.ratingCats ?? []), { id, label: label.trim(), emoji: emoji || '⭐', by: by.trim() || undefined, want: 'To try' }] })
            toast(`${emoji} ${label.trim()} added`)
            setLabel('')
            setBy('')
            onClose()
            onCreated?.(id)
          }}
        >
          Create
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="flex gap-3">
          <input aria-label="Emoji" className="field w-20 text-center text-[24px]" value={emoji} onChange={(e) => setEmoji([...e.target.value].slice(-2).join(''))} />
          <input aria-label="Category name" className="field flex-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Perfumes, Street food, Sneakers" />
        </div>
        <input aria-label="Maker label" className="field" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Label for the maker (optional): Brand, Artist, Chef…" />
        <div className="flex flex-wrap gap-2">
          {['🍜', '🍦', '🧃', '🍕', '🏞️', '🏨', '👟', '🧴', '🎭', '🏏', '📱', '🎨'].map((e) => (
            <button key={e} onClick={() => setEmoji(e)} className={cx('press h-11 w-11 rounded-2xl text-[22px]', emoji === e ? 'bg-acc-soft ring-2 ring-acc' : 'bg-card2')}>
              {e}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
