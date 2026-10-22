// Local-first record store. Every collection is a set of JSON files in the private repo
// (data/<dir>.json, or sharded by month/year). Changes land here instantly, persist to
// IndexedDB, and the sync engine pushes dirty files to GitHub as a single commit.

import { useSyncExternalStore } from 'react'
import { idbClear, idbDel, idbEntries, idbSet } from './idb'
import type { Rec } from './types'

type Shard = 'single' | 'month' | 'year'
type CollDef = { shard: Shard; dir: string; dateField?: string }

export const COLLS = {
  profile: { shard: 'single', dir: 'profile' },
  settings: { shard: 'single', dir: 'settings' },
  goals: { shard: 'single', dir: 'goals' },
  letters: { shard: 'single', dir: 'letters' },
  reviews: { shard: 'single', dir: 'reviews' },
  body: { shard: 'single', dir: 'body' },
  basdai: { shard: 'single', dir: 'basdai' },
  customFoods: { shard: 'single', dir: 'custom-foods' },
  meals: { shard: 'single', dir: 'meal-templates' },
  hybrid: { shard: 'single', dir: 'hybrid' },
  sessions: { shard: 'single', dir: 'writing-sessions' },
  srs: { shard: 'single', dir: 'german-srs' },
  words: { shard: 'single', dir: 'german-words' },
  push: { shard: 'single', dir: 'push' },
  ratings: { shard: 'single', dir: 'ratings' },
  days: { shard: 'month', dir: 'days', dateField: 'id' },
  food: { shard: 'month', dir: 'food', dateField: 'date' },
  activity: { shard: 'month', dir: 'activity', dateField: 'date' },
  deLog: { shard: 'month', dir: 'german-log', dateField: 'date' },
  meds: { shard: 'month', dir: 'meds', dateField: 'date' },
  lifts: { shard: 'month', dir: 'lifts', dateField: 'date' },
  posts: { shard: 'year', dir: 'writing', dateField: 'date' },
} as const satisfies Record<string, CollDef>

export type CollName = keyof typeof COLLS

export type FileState = {
  path: string
  coll: CollName
  recs: Map<string, Rec>
  remoteSha: string | null
  dirty: boolean
  rev: number
}

type Stored = { path: string; coll: CollName; records: Rec[]; remoteSha: string | null; dirty: boolean }

const files = new Map<string, FileState>()
const byColl = new Map<CollName, Set<string>>()
const cache = new Map<CollName, Rec[]>()
const listeners = new Set<() => void>()
const raw = new Map<string, string | null>()
const changeHooks = new Set<() => void>()

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function def(coll: CollName): CollDef {
  return COLLS[coll]
}

export function pathFor(coll: CollName, rec: Partial<Rec> & Record<string, unknown>): string {
  const d = def(coll)
  if (d.shard === 'single') return `data/${d.dir}.json`
  const date = String(rec[d.dateField!] ?? '')
  if (!/^\d{4}-\d{2}/.test(date)) throw new Error(`${coll}: record needs a ${d.dateField} date`)
  return `data/${d.dir}/${d.shard === 'month' ? date.slice(0, 7) : date.slice(0, 4)}.json`
}

export function collFromPath(path: string): CollName | null {
  const m = path.match(/^data\/(.+?)(?:\/(\d{4}(?:-\d{2})?))?\.json$/)
  if (!m) return null
  const [, dir, shard] = m
  for (const [name, d] of Object.entries(COLLS) as [CollName, CollDef][]) {
    if (d.dir !== dir) continue
    if (d.shard === 'single' && !shard) return name
    if (d.shard === 'month' && shard && /^\d{4}-\d{2}$/.test(shard)) return name
    if (d.shard === 'year' && shard && /^\d{4}$/.test(shard)) return name
  }
  return null
}

function ensureFile(path: string, coll: CollName): FileState {
  let f = files.get(path)
  if (!f) {
    f = { path, coll, recs: new Map(), remoteSha: null, dirty: false, rev: 0 }
    files.set(path, f)
    if (!byColl.has(coll)) byColl.set(coll, new Set())
    byColl.get(coll)!.add(path)
  }
  return f
}

// ── change notification & persistence ──
const pendingPersist = new Set<string>()
let persistTimer: ReturnType<typeof setTimeout> | undefined

