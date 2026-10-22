import { BookA, Droplet, Dumbbell, Feather, Footprints, Orbit, Pill as PillIcon, Scale, Star, Utensils, Activity as ActivityIcon } from 'lucide-react'
import { useState } from 'react'
import { addWater, patchDay, useProfile } from '../lib/app'
import { dkey, hm } from '../lib/date'
import { go } from '../lib/router'
import { patch, put, remove } from '../lib/store'
import type { BodyEntry, Day, MedLog } from '../lib/types'
import { NumberSheet } from './NumberSheet'
import { Sheet } from './Sheet'
import { toast } from './Toasts'

export function QuickAdd({ open, onClose, day }: { open: boolean; onClose: () => void; day?: Day }) {
  const date = dkey()
  const { profile } = useProfile()
  const [num, setNum] = useState<'steps' | 'weight' | null>(null)
  const meds = profile.medications ?? []

  const tile = (label: string, icon: React.ReactNode, run: () => void, tone = 'bg-card') => (
    <button
      key={label}
      onClick={() => {
        run()
      }}
      className={`press flex flex-col items-center justify-center gap-2 rounded-3xl border border-line ${tone} px-2 py-4 text-[13px] font-semibold`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc-soft text-acc">{icon}</span>
      {label}
    </button>
  )

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Add" accent="today">
        <div className="grid grid-cols-3 gap-2.5 pb-2">
          {tile('Food', <Utensils size={22} />, () => go('/body/food/add'))}
          {tile('Water +250', <Droplet size={22} />, () => {
            addWater(date, 250)
            toast('Added 250 ml water', { label: 'Undo', run: () => addWater(date, -250) })
          })}
          {tile('Steps', <Footprints size={22} />, () => setNum('steps'))}
          {tile('Weight', <Scale size={22} />, () => setNum('weight'))}
          {tile('Workout', <Dumbbell size={22} />, () => go('/body/plan'))}
          {tile('Activity', <ActivityIcon size={22} />, () => go('/body/move?add=1'))}
          {tile('Thought', <Feather size={22} />, () => go('/mind/new?type=thought'))}
          {tile('Book idea', <Orbit size={22} />, () => go('/hybrid/new'))}
          {tile('German word', <BookA size={22} />, () => go('/deutsch/words?add=1'))}
          {tile('Rate', <Star size={22} />, () => go('/ratings/new'))}
          {meds.map((m) =>
            tile(m.name.length > 14 ? m.name.slice(0, 13) + '…' : m.name, <PillIcon size={22} />, () => {
              const rec = put<MedLog>('meds', { date, time: hm(), name: m.name })
              toast(`Logged ${m.name} at ${hm()}`, { label: 'Undo', run: () => remove('meds', rec.id) })
              onClose()
            }),
          )}
        </div>
      </Sheet>
      <NumberSheet
        open={num === 'steps'}
        onClose={() => setNum(null)}
        title="Steps today"
        unit="steps"
        accent="body"
        initial={day?.steps}
        hint="Copy today's count from your phone's health app."
        presets={[3000, 5000, 7000, 8000, 10000].map((v) => ({ label: v.toLocaleString('en-IN'), value: v }))}
        onSave={(v) => {
          patchDay(date, { steps: v })
          toast(`Steps saved: ${v.toLocaleString('en-IN')}`)
        }}
      />
      <NumberSheet
        open={num === 'weight'}
        onClose={() => setNum(null)}
        title="Weigh-in"
        unit="kg"
        decimals={1}
        accent="body"
        hint="Best: mornings, after the bathroom, before eating."
        onSave={(v) => {
          patch<BodyEntry>('body', `b-${date}`, { date, kg: v })
          toast(`Weight saved: ${v} kg`)
        }}
      />
    </>
  )
}
