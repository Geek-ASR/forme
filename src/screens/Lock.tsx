import { Delete, Lock as LockIcon } from 'lucide-react'
import { useState } from 'react'
import { disconnect, unlock } from '../lib/auth'
import { buzz } from '../lib/speech'
import { resetStore } from '../lib/store'
import { cx } from '../components/ui'

export const PIN_LEN_KEY = 'forme.pinlen'

export default function Lock() {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const len = Number(localStorage.getItem(PIN_LEN_KEY) || 4)

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
    <div className="acc-today safe-top flex min-h-dvh flex-col items-center justify-center px-6 pb-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-acc-soft text-acc">
        <LockIcon size={26} />
      </div>
      <div className="mt-4 text-[20px] font-semibold">Forme is locked</div>
      <div className="mt-1 text-[14px] text-ink3">{busy ? 'Unlocking…' : 'Enter your PIN'}</div>
      <div className={cx('mt-6 flex gap-3', shake && 'animate-[pulse-soft_0.4s]')}>
        {Array.from({ length: len }).map((_, i) => (
          <span key={i} className={cx('h-3.5 w-3.5 rounded-full border-2 border-acc', i < pin.length && 'bg-acc')} />
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
              className="press flex h-18 w-18 items-center justify-center rounded-full bg-card text-[26px] font-medium shadow-sm"
              style={{ height: 72, width: 72 }}
            >
              {k === 'del' ? <Delete size={24} /> : k}
            </button>
          ),
        )}
      </div>
      <button onClick={forgot} className="press mt-8 text-[13.5px] font-medium text-ink3">
        Forgot PIN?
      </button>
    </div>
  )
}
