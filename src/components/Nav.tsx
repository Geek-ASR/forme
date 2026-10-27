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

export function BottomNav({ path }: { path: string }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/90 backdrop-blur-xl" aria-label="Main">
      <div className="mx-auto flex max-w-xl">
        {TABS.map(({ key, href, label, Icon, match }) => {
          const active = match(path)
          return (
            <a
              key={key}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cx('press flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold', active ? 'text-ink' : 'text-ink3')}
            >
              <span className={cx('flex h-8 w-14 items-center justify-center rounded-full transition-colors', active && 'bg-card2')}>
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              </span>
              {label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
