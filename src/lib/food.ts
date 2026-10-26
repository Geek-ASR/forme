// Food search + natural-language meal parser.
// "2 roti, 1 katori dal tadka, half plate jeera rice and a glass of chaas" → matched dishes with portions.

import { FOODS, type Food } from '../data/foods'
import type { CustomFood, FoodEntry, Meal } from './types'

export function customToFood(c: CustomFood): Food {
  return {
    id: 'c:' + c.id,
    name: c.name,
    aliases: (c.aliases ?? '').split('|').map((a) => a.trim()).filter(Boolean),
    unit: c.unit,
    g: c.g,
    kcal: c.kcal,
    p: c.p,
    c: c.c,
    f: c.f,
    fb: c.fb ?? 0,
    cat: 'My dishes',
  }
}

export function foodList(custom: CustomFood[]): Food[] {
  return [...custom.map(customToFood), ...FOODS]
}

// ── normalisation ──
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Loose phonetic key so "paneer/panir", "bhaji/bhajji", "chapathi/chapati" meet. */
const phon = (s: string) =>
  norm(s)
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/w/g, 'v')
    .replace(/ph/g, 'f')
    .replace(/q/g, 'k')
    .replace(/ck/g, 'k')
    .replace(/([a-z])\1+/g, '$1')
    .replace(/([kgcjtdpb])h/g, '$1')

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>()
  for (let i = 0; i < s.length - 1; i++) {
    const b = s.slice(i, i + 2)
    m.set(b, (m.get(b) ?? 0) + 1)
  }
  return m
}

function dice(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const A = bigrams(a)
  const B = bigrams(b)
  let inter = 0
  for (const [k, v] of A) inter += Math.min(v, B.get(k) ?? 0)
  return (2 * inter) / (a.length - 1 + b.length - 1)
}

function keyScore(q: string, key: string): number {
  if (!q || !key) return 0
  if (q === key) return 1
  if (key.startsWith(q + ' ') || (key.startsWith(q) && q.length >= 3)) return 0.93 - Math.min(0.15, (key.length - q.length) * 0.008)
  const qt = q.split(' ')
  const kt = key.split(' ')
  let hit = 0
  for (const t of qt) {
    if (kt.includes(t)) hit += 1
    else if (kt.some((k) => (k.startsWith(t) && t.length >= 3) || (t.startsWith(k) && k.length >= 4))) hit += 0.75
    else if (kt.some((k) => k.length >= 4 && t.length >= 4 && dice(k, t) >= 0.7)) hit += 0.6
  }
  const cov = hit / qt.length
  const keyCov = Math.min(1, hit / kt.length)
  const tok = cov * 0.7 + keyCov * 0.2
  const d = dice(q.replace(/ /g, ''), key.replace(/ /g, ''))
  return Math.max(tok, d * 0.88)
}

type Indexed = { food: Food; keys: string[] }
let indexCache: { list: Food[]; idx: Indexed[] } | null = null

function index(foods: Food[]): Indexed[] {
  if (indexCache?.list === foods) return indexCache.idx
  const idx = foods.map((food) => ({ food, keys: [food.name, ...food.aliases].map(phon) }))
  indexCache = { list: foods, idx }
  return idx
}

