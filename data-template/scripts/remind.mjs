// Sends Forme reminders as Web Push notifications. Runs in GitHub Actions (see .github/workflows/reminders.yml).
// "Smart" reminders read today's data first and skip themselves when the thing is already done.

import fs from 'node:fs'
import webpush from 'web-push'

const read = (path) => {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8')).records.filter((r) => !r.deleted)
  } catch {
    return []
  }
}

const settings = read('data/settings.json').find((r) => r.id === 'main') ?? {}
const profile = read('data/profile.json').find((r) => r.id === 'main') ?? {}
const subs = read('data/push.json')
const tz = profile.timezone || 'Asia/Kolkata'

if (!subs.length) {
  console.log('No devices have enabled notifications yet.')
  process.exit(0)
}
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error('Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY secrets.')
  process.exit(1)
}
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)

// ── which local time is this run for? ──
// Use the cron's intended time (not the actual start, which GitHub may delay).
const now = process.env.NOW_ISO ? new Date(process.env.NOW_ISO) : new Date() // NOW_ISO: for testing only
let when = now
if (process.env.EVENT === 'schedule' && process.env.SCHEDULE) {
  const [m, h] = process.env.SCHEDULE.split(' ').map(Number)
  const t = new Date(now)
  t.setUTCHours(h, m, 0, 0)
  if (t.getTime() > now.getTime() + 60_000) t.setUTCDate(t.getUTCDate() - 1)
  when = t
}
const parts = Object.fromEntries(
  new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
    .formatToParts(when)
    .map((p) => [p.type, p.value]),
)
const date = `${parts.year}-${parts.month}-${parts.day}`
const hm = `${parts.hour}:${parts.minute}`
const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)

const test = process.env.EVENT === 'workflow_dispatch'
const due = test
  ? [{ id: 'test', label: 'Forme', body: 'Reminders are working on this device 🎉', url: '#/' }]
  : (settings.reminders ?? []).filter((r) => r.enabled && r.time === hm && (r.days ?? []).includes(dow))

if (!due.length) {
  console.log(`Nothing due at ${hm} (${tz}).`)
  process.exit(0)
}

// ── today's context ──
const month = date.slice(0, 7)
const day = read(`data/days/${month}.json`).find((r) => r.id === date) ?? {}
const food = read(`data/food/${month}.json`).filter((r) => r.date === date)
const acts = read(`data/activity/${month}.json`).filter((r) => r.date === date)
const deMin = read(`data/german-log/${month}.json`)
  .filter((r) => r.date === date)
  .reduce((s, r) => s + (r.minutes || 0), 0)
const cardsDue = read('data/german-srs.json').filter((s) => s.due <= date).length
const targets = { kcal: 1650, protein: 100, waterMl: 3000, germanMinutes: 20, ...(settings.targets ?? {}) }
const checks = day.checks ?? {}
const kcal = Math.round(food.reduce((s, f) => s + (f.kcal || 0), 0))
const meals = new Set(food.map((f) => f.meal))

function skinTonight() {
  if (day.skinIrritated) return 'rest'
  const start = profile.skinStart ? new Date(profile.skinStart + 'T00:00:00Z') : new Date(date + 'T00:00:00Z')
  const weeks = Math.floor((new Date(date + 'T00:00:00Z') - start) / (7 * 86400000))
  const nights = weeks < 2 ? [1, 4] : weeks < 5 ? [1, 3, 5] : [0, 1, 3, 5]
  return nights.includes(dow) ? 'bha' : 'arbutin'
}

function personalise(r) {
  switch (r.kind) {
    case 'mobility':
      if (acts.some((a) => a.kind === 'mobility')) return null
      if ((day.pain ?? 0) >= 6 || day.flare) return { ...r, body: 'Rough day? Flare care is eight gentle minutes.', url: '#/body/workout/flare' }
      return r
    case 'skin-am':
      return checks['skin-am'] ? null : r
    case 'skin-pm': {
      if (checks['skin-pm']) return null
      const n = skinTonight()
      const body = n === 'bha' ? 'Salicylic acid night: cleanse → SA serum → moisturiser → lip balm.' : n === 'arbutin' ? 'Alpha arbutin night: cleanse → arbutin → moisturiser → lip balm.' : 'Recovery night: cleanse and moisturise only.'
      return { ...r, body }
    }
    case 'workout':
      if (day.flare || acts.some((a) => a.kind !== 'mobility')) return null
      return r
    case 'german':
      if (deMin >= targets.germanMinutes) return null
      return { ...r, body: cardsDue ? `${cardsDue} cards are due · ${targets.germanMinutes - deMin} min to today's goal.` : r.body }
    case 'food': {
      const want = r.id === 'r-lunch' ? 'lunch' : r.id === 'r-dinner' ? 'dinner' : null
      if (want ? meals.has(want) : meals.size >= 3) return null
      return { ...r, body: kcal ? `${kcal} kcal logged so far today. What did you eat?` : r.body }
    }
    case 'water': {
      const ml = day.waterMl ?? 0
      if (ml >= targets.waterMl * 0.6) return null
      return { ...r, body: `${(ml / 1000).toFixed(1)} L so far today — have a glass now.` }
    }
    default:
      return r
  }
}

const toSend = due.map(personalise).filter(Boolean)
let sent = 0
for (const r of toSend) {
  const payload = JSON.stringify({ title: r.label, body: r.body ?? '', url: r.url ?? '#/', tag: r.id })
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 3 * 3600, urgency: 'normal' })
      sent++
      console.log(`sent "${r.label}" → ${s.device}`)
    } catch (e) {
      console.log(`failed "${r.label}" → ${s.device}: ${e.statusCode ?? ''} ${(e.body ?? e.message ?? '').toString().slice(0, 140)}`)
      if (e.statusCode === 404 || e.statusCode === 410) console.log('  (this device unsubscribed — re-enable notifications on it in Forme)')
    }
  }
}
console.log(`${hm} ${tz}: ${toSend.length} reminder(s), ${sent} notification(s) sent, ${due.length - toSend.length} skipped as already done.`)
