import { Heart, Pencil, Repeat, Trash } from 'lucide-react'
import { Stars, fmtStars } from '../../components/Stars'
import { toast } from '../../components/Toasts'
import { Button, Empty, IconButton, Page, Pill } from '../../components/ui'
import { STAR_WORD } from '../../data/ratings'
import { fmtLong } from '../../lib/date'
import { renderMarkdown } from '../../lib/md'
import { back, go } from '../../lib/router'
import { put, remove, useColl, useDoc } from '../../lib/store'
import type { Rating } from '../../lib/types'
import { catOf, useRatingCats } from './Ratings'

export default function RatingView({ id }: { id: string }) {
  const r = useDoc<Rating>('ratings', id)
  const cats = useRatingCats()
  const all = useColl<Rating>('ratings')
  if (!r)
    return (
      <Page accent="mind" back="/ratings" title="">
        <Empty title="Not found" body="This rating may have been deleted." />
      </Page>
    )
  const c = catOf(cats, r.cat)
  const inCat = all.filter((x) => x.cat === r.cat && x.status === 'done' && x.stars).sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
  const rank = r.status === 'done' ? inCat.findIndex((x) => x.id === r.id) + 1 : 0

  return (
    <Page
      accent="mind"
      back="/ratings"
      title={c.label}
      actions={
        <>
          <IconButton label="Edit" onClick={() => go(`/ratings/edit/${r.id}`)}>
            <Pencil size={18} />
          </IconButton>
          <IconButton
            label="Delete"
            onClick={() => {
              if (!confirm(`Delete “${r.title}”?`)) return
              remove('ratings', r.id)
              toast('Deleted', { label: 'Undo', run: () => put<Rating>('ratings', r) })
              back('/ratings')
            }}
          >
            <Trash size={18} />
          </IconButton>
        </>
      }
    >
      <div className="pt-3 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-card2 text-[42px]">{c.emoji}</div>
        <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight">{r.title}</h1>
        <div className="mt-1 text-[14px] text-ink3">{[r.by, r.year, r.where].filter(Boolean).join(' · ')}</div>
        {r.status === 'done' ? (
          <div className="mt-4 flex flex-col items-center">
            <Stars value={r.stars} size={30} />
            <div className="mt-2 text-[15px] font-semibold">
              {fmtStars(r.stars)} · {STAR_WORD[String(r.stars)]}
            </div>
            {rank > 0 && inCat.length > 1 && (
              <div className="mt-1 text-[12.5px] text-ink3">
                #{rank} of {inCat.length} {c.label.toLowerCase()} you've rated
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <Pill>{r.status === 'doing' ? `${c.doing ?? 'In progress'}${r.progress ? ` · ${r.progress}` : ''}` : c.want ?? 'Want to try'}</Pill>
          </div>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {r.fav && (
            <Pill className="bg-[#e34948]/12 text-[#e34948]">
              <Heart size={12} className="fill-current" /> favourite
            </Pill>
          )}
          {r.again && (
            <Pill tone="good">
              <Repeat size={12} /> would again
            </Pill>
          )}
          {r.price ? <Pill tone="muted">₹{r.price}</Pill> : null}
          {r.date && r.status === 'done' ? <Pill tone="muted">{fmtLong(r.date)}</Pill> : null}
        </div>
      </div>

      {r.notes && <div className="prose-forme mt-6 rounded-3xl border border-line bg-card p-5" dangerouslySetInnerHTML={{ __html: renderMarkdown(r.notes) }} />}
      {!!r.tags?.length && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {r.tags.map((t) => (
            <Pill key={t} tone="muted">
              #{t}
            </Pill>
          ))}
        </div>
      )}
      {r.status !== 'done' && (
        <Button full size="lg" className="mt-6" onClick={() => go(`/ratings/edit/${r.id}?status=done`)}>
          Done it? Rate it now
        </Button>
      )}
    </Page>
  )
}