function schedulePersist(path: string) {
  pendingPersist.add(path)
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => void flushPersist(), 200)
}

export async function flushPersist(): Promise<void> {
  const paths = [...pendingPersist]
  pendingPersist.clear()
  await Promise.all(
    paths.map((p) => {
      const f = files.get(p)
      if (!f) return idbDel('file:' + p)
      const stored: Stored = { path: f.path, coll: f.coll, records: [...f.recs.values()], remoteSha: f.remoteSha, dirty: f.dirty }
      return idbSet('file:' + p, stored)
    }),
  )
}

function emit() {
  for (const l of listeners) l()
}

function changed(coll: CollName, path: string, local: boolean) {
  cache.delete(coll)
  schedulePersist(path)
  emit()
  if (local) for (const h of changeHooks) h()
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Called after every local edit — the sync engine uses it to schedule a push. */
export function onLocalChange(fn: () => void): () => void {
  changeHooks.add(fn)
  return () => changeHooks.delete(fn)
}

// ── reads ──
export function all<T extends Rec>(coll: CollName): T[] {
  const hit = cache.get(coll)
  if (hit) return hit as T[]
  const seen = new Map<string, Rec>()
  for (const p of byColl.get(coll) ?? []) {
    for (const r of files.get(p)!.recs.values()) {
      const prev = seen.get(r.id)
      if (!prev || r.updatedAt > prev.updatedAt) seen.set(r.id, r)
    }
  }
  const out = [...seen.values()].filter((r) => !r.deleted)
  cache.set(coll, out)
  return out as T[]
}

function find(coll: CollName, id: string): Rec | undefined {
  const d = def(coll)
  if (d.shard === 'single' || d.dateField === 'id') {
    try {
      return files.get(pathFor(coll, { id } as Rec))?.recs.get(id)
    } catch {
      return undefined
    }
  }
  let best: Rec | undefined
  for (const p of byColl.get(coll) ?? []) {
    const r = files.get(p)!.recs.get(id)
    if (r && (!best || r.updatedAt > best.updatedAt)) best = r
  }
  return best
}

export function get<T extends Rec>(coll: CollName, id: string): T | undefined {
  const r = find(coll, id)
  return r && !r.deleted ? (r as T) : undefined
}

// ── writes ──
type Input<T> = Omit<T, 'id' | 'updatedAt'> & { id?: string; updatedAt?: number }

export function put<T extends Rec>(coll: CollName, input: Input<T>): T {
  const id = input.id ?? newId()
  const prev = find(coll, id)
  const rec = { ...input, id, updatedAt: Math.max(Date.now(), (prev?.updatedAt ?? 0) + 1) } as T & { deleted?: boolean }
  delete rec.deleted
  const path = pathFor(coll, rec as unknown as Rec & Record<string, unknown>)
  const f = ensureFile(path, coll)
  f.recs.set(id, rec)
  f.dirty = true
  f.rev++
  changed(coll, path, true)
  return rec
}

export function patch<T extends Rec>(coll: CollName, id: string, p: Partial<T>): T {
  const prev = (get<T>(coll, id) ?? { id }) as T
  return put<T>(coll, { ...prev, ...p, id } as Input<T>)
}

export function remove(coll: CollName, id: string): void {
  const prev = find(coll, id) as (Rec & Record<string, unknown>) | undefined
  if (!prev || prev.deleted) return
  const d = def(coll)
  const tomb: Rec & Record<string, unknown> = { id, updatedAt: Math.max(Date.now(), prev.updatedAt + 1), deleted: true }
  if (d.dateField && d.dateField !== 'id') tomb[d.dateField] = prev[d.dateField]
  const path = pathFor(coll, tomb)
  const f = ensureFile(path, coll)
  f.recs.set(id, tomb)
  f.dirty = true
  f.rev++
  changed(coll, path, true)
}

// ── React hooks ──
export function useColl<T extends Rec>(coll: CollName): T[] {
  return useSyncExternalStore(subscribe, () => all<T>(coll))
}

export function useDoc<T extends Rec>(coll: CollName, id: string): T | undefined {
  return useSyncExternalStore(subscribe, () => get<T>(coll, id))
}

// ── sync engine support ──
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(o)
        .filter((k) => o[k] !== undefined)
        .sort()
        .map((k) => [k, sortKeys(o[k])]),
    )
  }
  return v
}

