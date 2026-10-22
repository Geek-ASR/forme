import { ArrowDown, ArrowUp, BellRing, CalendarPlus, Plus, Send, Share, Trash, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { RoutineIcon, ROUTINE_ICONS } from '../../components/icons'
import { toast } from '../../components/Toasts'
import { Button, Card, Page, Section, Toggle, cx } from '../../components/ui'
import { saveSettings, useProfile, useSettings } from '../../lib/app'
import { getConn, getToken } from '../../lib/auth'
import { fmtTime } from '../../lib/date'
import { GitHub, GitHubError } from '../../lib/github'
import { buildIcs, downloadFile } from '../../lib/ics'
import { currentSubscription, enablePush, isIOS, isStandalone, pushSupported, queueWorkflow } from '../../lib/push'
import { newId, useColl } from '../../lib/store'
import { retryWorkflow, useSync } from '../../lib/sync'
import type { PushSub, Reminder, RoutineItem } from '../../lib/types'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function Routine() {
  const settings = useSettings()
  const { profile } = useProfile()
  const sync = useSync()
  const subs = useColl<PushSub>('push')
  const [items, setItems] = useState<RoutineItem[]>(settings.routine)
  const [rems, setRems] = useState<Reminder[]>(settings.reminders)
  const [dirty, setDirty] = useState(false)
  const [sub, setSub] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const conn = getConn()

  useEffect(() => {
    currentSubscription().then((s) => setSub(s?.endpoint ?? null))
  }, [])
  const thisDevice = sub ? subs.find((s) => s.endpoint === sub) : undefined

  const editItem = (i: number, p: Partial<RoutineItem>) => {
    setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)))
    setDirty(true)
  }
  const editRem = (i: number, p: Partial<Reminder>) => {
    setRems(rems.map((x, j) => (j === i ? { ...x, ...p } : x)))
    setDirty(true)
  }
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
    setDirty(true)
  }

  function save() {
    saveSettings({ routine: items, reminders: rems })
    if (conn?.mode === 'github') queueWorkflow(rems, profile.timezone)
    setDirty(false)
    toast(conn?.mode === 'github' ? 'Saved — the reminder schedule updates on GitHub with the next sync' : 'Saved')
  }

  async function enable() {
    setBusy(true)
    try {
      await enablePush()
      const s = await currentSubscription()
      setSub(s?.endpoint ?? null)
      if (conn?.mode === 'github') queueWorkflow(rems, profile.timezone)
      toast('Notifications enabled on this device 🔔')
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    const token = getToken()
    if (!conn || conn.mode !== 'github' || !token) return toast('Connect GitHub first')
    try {
      await new GitHub(conn.owner, conn.repo, conn.branch, token).dispatchWorkflow('reminders.yml', { test: 'true' })
      toast('Test sent — it arrives in about a minute')
    } catch (e) {
      if (e instanceof GitHubError && (e.status === 403 || e.status === 404))
        toast('Your token needs “Actions: Read and write” for this — or run it from GitHub → Actions → reminders → Run workflow.')
      else toast((e as Error).message)
    }
  }

  return (
    <Page accent="me" back="/me" title="Routine & reminders" actions={dirty ? <Button size="sm" onClick={save}>Save</Button> : undefined}>
      <Section title="Notifications" className="mt-2">
        <Card>
          {!pushSupported() ? (
            isIOS() && !isStandalone() ? (
              <div className="text-[14px] leading-relaxed text-ink2">
                <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <Share size={17} className="text-acc" /> One step on iPhone
                </div>
                In Safari tap <b>Share → Add to Home Screen</b>, then open Forme from your home screen and come back here to enable reminders.
              </div>
            ) : (
              <div className="text-[14px] text-ink2">This browser can't receive push notifications. Use the calendar export below instead.</div>
            )
          ) : thisDevice ? (
            <div className="flex items-center gap-3">
              <BellRing size={22} className="text-acc" />
              <div className="flex-1">
                <div className="text-[15px] font-semibold">On for this {thisDevice.device}</div>
                <div className="text-[12.5px] text-ink3">
                  {subs.length} device{subs.length === 1 ? '' : 's'} receive reminders
                </div>
              </div>
              <Button size="sm" variant="soft" icon={<Send size={15} />} onClick={test}>
                Test
              </Button>
            </div>
          ) : (
            <div>
              <div className="text-[15px] font-semibold">Get reminders on this device</div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink3">Sent by a scheduled GitHub Action in your private repo — smart ones skip themselves when you've already done the thing.</p>
              <Button className="mt-3" loading={busy} icon={<BellRing size={17} />} onClick={enable}>
                Enable notifications
              </Button>
            </div>
          )}
          {sync.workflowBlocked && (
            <div className="mt-3 flex gap-2 rounded-2xl bg-bad/10 p-3 text-[13px] text-bad">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <div>
                Your token can't update the reminder schedule. Give it <b>Workflows: Read and write</b> on the data repo, then{' '}
                <button className="font-semibold underline" onClick={retryWorkflow}>
                  retry
                </button>
                .
              </div>
            </div>
          )}
        </Card>
      </Section>

      <Section
        title="Reminders"
        action={
          <button
            onClick={() => {
              setRems([...rems, { id: 'r-' + newId(), label: 'New reminder', body: '', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true, kind: 'custom', url: '#/' }])
              setDirty(true)
            }}
            className="press flex items-center gap-1 text-[14px] font-semibold text-acc"
          >
            <Plus size={16} /> Add
          </button>
        }
      >
        <div className="space-y-2.5">
          {rems.map((r, i) => (
            <Card key={r.id} className={r.enabled ? '' : 'opacity-60'}>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={r.time}
                  onChange={(e) => editRem(i, { time: e.target.value })}
                  className="num w-[104px] rounded-xl bg-card2 px-2 py-1.5 text-[16px] font-semibold"
                  aria-label={`Time for ${r.label}`}
                />
                <input value={r.label} onChange={(e) => editRem(i, { label: e.target.value })} className="min-w-0 flex-1 bg-transparent text-[15.5px] font-semibold outline-none" aria-label="Reminder name" />
                <Toggle label={`Enable ${r.label}`} checked={r.enabled} onChange={(v) => editRem(i, { enabled: v })} />
              </div>
              <input value={r.body ?? ''} onChange={(e) => editRem(i, { body: e.target.value })} placeholder="Message" className="mt-2 w-full bg-transparent text-[13.5px] text-ink2 outline-none placeholder:text-ink3" aria-label="Reminder message" />
              <div className="mt-2 flex items-center gap-1">
                {DAYS.map((d, di) => {
                  const on = r.days.includes(di)
                  return (
                    <button
                      key={di}
                      aria-pressed={on}
                      aria-label={`Day ${di}`}
                      onClick={() => editRem(i, { days: on ? r.days.filter((x) => x !== di) : [...r.days, di].sort() })}
                      className={cx('press h-8 w-8 rounded-full text-[12.5px] font-semibold', on ? 'bg-acc-fill text-acc-on' : 'bg-card2 text-ink3')}
                    >
                      {d}
                    </button>
                  )
                })}
                <span className="flex-1" />
                {r.kind === 'custom' && (
                  <button
                    aria-label="Delete reminder"
                    onClick={() => {
                      setRems(rems.filter((_, j) => j !== i))
                      setDirty(true)
                    }}
                    className="press p-1.5 text-ink3"
                  >
                    <Trash size={15} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-ink3">
          GitHub's scheduler can run a few minutes late at busy times. For anything critical (like medicine), add the calendar backup below too.
        </p>
      </Section>

      <Section title="Daily checklist">
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {items.map((it, i) => (
            <div key={it.id} className={cx('flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-b-0', !it.enabled && 'opacity-55')}>
              <span className="text-ink3">
                <RoutineIcon name={it.icon} size={17} />
              </span>
              <input value={it.label} onChange={(e) => editItem(i, { label: e.target.value })} className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none" aria-label="Checklist item" />
              <div className="flex">
                <button aria-label="Move up" onClick={() => move(i, -1)} className="press p-1 text-ink3">
                  <ArrowUp size={15} />
                </button>
                <button aria-label="Move down" onClick={() => move(i, 1)} className="press p-1 text-ink3">
                  <ArrowDown size={15} />
                </button>
              </div>
              <Toggle label={`Show ${it.label}`} checked={it.enabled} onChange={(v) => editItem(i, { enabled: v })} />
            </div>
          ))}
          <button
            onClick={() => {
              setItems([...items, { id: 'c-' + newId(), label: 'New habit', icon: 'sparkles', enabled: true }])
              setDirty(true)
            }}
            className="press flex w-full items-center justify-center gap-2 py-3 text-[14px] font-semibold text-acc"
          >
            <Plus size={16} /> Add a habit
          </button>
        </div>
        <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-ink3">
          Items like water, steps, protein, German and workouts tick themselves when your logs reach the target. Icons: {Object.keys(ROUTINE_ICONS).length} available.
        </p>
        {dirty && (
          <Button full size="lg" className="mt-3" onClick={save}>
            Save changes
          </Button>
        )}
      </Section>

      <Section title="Calendar backup">
        <Card>
          <p className="text-[14px] leading-relaxed text-ink2">
            Download your reminders as a calendar file. On iPhone it opens straight into Calendar; on Android, import it in Google Calendar (web → Settings → Import). Native alarms, no internet needed.
          </p>
          <Button
            className="mt-3"
            variant="soft"
            icon={<CalendarPlus size={17} />}
            onClick={() => downloadFile('forme-routines.ics', buildIcs(rems, location.origin + location.pathname), 'text/calendar')}
          >
            Download .ics
          </Button>
          <div className="mt-2 text-[12.5px] text-ink3">
            {rems.filter((r) => r.enabled).length} reminders · e.g. {rems.find((r) => r.enabled)?.label} at {fmtTime(rems.find((r) => r.enabled)?.time)}
          </div>
        </Card>
      </Section>
    </Page>
  )
}
