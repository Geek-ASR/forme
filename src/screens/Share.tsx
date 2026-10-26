// Share to Forme from any Android app (manifest share_target → #/share?share_text=…).
// A quote, a link, a film, a dish, a German word — pick where it goes.

import { BookA, Feather, Orbit, Star, Utensils } from 'lucide-react'
import { Card, List, Page, Row } from '../components/ui'
import { dkey } from '../lib/date'
import { go, useRoute } from '../lib/router'
import { put } from '../lib/store'
import type { HybridNote, Post } from '../lib/types'

export default function Share() {
  const { query } = useRoute()
  const title = query.get('share_title')?.trim() ?? ''
  const text = query.get('share_text')?.trim() ?? ''
  const url = query.get('share_url')?.trim() || text.match(/https?:\/\/\S+/)?.[0] || ''
  const plain = (url ? text.replace(url, '') : text).trim()
  const headline = (title || plain || url).split('\n')[0].trim().slice(0, 90)
  const body = [title && !plain.startsWith(title) ? title : '', plain, url].filter(Boolean).join('\n\n')
  const enc = encodeURIComponent

  if (!body) {
    return (
      <Page accent="today" back="/" title="Share to Forme">
        <Card className="mt-2">
          <div className="text-[15px] font-semibold">Nothing came through</div>
          <div className="mt-1 text-[13.5px] text-ink3">Share some text or a link from another app and pick Forme.</div>
        </Card>
      </Page>
    )
  }

  const options = [
    {
      icon: <Feather size={19} />,
      title: 'Save as a thought',
      sub: 'Mind · add your own words after',
      run: () => go(`/mind/edit/${put<Post>('posts', { date: dkey(), type: 'thought', body, createdAt: Date.now() }).id}`, true),
    },
    {
      icon: <Orbit size={19} />,
      title: 'Idea for the book',
      sub: 'The Hybrid World · ideas inbox',
      run: () => {
        const rest = title ? plain : plain.split('\n').slice(1).join('\n').trim() // whatever the headline didn't use
        const n =put<HybridNote>('hybrid', { kind: 'idea', book: 'b1', status: 'NEW', title: headline, body: rest || undefined, ref: url || undefined, createdAt: Date.now() })
        go(`/hybrid/edit/${n.id}`, true)
      },
    },
    { icon: <Star size={19} />, title: 'Rate it', sub: 'A film, a place, a drink…', run: () => go(`/ratings/new?title=${enc(headline)}${url ? `&notes=${enc(url)}` : ''}`, true) },
    { icon: <Utensils size={19} />, title: 'Log it as food', sub: 'Uses the meal parser', run: () => go(`/body/food/add?text=${enc(plain || title)}`, true) },
    { icon: <BookA size={19} />, title: 'Add a German word', sub: 'Joins your daily review', run: () => go(`/deutsch/words?add=1&de=${enc(headline)}`, true) },
  ]

  return (
    <Page accent="today" back="/" title="Share to Forme">
      <Card className="mt-2">
        {title && <div className="text-[15px] font-semibold">{title}</div>}
        {plain && plain !== title && <div className="mt-1 line-clamp-6 whitespace-pre-wrap font-serif text-[15.5px] leading-relaxed text-ink2">{plain}</div>}
        {url && <div className="mt-1.5 truncate text-[13px] text-acc">{url}</div>}
      </Card>
      <div className="mt-5 mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink3">Save it to</div>
      <List>
        {options.map((o) => (
          <Row key={o.title} icon={o.icon} title={o.title} sub={o.sub} onClick={o.run} chevron />
        ))}
      </List>
    </Page>
  )
}
