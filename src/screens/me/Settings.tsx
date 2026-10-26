import { CloudCheck, Download, ExternalLink, GitCommitHorizontal, KeyRound, Lock, LogOut, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from '../../components/Toasts'
import { Button, Card, Field, Page, Row, Section, Segmented } from '../../components/ui'
import { saveSettings, useSettings } from '../../lib/app'
import { disconnect, getConn, getToken, hasPin, lockNow, removePin, setPin, useAuthVersion } from '../../lib/auth'
import { relTime } from '../../lib/date'
import { GitHub } from '../../lib/github'
import { downloadFile } from '../../lib/ics'
import { exportAll, importAll, resetStore } from '../../lib/store'
import { syncNow, useSync } from '../../lib/sync'
import { getTheme, setTheme, type ThemePref } from '../../lib/theme'
import Connect from '../Connect'
import { PIN_LEN_KEY } from '../Lock'

type Commit = { sha: string; html_url: string; commit: { message: string; author: { date: string } } }

export default function Settings() {
  useAuthVersion()
  const conn = getConn()
  const sync = useSync()
  const exp = useSettings().tokenExpires
  const [theme, setT] = useState<ThemePref>(getTheme())
  const [commits, setCommits] = useState<Commit[] | null>(null)
  const [pin, setPinText] = useState('')
  const [reconnect, setReconnect] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = getToken()
    if (conn?.mode !== 'github' || !token) return
    new GitHub(conn.owner, conn.repo, conn.branch, token)
      .listCommits(8)
      .then(setCommits)
      .catch(() => setCommits([]))
  }, [conn, sync.lastSync])

  if (reconnect) return <Connect onDone={() => setReconnect(false)} />

  const stateText: Record<string, string> = {
    idle: 'All changes saved to GitHub',
    syncing: 'Saving…',
    offline: 'Offline — changes are kept on this device and sync when you are back online',
    error: sync.message ?? 'Sync error',
    auth: sync.message ?? 'Token problem',
    local: 'This device only — not connected to GitHub',
    locked: 'Locked',
  }

  return (
    <Page accent="me" back="/me" title="Settings & sync">
      <Section title="Your data" className="mt-2">
        <Card>
          <div className="flex items-start gap-3">
            <CloudCheck size={22} className={sync.state === 'auth' || sync.state === 'error' ? 'text-bad' : 'text-acc'} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{conn?.mode === 'github' ? `${conn.owner}/${conn.repo}` : 'Local only'}</div>
              <div className="text-[13px] leading-snug text-ink3">{stateText[sync.state]}</div>
              <div className="mt-1 text-[12.5px] text-ink3">
                {sync.lastSync ? `Last sync ${relTime(sync.lastSync)}` : 'Not synced yet'}
                {sync.pending ? ` · ${sync.pending} pending` : ''}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {conn?.mode === 'github' && (
              <Button size="sm" variant="soft" loading={sync.state === 'syncing'} icon={<RefreshCw size={15} />} onClick={() => void syncNow()}>
                Sync now
              </Button>
            )}
            {conn?.mode === 'github' && (
              <a href={`https://github.com/${conn.owner}/${conn.repo}`} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" icon={<ExternalLink size={15} />}>
                  Open repo
                </Button>
              </a>
            )}
            <Button size="sm" variant="outline" icon={<KeyRound size={15} />} onClick={() => setReconnect(true)}>
              {conn?.mode === 'github' ? 'Change token' : 'Connect GitHub'}
            </Button>
          </div>
          {conn?.mode === 'github' && (
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-ink2">Token expires</div>
                <div className="text-[12px] text-ink3">{exp === 'never' ? 'Never' : exp ? 'Forme warns you a week before' : 'Not set'}</div>
              </div>
              <input
                type="date"
                aria-label="Token expiry date"
                value={exp && exp !== 'never' ? exp : ''}
                onChange={(e) => saveSettings({ tokenExpires: e.target.value || undefined })}
                className="field num w-[150px] py-1.5 text-[14px]"
              />
              <button onClick={() => saveSettings({ tokenExpires: 'never' })} aria-pressed={exp === 'never'} className="press text-[13px] font-semibold text-acc">
                Never
              </button>
            </div>
          )}
        </Card>
        {commits && commits.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-card">
            <div className="px-4 pt-3 pb-1 text-[12.5px] font-semibold uppercase tracking-wide text-ink3">History · every save is a commit</div>
            {commits.map((c) => (
              <Row
                key={c.sha}
                href={c.html_url}
                icon={<GitCommitHorizontal size={17} />}
                title={c.commit.message.split('\n')[0]}
                sub={`${relTime(new Date(c.commit.author.date).getTime())} · ${c.sha.slice(0, 7)}`}
              />
            ))}
          </div>
        )}
        <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-ink3">
          Nothing is ever overwritten blindly: deletes are recorded, pushes are fast-forward only, and any change can be restored from the commit history.
        </p>
      </Section>

      <Section title="App lock">
        <Card>
          {hasPin() ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="soft" icon={<Lock size={15} />} onClick={lockNow}>
                Lock now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  removePin()
                  toast('PIN removed')
                }}
              >
                Remove PIN
              </Button>
            </div>
          ) : (
            <>
              <Field label="Set a PIN (4–6 digits)" hint="The GitHub token is then stored encrypted with your PIN, and Forme locks after 3 minutes in the background.">
                <input inputMode="numeric" type="password" maxLength={6} className="field num tracking-[0.4em]" value={pin} onChange={(e) => setPinText(e.target.value.replace(/\D/g, ''))} />
              </Field>
              <Button
                size="sm"
                className="mt-3"
                disabled={pin.length < 4}
                onClick={async () => {
                  await setPin(pin)
                  localStorage.setItem(PIN_LEN_KEY, String(pin.length))
                  setPinText('')
                  toast('PIN set 🔒')
                }}
              >
                Set PIN
              </Button>
            </>
          )}
        </Card>
      </Section>

      <Section title="Appearance">
        <Segmented
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          value={theme}
          onChange={(v) => {
            setT(v)
            setTheme(v)
          }}
        />
      </Section>

      <Section title="Backup">
        <Card>
          <p className="text-[13.5px] leading-relaxed text-ink2">Your GitHub repo is the real backup. You can also download everything as one JSON file, or import one (it merges — newer entries win, nothing is wiped).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="soft" icon={<Download size={15} />} onClick={() => downloadFile(`forme-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportAll(), null, 1), 'application/json')}>
              Export JSON
            </Button>
            <Button size="sm" variant="outline" icon={<Upload size={15} />} onClick={() => file.current?.click()}>
              Import
            </Button>
            <input
              ref={file}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                try {
                  const n = importAll(JSON.parse(await f.text()))
                  toast(`Imported ${n} records`)
                } catch {
                  toast('That file could not be read')
                }
                e.target.value = ''
              }}
            />
          </div>
        </Card>
      </Section>

      <Section title="This device">
        <Card>
          <p className="text-[13.5px] leading-relaxed text-ink2">Sign out removes the token and the local copy from this device. Your data stays safe in GitHub.</p>
          <Button
            size="sm"
            variant="danger"
            className="mt-3"
            icon={<LogOut size={15} />}
            onClick={async () => {
              if (sync.pending && !confirm(`${sync.pending} changes have not reached GitHub yet and will be lost. Sign out anyway?`)) return
              if (!confirm('Sign out of Forme on this device?')) return
              await resetStore()
              disconnect()
            }}
          >
            Sign out of this device
          </Button>
        </Card>
      </Section>

      <p className="mt-8 px-1 text-center text-[12px] leading-relaxed text-ink3">
        Forme · your data lives only in your private GitHub repository · open source app shell
      </p>
    </Page>
  )
}