/** One record per line keeps git diffs readable and merges deterministic. */
export function serialize(f: FileState): string {
  const recs = [...f.recs.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const head = `{"collection":${JSON.stringify(f.coll)},"v":1,"records":[`
  if (!recs.length) return `${head}]}\n`
  return `${head}\n${recs.map((r) => JSON.stringify(sortKeys(r))).join(',\n')}\n]}\n`
}

export function fileStates(): FileState[] {
  return [...files.values()]
}

export function dirtyCount(): number {
  let n = 0
  for (const f of files.values()) if (f.dirty) n++
  return n + raw.size
}

/** Merge a remote file into local state (last write wins per record). */
export function mergeRemote(path: string, records: Rec[], sha: string): FileState | null {
  const coll = collFromPath(path)
  if (!coll) return null
  const f = ensureFile(path, coll)
  let touched = false
  for (const r of records) {
    if (!r || typeof r.id !== 'string') continue
    const cur = f.recs.get(r.id)
    if (!cur || (r.updatedAt ?? 0) > (cur.updatedAt ?? 0)) {
      f.recs.set(r.id, r)
      touched = true
    }
  }
  f.remoteSha = sha
  if (touched) changed(coll, path, false)
  else schedulePersist(path)
  return f
}

export function setDirty(f: FileState, dirty: boolean) {
  if (f.dirty !== dirty) {
    f.dirty = dirty
    schedulePersist(f.path)
    emit()
  }
}

export function markPushed(path: string, rev: number, sha: string) {
  const f = files.get(path)
  if (!f) return
  f.remoteSha = sha
  if (f.rev === rev) f.dirty = false
  schedulePersist(path)
}

/** Non-record files written on the next sync (e.g. the reminders workflow). */
export function setRaw(path: string, content: string | null) {
  raw.set(path, content)
  void idbSet('raw:' + path, content)
  for (const h of changeHooks) h()
  emit()
}

export function pendingRaw(): [string, string | null][] {
  return [...raw.entries()]
}

export function clearRaw(path: string, content: string | null) {
  if (raw.has(path) && raw.get(path) === content) {
    raw.delete(path)
    void idbDel('raw:' + path)
    emit()
  }
}

export async function loadStore(): Promise<void> {
  files.clear()
  byColl.clear()
  cache.clear()
  raw.clear()
  for (const [, s] of await idbEntries<Stored>('file:')) {
    const f = ensureFile(s.path, s.coll)
    for (const r of s.records) f.recs.set(r.id, r)
    f.remoteSha = s.remoteSha
    f.dirty = s.dirty
  }
  for (const [k, v] of await idbEntries<string | null>('raw:')) raw.set(k.slice(4), v)
  emit()
}

export async function resetStore(): Promise<void> {
  files.clear()
  byColl.clear()
  cache.clear()
  raw.clear()
  await idbClear()
  emit()
}

export function hasAnyData(): boolean {
  for (const f of files.values()) if (f.recs.size) return true
  return false
}

/** Plain-JSON export of every live record, grouped by collection. */
export function exportAll(): { exportedAt: string; app: string; collections: Record<string, Rec[]> } {
  const collections: Record<string, Rec[]> = {}
  for (const name of Object.keys(COLLS) as CollName[]) collections[name] = all(name)
  return { exportedAt: new Date().toISOString(), app: 'forme', collections }
}

/** Import an export file — merges (newer wins), never wipes. Returns records imported. */
export function importAll(data: { collections?: Record<string, Rec[]> }): number {
  let n = 0
  for (const [name, recs] of Object.entries(data.collections ?? {})) {
    if (!(name in COLLS) || !Array.isArray(recs)) continue
    const coll = name as CollName
    for (const r of recs) {
      if (!r?.id) continue
      const cur = find(coll, r.id)
      if (cur && cur.updatedAt >= (r.updatedAt ?? 0)) continue
      try {
        const path = pathFor(coll, r as Rec & Record<string, unknown>)
        const f = ensureFile(path, coll)
        f.recs.set(r.id, { ...r, updatedAt: r.updatedAt ?? Date.now() })
        f.dirty = true
        f.rev++
        cache.delete(coll)
        schedulePersist(path)
        n++
      } catch {
        /* skip malformed record */
      }
    }
  }
  emit()
  for (const h of changeHooks) h()
  return n
}
