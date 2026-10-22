import { Plus, Trash } from 'lucide-react'
import { useState } from 'react'
import { toast } from '../../components/Toasts'
import { Button, Card, Field, Page, Section, Segmented } from '../../components/ui'
import { saveSettings, useProfile, useSettings, useWeightNow } from '../../lib/app'
import { bmr, kfmt } from '../../lib/calc'
import { put } from '../../lib/store'
import type { Profile, Settings } from '../../lib/types'

export default function ProfileScreen() {
  const { profile } = useProfile()
  const settings = useSettings()
  const kg = useWeightNow()
  const [p, setP] = useState<Profile>(profile)
  const [t, setT] = useState<Settings['targets']>(settings.targets)
  const [meds, setMeds] = useState(profile.medications ?? [])
  const base = Math.round(bmr(p, kg) * 1.2)
  const suggested = Math.round((base - 450) / 50) * 50
  const num = (v: string) => Number(v.replace(',', '.')) || 0

  function save() {
    put<Profile>('profile', { ...p, id: 'main', medications: meds.filter((m) => m.name.trim()), conditions: p.conditions?.filter(Boolean) })
    saveSettings({ targets: t })
    toast('Profile saved')
  }

  const text = (k: keyof Profile, label: string, type = 'text', hint?: string) => (
    <Field label={label} hint={hint}>
      <input type={type} className="field" value={String(p[k] ?? '')} onChange={(e) => setP({ ...p, [k]: e.target.value })} />
    </Field>
  )
  const numF = (k: keyof Profile, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input inputMode="decimal" className="field num" value={String(p[k] ?? '')} onChange={(e) => setP({ ...p, [k]: num(e.target.value) })} />
    </Field>
  )
  const target = (k: keyof Settings['targets'], label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input inputMode="decimal" className="field num" value={String(t[k] ?? '')} onChange={(e) => setT({ ...t, [k]: num(e.target.value) || undefined })} />
    </Field>
  )

  return (
    <Page accent="me" back="/me" title="Profile & targets" actions={<Button size="sm" onClick={save}>Save</Button>}>
      <Section title="You" className="mt-2">
        <div className="space-y-3">
          {text('name', 'Name')}
          {text('birth', 'Birthday', 'date', 'Used for your age in the calorie maths.')}
          <Field label="Sex (for BMR formula)">
            <Segmented
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ]}
              value={p.sex}
              onChange={(v) => setP({ ...p, sex: v })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {numF('heightCm', 'Height (cm)')}
            {numF('startWeightKg', 'Start weight (kg)')}
            {numF('milestoneWeightKg', 'Plan target (kg)')}
            {numF('goalWeightKg', 'Final goal (kg)')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {text('planStart', 'Plan start', 'date')}
            {text('milestoneDate', 'Target date', 'date')}
          </div>
          {text('diet', 'Diet')}
          {text('timezone', 'Timezone', 'text', 'IANA name, e.g. Asia/Kolkata or Europe/Berlin — reminders follow it.')}
          <Field label="Health conditions" hint="Comma-separated. Private — stored only in your data repo.">
            <input className="field" value={(p.conditions ?? []).join(', ')} onChange={(e) => setP({ ...p, conditions: e.target.value.split(',').map((x) => x.trim()) })} />
          </Field>
        </div>
      </Section>

      <Section
        title="Medicines"
        action={
          <button onClick={() => setMeds([...meds, { name: '', note: '' }])} className="press flex items-center gap-1 text-[14px] font-semibold text-acc">
            <Plus size={15} /> Add
          </button>
        }
      >
        <div className="space-y-2">
          {meds.map((m, i) => (
            <Card key={i} className="flex items-center gap-2">
              <div className="flex-1 space-y-1.5">
                <input className="w-full bg-transparent text-[15px] font-semibold outline-none" placeholder="Name" value={m.name} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input className="w-full bg-transparent text-[13px] text-ink2 outline-none" placeholder="Note (dose, when, doctor's advice)" value={m.note ?? ''} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
              </div>
              <button aria-label="Remove medicine" onClick={() => setMeds(meds.filter((_, j) => j !== i))} className="press p-2 text-ink3">
                <Trash size={16} />
              </button>
            </Card>
          ))}
          {!meds.length && <div className="px-1 text-[13.5px] text-ink3">None added. Medicines added here get one-tap “took it” logging.</div>}
        </div>
      </Section>

      <Section title="Daily targets">
        <Card className="mb-3">
          <div className="text-[13.5px] leading-relaxed text-ink2">
            Your base burn is about <b>{kfmt(base)} kcal</b> (BMR × 1.2 at {kg.toFixed(1)} kg). Eating ~<b>{kfmt(suggested)}</b> plus your planned walking and workouts gives a deficit of roughly 600–750 kcal/day ≈ 0.6 kg a week — fast enough to see, gentle enough to keep muscle.
          </div>
          <Button size="sm" variant="soft" className="mt-2" onClick={() => setT({ ...t, kcal: suggested })}>
            Use {kfmt(suggested)} kcal
          </Button>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {target('kcal', 'Calories (kcal)')}
          {target('protein', 'Protein (g)', '≈1.5 g per kg of goal weight')}
          {target('waterMl', 'Water (ml)')}
          {target('sleepHours', 'Sleep (h)')}
          {target('germanMinutes', 'German (min)')}
          {target('stepsOverride', 'Steps (blank = plan)', 'The plan ramps 7k → 10k')}
        </div>
        <Button full size="lg" className="mt-5" onClick={save}>
          Save
        </Button>
      </Section>
    </Page>
  )
}
