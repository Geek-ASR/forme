import { Heart, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { StarInput } from '../../components/Stars'
import { toast } from '../../components/Toasts'
import { Button, Chips, Field, Page, Segmented, Toggle, cx } from '../../components/ui'
import { PRICE_CATS, STAR_WORD, TITLE_HINT, YEAR_CATS } from '../../data/ratings'
import { dkey } from '../../lib/date'
import { go, useRoute } from '../../lib/router'
import { get, put } from '../../lib/store'
import type { Rating, RatingStatus } from '../../lib/types'
import { NewCategory, catOf, useRatingCats } from './Ratings'

export default function RatingEdit({ id }: { id?: string }) {
  const { query } = useRoute()
  const cats = useRatingCats()
  const existing = id ? get<Rating>('ratings', id) : undefined
  const [r, setR] = useState<Partial<Rating>>(() => {
    const base = existing ?? { cat: query.get('cat') || 'movies', status: 'done' as RatingStatus, date: dkey() }
    const st = query.get('status') as RatingStatus | null
    return st ? { ...base, status: st, date: st === 'done' ? dkey() : base.date } : base
  })
  const [tags, setTags] = useState((existing?.tags ?? []).join(', '))
  const [newCat, setNewCat] = useState(false)
  const c = catOf(cats, r.cat ?? 'movies')
  const statuses: { value: RatingStatus; label: string }[] = [
    { value: 'done', label: 'Rated' },
    { value: 'want', label: c.want ?? 'Want to try' },
    ...(c.doing ? [{ value: 'doing' as RatingStatus, label: c.doing }] : []),
  ]
  const set = (p: Partial<Rating>) => setR({ ...r, ...p })

  function save() {
    if (!r.title?.trim()) return toast('What are you rating? Add a title.')
    if (r.status === 'done' && !r.stars) return toast('Tap the stars to rate it')
    const rec = put<Rating>('ratings', {
      ...(r as Rating),
      title: r.title.trim(),
      by: r.by?.trim() || undefined,
      where: r.where?.trim() || undefined,
      notes: r.notes?.trim() || undefined,
      progress: r.status === 'doing' ? r.progress?.trim() || undefined : undefined,
      stars: r.status === 'done' ? r.stars : undefined,
      tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      createdAt: r.createdAt ?? Date.now(),
    })
    toast(r.status === 'done' ? `${c.emoji} ${rec.title} · ${rec.stars}★` : `${c.emoji} Added to ${statuses.find((s) => s.value === r.status)?.label}`)
    go(`/ratings/r/${rec.id}`, true)
  }

  return (
    <Page accent="mind" back="/ratings" title={existing ? 'Edit rating' : 'Rate something'} actions={<Button size="sm" onClick={save}>Save</Button>}>
      <Chips
        className="mt-1"
        options={[...cats.map((x) => ({ value: x.id, label: `${x.emoji} ${x.label}` })), { value: '__new', label: '+ New' }]}
        value={r.cat ?? 'movies'}
        onChange={(v) => (v === '__new' ? setNewCat(true) : set({ cat: v, status: r.status === 'doing' && !catOf(cats, v).doing ? 'done' : r.status }))}
      />

      <input
        autoFocus={!existing}
        value={r.title ?? ''}
        onChange={(e) => set({ title: e.target.value })}
        placeholder={TITLE_HINT[r.cat ?? ''] ?? 'Title'}
        className="mt-4 w-full bg-transparent text-[26px] font-bold leading-tight outline-none placeholder:text-ink3/50"
        aria-label="Title"
      />

      <div className="mt-4">
        <Segmented options={statuses} value={r.status ?? 'done'} onChange={(v) => set({ status: v, date: v === 'done' ? r.date ?? dkey() : r.date })} />
      </div>

      {r.status === 'done' && (
        <div className="mt-5 flex flex-col items-center">
          <StarInput value={r.stars ?? 0} onChange={(v) => set({ stars: v })} />
          <div className="mt-2 h-6 text-[16px] font-semibold text-acc">{r.stars ? `${r.stars} · ${STAR_WORD[String(r.stars)]}` : 'Tap or slide to rate'}</div>
          {r.stars ? (
            <button onClick={() => set({ stars: undefined })} className="press mt-1 flex items-center gap-1 text-[12.5px] text-ink3">
              <RotateCcw size={12} /> clear
            </button>
          ) : null}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => set({ fav: !r.fav || undefined })}
          aria-pressed={!!r.fav}
          className={cx('press flex h-12 items-center justify-center gap-2 rounded-2xl border text-[14.5px] font-semibold', r.fav ? 'border-transparent bg-[#e34948]/12 text-[#e34948]' : 'border-line2 text-ink2')}
        >
          <Heart size={17} className={r.fav ? 'fill-current' : ''} /> Favourite
        </button>
        {r.status === 'done' && (
          <div className="flex h-12 items-center justify-between rounded-2xl border border-line2 px-3">
            <span className="text-[14px] font-semibold text-ink2">Again?</span>
            <Toggle label="Would do again" checked={!!r.again} onChange={(v) => set({ again: v || undefined })} />
          </div>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {r.status === 'doing' && (
          <Field label="Progress">
            <input className="field" value={r.progress ?? ''} onChange={(e) => set({ progress: e.target.value })} placeholder="e.g. S2 E5 · chapter 12 · 40%" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={c.by ?? 'By'}>
            <input className="field" value={r.by ?? ''} onChange={(e) => set({ by: e.target.value })} />
          </Field>
          <Field label={c.where ?? 'Where'}>
            <input className="field" value={r.where ?? ''} onChange={(e) => set({ where: e.target.value })} />
          </Field>
          {YEAR_CATS.has(c.id) && (
            <Field label="Year">
              <input inputMode="numeric" className="field num" value={r.year ?? ''} onChange={(e) => set({ year: Number(e.target.value.replace(/\D/g, '').slice(0, 4)) || undefined })} />
            </Field>
          )}
          {PRICE_CATS.has(c.id) && (
            <Field label="Price (₹)">
              <input inputMode="decimal" className="field num" value={r.price ?? ''} onChange={(e) => set({ price: Number(e.target.value.replace(/[^\d.]/g, '')) || undefined })} />
            </Field>
          )}
          {r.status === 'done' && (
            <Field label="Date">
              <input type="date" className="field" value={r.date ?? ''} onChange={(e) => set({ date: e.target.value || undefined })} />
            </Field>
          )}
        </div>
        <Field label="Notes">
          <textarea
            rows={4}
            className="field font-serif text-[16px]"
            value={r.notes ?? ''}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder={r.status === 'done' ? 'What stood out? Who would you recommend it to?' : 'Why do you want to try it? Who recommended it?'}
          />
        </Field>
        <Field label="Tags" hint="Comma-separated: thriller, rewatch, with-friends">
          <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        <Button full size="lg" onClick={save}>
          Save
        </Button>
      </div>
      <NewCategory open={newCat} onClose={() => setNewCat(false)} onCreated={(cid) => set({ cat: cid })} />
    </Page>
  )
}
