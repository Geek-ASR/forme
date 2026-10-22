// Optional public blog. Everything is private by default; "Publish" copies one piece of writing
// to the `posts` branch of the public site repo, where the public blog page reads it.

import { getToken } from './auth'
import { PUBLIC_REPO } from './config'
import { GitHub } from './github'
import { excerpt, slugify, wordCount } from './md'
import type { Post } from './types'

export type PublicIndexEntry = { slug: string; title: string; type: string; date: string; excerpt: string; words: number }
export type PublicPost = { slug: string; title: string; type: string; date: string; body: string; tags?: string[] }

function client() {
  const token = getToken()
  if (!token) throw new Error('Connect GitHub to publish.')
  return new GitHub(PUBLIC_REPO.owner, PUBLIC_REPO.repo, PUBLIC_REPO.branch, token)
}

async function readIndex(gh: GitHub): Promise<{ posts: PublicIndexEntry[] }> {
  const text = await gh.readFile('index.json')
  try {
    return text ? JSON.parse(text) : { posts: [] }
  } catch {
    return { posts: [] }
  }
}

export const postTitle = (p: Post) => p.title?.trim() || excerpt(p.body, 60) || 'Untitled'

export async function publishPost(post: Post): Promise<string> {
  const gh = client()
  const index = await readIndex(gh)
  let slug = post.slug
  if (!slug) {
    const base = slugify(postTitle(post))
    slug = base
    let n = 2
    while (index.posts.some((p) => p.slug === slug)) slug = `${base}-${n++}`
  }
  const entry: PublicIndexEntry = { slug, title: postTitle(post), type: post.type, date: post.date, excerpt: excerpt(post.body, 200), words: wordCount(post.body) }
  const body: PublicPost = { slug, title: entry.title, type: post.type, date: post.date, body: post.body, tags: post.tags }
  index.posts = [entry, ...index.posts.filter((p) => p.slug !== slug)].sort((a, b) => (a.date < b.date ? 1 : -1))
  await gh.commitFiles(`publish: ${slug}`, [
    { path: 'index.json', mode: '100644', type: 'blob', content: JSON.stringify(index, null, 1) + '\n' },
    { path: `posts/${slug}.json`, mode: '100644', type: 'blob', content: JSON.stringify(body, null, 1) + '\n' },
  ])
  return slug
}

export async function unpublishPost(post: Post): Promise<void> {
  if (!post.slug) return
  const gh = client()
  const index = await readIndex(gh)
  index.posts = index.posts.filter((p) => p.slug !== post.slug)
  await gh.commitFiles(`unpublish: ${post.slug}`, [
    { path: 'index.json', mode: '100644', type: 'blob', content: JSON.stringify(index, null, 1) + '\n' },
    { path: `posts/${post.slug}.json`, mode: '100644', type: 'blob', sha: null },
  ])
}

export const publicUrl = (slug: string) => `${location.origin}${location.pathname}#/p/${slug}`
