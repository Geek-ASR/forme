// Connection settings + token storage + optional PIN lock.
// With a PIN set, the token is stored only encrypted (AES-GCM, key from PBKDF2(PIN)),
// and is decrypted into memory on unlock. Without a PIN it sits in this origin's localStorage.

import { useSyncExternalStore } from 'react'
import { DEFAULT_DATA_REPO } from './config'

export type Conn = { mode: 'github' | 'local'; owner: string; repo: string; branch: string }
type LockBlob = { salt: string; iv: string; ct: string; iter: number }

const K_CONN = 'forme.conn'
const K_TOKEN = 'forme.token'
const K_LOCK = 'forme.lock'

function read<T>(k: string): T | null {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}
function write(k: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

let conn: Conn | null = read<Conn>(K_CONN)
let token: string | null = read<string>(K_TOKEN)
let locked = !!read<LockBlob>(K_LOCK) && !token
let version = 0
const listeners = new Set<() => void>()
const bump = () => {
  version++
  for (const l of listeners) l()
}

export const authSubscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function useAuthVersion() {
  return useSyncExternalStore(authSubscribe, () => version)
}

export const getConn = () => conn
export const getToken = () => token
export const isLocked = () => locked
export const hasPin = () => !!read<LockBlob>(K_LOCK)

export function connectGitHub(c: Omit<Conn, 'mode'>, t: string) {
  conn = { mode: 'github', ...c }
  write(K_CONN, conn)
  token = t
  if (hasPin()) void reencrypt()
  else write(K_TOKEN, t)
  locked = false
  bump()
}

export function chooseLocalOnly() {
  conn = { mode: 'local', ...DEFAULT_DATA_REPO }
  write(K_CONN, conn)
  bump()
}

export function disconnect() {
  conn = null
  token = null
  locked = false
  write(K_CONN, null)
  write(K_TOKEN, null)
  write(K_LOCK, null)
  bump()
}

// ── PIN lock ──
const enc = new TextEncoder()
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
let pinCache: string | null = null

async function keyFrom(pin: string, salt: Uint8Array, iter: number) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: iter, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function seal(pin: string, payload: string): Promise<LockBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const iter = 310000
  const key = await keyFrom(pin, salt, iter)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(payload)))
  return { salt: b64(salt), iv: b64(iv), ct: b64(ct), iter }
}

async function reencrypt() {
  if (!pinCache) return
  write(K_LOCK, await seal(pinCache, JSON.stringify({ token })))
  write(K_TOKEN, null)
}

export async function setPin(pin: string) {
  pinCache = pin
  write(K_LOCK, await seal(pin, JSON.stringify({ token })))
  write(K_TOKEN, null)
  bump()
}

export function removePin() {
  write(K_LOCK, null)
  pinCache = null
  if (token) write(K_TOKEN, token)
  bump()
}

export async function unlock(pin: string): Promise<boolean> {
  const blob = read<LockBlob>(K_LOCK)
  if (!blob) return true
  try {
    const key = await keyFrom(pin, unb64(blob.salt), blob.iter)
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) as BufferSource }, key, unb64(blob.ct) as BufferSource)
    const data = JSON.parse(new TextDecoder().decode(pt)) as { token: string | null }
    token = data.token
    pinCache = pin
    locked = false
    bump()
    return true
  } catch {
    return false
  }
}

export function lockNow() {
  if (!hasPin()) return
  token = null
  pinCache = null
  locked = true
  bump()
}

// Auto-lock after 3 minutes in the background.
let hiddenAt = 0
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now()
    else if (hiddenAt && Date.now() - hiddenAt > 3 * 60 * 1000) lockNow()
  })
}
