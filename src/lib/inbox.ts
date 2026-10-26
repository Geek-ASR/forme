// Quick logs that arrive from outside the app: notification buttons ("+250 ml", "Done ✓") and
// quick-log links (#/log?water=250 — home-screen shortcuts, Tasker…).
// Notification buttons work without opening Forme: the service worker queues them in a small
// IndexedDB inbox ('forme-inbox' — see scripts/sw-template.js) and the app applies them on next open.

import { SESSIONS, sessionMinutes, programDay } from '../data/program'
import { addWater, fallbackProfile, mergeSettings, patchDay, setCheck } from './app'
import { metKcal, weightOn } from './calc'
import { all, get, patch, put, remove } from './store'
import type { Activity, BodyEntry, Day, Profile, Settings } from './types'

export type Op =
  | { type: 'water'; ml: number; date: string }
  | { type: 'check'; id: string; date: string }
  | { type: 'session'; id: string; date: string }
  | { type: 'steps'; steps: number; date: string }
  | { type: 'sleep'; hours: number; date: string }
  | { type: 'kg'; kg: number; date: string }

/** Applies one quick log. Returns what happened (for the toast) and how to undo it. */
export function applyOp(op: Op): { text: string; undo: () => void } | null {
  const day = get<Day>('days', op.date)
  switch (op.type) {
    case 'water':
      addWater(op.date, op.ml)
      return { text: `${op.ml > 0 ? '+' : ''}${op.ml} ml water`, undo: () => addWater(op.date, -op.ml) }
    case 'check': {
      const item = mergeSettings(get<Settings>('settings', 'main')).routine.find((r) => r.id === op.id)
      const before = day?.checks?.[op.id]
      setCheck(op.date, op.id, true)
      return { text: `${item?.label ?? op.id} ✓`, undo: () => patchDay(op.date, { checks: { ...(get<Day>('days', op.date)?.checks ?? {}), [op.id]: before as boolean } }) }
    }
    case 'session': {
      const s = SESSIONS[op.id]
      if (!s || s.mode === 'rest') return null
      const profile = { ...fallbackProfile(), ...get<Profile>('profile', 'main') }
      const kg = weightOn(all<BodyEntry>('body'), op.date, profile.startWeightKg)
      const minutes = sessionMinutes(s, programDay(profile.planStart, op.date).phase.n) || 10
      const kind: Activity['kind'] = s.kind === 'mobility' || s.kind === 'flare' ? 'mobility' : s.kind === 'walk' ? 'walk' : 'workout'
      const rec = put<Activity>('activity', { date: op.date, kind, session: s.id, title: s.name, minutes, met: s.met, kcal: metKcal(s.met, kg, minutes) })
      return { text: `${s.name.split(' · ')[0]} logged`, undo: () => remove('activity', rec.id) }
    }
    case 'steps': {
      const before = day?.steps
      patchDay(op.date, { steps: op.steps })
      return { text: `Steps: ${op.steps.toLocaleString('en-IN')}`, undo: () => patchDay(op.date, { steps: before }) }
    }
    case 'sleep': {
      const before = day?.sleepH
      patchDay(op.date, { sleepH: op.hours })
      return { text: `Slept ${op.hours} h`, undo: () => patchDay(op.date, { sleepH: before }) }
    }
    case 'kg': {
      const id = `b-${op.date}`
      const before = get<BodyEntry>('body', id)
      patch<BodyEntry>('body', id, { date: op.date, kg: op.kg })
      return { text: `Weight: ${op.kg} kg`, undo: () => (before ? put<BodyEntry>('body', before) : remove('body', id)) }
    }
  }
}

const DB = 'forme-inbox'

function openInbox(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('ops', { autoIncrement: true })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Takes everything queued by notification buttons (read + clear in one transaction) and applies it. */
export async function drainInbox(): Promise<string[]> {
  if (typeof indexedDB === 'undefined') return []
  let ops: Op[] = []
  try {
    const db = await openInbox()
    ops = await new Promise<Op[]>((resolve, reject) => {
      const tx = db.transaction('ops', 'readwrite')
      const store = tx.objectStore('ops')
      const req = store.getAll()
      req.onsuccess = () => store.clear()
      tx.oncomplete = () => resolve(req.result as Op[])
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    return []
  }
  return ops.map((op) => applyOp(op)?.text).filter((t): t is string => !!t)
}
