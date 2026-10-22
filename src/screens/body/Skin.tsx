import { Check, Pencil, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Bar, Button, Card, Field, Page, Pill, Section, Segmented, Toggle, cx } from '../../components/ui'
import { AM, HAIR, ROLE_LABEL, SKIN_RULES, SKIN_TIMELINE, TONIGHT_LABEL, bhaNights, pmSteps, tonight, type SkinStep } from '../../data/skincare'
import { patchDay, saveSettings, setCheck, useProfile, useSettings } from '../../lib/app'
import { addDays, diffDays, dkey, dowShort, fmtLong, weekday, weekStart } from '../../lib/date'
import { patch, useDoc } from '../../lib/store'
import type { Day, Product, Profile } from '../../lib/types'

export default function Skin() {
  const date = dkey()
  const { profile } = useProfile()
  const settings = useSettings()
  const day = useDoc<Day>('days', date)
  const [when, setWhen] = useState<'am' | 'pm'>(new Date().getHours() < 15 ? 'am' : 'pm')
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const [edit, setEdit] = useState<Product | null>(null)
  const t = tonight(profile.skinStart, date, day?.skinIrritated)
  const steps = when === 'am' ? AM : pmSteps(t)
  const products = settings.skincare.products
  const productFor = (role: SkinStep['role']) => products.find((p) => p.role === role)
  const doneKey = when === 'am' ? 'skin-am' : 'skin-pm'
  const isDone = !!day?.checks?.[doneKey]
  const mon = weekStart(date)
  const nights = Array.from({ length: 7 }, (_, i) => addDays(mon, i))

  function setProduct(p: Product) {
    saveSettings({ skincare: { products: products.map((x) => (x.id === p.id ? p : x)) } })
  }

  return (
    <Page accent="body" back="/body" title="Skincare">
      {!profile.skinStart && (
        <Card className="mt-1">
          <div className="text-[15px] font-semibold">Start your routine</div>
          <p className="mt-1 text-[13.5px] text-ink3">Forme ramps salicylic acid up slowly from your start date: twice a week, then three, then four nights.</p>
          <Button className="mt-3" variant="soft" onClick={() => patch<Profile>('profile', 'main', { skinStart: date })}>
            Start today
          </Button>
        </Card>
      )}

      <div className="mt-2">
        <Segmented
          options={[
            { value: 'am', label: '☀️ Morning' },
            { value: 'pm', label: `🌙 Tonight` },
          ]}
          value={when}
          onChange={(v) => {
            setWhen(v)
            setTicks({})
          }}
        />
      </div>
      {when === 'pm' && (
        <div className="mt-3 flex items-center justify-between rounded-3xl border border-line bg-card px-4 py-3">
          <div>
            <div className="text-[15px] font-semibold">{TONIGHT_LABEL[t]}</div>
            <div className="text-[12.5px] text-ink3">Skin irritated, or shaved today? Switch to recovery.</div>
          </div>
          <Toggle label="Skin irritated today" checked={!!day?.skinIrritated} onChange={(v) => patchDay(date, { skinIrritated: v })} />
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        {steps.map((s, i) => {
          const prod = productFor(s.role)
          const ticked = ticks[s.role + i] || isDone
          return (
            <button
              key={s.role + i}
              onClick={() => setTicks({ ...ticks, [s.role + i]: !ticks[s.role + i] })}
              className={cx('press flex w-full gap-3 rounded-3xl border bg-card p-4 text-left', s.key ? 'border-acc/40' : 'border-line')}
            >
              <span className={cx('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold', ticked ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2 text-ink3')}>
                {ticked ? <Check size={15} strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-[15.5px] font-semibold">
                  {s.title}
                  {s.key && <Pill>non-negotiable</Pill>}
                </span>
                {prod && (
                  <span className="mt-0.5 block text-[13px] text-ink3">
                    {prod.name}
                    {!prod.have && <span className="font-semibold text-bad"> · need to buy</span>}
                  </span>
                )}
                <span className="mt-1 block text-[14px] leading-relaxed text-ink2">{s.how}</span>
              </span>
            </button>
          )
        })}
      </div>
      <Button
        full
        size="lg"
        className="mt-3"
        variant={isDone ? 'soft' : 'primary'}
        icon={<Check size={18} />}
        onClick={() => {
          setCheck(date, doneKey, !isDone)
          if (!isDone) toast(when === 'am' ? 'Morning routine done ☀️' : 'Night routine done 🌙')
        }}
      >
        {isDone ? 'Done today ✓' : `Mark ${when === 'am' ? 'morning' : 'night'} routine done`}
      </Button>

      <Section title="This week's nights">
        <Card>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {nights.map((k) => {
              const bha = bhaNights(profile.skinStart, k).includes(weekday(k))
              return (
                <div key={k} className={cx('rounded-xl py-2', k === date ? 'ring-2 ring-acc' : '', bha ? 'bg-acc-soft' : 'bg-card2')}>
                  <div className="text-[11px] font-semibold text-ink3">{dowShort(weekday(k)).slice(0, 2)}</div>
                  <div className={cx('mt-0.5 text-[13px] font-bold', bha ? 'text-acc' : 'text-ink2')}>{bha ? 'SA' : 'AA'}</div>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink3">
            SA = salicylic acid night · AA = alpha arbutin night.
            {profile.skinStart && ` Started ${fmtLong(profile.skinStart)} — week ${Math.floor(diffDays(date, profile.skinStart) / 7) + 1}.`}
          </p>
        </Card>
      </Section>

      <Section title={HAIR.title}>
        <Card>
          <div className="text-[13px] text-ink3">{productFor('hair')?.name}</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] leading-relaxed text-ink2">
            {HAIR.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
      </Section>

      <Section title="Shelf">
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {products.map((p) => {
            const weeksUsed = p.openedOn ? diffDays(date, p.openedOn) / 7 : 0
            const lasts = p.lastsWeeks ?? 10
            const leftW = Math.max(0, lasts - weeksUsed)
            return (
              <div key={p.id} className="border-b border-line px-4 py-3 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{p.name}</div>
                    <div className="text-[12.5px] text-ink3">{ROLE_LABEL[p.role]}</div>
                  </div>
                  {p.have ? p.openedOn && leftW < 2 ? <Pill tone="bad">restock soon</Pill> : <Pill tone="good">have</Pill> : <Pill tone="bad">need</Pill>}
                  <button aria-label={`Edit ${p.name}`} onClick={() => setEdit(p)} className="press p-1.5 text-ink3">
                    <Pencil size={15} />
                  </button>
                </div>
                {p.have && p.openedOn && (
                  <div className="mt-2">
                    <Bar value={leftW} max={lasts} height={5} />
                    <div className="mt-1 text-[12px] text-ink3">
                      opened {fmtLong(p.openedOn)} · ≈{Math.round(leftW)} weeks left
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {products.some((p) => !p.have) && (
          <p className="mt-2 flex items-start gap-2 px-1 text-[13px] leading-relaxed text-ink2">
            <ShoppingBag size={16} className="mt-0.5 shrink-0 text-acc" />
            To buy: {products.filter((p) => !p.have).map((p) => p.name).join(', ')}. Sunscreen first — without it the serums can't do their job.
          </p>
        )}
      </Section>

      <Section title="Rules that matter">
        <div className="space-y-2.5">
          {SKIN_RULES.map((r) => (
            <Card key={r.t}>
              <div className="text-[15px] font-semibold">{r.t}</div>
              <div className="mt-1 text-[13.5px] leading-relaxed text-ink2">{r.d}</div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="What to expect">
        <Card>
          {SKIN_TIMELINE.map((x) => (
            <div key={x.w} className="flex gap-3 py-1.5">
              <span className="w-24 shrink-0 text-[13px] font-semibold text-acc">{x.w}</span>
              <span className="text-[13.5px] leading-relaxed text-ink2">{x.d}</span>
            </div>
          ))}
        </Card>
      </Section>

      <ProductSheet product={edit} onClose={() => setEdit(null)} onSave={setProduct} />
    </Page>
  )
}

function ProductSheet({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (p: Product) => void }) {
  const [p, setP] = useState<Product | null>(null)
  if (product && p?.id !== product.id) setP(product)
  if (!product || !p) return null
  return (
    <Sheet
      open
      onClose={onClose}
      title="Product"
      accent="body"
      footer={
        <Button
          full
          size="lg"
          onClick={() => {
            onSave(p)
            setP(null)
            onClose()
          }}
        >
          Save
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <input className="field" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </Field>
        <div className="flex items-center justify-between rounded-2xl bg-card p-3">
          <span className="text-[15px] font-medium">I have this</span>
          <Toggle label="I have this" checked={p.have} onChange={(v) => setP({ ...p, have: v })} />
        </div>
        <Field label="Opened on" hint="Used to estimate when you will run out.">
          <div className="flex gap-2">
            <input type="date" className="field" value={p.openedOn ?? ''} onChange={(e) => setP({ ...p, openedOn: e.target.value || undefined })} />
            <Button variant="outline" onClick={() => setP({ ...p, openedOn: dkey(), have: true })}>
              Today
            </Button>
          </div>
        </Field>
        <Field label={`Lasts about ${p.lastsWeeks ?? 10} weeks`}>
          <input type="range" className="slider" min={2} max={30} value={p.lastsWeeks ?? 10} onChange={(e) => setP({ ...p, lastsWeeks: Number(e.target.value) })} />
        </Field>
      </div>
    </Sheet>
  )
}
