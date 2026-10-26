import { BellRing, Check, Download, ExternalLink, Send } from 'lucide-react'
import { useState } from 'react'
import { useProfile, useSettings } from '../lib/app'
import { getConn } from '../lib/auth'
import { promptInstall, platform, useInstall } from '../lib/install'
import { enablePush, isStandalone, notificationsBlocked, pushSupported, queueWorkflow, sendTestPush, useLastPush, useThisDevice, workflowPage } from '../lib/push'
import { useColl } from '../lib/store'
import type { PushSub } from '../lib/types'
import { toast } from './Toasts'
import { Button, Card, cx } from './ui'

const HIDE_KEY = 'forme.setup.hideUntil'
const SKIP_INSTALL = 'forme.setup.skipInstall'
const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* private mode */
    }
  },
}

/**
 * "Set up this phone" on Today — install, turn on reminders, prove one arrives.
 * Stays until a notification has actually reached this device (the service worker records it).
 */
export function PhoneSetup() {
  const p = platform()
  const install = useInstall()
  const subs = useColl<PushSub>('push')
  const device = useThisDevice(subs)
  const last = useLastPush()
  const settings = useSettings()
  const { profile } = useProfile()
  const github = getConn()?.mode === 'github'
  const [busy, setBusy] = useState<string | null>(null)
  const [sent, setSent] = useState<'sent' | 'no-permission' | null>(null)
  const [hidden, setHidden] = useState(() => Number(ls.get(HIDE_KEY) ?? 0) > Date.now())
  const [skipInstall, setSkipInstall] = useState(() => ls.get(SKIP_INSTALL) === '1')

  if (p === 'desktop' || hidden || device === undefined || last === undefined) return null
  const installed = install.installed || isStandalone()
  const steps = [
    { id: 'install', title: 'Install Forme on this phone', done: installed || skipInstall },
    ...(github
      ? [
          { id: 'notify', title: 'Turn on reminders', done: !!device },
          { id: 'test', title: 'Send yourself a test', done: !!last },
        ]
      : []),
  ]
  const current = steps.find((s) => !s.done)
  if (!current) return null

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id)
    try {
      await fn()
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const body: Record<string, React.ReactNode> = {
    install: (
      <>
        <p>Opens full-screen like any app, works offline, and Android shows your reminders as Forme's.</p>
        {install.canPrompt ? (
          <Button className="mt-3" icon={<Download size={17} />} loading={busy === 'install'} onClick={() => run('install', async () => void (await promptInstall()))}>
            Install
          </Button>
        ) : p === 'ios' ? (
          <p className="mt-2">
            In Safari tap <b>Share → Add to Home Screen</b>, then open Forme from your home screen.
          </p>
        ) : (
          <p className="mt-2">
            In Chrome tap <b>⋮ → Add to Home screen → Install</b>. Already installed? Open Forme from your home screen.
          </p>
        )}
        {p === 'android' && (
          <button
            className="press mt-2 block text-[13px] font-semibold text-ink3"
            onClick={() => {
              ls.set(SKIP_INSTALL, '1')
              setSkipInstall(true)
            }}
          >
            Keep using it in the browser
          </button>
        )}
      </>
    ),
    notify: !pushSupported() ? (
      p === 'ios' && !isStandalone() ? (
        <p>On iPhone, reminders work once Forme is opened from the home screen.</p>
      ) : (
        <p>This browser can't receive notifications — open Forme in Chrome.</p>
      )
    ) : notificationsBlocked() ? (
      <p>
        Notifications are blocked for Forme. Long-press the Forme icon → <b>App info → Notifications → Allow</b> (in a browser tab: Chrome <b>⋮ → Settings → Site settings → Notifications</b>), then come back.
      </p>
    ) : (
      <>
        <p>Your reminders ({settings.reminders.filter((r) => r.enabled).length} a day) come from a scheduled job in your private repo, and skip themselves when you've already done the thing.</p>
        <Button
          className="mt-3"
          icon={<BellRing size={17} />}
          loading={busy === 'notify'}
          onClick={() =>
            run('notify', async () => {
              await enablePush()
              queueWorkflow(settings.reminders, profile.timezone)
              toast('Reminders are on for this phone 🔔')
            })
          }
        >
          Turn on reminders
        </Button>
      </>
    ),
    test: (
      <>
        <p>One notification now, to be sure this phone gets them. It takes about a minute.</p>
        {sent === 'sent' ? (
          <p className="mt-2 font-medium text-ink2">On its way… this card ticks itself when it lands. Nothing after 3 minutes? Check Android Settings → Apps → Forme → Notifications.</p>
        ) : sent === 'no-permission' ? (
          <>
            <p className="mt-2">Your token can't start it from here. On GitHub tap <b>Run workflow</b>:</p>
            <a href={workflowPage()} target="_blank" rel="noreferrer" className="press mt-2 inline-flex h-11 items-center gap-2 rounded-2xl bg-acc-soft px-4 text-[15px] font-semibold text-acc">
              <ExternalLink size={16} /> Open reminders on GitHub
            </a>
          </>
        ) : null}
        {sent !== 'no-permission' && (
          <Button className="mt-3" variant={sent ? 'soft' : 'primary'} icon={<Send size={16} />} loading={busy === 'test'} onClick={() => run('test', async () => setSent(await sendTestPush()))}>
            {sent ? 'Send again' : 'Send a test'}
          </Button>
        )}
      </>
    ),
  }

  return (
    <Card className="mt-4 border-acc/40">
      <div className="flex items-center justify-between">
        <div className="text-[15.5px] font-semibold">Set up this phone</div>
        <div className="text-[12.5px] font-semibold text-ink3">
          {steps.filter((s) => s.done).length} of {steps.length}
        </div>
      </div>
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={s.id} className="flex gap-3">
            <span
              className={cx(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
                s.done ? 'bg-acc-fill text-acc-on' : s === current ? 'border-2 border-acc text-acc' : 'border-2 border-line2 text-ink3',
              )}
            >
              {s.done ? <Check size={15} strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className={cx('text-[15px] font-semibold', s.done ? 'text-ink3 line-through decoration-1' : s !== current && 'text-ink3')}>{s.title}</div>
              {s === current && <div className="mt-1 text-[13.5px] leading-relaxed text-ink3">{body[s.id]}</div>}
            </div>
          </li>
        ))}
      </ol>
      <button
        className="press mt-3 text-[12.5px] font-semibold text-ink3"
        onClick={() => {
          ls.set(HIDE_KEY, String(Date.now() + 7 * 86400000))
          setHidden(true)
        }}
      >
        Hide for a week
      </button>
    </Card>
  )
}
