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

// ── once a day, with the first reminder: 120-day-challenge milestones and a token-expiry warning ──
const DAY = 86400000
const daysBetween = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / DAY)
const shift = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10)
const challengeDay = profile.planStart ? daysBetween(date, profile.planStart) + 1 : 0
const MILESTONES = {
  1: ['Day 1 of 120', "Today: weigh in, measure your waist and take the fitness test — the numbers you'll beat on Day 120."],
  30: ['Day 30 — one month in', 'Retest week: push-ups, plank, wall sit, chair stands. Compare with Day 1.'],
  60: ['Day 60 — halfway', 'Measure again and look at your weight trend. Stalled two weeks? Trim 100–150 kcal.'],
  90: ['Day 90 — three months', 'Retest week. The hardest variations start now.'],
  120: ['Day 120 — the finish line 🏁', 'Final weigh-in and fitness test — then open your letter.'],
}
const firstToday = (settings.reminders ?? []).filter((r) => r.enabled && (r.days ?? []).includes(dow)).map((r) => r.time).sort()[0]
if (!test && hm === firstToday) {
  const m = MILESTONES[challengeDay]
  if (m) due.push({ id: 'milestone', label: m[0], body: m[1], url: '#/challenge', kind: 'milestone' })
  const exp = settings.tokenExpires
  const left = exp && exp !== 'never' ? daysBetween(exp, date) : null
  if (left !== null && left <= 5 && left >= -7) {
    due.push({
      id: 'token',
      label: left < 0 ? 'Forme has stopped saving to GitHub' : `Your GitHub key expires ${left === 0 ? 'today' : `in ${left} day${left === 1 ? '' : 's'}`}`,
      body: 'Make a new token with the same settings, then Settings → Change token. Nothing is lost.',
      url: '#/me/settings',
      kind: 'token',
    })
  }
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
const meals = new Set([...food.map((f) => f.meal), ...(day.skipped ?? [])]) // a skipped meal counts as logged

// Notification buttons (Android shows up to 2). `op` is logged by the service worker without opening the app.
const DONE = (id) => [{ action: 'done', title: 'Done ✓', op: { type: 'check', id } }]

function skinTonight() {
  if (day.skinIrritated) return 'rest'
  const products = settings.skincare?.products ?? []
  const ret = products.find((p) => p.role === 'retinoid' && p.have)?.openedOn
  const days = (a, b) => Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 86400000)
  const weeks = profile.skinStart ? Math.floor(days(date, profile.skinStart) / 7) : 0
  const sa = ret && date >= ret ? [1, 3, 5] : weeks < 2 ? [1, 3, 5] : [0, 1, 3, 5]
  if (sa.includes(dow)) return 'bha'
  const rt = !ret || date < ret ? [] : days(date, ret) < 14 ? [2, 6] : [2, 4, 6]
  return rt.includes(dow) ? 'retinoid' : 'arbutin'
}

