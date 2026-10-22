import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { Button, type Accent } from './ui'

/** A focused "enter one number" sheet (steps, weight, sleep…) with optional preset chips. */
export function NumberSheet({
  open,
  onClose,
  title,
  unit,
  initial,
  presets,
  onSave,
  decimals = 0,
  accent,
  hint,
}: {
  open: boolean
  onClose: () => void
  title: string
  unit: string
  initial?: number
  presets?: { label: string; value: number }[]
  onSave: (v: number) => void
  decimals?: number
  accent?: Accent
  hint?: string
}) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (open) setText(initial !== undefined && initial > 0 ? String(initial) : '')
  }, [open, initial])
  const value = Number(text.replace(',', '.'))
  const valid = text !== '' && Number.isFinite(value) && value >= 0
  const save = () => {
    if (!valid) return
    onSave(decimals ? Math.round(value * 10 ** decimals) / 10 ** decimals : Math.round(value))
    onClose()
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      accent={accent}
      footer={
        <Button full size="lg" disabled={!valid} onClick={save}>
          Save
        </Button>
      }
    >
      <div className="flex items-baseline justify-center gap-2 py-4">
        <input
          autoFocus
          inputMode={decimals ? 'decimal' : 'numeric'}
          enterKeyHint="done"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="0"
          aria-label={title}
          className="num w-48 bg-transparent text-center text-[48px] font-semibold outline-none placeholder:text-ink3/40"
        />
        <span className="text-[18px] text-ink3">{unit}</span>
      </div>
      {hint && <p className="-mt-2 mb-3 text-center text-[13px] text-ink3">{hint}</p>}
      {presets && (
        <div className="flex flex-wrap justify-center gap-2 pb-2">
          {presets.map((p) => (
            <button key={p.label} onClick={() => setText(String(p.value))} className="press h-9 rounded-full border border-line2 bg-card px-3.5 text-[14px] font-medium text-ink2">
              {p.label}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
