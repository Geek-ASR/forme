// Reminders = Web Push sent by a scheduled GitHub Action in the private data repo.
// The app stores the push subscription in the repo and rewrites the workflow's cron lines
// whenever reminder times change. Cron runs in UTC, so every local time is converted for both
// standard and daylight-saving offsets of your timezone; the sender script keeps only the match.

import { useEffect, useState } from 'react'
import { getConn, getToken } from './auth'
import { VAPID_PUBLIC_KEY } from './config'
import { GitHub, GitHubError } from './github'
import { put, setRaw } from './store'
import { syncNow } from './sync'
import type { PushSub, Reminder } from './types'

export const WORKFLOW_PATH = '.github/workflows/reminders.yml'

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

function urlB64ToUint8Array(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function deviceName(): string {
  const ua = navigator.userAgent
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua)) return 'iPad'
  if (/android/i.test(ua)) return 'Android'
  if (/mac os/i.test(ua)) return 'Mac'
  if (/windows/i.test(ua)) return 'Windows'
  return 'Browser'
}

async function subId(endpoint: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return 'p' + [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

export async function enablePush(): Promise<string> {
  if (!pushSupported()) throw new Error('This browser does not support push notifications.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications were not allowed. You can enable them in your browser/site settings.')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource })
  }
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const id = await subId(json.endpoint)
  put<PushSub>('push', { id, endpoint: json.endpoint, keys: json.keys, device: deviceName(), createdAt: Date.now() })
  window.dispatchEvent(new Event('forme:subscribed'))
  return id
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription()
  if (sub) await sub.unsubscribe()
}

export const notificationsBlocked = () => pushSupported() && Notification.permission === 'denied'

/** The endpoint of this device's subscription, once it is also saved in the repo (null = not set up). */
export function useThisDevice(subs: PushSub[]): PushSub | null | undefined {
  const [endpoint, setEndpoint] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    const check = () => currentSubscription().then((s) => alive && setEndpoint(s?.endpoint ?? null))
    check()
    window.addEventListener('forme:subscribed', check)
    return () => {
      alive = false
      window.removeEventListener('forme:subscribed', check)
    }
  }, [])
  if (endpoint === undefined) return undefined
  return (endpoint && subs.find((s) => s.endpoint === endpoint)) || null
}

// The service worker notes the last notification it showed on this device (Cache Storage),
// so the app can tell "reminders reach this phone" apart from "reminders were sent".
export type PushLog = { at: number; tag?: string; title?: string }
const PUSH_LOG = '__forme/last-push'

export async function lastPush(): Promise<PushLog | null> {
  try {
    const c = await caches.open('forme-runtime')
    const r = await c.match(new URL(PUSH_LOG, location.origin + location.pathname).href)
    return r ? ((await r.json()) as PushLog) : null
  } catch {
    return null
  }
}

export function useLastPush(): PushLog | null | undefined {
  const [log, setLog] = useState<PushLog | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    const read = () => lastPush().then((l) => alive && setLog(l))
    read()
    window.addEventListener('forme:push', read)
    return () => {
      alive = false
      window.removeEventListener('forme:push', read)
    }
  }, [])
  return log
}

/** Runs the reminders workflow in test mode. Saves first: the Action only knows devices already in the repo. */
export async function sendTestPush(): Promise<'sent' | 'no-permission'> {
  const conn = getConn()
  const token = getToken()
  if (!conn || conn.mode !== 'github' || !token) throw new Error('Connect GitHub first')
  await syncNow()
  try {
    await new GitHub(conn.owner, conn.repo, conn.branch, token).dispatchWorkflow('reminders.yml', { test: 'true' })
    return 'sent'
  } catch (e) {
    if (e instanceof GitHubError && (e.status === 403 || e.status === 404)) return 'no-permission'
    throw e
  }
}

/** Where to run the test by hand when the token can't (no Actions permission). */
export function workflowPage(): string {
  const conn = getConn()
  return conn ? `https://github.com/${conn.owner}/${conn.repo}/actions/workflows/reminders.yml` : 'https://github.com'
}

// ── timezone maths ──
function tzOffsetMin(tz: string, at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return Math.round((asUtc - at.getTime()) / 60000)
}

/** Distinct UTC offsets the timezone uses during the year (1 for India, 2 for Germany). */
export function tzOffsets(tz: string): number[] {
  const y = new Date().getFullYear()
  return [...new Set([tzOffsetMin(tz, new Date(Date.UTC(y, 0, 15))), tzOffsetMin(tz, new Date(Date.UTC(y, 6, 15)))])]
}

export function localToUtcHM(time: string, offsetMin: number): { h: number; m: number } {
  const [h, m] = time.split(':').map(Number)
  const t = (((h * 60 + m - offsetMin) % 1440) + 1440) % 1440
  return { h: Math.floor(t / 60), m: t % 60 }
}

export function buildWorkflow(reminders: Reminder[], tz: string): string {
  const offsets = tzOffsets(tz)
  const crons = new Map<string, string[]>()
  for (const r of reminders.filter((x) => x.enabled && x.days.length)) {
    for (const off of offsets) {
      const { h, m } = localToUtcHM(r.time, off)
      const key = `${m} ${h} * * *`
      crons.set(key, [...(crons.get(key) ?? []), r.time])
    }
  }
  const lines = [...crons.entries()]
    .sort(([a], [b]) => {
      const [am, ah] = a.split(' ').map(Number)
      const [bm, bh] = b.split(' ').map(Number)
      return ah * 60 + am - (bh * 60 + bm)
    })
    .map(([cron, times]) => `    - cron: '${cron}' # ${[...new Set(times)].join(', ')} ${tz}`)
  return [
    '# Generated by Forme — change reminder times in the app (Me → Routine & reminders).',
    '# GitHub runs schedules in UTC; scripts/remind.mjs converts back to your timezone',
    '# and only sends the reminders that match, so DST changes are handled.',
    'name: reminders',
    'on:',
    ...(lines.length ? ['  schedule:', ...lines] : []),
    '  workflow_dispatch:',
    '    inputs:',
    '      test:',
    "        description: 'Send a test notification to every device'",
    "        default: 'true'",
    'permissions:',
    '  contents: read',
    'concurrency:',
    '  group: reminders',
    '  cancel-in-progress: false',
    'jobs:',
    '  remind:',
    '    runs-on: ubuntu-latest',
    '    timeout-minutes: 5',
    '    steps:',
    '      - uses: actions/checkout@v7',
    '      - uses: actions/setup-node@v7',
    '        with:',
    '          node-version: 22',
    '          cache: npm',
    '      - run: npm ci --omit=dev --no-audit --no-fund',
    '      - run: node scripts/remind.mjs',
    '        env:',
    '          VAPID_PUBLIC_KEY: ${{ secrets.VAPID_PUBLIC_KEY }}',
    '          VAPID_PRIVATE_KEY: ${{ secrets.VAPID_PRIVATE_KEY }}',
    '          VAPID_SUBJECT: ${{ secrets.VAPID_SUBJECT }}',
    '          SCHEDULE: ${{ github.event.schedule }}',
    '          EVENT: ${{ github.event_name }}',
    '',
  ].join('\n')
}

/** Queue the regenerated workflow for the next sync commit. */
export function queueWorkflow(reminders: Reminder[], tz: string) {
  setRaw(WORKFLOW_PATH, buildWorkflow(reminders, tz))
}
