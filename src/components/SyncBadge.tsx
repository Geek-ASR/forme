import { CloudCheck, CloudOff, CloudUpload, RefreshCw, Smartphone, TriangleAlert } from 'lucide-react'
import { relTime } from '../lib/date'
import { go } from '../lib/router'
import { useSync } from '../lib/sync'
import { cx } from './ui'

/** Always-visible save state — so you can trust your data is on GitHub. */
export function SyncBadge() {
  const s = useSync()
  let icon = <CloudCheck size={16} />
  let text = s.lastSync ? relTime(s.lastSync) : 'Synced'
  let tone = 'text-ink3'
  if (s.state === 'syncing') {
    icon = <RefreshCw size={15} className="anim-spin" />
    text = 'Saving'
  } else if (s.state === 'local') {
    icon = <Smartphone size={15} />
    text = 'This device'
  } else if (s.state === 'offline') {
    icon = <CloudOff size={16} />
    text = s.pending ? `Offline · ${s.pending}` : 'Offline'
  } else if (s.state === 'auth' || s.state === 'error') {
    icon = <TriangleAlert size={15} />
    text = 'Sync issue'
    tone = 'text-bad'
  } else if (s.pending) {
    icon = <CloudUpload size={16} />
    text = `${s.pending} to save`
  }
  return (
    <button
      onClick={() => go('/me/settings')}
      className={cx('press flex h-8 items-center gap-1.5 rounded-full border border-line bg-card px-2.5 text-[12px] font-medium', tone)}
      aria-label={`Sync status: ${text}`}
    >
      {icon}
      <span className="max-w-[110px] truncate">{text}</span>
    </button>
  )
}
