// Sync engine: pull changed files (by blob SHA), merge per record, push dirty files as ONE commit.
// Data-safety rules:
//  • Records are never physically removed (deletes are tombstones) → a file can only grow.
//    Before every push we check that; a shrinking file aborts the sync ("safety stop").
//  • Pushes are fast-forward only. If the branch moved (another device), we re-pull, merge, retry.
//  • Everything is also kept in IndexedDB, so offline edits survive reloads and sync later.

import { useSyncExternalStore } from 'react'
import { getConn, getToken } from './auth'
import { GitHub, GitHubError, gitBlobSha, type TreeEntry } from './github'
import { idbGet, idbSet } from './idb'
import * as S from './store'
import type { Rec } from './types'

export type SyncState = 'local' | 'idle' | 'syncing' | 'offline' | 'error' | 'auth' | 'locked'
export type SyncStatus = {
  state: SyncState
  pending: number
  lastSync: number | null
  message?: string
  workflowBlocked?: boolean
  firstPullDone: boolean
}

type Meta = { head: string | null; tree: string | null; lastSync: number | null; key: string }

let status: SyncStatus = { state: 'idle', pending: 0, lastSync: null, firstPullDone: false }
const listeners = new Set<() => void>()
let meta: Meta = { head: null, tree: null, lastSync: null, key: '' }
const remoteCounts = new Map<string, number>()
let running = false
let again = false
let timer: ReturnType<typeof setTimeout> | undefined
let lastAttempt = 0
let skipRaw = false

function set(p: Partial<SyncStatus>) {
  status = { ...status, ...p }
  for (const l of listeners) l()
}
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const useSync = () => useSyncExternalStore(subscribe, () => status)
export const getSyncStatus = () => status

/** Safe to write on top of local data: the first pull is in, or no pull is possible right now. */
export const isSettled = (s: SyncStatus) => s.firstPullDone || s.state === 'offline' || s.state === 'local' || s.state === 'auth' || s.state === 'error'
export const useSyncSettled = () => isSettled(useSync())

export function scheduleSync(delay = 2500) {
  clearTimeout(timer)
  timer = setTimeout(() => void run(), delay)
}

export async function syncNow(): Promise<SyncStatus> {
  clearTimeout(timer)
  await run()
  return status
}

/** Retry writing the reminders workflow (after the token gained the Workflows permission). */
export function retryWorkflow() {
  skipRaw = false
  set({ workflowBlocked: false })
  scheduleSync(100)
}

function describe(path: string): string {
  const m = path.match(/^data\/(.+?)(?:\/(.+))?\.json$/)
  if (!m) return path.replace(/^\.github\/workflows\//, 'workflow ')
  return m[2] ? `${m[1]} ${m[2]}` : m[1]
}

function commitMessage(paths: string[]): string {
  const parts = paths.map(describe)
  const head = `forme: ${parts.slice(0, 4).join(', ')}${parts.length > 4 ? ` +${parts.length - 4} more` : ''}`
  return parts.length > 4 ? `${head}\n\n${parts.map((p) => `- ${p}`).join('\n')}` : head
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++])
    }),
  )
}

async function pull(gh: GitHub, head: string) {
  const tree = await gh.getCommitTree(head)
  const items = await gh.getTree(tree)
  const local = new Map(S.fileStates().map((f) => [f.path, f]))
  const todo = items.filter(
    (it) => it.type === 'blob' && S.collFromPath(it.path) && local.get(it.path)?.remoteSha !== it.sha,
  )
  await pool(todo, 6, async (it) => {
    const text = await gh.getBlobText(it.sha)
    let records: Rec[] = []
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed?.records)) records = parsed.records
    } catch {
      console.warn('Forme: skipped unreadable file', it.path)
      return
    }
    const f = S.mergeRemote(it.path, records, it.sha)
    if (!f) return
    // unique ids — a hand-edited file with a duplicate id must not trip the safety stop
    remoteCounts.set(it.path, new Set(records.map((r) => r?.id).filter(Boolean)).size)
    const rev = f.rev
    const sha = await gitBlobSha(S.serialize(f))
    if (f.rev === rev) S.setDirty(f, sha !== it.sha)
  })
  // Files we think exist remotely but are gone from the tree get re-created.
  const remotePaths = new Set(items.map((i) => i.path))
  for (const f of S.fileStates()) if (f.remoteSha && !remotePaths.has(f.path) && f.recs.size) S.setDirty(f, true)
  meta.head = head
  meta.tree = tree
}

