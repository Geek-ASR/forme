// Tiny IndexedDB key-value wrapper. Falls back to memory when IndexedDB is unavailable
// (e.g. some private-browsing modes) so the app still runs — it just won't persist locally.

const DB_NAME = 'forme'
const STORE = 'kv'
let dbPromise: Promise<IDBDatabase | null> | null = null
const memory = new Map<string, unknown>()

function open(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => req.result.createObjectStore(STORE)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
        req.onblocked = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return dbPromise
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await open()
  if (!db) return memory.get(key) as T | undefined
  return tx(db, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>)
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await open()
  if (!db) {
    memory.set(key, value)
    return
  }
  await tx(db, 'readwrite', (s) => s.put(value, key))
}

export async function idbDel(key: string): Promise<void> {
  const db = await open()
  if (!db) {
    memory.delete(key)
    return
  }
  await tx(db, 'readwrite', (s) => s.delete(key))
}

/** All [key, value] pairs whose key starts with prefix */
export async function idbEntries<T>(prefix: string): Promise<[string, T][]> {
  const db = await open()
  if (!db) return [...memory.entries()].filter(([k]) => k.startsWith(prefix)) as [string, T][]
  const range = IDBKeyRange.bound(prefix, prefix + '￿')
  const [keys, values] = await Promise.all([
    tx(db, 'readonly', (s) => s.getAllKeys(range)),
    tx(db, 'readonly', (s) => s.getAll(range)),
  ])
  return keys.map((k, i) => [String(k), values[i] as T])
}

export async function idbClear(): Promise<void> {
  const db = await open()
  memory.clear()
  if (db) await tx(db, 'readwrite', (s) => s.clear())
}
