/* Forme service worker — offline app shell + push reminders. Generated at build time. */
const VERSION = '__VERSION__'
const CACHE = `forme-${VERSION}`
const RUNTIME = 'forme-runtime'
const PRECACHE = __PRECACHE__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('forme-') && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Never touch GitHub API / raw content: data must always be fresh.
  if (url.origin !== self.location.origin) return

  // Navigations: network first (to pick up new deploys), fall back to the cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy))
          return res
        })
        .catch(() => caches.match('./').then((r) => r || caches.match('index.html'))),
    )
    return
  }

  // Static assets: cache first (filenames are content-hashed), runtime-cache anything else (e.g. decks).
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(RUNTIME).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})

// The last notification shown on this device — the app reads it to confirm reminders arrive here.
const PUSH_LOG = new URL('__forme/last-push', self.registration.scope).href

const tellClients = (msg) =>
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => ws.forEach((w) => w.postMessage(msg)))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Forme'
  // Buttons, e.g. { action: 'w250', title: '+250 ml', op: { type: 'water', ml: 250 } } — max 2 on Android.
  const actions = Array.isArray(data.actions) ? data.actions.slice(0, 2) : []
  const log = caches
    .open(RUNTIME)
    .then((c) => c.put(PUSH_LOG, new Response(JSON.stringify({ at: Date.now(), tag: data.tag || '', title }), { headers: { 'content-type': 'application/json' } })))
    .then(() => tellClients({ type: 'push', tag: data.tag || '' }))
    .catch(() => {})
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || '',
        icon: 'icons/icon-192.png',
        badge: 'icons/badge-96.png',
        tag: data.tag || undefined,
        renotify: !!data.tag,
        actions: actions.map((a) => ({ action: a.action, title: a.title })),
        data: { url: data.url || '#/', date: data.date, actions },
      }),
      log,
    ]),
  )
})

// ── inbox: logs made from notification buttons, applied by the app next time it opens (src/lib/inbox.ts) ──
function queueOp(op) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('forme-inbox', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('ops', { autoIncrement: true })
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('ops', 'readwrite')
      tx.objectStore('ops').add(op)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

const localDate = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const button = event.action ? (data.actions || []).find((a) => a.action === event.action) : null
  if (button && button.op) {
    // Logged straight from the notification — no need to open the app.
    event.waitUntil(
      queueOp({ ...button.op, date: data.date || localDate() })
        .then(() => tellClients({ type: 'inbox' }))
        .catch(() => {}),
    )
    return
  }
  const target = new URL((button && button.url) || data.url || '#/', self.registration.scope).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const w of windows) {
        if (w.url.startsWith(self.registration.scope)) {
          await w.focus()
          w.postMessage({ type: 'navigate', url: target })
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