function personalise(r) {
  switch (r.kind) {
    case 'mobility':
      if (acts.some((a) => a.kind === 'mobility') || checks.mobility) return null
      if ((day.pain ?? 0) >= 6 || day.flare) return { ...r, body: 'Rough day? Flare care is eight gentle minutes.', url: '#/body/workout/flare' }
      return { ...r, actions: [{ action: 'done', title: 'Did it ✓', op: { type: 'session', id: 'mobility' } }] }
    case 'skin-am':
      return checks['skin-am'] ? null : { ...r, actions: DONE('skin-am') }
    case 'skin-pm': {
      if (checks['skin-pm']) return null
      const n = skinTonight()
      const body = {
        bha: 'Salicylic acid night: cleanse → SA serum → moisturiser → lip balm.',
        arbutin: 'Alpha arbutin night: cleanse → arbutin → moisturiser → lip balm.',
        retinoid: 'Retinoid night: cleanse → pea-sized retinoid on dry skin → moisturiser.',
        rest: 'Recovery night: cleanse gently and moisturise only.',
      }[n]
      return { ...r, body, actions: DONE('skin-pm') }
    }
    case 'workout': {
      if (day.flare || checks.workout || acts.some((a) => a.kind !== 'mobility')) return null
      // same thresholds as the app's readiness check (src/lib/readiness.ts)
      const pain = day.pain ?? 0
      const stiff = day.stiffMin ?? 0
      if (pain >= 7 || stiff >= 120) return { ...r, body: 'Rough day for your back — flare care is eight gentle minutes. Movement helps; intensity can wait.', url: '#/body/workout/flare' }
      if (pain >= 4 || stiff >= 60) {
        const why = pain >= 4 ? `Pain ${pain}/10 today` : `${stiff} min of stiffness this morning`
        return { ...r, body: `${why} — the easy version is ready: fewer sets, gentler moves.`, url: '#/' }
      }
      return r
    }
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
      return {
        ...r,
        body: `${(ml / 1000).toFixed(1)} L so far today — have a glass now.`,
        actions: [
          { action: 'w250', title: '+250 ml', op: { type: 'water', ml: 250 } },
          { action: 'w500', title: '+500 ml', op: { type: 'water', ml: 500 } },
        ],
      }
    }
    case 'weekly': {
      // Sunday: the last seven days in one line, read straight from the repo.
      const week = Array.from({ length: 7 }, (_, i) => shift(date, -i))
      const months = [...new Set(week.map((d) => d.slice(0, 7)))]
      const rows = (dir) => months.flatMap((m) => read(`data/${dir}/${m}.json`))
      const wDays = rows('days').filter((x) => week.includes(x.id))
      const wFood = rows('food').filter((x) => week.includes(x.date))
      const wActs = rows('activity').filter((x) => week.includes(x.date))
      const shown = week.filter((d) => wFood.some((f) => f.date === d) || wActs.some((a) => a.date === d) || wDays.some((x) => x.id === d && (x.mood || x.steps || x.waterMl || x.closedAt))).length
      const workouts = wActs.filter((a) => a.kind !== 'mobility').length
      const steps = wDays.map((x) => x.steps).filter(Boolean)
      const avg = steps.length ? Math.round(steps.reduce((s, v) => s + v, 0) / steps.length) : 0
      const lead = challengeDay >= 1 && challengeDay <= 120 ? `Day ${challengeDay} of 120. ` : ''
      return { ...r, body: `${lead}Last 7 days: showed up ${shown}/7, ${workouts} workout${workouts === 1 ? '' : 's'}${avg ? `, ~${avg.toLocaleString('en-IN')} steps a day` : ''}. Weigh in, then a 2-minute look back.` }
    }
    case 'evening': {
      if (day.closedAt) return null
      const n = food.length ? new Set(food.map((f) => f.meal)).size : 0
      return n ? { ...r, body: `${n} meal${n > 1 ? 's' : ''} logged · ${kcal} kcal so far. 30 seconds to close the day.` } : r
    }
    default:
      return r
  }
}

const toSend = due.map(personalise).filter(Boolean)
let sent = 0
for (const r of toSend) {
  const payload = JSON.stringify({ title: r.label, body: r.body ?? '', url: r.url ?? '#/', tag: r.id, date, actions: r.actions ?? [] })
  for (const s of subs) {
    try {
      // high urgency: delivered on time even when Android is dozing; a reminder older than 2 h is dropped
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 2 * 3600, urgency: 'high' })
      sent++
      console.log(`sent "${r.label}" → ${s.device}`)
    } catch (e) {
      console.log(`failed "${r.label}" → ${s.device}: ${e.statusCode ?? ''} ${(e.body ?? e.message ?? '').toString().slice(0, 140)}`)
      if (e.statusCode === 404 || e.statusCode === 410) console.log('  (this device unsubscribed — re-enable notifications on it in Forme)')
    }
  }
}
console.log(`${hm} ${tz}: ${toSend.length} reminder(s), ${sent} notification(s) sent, ${due.length - toSend.length} skipped as already done.`)
