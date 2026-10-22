export type ThemePref = 'auto' | 'light' | 'dark'
const KEY = 'forme.theme'

export function getTheme(): ThemePref {
  try {
    return (localStorage.getItem(KEY) as ThemePref) || 'auto'
  } catch {
    return 'auto'
  }
}

export function applyTheme(pref = getTheme()) {
  const root = document.documentElement
  if (pref === 'auto') delete root.dataset.theme
  else root.dataset.theme = pref
  const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0d0d0d' : '#f4f3ef'))
}

export function setTheme(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    /* ignore */
  }
  applyTheme(pref)
}
