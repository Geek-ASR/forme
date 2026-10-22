// Dates are stored as local calendar keys ("YYYY-MM-DD") so a day means the day you lived it,
// regardless of UTC. Day arithmetic goes through local Date objects (DST-safe with rounding).

export const pad = (n: number) => String(n).padStart(2, '0')

export function dkey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(k: string, n: number): string {
  const d = parseKey(k)
  d.setDate(d.getDate() + n)
  return dkey(d)
}

/** a − b in whole days */
export function diffDays(a: string, b: string): number {
  return Math.round((parseKey(a).getTime() - parseKey(b).getTime()) / 86400000)
}

/** 0 = Sunday … 6 = Saturday */
export const weekday = (k: string) => parseKey(k).getDay()

export function rangeKeys(from: string, to: string): string[] {
  const out: string[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

export function lastNDays(n: number, end = dkey()): string[] {
  return rangeKeys(addDays(end, -(n - 1)), end)
}

/** Monday of the week containing k */
export function weekStart(k: string): string {
  const wd = weekday(k)
  return addDays(k, wd === 0 ? -6 : 1 - wd)
}

/** ISO week id like 2026-W43 */
export function isoWeek(k: string): string {
  const d = parseKey(k)
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${pad(week)}`
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const dowShort = (i: number) => DOW[i]
export const dowLong = (i: number) => DOW_LONG[i]
export const monShort = (i: number) => MON[i]

/** "Thu, 22 Oct" */
export function fmtDay(k: string): string {
  const d = parseKey(k)
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`
}

/** "22 Oct 2026" */
export function fmtLong(k: string): string {
  const d = parseKey(k)
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`
}

/** "Today", "Yesterday", "Tomorrow" or "Thu, 22 Oct" */
export function fmtRel(k: string, today = dkey()): string {
  const n = diffDays(k, today)
  if (n === 0) return 'Today'
  if (n === -1) return 'Yesterday'
  if (n === 1) return 'Tomorrow'
  return fmtDay(k)
}

export function hm(d: Date = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "07:30" → "7:30 am" */
export function fmtTime(t?: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${pad(m)} ${ap}`
}

export function minutesOf(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function greeting(d = new Date()): string {
  const h = d.getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Good night'
}

export function relTime(ms: number, now = Date.now()): string {
  const s = Math.round((now - ms) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

/** Whole-day time-of-day bucket used to preselect meals */
export function mealFor(d = new Date()): 'breakfast' | 'lunch' | 'snack' | 'dinner' {
  const h = d.getHours() + d.getMinutes() / 60
  if (h < 11) return 'breakfast'
  if (h < 15.5) return 'lunch'
  if (h < 19) return 'snack'
  return 'dinner'
}