export function searchFoods(query: string, foods: Food[], limit = 8): { food: Food; score: number }[] {
  const q = phon(query)
  if (!q) return []
  const out: { food: Food; score: number }[] = []
  for (const { food, keys } of index(foods)) {
    let best = 0
    for (const k of keys) best = Math.max(best, keyScore(q, k))
    if (food.cat === 'My dishes') best = Math.min(1, best + 0.03)
    if (best >= 0.34) out.push({ food, score: best })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

// ── quantities & units ──
const NUMWORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, ek: 1, single: 1, two: 2, do: 2, don: 2, three: 3, teen: 3, four: 4, char: 4, chaar: 4,
  five: 5, paanch: 5, pach: 5, panch: 5, six: 6, chhe: 6, saha: 6, seven: 7, saat: 7, eight: 8, aath: 8, nine: 9, ten: 10,
  half: 0.5, aadha: 0.5, adha: 0.5, ardha: 0.5, ardhi: 0.5, quarter: 0.25, dedh: 1.5, didh: 1.5, dhai: 2.5, adich: 2.5,
  couple: 2, few: 3,
}

type Unit = { kind: string; g?: number }
const U = (kind: string, g?: number): Unit => ({ kind, g })
const UNITS: Record<string, Unit> = {
  katori: U('katori', 150), katoris: U('katori', 150), vati: U('katori', 150), wati: U('katori', 150), vatya: U('katori', 150),
  bowl: U('bowl', 200), bowls: U('bowl', 200),
  plate: U('plate', 250), plates: U('plate', 250), thali: U('thali'),
  glass: U('glass', 250), glasses: U('glass', 250), cup: U('cup', 150), cups: U('cup', 150), mug: U('cup', 250),
  tbsp: U('tbsp', 15), tablespoon: U('tbsp', 15), tablespoons: U('tbsp', 15), chamcha: U('tbsp', 15),
  tsp: U('tsp', 5), teaspoon: U('tsp', 5), teaspoons: U('tsp', 5), spoon: U('tsp', 5), spoons: U('tsp', 5), chamach: U('tsp', 5),
  scoop: U('scoop', 30), scoops: U('scoop', 30), handful: U('handful', 30), handfuls: U('handful', 30), mutthi: U('handful', 30), muth: U('handful', 30),
  g: U('g', 1), gm: U('g', 1), gms: U('g', 1), gram: U('g', 1), grams: U('g', 1), kg: U('g', 1000),
  ml: U('ml', 1), l: U('ml', 1000), litre: U('ml', 1000), liter: U('ml', 1000),
  piece: U('count'), pieces: U('count'), pc: U('count'), pcs: U('count'), nos: U('count'), no: U('count'),
  slice: U('count'), slices: U('count'), serving: U('count'), servings: U('count'), portion: U('count'),
  can: U('count'), bottle: U('count'), pack: U('count'), packet: U('count'), peg: U('count'), pegs: U('count'),
}
const SIZES: Record<string, number> = { small: 0.75, chota: 0.75, chhota: 0.75, lahan: 0.75, medium: 1, regular: 1, large: 1.3, big: 1.3, bada: 1.3, motha: 1.3, full: 1, heaped: 1.2 }
const FILLER = new Set(['of', 'x', 'some', 'little', 'thoda', 'thodi', 'had', 'ate', 'i', 'my', 'with', 'the'])

/** "1 katori" → { n: 1, word: 'katori' }; "100 g" → { n: 100, word: 'g' } */
export function servingParts(unit: string): { n: number; word: string } {
  const m = unit.match(/^([\d.]+)\s*(.*)$/)
  return m ? { n: parseFloat(m[1]), word: m[2] || 'serving' } : { n: 1, word: unit }
}

function servingKind(food: Food): string {
  const w = servingParts(food.unit).word.split(' ')[0]
  if (w === 'g' || w === 'ml') return w
  return UNITS[w]?.kind ?? 'count'
}

export function multiplier(food: Food, qty: number, unit: Unit | null, size: number): number {
  let m: number
  if (!unit || unit.kind === 'count') m = qty * size
  else if (unit.kind === 'g' || unit.kind === 'ml') m = food.g ? (qty * (unit.g ?? 1)) / food.g : qty
  else if (servingKind(food) === unit.kind) m = qty * size
  else if (unit.g && food.g) m = (qty * unit.g * size) / food.g
  else m = qty * size
  return Math.max(0.1, Math.min(30, Math.round(m * 100) / 100))
}

export type ParsedItem = {
  raw: string
  query: string
  qty: number
  unit: Unit | null
  size: number
  matches: { food: Food; score: number }[]
}

function splitGlued(tokens: string[]): string[] {
  const out: string[] = []
  for (const t of tokens) {
    const m = t.match(/^(\d+(?:\.\d+)?)([a-z]+)$/) // 200g, 2pcs
    const x = t.match(/^x(\d+(?:\.\d+)?)$/) // x2
    if (m && (UNITS[m[2]] || m[2] === 'x')) out.push(m[1], ...(m[2] === 'x' ? [] : [m[2]]))
    else if (x) out.push(x[1])
    else out.push(t)
  }
  return out
}

function readQty(t: string): number | null {
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t)
  const fr = t.match(/^(\d+)\/(\d+)$/)
  if (fr && +fr[2]) return +fr[1] / +fr[2]
  const rg = t.match(/^(\d+)-(\d+)$/)
  if (rg) return (+rg[1] + +rg[2]) / 2
  return NUMWORDS[t] ?? null
}

