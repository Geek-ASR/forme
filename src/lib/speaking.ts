// Speaking practice: picking sentences to shadow and scoring what speech recognition heard.
// Scoring is word by word and forgiving of what a recogniser can't know — capitals, punctuation,
// ß/ss, numbers written as digits — and of one-letter slips in longer words ("almost").

import { PHRASES } from '../data/german'
import type { Card } from './srs'
import type { SrsState } from './types'

export type Sentence = { de: string; en: string; from: 'yours' | 'deck' | 'phrase' }
export type WordMark = { text: string; mark: 'ok' | 'near' | 'miss' }

const fold = (s: string) => s.toLowerCase().replace(/ß/g, 'ss')
const NUM: Record<string, string> = Object.fromEntries(
  Object.entries({
    null: 0, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12,
    dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, hundert: 100,
  }).map(([w, n]) => [fold(w), String(n)]),
)
const norm = (w: string) => {
  const f = fold(w).replace(/[^\p{L}\p{N}]/gu, '')
  return NUM[f] ?? f
}

function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length]
}

/** 2 = same word, 1 = almost (a slip a recogniser makes from slightly-off pronunciation), 0 = different. */
function same(t: string, h: string): 0 | 1 | 2 {
  if (t === h) return 2
  if (t.length >= 4 && t[0] === h[0] && lev(t, h) <= (t.length >= 8 ? 2 : 1)) return 1
  return 0
}

/**
 * Aligns what was heard to the sentence (longest common subsequence) and marks every word.
 * Recognisers often split German compounds ("Warmmiete" → "warme Miete"), so one target word may
 * also match two heard words joined.
 */
export function scoreAttempt(target: string, heard: string): { marks: WordMark[]; score: number } {
  const shown = target.split(/\s+/).filter(Boolean)
  const T = shown.map(norm)
  const H = heard.split(/\s+/).map(norm).filter(Boolean)
  const one = (i: number, j: number) => (T[i] ? same(T[i], H[j]) : 0)
  const two = (i: number, j: number) => (T[i] && j + 1 < H.length && T[i].length >= 8 ? same(T[i], H[j] + H[j + 1]) : 0)
  const dp = Array.from({ length: T.length + 1 }, () => new Array<number>(H.length + 2).fill(0))
  for (let i = T.length - 1; i >= 0; i--) {
    for (let j = H.length - 1; j >= 0; j--) {
      const s1 = one(i, j)
      const s2 = two(i, j)
      dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], s1 ? dp[i + 1][j + 1] + s1 : 0, s2 ? dp[i + 1][j + 2] + s2 : 0)
    }
  }
  const marks: WordMark[] = shown.map((text) => ({ text, mark: 'miss' }))
  for (let i = 0, j = 0; i < T.length && j < H.length; ) {
    const s1 = one(i, j)
    const s2 = two(i, j)
    if (s1 && dp[i][j] === dp[i + 1][j + 1] + s1) {
      marks[i].mark = s1 === 2 ? 'ok' : 'near'
      i++
      j++
    } else if (s2 && dp[i][j] === dp[i + 1][j + 2] + s2) {
      marks[i].mark = s2 === 2 ? 'ok' : 'near'
      i++
      j += 2
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  marks.forEach((m, i) => !T[i] && (m.mark = 'ok')) // pure punctuation tokens
  const score = marks.reduce((s, m) => s + (m.mark === 'ok' ? 1 : m.mark === 'near' ? 0.6 : 0), 0) / Math.max(1, marks.length)
  return { marks, score }
}

/** The recogniser's alternatives can differ by a word — judge the attempt by the closest one. */
export function bestAttempt(target: string, texts: string[]) {
  return texts.map((t) => ({ heard: t, ...scoreAttempt(target, t) })).sort((a, b) => b.score - a.score)[0]
}

const TIPS: [RegExp, string][] = [
  [/ü/, 'ü — say “ee” with your lips rounded, as if whistling.'],
  [/ö/, 'ö — say the “e” of “bed” with rounded lips.'],
  [/ä/, 'ä — like the “e” in “bed”.'],
  [/(i|e|ä|ö|ü|l|n|r)ch/, 'ch after e, i, ä, ö, ü (or l, n, r) is soft — like the “h” in “huge”, not “k” or “sh”.'],
  [/(a|o|u)ch/, 'ch after a, o or u is throaty — like the Scottish “loch”.'],
  [/^(sp|st)/, 'sp / st at the start of a word sound “shp” / “sht” — Straße ≈ “shtrah-sse”.'],
  [/ei/, 'ei sounds like English “eye” — mein ≈ “mine”.'],
  [/ie/, 'ie is a long “ee” — Liebe ≈ “lee-be”.'],
  [/z/, 'z sounds “ts” — Zeit ≈ “tsite”.'],
  [/w/, 'w sounds like English “v” — Wasser ≈ “vasser”.'],
  [/^v/, 'v at the start of a word is usually “f” — Vater ≈ “fah-ter”.'],
  [/^j/, 'j sounds like English “y” — ja ≈ “yah”.'],
  [/r/, 'r sits at the back of the throat; at the end of a word it melts into “a” — Lehrer ≈ “leh-ra”.'],
]

/** One pronunciation hint for the words that didn't come through. */
export function tipFor(missed: string[]): string | null {
  for (const [re, tip] of TIPS) if (missed.some((w) => re.test(w.toLowerCase().replace(/[^\p{L}]/gu, '')))) return tip
  return null
}

/** Today's round: example sentences of words you've studied first, two survival phrases, the rest from your level's deck. */
export function pickSentences(deck: Card[], srs: SrsState[], seed: string, n = 8, maxWords = 9): Sentence[] {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const rand = () => ((h = (h * 1103515245 + 12345) >>> 0) / 2 ** 32)
  const shuffle = <T,>(a: T[]) => a.map((x) => [rand(), x] as const).sort((p, q) => p[0] - q[0]).map(([, x]) => x)
  const short = deck.filter((c) => c.x && c.y && c.x.split(/\s+/).length <= maxWords)
  const studied = new Set(srs.map((s) => s.id))
  const yours = shuffle(short.filter((c) => studied.has(c.i))).slice(0, Math.min(4, n - 2))
  const phrases = shuffle(PHRASES.flatMap((g) => g.items)).slice(0, 2)
  const used = new Set(yours.map((c) => c.i))
  const fill = shuffle(short.filter((c) => !used.has(c.i))).slice(0, n - yours.length - phrases.length)
  return shuffle([
    ...yours.map((c): Sentence => ({ de: c.x!, en: c.y!, from: 'yours' })),
    ...phrases.map(([de, en]): Sentence => ({ de, en, from: 'phrase' })),
    ...fill.map((c): Sentence => ({ de: c.x!, en: c.y!, from: 'deck' })),
  ])
}
