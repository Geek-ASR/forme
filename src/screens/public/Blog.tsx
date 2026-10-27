import { useEffect, useState } from 'react'
import { Empty, Spinner } from '../../components/ui'
import { rawPublicUrl } from '../../lib/config'
import { fmtLong } from '../../lib/date'
import { renderMarkdown } from '../../lib/md'
import type { PublicIndexEntry, PublicPost } from '../../lib/publish'

/** The public face: writing you chose to publish. Reads the `posts` branch of the public repo. */
export default function Blog({ path }: { path: string }) {
  const slug = path.startsWith('/p/') ? decodeURIComponent(path.slice(3)) : null
  return (
    <div className="acc-mind min-h-dvh">
      <div className="safe-top mx-auto max-w-xl px-5 pt-8 pb-16">
        <a href="#/blog" className="text-[13px] font-semibold uppercase tracking-[0.2em] text-acc">
          Forme · writing
        </a>
        {slug ? <PostView slug={slug} /> : <Index />}
      </div>
    </div>
  )
}

function useJson<T>(url: string) {
  const [data, setData] = useState<T | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    fetch(url, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setData(j))
      .catch(() => alive && setData(null))
    return () => {
      alive = false
    }
  }, [url])
  return data
}

function Index() {
  const data = useJson<{ posts: PublicIndexEntry[] }>(rawPublicUrl('index.json'))
  if (data === undefined) return <Spinner className="mt-10" />
  if (!data?.posts?.length) return <Empty title="Nothing published yet" body="Words will appear here when they are ready." />
  return (
    <div className="mt-8 space-y-8">
      {data.posts.map((p) => (
        <a key={p.slug} href={`#/p/${p.slug}`} className="block">
          <div className="text-[12.5px] text-ink3">
            {fmtLong(p.date)} · {Math.max(1, Math.round(p.words / 220))} min read
          </div>
          <h2 className="mt-1 text-[22px] font-bold leading-snug">{p.title}</h2>
          <p className="mt-1.5 font-serif text-[16px] leading-relaxed text-ink2">{p.excerpt}</p>
        </a>
      ))}
    </div>
  )
}

function PostView({ slug }: { slug: string }) {
  const p = useJson<PublicPost>(rawPublicUrl(`posts/${encodeURIComponent(slug)}.json`))
  useEffect(() => {
    if (p?.title) document.title = `${p.title} · Forme`
  }, [p])
  if (p === undefined) return <Spinner className="mt-10" />
  if (!p) return <Empty title="Not found" body="This piece may have been unpublished." />
  return (
    <article className="mt-6">
      <div className="text-[13px] text-ink3">{fmtLong(p.date)}</div>
      {p.type !== 'quote' && <h1 className="font-display mt-2 text-[31px] font-semibold leading-tight">{p.title}</h1>}
      <div className="prose-forme mt-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      <a href="#/blog" className="mt-10 inline-block text-[14px] font-semibold text-acc">
        ← All writing
      </a>
    </article>
  )
}
