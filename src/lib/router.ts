// Hash router (works on GitHub Pages without server rewrites): #/body/food?d=2026-10-22

import { useSyncExternalStore } from 'react'

function read() {
  const h = location.hash.replace(/^#/, '') || '/'
  const [path, qs = ''] = h.split('?')
  return { path: path || '/', query: new URLSearchParams(qs), key: h }
}

let current = read()
const listeners = new Set<() => void>()
window.addEventListener('hashchange', () => {
  current = read()
  for (const l of listeners) l()
  window.scrollTo(0, 0)
})

export function useRoute() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => current,
  )
}

export function go(to: string, replace = false) {
  const target = to.startsWith('#') ? to : '#' + to
  if (replace) {
    history.replaceState(null, '', target)
    current = read()
    for (const l of listeners) l()
  } else location.hash = target
}

export function back(fallback = '/') {
  if (history.length > 1 && document.referrer !== location.href) history.back()
  else go(fallback)
}

/** Match "/mind/edit/:id" against a path; returns params or null */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean)
  const s = path.split('/').filter(Boolean)
  if (p.length !== s.length) return null
  const out: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) out[p[i].slice(1)] = decodeURIComponent(s[i])
    else if (p[i] !== s[i]) return null
  }
  return out
}
