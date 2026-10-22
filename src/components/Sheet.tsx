import { X } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cx, type Accent } from './ui'

let openCount = 0

/** Bottom sheet — the mobile-native way to show a form or detail without leaving the page. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  accent,
  full,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  accent?: Accent
  full?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    openCount++
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    panel.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      if (--openCount === 0) document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className={cx('fixed inset-0 z-50 flex items-end justify-center', accent && `acc-${accent}`)}>
      <div className="anim-fade absolute inset-0 bg-[var(--scrim)]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cx(
          'anim-rise relative flex w-full max-w-xl flex-col rounded-t-[28px] bg-page shadow-2xl outline-none',
          full ? 'h-[94dvh]' : 'max-h-[92dvh]',
        )}
      >
        <div className="flex justify-center pt-2.5">
          <div className="h-1.5 w-10 rounded-full bg-line2" />
        </div>
        <div className="flex items-center gap-2 px-5 pb-2 pt-2">
          <div className="min-w-0 flex-1 truncate text-[18px] font-semibold">{title}</div>
          <button aria-label="Close" onClick={onClose} className="press -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-ink3 hover:bg-card2">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="safe-bottom border-t border-line bg-page px-5 pt-3 pb-3">{footer}</div>}
        {!footer && <div className="safe-bottom" />}
      </div>
    </div>,
    document.body,
  )
}
