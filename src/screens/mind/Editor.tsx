import { Bold, ChevronLeft, Globe, Heading2, Italic, List, Pin, Quote } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { moodEmoji } from '../../components/charts'
import { toast } from '../../components/Toasts'
import { Button, Toggle, cx } from '../../components/ui'
import { promptOfDay } from '../../data/prompts'
import { getConn } from '../../lib/auth'
import { dkey } from '../../lib/date'
import { wordCount } from '../../lib/md'
import { publishPost, unpublishPost } from '../../lib/publish'
import { back, go, useRoute } from '../../lib/router'
import { get, put, useColl } from '../../lib/store'
import type { Post, PostType } from '../../lib/types'
import { TYPES } from './Mind'

type Draft = { type: PostType; title: string; body: string; tags: string; mood?: number; pinned?: boolean; pub?: boolean }
const draftKey = (id?: string) => `forme.draft.${id ?? 'new'}`

const PLACEHOLDER: Record<PostType, string> = {
  thought: 'What is on your mind?',
  journal: 'How was today, really?',
  philosophy: 'State the idea plainly. Then argue with it.',
  blog: 'Start anywhere. Shape it later.',
  quote: '“…”',
  poem: 'Let the line breaks breathe.',
}

export default function Editor({ id }: { id?: string }) {
  const { query } = useRoute()
  const existing = id ? get<Post>('posts', id) : undefined
  const allPosts = useColl<Post>('posts')
  const knownTags = [...new Set(allPosts.flatMap((p) => p.tags ?? []))].slice(0, 12)
  const initial: Draft = (() => {
    try {
      const saved = localStorage.getItem(draftKey(id))
      if (saved) return JSON.parse(saved) as Draft
    } catch {
      /* ignore */
    }
    if (existing) return { type: existing.type, title: existing.title ?? '', body: existing.body, tags: (existing.tags ?? []).join(', '), mood: existing.mood, pinned: existing.pinned, pub: existing.public }
    const type = (query.get('type') as PostType) || 'thought'
    return { type, title: '', body: query.get('prompt') ? `> ${promptOfDay(dkey())}\n\n` : '', tags: '' }
  })()
  const [d, setD] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(id), JSON.stringify(d))
    } catch {
      /* ignore */
    }
  }, [d, id])

  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(240, el.scrollHeight) + 'px'
  }, [d.body])

  function wrap(before: string, after = before, linePrefix = false) {
    const el = area.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    let next: string
    let cursor: number
    if (linePrefix) {
      const lineStart = value.lastIndexOf('\n', s - 1) + 1
      next = value.slice(0, lineStart) + before + value.slice(lineStart)
      cursor = e + before.length
    } else {
      next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e)
      cursor = e + before.length
    }
    setD({ ...d, body: next })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(cursor, cursor)
    })
  }

  function discard() {
    try {
      localStorage.removeItem(draftKey(id))
    } catch {
      /* ignore */
    }
  }

  async function save() {
    if (!d.body.trim()) return toast('Write something first')
    setBusy(true)
    const tags = d.tags
      .split(/[,#]/)
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean)
    let post = put<Post>('posts', {
      ...(existing ?? {}),
      id: existing?.id,
      date: existing?.date ?? dkey(),
      createdAt: existing?.createdAt ?? Date.now(),
      type: d.type,
      title: d.title.trim() || undefined,
      body: d.body.trim(),
      tags: tags.length ? tags : undefined,
      mood: d.mood,
      pinned: d.pinned || undefined,
      public: existing?.public,
      slug: existing?.slug,
      publishedAt: existing?.publishedAt,
    })
    try {
      if (d.pub && (!existing?.public || existing.body !== post.body || existing.title !== post.title)) {
        const slug = await publishPost(post)
        post = put<Post>('posts', { ...post, public: true, slug, publishedAt: post.publishedAt ?? Date.now() })
        toast('Saved and published to your public blog 🌍')
      } else if (!d.pub && existing?.public) {
        await unpublishPost(post)
        put<Post>('posts', { ...post, public: false, publishedAt: undefined })
        toast('Saved · removed from the public blog')
      } else toast('Saved privately')
    } catch (e) {
      toast(`Saved privately. Publishing failed: ${(e as Error).message}`)
    }
    discard()
    setBusy(false)
    go(`/mind/p/${post.id}`, true)
  }

  const words = wordCount(d.body)
  const showTitle = d.type !== 'thought' && d.type !== 'quote'

  return (
    <div className="acc-mind min-h-dvh pb-20">
      <div className="safe-top sticky top-0 z-30 bg-page/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-2">
          <button aria-label="Back (draft is kept)" onClick={() => back('/mind')} className="press flex h-11 w-11 items-center justify-center rounded-full text-ink2">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 text-[13px] text-ink3">
            {words} words · {Math.max(1, Math.round(words / 220))} min read
          </div>
          <Button size="sm" loading={busy} onClick={save}>
            Save
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-xl px-5">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pt-1 pb-3">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setD({ ...d, type: t.value })}
              aria-pressed={d.type === t.value}
              className={cx('press h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold', d.type === t.value ? 'bg-acc-fill text-acc-on' : 'bg-card2 text-ink3')}
            >
              {t.label}
            </button>
          ))}
        </div>
        {showTitle && (
          <input
            value={d.title}
            onChange={(e) => setD({ ...d, title: e.target.value })}
            placeholder={d.type === 'blog' ? 'Title' : 'Title (optional)'}
            className="font-display w-full bg-transparent py-2 text-[27px] font-semibold leading-tight outline-none placeholder:text-ink3/50"
            aria-label="Title"
          />
        )}
        <textarea
          ref={area}
          autoFocus={!existing}
          value={d.body}
          onChange={(e) => setD({ ...d, body: e.target.value })}
          placeholder={PLACEHOLDER[d.type]}
          className={cx('mt-1 w-full resize-none bg-transparent font-serif leading-[1.75] outline-none placeholder:text-ink3/50', d.type === 'thought' ? 'text-[20px]' : 'text-[18px]', d.type === 'quote' && 'italic')}
          aria-label="Body"
        />
        {d.type === 'quote' && (
          <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="— who said it" className="field mt-2" aria-label="Author of quote" />
        )}

        <div className="mt-6 space-y-4 rounded-3xl border border-line bg-card p-4">
          <div>
            <div className="mb-2 text-[13px] font-semibold text-ink2">Mood</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  aria-pressed={d.mood === m}
                  onClick={() => setD({ ...d, mood: d.mood === m ? undefined : m })}
                  className={cx('press flex h-11 w-11 items-center justify-center rounded-2xl text-[22px]', d.mood === m ? 'bg-acc-soft ring-2 ring-acc' : 'bg-card2')}
                >
                  {moodEmoji(m)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[13px] font-semibold text-ink2">Tags</div>
            <input className="field" value={d.tags} onChange={(e) => setD({ ...d, tags: e.target.value })} placeholder="freedom, discipline, germany" aria-label="Tags" />
            {knownTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {knownTags.map((t) => (
                  <button key={t} onClick={() => setD({ ...d, tags: d.tags ? `${d.tags}, ${t}` : t })} className="press rounded-full bg-card2 px-2.5 py-1 text-[12.5px] font-medium text-ink3">
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[14.5px] font-medium">
              <Pin size={16} className="text-acc" /> Pin to top
            </span>
            <Toggle label="Pin" checked={!!d.pinned} onChange={(v) => setD({ ...d, pinned: v })} />
          </div>
          {getConn()?.mode === 'github' && d.type !== 'journal' && (
            <div className="flex items-center justify-between">
              <span className="text-[14.5px] font-medium">
                <span className="flex items-center gap-2">
                  <Globe size={16} className="text-acc" /> Publish on my public blog
                </span>
                <span className="block text-[12.5px] font-normal text-ink3">Off = only you can ever see it</span>
              </span>
              <Toggle label="Publish" checked={!!d.pub} onChange={(v) => setD({ ...d, pub: v })} />
            </div>
          )}
        </div>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-1 px-3 py-2">
          {[
            { label: 'Bold', icon: <Bold size={18} />, run: () => wrap('**') },
            { label: 'Italic', icon: <Italic size={18} />, run: () => wrap('*') },
            { label: 'Heading', icon: <Heading2 size={18} />, run: () => wrap('## ', '', true) },
            { label: 'Quote', icon: <Quote size={18} />, run: () => wrap('> ', '', true) },
            { label: 'List', icon: <List size={18} />, run: () => wrap('- ', '', true) },
          ].map((b) => (
            <button key={b.label} aria-label={b.label} onMouseDown={(e) => e.preventDefault()} onClick={b.run} className="press flex h-10 w-10 items-center justify-center rounded-xl text-ink2 hover:bg-card2">
              {b.icon}
            </button>
          ))}
          <span className="flex-1" />
          <button
            onClick={() => {
              if (confirm('Discard this draft?')) {
                discard()
                back('/mind')
              }
            }}
            className="press px-2 text-[13px] font-medium text-ink3"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}