async function run(): Promise<void> {
  lastAttempt = Date.now()
  const conn = getConn()
  const token = getToken()
  if (!conn || conn.mode !== 'github') {
    set({ state: 'local', pending: S.dirtyCount(), firstPullDone: true })
    return
  }
  if (!token) {
    set({ state: 'locked' })
    return
  }
  if (running) {
    again = true
    return
  }
  running = true
  set({ state: 'syncing', message: undefined })
  const gh = new GitHub(conn.owner, conn.repo, conn.branch, token)
  const key = `${conn.owner}/${conn.repo}/${conn.branch}`
  if (meta.key !== key) meta = { head: null, tree: null, lastSync: null, key }

  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const head = await gh.getHead()
      if (!head) throw new GitHubError(409, 'The data repository has no commits yet.')
      if (head !== meta.head || !meta.tree) await pull(gh, head)

      const dirty = S.fileStates().filter((f) => f.dirty)
      const raws = skipRaw ? [] : S.pendingRaw()
      if (!dirty.length && !raws.length) break

      const entries: TreeEntry[] = []
      const pushed: { path: string; rev: number; text: string; count: number }[] = []
      for (const f of dirty) {
        const text = S.serialize(f)
        const before = remoteCounts.get(f.path)
        if (before !== undefined && f.recs.size < before) {
          throw new GitHubError(-1, `Safety stop: ${describe(f.path)} would lose records. Nothing was written.`)
        }
        entries.push({ path: f.path, mode: '100644', type: 'blob', content: text })
        pushed.push({ path: f.path, rev: f.rev, text, count: f.recs.size })
      }
      for (const [path, content] of raws) {
        entries.push(content === null ? { path, mode: '100644', type: 'blob', sha: null } : { path, mode: '100644', type: 'blob', content })
      }

      try {
        const tree = await gh.createTree(meta.tree, entries)
        const commit = await gh.createCommit(commitMessage([...pushed.map((p) => p.path), ...raws.map((r) => r[0])]), tree, [head])
        await gh.updateRef(commit)
        meta.head = commit
        meta.tree = tree
      } catch (e) {
        if (e instanceof GitHubError && raws.length && /workflow/i.test(e.message)) {
          skipRaw = true
          set({ workflowBlocked: true })
          continue
        }
        if (e instanceof GitHubError && (e.status === 422 || e.status === 409)) {
          meta.head = null // branch moved on: re-pull, merge and try again
          continue
        }
        throw e
      }

      for (const p of pushed) {
        S.markPushed(p.path, p.rev, await gitBlobSha(p.text))
        remoteCounts.set(p.path, p.count)
      }
      for (const [path, content] of raws) S.clearRaw(path, content)
      if (raws.length) set({ workflowBlocked: false })
      if (!S.fileStates().some((f) => f.dirty) && (skipRaw || !S.pendingRaw().length)) break
    }
    meta.lastSync = Date.now()
    void idbSet('meta:sync', meta)
    await S.flushPersist()
    set({ state: 'idle', lastSync: meta.lastSync, pending: S.dirtyCount(), firstPullDone: true })
  } catch (e) {
    const err = e instanceof GitHubError ? e : new GitHubError(-1, String((e as Error)?.message || e))
    if (err.status === 0) set({ state: 'offline', pending: S.dirtyCount() })
    else if (err.status === 401) set({ state: 'auth', message: 'GitHub rejected the token (expired or revoked). Reconnect in Settings → Sync.' })
    else if (err.status === 403 || err.status === 404)
      set({ state: 'auth', message: `No write access to ${conn.owner}/${conn.repo}. The token needs Contents: Read and write on this repo.` })
    else set({ state: 'error', message: err.message, pending: S.dirtyCount() })
  } finally {
    running = false
    if (again) {
      again = false
      scheduleSync(800)
    }
  }
}

let started = false
export async function initSync() {
  const saved = await idbGet<Meta>('meta:sync')
  if (saved) meta = saved
  set({ lastSync: meta.lastSync, pending: S.dirtyCount() })
  if (started) return
  started = true
  S.onLocalChange(() => {
    set({ pending: S.dirtyCount() })
    scheduleSync()
  })
  window.addEventListener('online', () => scheduleSync(300))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void S.flushPersist()
      if (S.dirtyCount()) void run()
    } else if (Date.now() - lastAttempt > 30_000) scheduleSync(300)
  })
  setInterval(() => {
    if (document.visibilityState === 'visible') scheduleSync(0)
  }, 5 * 60 * 1000)
}

export function resetSyncMeta() {
  meta = { head: null, tree: null, lastSync: null, key: '' }
  remoteCounts.clear()
  void idbSet('meta:sync', meta)
  set({ lastSync: null, firstPullDone: false })
}
