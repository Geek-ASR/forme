// Quick-log links: #/log?water=250 · steps=8123 · kg=70.5 · sleep=7.5 · check=skin-pm · session=mobility
// Optional: d=YYYY-MM-DD (up to a week back) and then=/path to land somewhere other than Today.
// Used by the home-screen shortcuts, and by automation apps (e.g. Tasker reading steps from Health Connect).

import { useEffect, useRef } from 'react'
import { Spinner } from '../components/ui'
import { toast } from '../components/Toasts'
import { SESSIONS } from '../data/program'
import { diffDays, dkey } from '../lib/date'
import { applyOp, type Op } from '../lib/inbox'
import { go, useRoute } from '../lib/router'
import { useSyncSettled } from '../lib/sync'

export function parseQuickLog(q: URLSearchParams, today = dkey()): Op[] {
  const d = q.get('d') ?? ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today && diffDays(today, d) <= 7 ? d : today
  const num = (k: string, lo: number, hi: number) => {
    const v = Number((q.get(k) ?? '').replace(',', '.'))
    return q.get(k) && Number.isFinite(v) && v >= lo && v <= hi ? v : null
  }
  const ops: Op[] = []
  const water = num('water', -2000, 5000)
  if (water) ops.push({ type: 'water', ml: Math.round(water), date })
  const steps = num('steps', 0, 100000)
  if (steps !== null) ops.push({ type: 'steps', steps: Math.round(steps), date })
  const sleep = num('sleep', 0, 16)
  if (sleep !== null) ops.push({ type: 'sleep', hours: Math.round(sleep * 10) / 10, date })
  const kg = num('kg', 25, 300)
  if (kg !== null) ops.push({ type: 'kg', kg: Math.round(kg * 10) / 10, date })
  const check = q.get('check')
  if (check && /^[\w-]{1,40}$/.test(check)) ops.push({ type: 'check', id: check, date })
  const session = q.get('session')
  if (session && SESSIONS[session]) ops.push({ type: 'session', id: session, date })
  return ops
}

export default function QuickLog() {
  const { query, key } = useRoute()
  const settled = useSyncSettled() // wait for the first pull so we add to the latest numbers
  const handled = useRef<string | null>(null) // a link applies once, even when effects run twice

  useEffect(() => {
    if (!settled) return
    if (handled.current !== key) {
      handled.current = key
      const done = parseQuickLog(query).flatMap((op) => applyOp(op) ?? [])
      if (done.length) toast(done.map((r) => r.text).join(' · '), { label: 'Undo', run: () => done.forEach((r) => r.undo()) }, 5000)
      else toast('That link had nothing to log')
    }
    const then = query.get('then')
    go(then && /^\/[\w/-]*$/.test(then) ? then : '/', true)
  }, [settled, key, query])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-ink3">
      <Spinner />
      <div className="text-[14px]">Logging…</div>
    </div>
  )
}
