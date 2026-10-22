import { ChevronDown, ExternalLink, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Field } from '../components/ui'
import { chooseLocalOnly, connectGitHub, getConn } from '../lib/auth'
import { DEFAULT_DATA_REPO, TOKEN_HELP_URL } from '../lib/config'
import { GitHub, GitHubError } from '../lib/github'
import { resetSyncMeta, syncNow } from '../lib/sync'

export default function Connect({ error: initialError, onDone }: { error?: string; onDone?: () => void }) {
  const prev = getConn()
  const [repo, setRepo] = useState(`${prev?.owner ?? DEFAULT_DATA_REPO.owner}/${prev?.repo ?? DEFAULT_DATA_REPO.repo}`)
  const [token, setToken] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialError ?? '')
  const [help, setHelp] = useState(false)

  async function connect() {
    setError('')
    const [owner, name] = repo.trim().replace(/^https:\/\/github\.com\//, '').split('/')
    if (!owner || !name) return setError('Enter the repository as owner/name, e.g. Geek-ASR/forme-data.')
    if (token.trim().length < 20) return setError('Paste your fine-grained token (it starts with github_pat_).')
    setBusy(true)
    try {
      const gh = new GitHub(owner, name, 'main', token.trim())
      const info = await gh.getRepo()
      if (!info.permissions?.push) throw new Error('This token can read the repo but not write to it. Give it Contents: Read and write.')
      if (!info.private && !confirm(`${info.full_name} is PUBLIC — anyone could read your data. Continue anyway?`)) {
        setBusy(false)
        return
      }
      resetSyncMeta()
      connectGitHub({ owner, repo: name, branch: info.default_branch || 'main' }, token.trim())
      await syncNow()
      onDone?.()
    } catch (e) {
      if (e instanceof GitHubError && e.status === 401) setError('GitHub rejected this token. Check it was copied fully and has not expired.')
      else if (e instanceof GitHubError && e.status === 404) setError(`Can't see ${repo}. Make sure the token has access to this repository.`)
      else if (e instanceof GitHubError && e.status === 0) setError('No internet connection.')
      else setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="acc-today safe-top min-h-dvh pb-16">
      <div className="mx-auto max-w-md px-5 pt-10">
        <img src="./favicon.svg" alt="" width={64} height={64} className="rounded-[20px] shadow-lg" />
        <h1 className="mt-5 text-[34px] font-bold leading-tight tracking-tight">Forme</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-ink2">
          A private space to take care of yourself — body, mind, words, German and the worlds you are building.
        </p>

        <Card className="mt-7">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <ShieldCheck size={18} className="text-acc" /> Connect your private data repo
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink3">
            Everything you log is saved as a commit in your own private GitHub repository. Nothing is stored anywhere else.
          </p>
          <div className="mt-4 space-y-3">
            <Field label="Repository">
              <input className="field" value={repo} onChange={(e) => setRepo(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            </Field>
            <Field label="Fine-grained token">
              <div className="relative">
                <input
                  className="field pr-12 font-mono text-[14px]"
                  type={show ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="github_pat_…"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                />
                <button aria-label={show ? 'Hide token' : 'Show token'} onClick={() => setShow(!show)} className="absolute top-1/2 right-2 -translate-y-1/2 p-2 text-ink3">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
          </div>
          {error && <div className="mt-3 rounded-2xl bg-bad/10 px-3 py-2.5 text-[13.5px] text-bad">{error}</div>}
          <Button full size="lg" className="mt-4" loading={busy} onClick={connect} icon={<KeyRound size={18} />}>
            Connect
          </Button>
        </Card>

        <button onClick={() => setHelp(!help)} className="press mt-4 flex w-full items-center justify-between rounded-2xl px-1 py-2 text-[14.5px] font-semibold text-acc">
          How do I create the token?
          <ChevronDown size={18} className={help ? 'rotate-180' : ''} />
        </button>
        {help && (
          <ol className="mt-1 list-decimal space-y-2 pl-6 text-[14px] leading-relaxed text-ink2">
            <li>Open GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.</li>
            <li>
              Repository access: <b>Only select repositories</b> → choose <b>forme-data</b> (and <b>forme</b> if you want to publish writing).
            </li>
            <li>
              Permissions → Repository: <b>Contents: Read and write</b>, <b>Workflows: Read and write</b> (for reminders). Metadata is added automatically.
            </li>
            <li>Set an expiry (a year is fine), generate, copy, and paste it above. It never leaves this device except to talk to GitHub.</li>
            <li>
              <a href={TOKEN_HELP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-acc">
                Open the token page <ExternalLink size={14} />
              </a>
            </li>
          </ol>
        )}

        {onDone && (
          <button onClick={onDone} className="press mt-4 w-full py-2 text-[14.5px] font-semibold text-ink3">
            Cancel
          </button>
        )}
        <div className={onDone ? 'hidden' : 'mt-8 border-t border-line pt-5 text-center'}>
          <button onClick={() => chooseLocalOnly()} className="press text-[14.5px] font-semibold text-ink2">
            Try it on this device only (no sync)
          </button>
          <p className="mt-1 text-[12.5px] text-ink3">You can connect GitHub later — local entries are merged in.</p>
        </div>
      </div>
    </div>
  )
}
