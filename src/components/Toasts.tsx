import { useSyncExternalStore } from 'react'

type Toast = { id: number; text: string; action?: { label: string; run: () => void } }
let toasts: Toast[] = []
let n = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(text: string, action?: Toast['action'], ms = 3200) {
  const t = { id: ++n, text, action }
  toasts = [...toasts.slice(-2), t]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id)
    emit()
  }, ms)
}

export function Toasts() {
  const list = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => toasts,
  )
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4" style={{ bottom: 'calc(150px + env(safe-area-inset-bottom))' }} aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="anim-pop pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-[14.5px] text-page shadow-xl">
          <span className="flex-1">{t.text}</span>
          {t.action && (
            <button
              className="font-semibold text-[var(--heat1)]"
              onClick={() => {
                t.action!.run()
                toasts = toasts.filter((x) => x.id !== t.id)
                emit()
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
