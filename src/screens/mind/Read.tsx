import { Globe, Link, Pencil, Pin, Trash } from 'lucide-react'
import { moodEmoji } from '../../components/charts'
import { toast } from '../../components/Toasts'
import { Empty, IconButton, Page, Pill } from '../../components/ui'
import { fmtLong } from '../../lib/date'
import { renderMarkdown, wordCount } from '../../lib/md'
import { publicUrl, unpublishPost } from '../../lib/publish'
import { back, go } from '../../lib/router'
import { patch, put, remove, useDoc } from '../../lib/store'
import type { Post } from '../../lib/types'
import { TYPE_LABEL } from './Mind'

export default function Read({ id }: { id: string }) {
  const p = useDoc<Post>('posts', id)
  if (!p)
    return (
      <Page accent="mind" back="/mind" title="">
        <Empty title="Not found" body="This entry may have been deleted." />
      </Page>
    )
  const words = wordCount(p.body)
  return (
    <Page
      accent="mind"
      back="/mind"
      title={TYPE_LABEL[p.type]}
      actions={
        <>
          {p.public && p.slug && (
            <IconButton
              label="Copy public link"
              onClick={() => navigator.clipboard?.writeText(publicUrl(p.slug!)).then(() => toast('Public link copied'))}
            >
              <Link size={18} />
            </IconButton>
          )}
          <IconButton label={p.pinned ? 'Unpin' : 'Pin'} active={p.pinned} onClick={() => patch<Post>('posts', p.id, { pinned: !p.pinned || undefined })}>
            <Pin size={18} />
          </IconButton>
          <IconButton label="Edit" onClick={() => go(`/mind/edit/${p.id}`)}>
            <Pencil size={18} />
          </IconButton>
          <IconButton
            label="Delete"
            onClick={async () => {
              if (!confirm('Delete this entry? (It stays in your GitHub history.)')) return
              if (p.public) await unpublishPost(p).catch(() => {})
              remove('posts', p.id)
              toast('Deleted', { label: 'Undo', run: () => put<Post>('posts', p) })
              back('/mind')
            }}
          >
            <Trash size={18} />
          </IconButton>
        </>
      }
    >
      <article className="pt-2 pb-6">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink3">
          <span>{fmtLong(p.date)}</span>
          <span>·</span>
          <span>
            {words} words · {Math.max(1, Math.round(words / 220))} min
          </span>
          {p.mood ? <span>{moodEmoji(p.mood)}</span> : null}
          {p.public && (
            <Pill>
              <Globe size={12} /> public
            </Pill>
          )}
        </div>
        {p.title && p.type !== 'quote' && <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight">{p.title}</h1>}
        <div className={`prose-forme mt-4 ${p.type === 'quote' ? 'text-[1.3rem] italic' : ''}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
        {p.type === 'quote' && p.title && <div className="mt-2 text-right text-[15px] text-ink2">— {p.title}</div>}
        {!!p.tags?.length && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <Pill key={t} tone="muted">
                #{t}
              </Pill>
            ))}
          </div>
        )}
      </article>
    </Page>
  )
}
