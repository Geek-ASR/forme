// Spaced repetition (SM-2 style). Grades: 0 Again · 1 Hard · 2 Good · 3 Easy.
// Cards come from the Deutschpfad decks (lazy-loaded per level) plus your own words.

import { addDays, dkey } from './date'
import type { CustomWord, Level, SrsState } from './types'

export type Card = {
  i: string
  d: string // German
  e: string // English
  s?: string // part of speech
  t?: string // topic
  a?: 'der' | 'die' | 'das'
  p?: string // plural
  x?: string // example (de)
  y?: string // example (en)
}

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1']

const deckCache = new Map<Level, Promise<Card[]>>()

export function loadDeck(level: Level): Promise<Card[]> {
  let p = deckCache.get(level)
  if (!p) {
    p = fetch(`./deutsch/${level.toLowerCase()}.json`)
      .then((r) => {
        if (!r.ok) throw new Error('deck')
        return r.json()
      })
      .then((j: { cards: Card[] }) => j.cards)
      .catch(() => {
        deckCache.delete(level)
        return []
      })
    deckCache.set(level, p)
  }
  return p
}

/** Your level plus every level below it */
export async function loadDecksUpTo(level: Level): Promise<Card[]> {
  const idx = LEVELS.indexOf(level)
  const decks = await Promise.all(LEVELS.slice(0, idx + 1).map(loadDeck))
  return decks.flat()
}

export function customToCard(w: CustomWord): Card {
  return { i: 'w:' + w.id, d: w.de, e: w.en, a: w.art as Card['a'], p: w.pl, x: w.ex, s: w.art ? 'noun' : '', t: 'my words' }
}

export type Grade = 0 | 1 | 2 | 3

export function schedule(prev: SrsState | undefined, id: string, grade: Grade, today = dkey()): Omit<SrsState, 'updatedAt'> {
  const s = prev ?? { id, ease: 2.5, ivl: 0, due: today, reps: 0, lapses: 0 }
  let { ease, ivl, reps, lapses } = s
  if (reps === 0) {
    ivl = grade === 0 ? 0 : grade === 3 ? 4 : 1
    if (grade === 1) ease -= 0.15
    if (grade === 3) ease += 0.15
  } else if (grade === 0) {
    lapses++
    ease -= 0.2
    ivl = 1
  } else if (grade === 1) {
    ease -= 0.15
    ivl = Math.max(1, Math.round(ivl * 1.2))
  } else if (grade === 2) {
    ivl = Math.max(ivl + 1, Math.round(ivl * ease))
  } else {
    ease += 0.15
    ivl = Math.max(ivl + 2, Math.round(ivl * ease * 1.3))
  }
  ease = Math.min(3, Math.max(1.3, ease))
  ivl = Math.min(365, ivl)
  return { id, ease, ivl, reps: grade === 0 ? reps : reps + 1, lapses, due: addDays(today, ivl), last: today, intro: prev?.intro ?? today }
}

export function intervalLabel(prev: SrsState | undefined, grade: Grade): string {
  const n = schedule(prev, 'x', grade).ivl
  if (n === 0) return 'now'
  if (n < 30) return `${n}d`
  if (n < 365) return `${Math.round(n / 30)}mo`
  return '1y'
}

/** Article colours: der mocha, die amber, das gold (theme-aware tokens). */
export const ART_COLOR: Record<string, string> = {
  der: 'text-der',
  die: 'text-die',
  das: 'text-das',
}
