import { CircleUser, Dumbbell, Feather, Languages, Sun } from 'lucide-react'
import { cx } from './ui'

const TABS = [
  { key: 'today', href: '#/', label: 'Today', Icon: Sun, match: (p: string) => p === '/' },
  { key: 'body', href: '#/body', label: 'Body', Icon: Dumbbell, match: (p: string) => p.startsWith('/body') },
  { key: 'mind', href: '#/mind', label: 'Mind', Icon: Feather, match: (p: string) => p.startsWith('/mind') || p.startsWith('/hybrid') || p.startsWith('/ratings') },
  { key: 'de', href: '#/deutsch', label: 'Deutsch', Icon: Languages, match: (p: string) => p.startsWith('/deutsch') },
  { key: 'me', href: '#/me', label: 'Me', Icon: CircleUser, match: (p: string) => p.startsWith('/me') },
]

const IMMERSIVE = [/^\/(evening|log|share)$/, /^\/body\/workout\//, /^\/body\/food\/add/, /^\/deutsch\/(review|sprint|speak)/, /^\/mind\/(new|edit)/, /^\/hybrid\/(new|edit)/, /^\/ratings\/(new|edit)/]
export const hideNavFor = (path: string) => IMMERSIVE.some((r) => r.test(path))

/** A floating espresso dock: the current tab is lit in champagne gold. */
export function BottomNav({ path }: { path: string }) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3" style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }} aria-label="Main">
      {/* page fades out under the dock, so content never peeks around it */}
      <div className="absolute inset-x-0 bottom-0 h-[calc(100%+18px)] bg-gradient-to-t from-page from-35% to-transparent" />
      <div className="pointer-events-auto relative mx-auto flex max-w-md gap-1 rounded-[26px] border border-[var(--dock-line)] bg-[var(--dock)] p-1.5 shadow-[0_14px_30px_-12px_rgba(26,16,9,0.55)] backdrop-blur-xl">
        {TABS.map(({ key, href, label, Icon, match }) => {
          const active = match(path)
          return (
            <a
              key={key}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'press flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[10.5px] font-semibold tracking-wide transition-colors',
                active ? 'bg-[var(--dock-pill)] text-[var(--dock-on)]' : 'text-[var(--dock-ink)]',
              )}
            >
              <Icon size={21} strokeWidth={active ? 2.3 : 1.9} />
              {label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
