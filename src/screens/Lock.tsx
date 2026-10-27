import { Delete, Lock as LockIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { disconnect, unlock } from '../lib/auth'
import { buzz } from '../lib/speech'
import { resetStore } from '../lib/store'
import { applyTheme } from '../lib/theme'
import { cx } from '../components/ui'

export const PIN_LEN_KEY = 'forme.pinlen'

export default function Lock() {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const len = Number(localStorage.getItem(PIN_LEN_KEY) || 4)

  // The lock screen is a mocha hero in both themes: match the phone's status bar to it while it's up.
  useEffect(() => {
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', '#4b3425'))
    return () => applyTheme()
  }, [])

  async function tryPin(p: string) {
    setBusy(true)
    const ok = await unlock(p)
    setBusy(false)
    if (!ok) {
      buzz([30, 40, 30])
      setShake(true)
      setTimeout(() => {
        setShake(false)
        setPin('')
      }, 450)
    }
  }

  function press(d: string) {
    if (busy) return
    const next = (pin + d).slice(0, len)
    setPin(next)
    if (next.length === len) void tryPin(next)
  }

  async function forgot() {
    if (!confirm('Reset the lock? This removes the token and the local copy on this device. Your data stays safe on GitHub — you will reconnect with your token.')) return
    await resetStore()
    disconnect()
  }

  return (
    <div className="hero safe-top flex min-h-dvh flex-col items-center justify-center px-6 pb-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hero-gold/15 text-hero-gold">
        <LockIcon size={26} />
      </div>
      <div className="font-display mt-4 text-[26px] font-semibold">Forme is locked</div>
      <div className="mt-1 text-[14px] text-hero-ink2">{busy ? 'Unlocking…' : 'Enter your PIN'}</div>
      <div className={cx('mt-6 flex gap-3', shake && 'animate-[pulse-soft_0.4s]')}>
        {Array.from({ length: len }).map((_, i) => (
          <span key={i} className={cx('h-3.5 w-3.5 rounded-full border-2 border-hero-gold', i < pin.length && 'bg-hero-gold')} />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-3 gap-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) =>
          k === '' ? (
            <span key="blank" />
          ) : (
            <button
              key={k}
              aria-label={k === 'del' ? 'Delete' : k}
              onClick={() => (k === 'del' ? setPin(pin.slice(0, -1)) : press(k))}
              className="press flex h-18 w-18 items-center justify-center rounded-full border border-[#fff4de]/10 bg-[#fff4de]/[0.07] text-[26px] font-medium text-hero-ink"
              style={{ height: 72, width: 72 }}
            >
              {k === 'del' ? <Delete size={24} /> : k}
            </button>
          ),
        )}
      </div>
      <button onClick={forgot} className="press mt-8 text-[13.5px] font-medium text-hero-ink2">
        Forgot PIN?
      </button>
    </div>
  )
}