export function parseSegment(seg: string, foods: Food[]): ParsedItem | null {
  const cleaned = seg
    .toLowerCase()
    .replace(/½/g, ' 0.5 ')
    .replace(/¼/g, ' 0.25 ')
    .replace(/¾/g, ' 0.75 ')
    .replace(/[^a-z0-9./\- ]+/g, ' ')
  let tokens = splitGlued(cleaned.split(/\s+/).filter(Boolean))
  let qty = 1
  let qtySet = false
  let unit: Unit | null = null
  let size = 1
  const eat = (fromEnd: boolean) => {
    while (tokens.length > 1) {
      const t = fromEnd ? tokens[tokens.length - 1] : tokens[0]
      const q = readQty(t)
      if (q !== null && !qtySet) {
        qty = q
        qtySet = true
      } else if (UNITS[t] && !unit) unit = UNITS[t]
      else if (SIZES[t] !== undefined) size = SIZES[t]
      else if (FILLER.has(t)) {
        /* skip */
      } else break
      tokens = fromEnd ? tokens.slice(0, -1) : tokens.slice(1)
    }
  }
  eat(false)
  eat(true)
  // "half" written after a number: "1 and half" is handled by segment split; "1.5" works directly.
  const query = tokens.join(' ').trim()
  if (!query || /^\d+$/.test(query)) return null
  return { raw: seg.trim(), query, qty, unit, size, matches: searchFoods(query, foods, 4) }
}

export function parseMeal(text: string, foods: Food[]): ParsedItem[] {
  return text
    .split(/,|;|\n|\+|&|\band\b|\bwith\b|\baur\b|\bani\b|\bplus\b|\bthen\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
    .map((s) => parseSegment(s, foods))
    .filter((x): x is ParsedItem => !!x)
}

// ── nutrients & display ──
export function nutrients(food: Food, mult: number) {
  const r = (v: number) => Math.round(v * mult * 10) / 10
  return { kcal: Math.round(food.kcal * mult), p: r(food.p), c: r(food.c), f: r(food.f), fb: r(food.fb) }
}

const FRAC: [number, string][] = [
  [0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [0.75, '¾'],
]
export function fmtQty(q: number): string {
  const whole = Math.floor(q + 1e-9)
  const frac = q - whole
  if (frac < 0.04) return String(whole)
  for (const [v, s] of FRAC) if (Math.abs(frac - v) < 0.04) return whole ? `${whole}${s}` : s
  return String(Math.round(q * 10) / 10)
}

const PLURAL: Record<string, string> = { piece: 'pieces', slice: 'slices', katori: 'katoris', bowl: 'bowls', plate: 'plates', glass: 'glasses', cup: 'cups', scoop: 'scoops', handful: 'handfuls', serving: 'servings', medium: 'medium', thali: 'thalis', roll: 'rolls', sandwich: 'sandwiches', pack: 'packs', can: 'cans', bottle: 'bottles', peg: 'pegs', tbsp: 'tbsp', tsp: 'tsp' }

/** 1.5 × "1 katori" → "1½ katoris"; 2 × "100 g" → "200 g" */
export function portionText(mult: number, unit: string): string {
  const { n, word } = servingParts(unit)
  const amount = mult * n
  if (word === 'g' || word === 'ml') return `${Math.round(amount)} ${word}`
  const first = word.split(' ')[0]
  const w = amount > 1.04 && PLURAL[first] ? [PLURAL[first], ...word.split(' ').slice(1)].join(' ') : word
  return `${fmtQty(amount)} ${w}`
}

export function entryFromFood(food: Food, mult: number, date: string, meal: Meal): Omit<FoodEntry, 'id' | 'updatedAt'> {
  return { date, meal, foodId: food.id, name: food.name, qty: mult, unit: food.unit, at: Date.now(), ...nutrients(food, mult) }
}

export type Totals = { kcal: number; p: number; c: number; f: number; fb: number }
export function sumEntries(entries: Pick<FoodEntry, 'kcal' | 'p' | 'c' | 'f' | 'fb'>[]): Totals {
  return entries.reduce<Totals>(
    (a, e) => ({ kcal: a.kcal + (e.kcal || 0), p: a.p + (e.p || 0), c: a.c + (e.c || 0), f: a.f + (e.f || 0), fb: a.fb + (e.fb || 0) }),
    { kcal: 0, p: 0, c: 0, f: 0, fb: 0 },
  )
}

/**
 * Protein to close today's gap: dense vegetarian picks (≥ 6 g a serving, ≥ 6 g per 100 kcal) that fit
 * the calories left — foods you already eat first. Over budget, only the leanest (≥ 10 g per 100 kcal).
 */
export function proteinIdeas(foods: Food[], history: FoodEntry[], kcalLeft: number, n = 6): Food[] {
  const eaten = new Map<string, number>()
  for (const e of history) if (e.foodId) eaten.set(e.foodId, (eaten.get(e.foodId) ?? 0) + 1)
  const lean = kcalLeft < 150
  const familiar = (f: Food) => ((eaten.get(f.id) ?? 0) >= 2 ? 1 : 0)
  return foods
    .filter((f) => f.p >= 6 && f.p / f.kcal >= (lean ? 0.1 : 0.06) && f.kcal <= Math.max(kcalLeft, 150))
    .sort((a, b) => familiar(b) - familiar(a) || b.p / b.kcal - a.p / a.kcal)
    .slice(0, n)
}
