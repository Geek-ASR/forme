// Install as an app. Chrome on Android fires `beforeinstallprompt` once the site is installable;
// keeping the event lets Forme offer its own one-tap "Install" button instead of a menu hunt.
// Imported from main.tsx so the listener is attached before the event can fire.

import { useSyncExternalStore } from 'react'
import { isStandalone } from './push'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallEvent | null = null
let installed = false
let state = { canPrompt: false, installed: false }
const listeners = new Set<() => void>()
const emit = () => {
  state = { canPrompt: !!deferred, installed: installed || isStandalone() }
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
  state = { canPrompt: false, installed: isStandalone() }
}

export function useInstall() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
  )
}

/** Shows the browser's install dialog. Resolves true if the person accepted. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  deferred = null
  await e.prompt()
  const { outcome } = await e.userChoice
  if (outcome === 'accepted') installed = true
  emit()
  return outcome === 'accepted'
}

export const platform = (): 'android' | 'ios' | 'desktop' => {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'desktop'
}
