import { Check, ChevronDown, ExternalLink, Pencil, Plus, ShoppingBag, Trash } from 'lucide-react'
import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toasts'
import { Bar, Button, Card, Chips, Field, Page, Pill, Section, Segmented, Toggle, cx } from '../../components/ui'
import {
  COMPAT, HABITS, HAIR, NIGHT_LABEL, NIGHT_SHORT, PHASES, RECOMMENDATIONS, ROLE_LABEL, SKIN_TIMELINE, SKIP, SOURCES, TROUBLESHOOT,
  WHAT_IT_DOES, amSteps, bhaNights, hasProduct, pmSteps, retinoidStart, skinNight, skinPhase, type Recommendation,
} from '../../data/skincare'
import { patchDay, saveSettings, setCheck, useProfile, useSettings } from '../../lib/app'
import { addDays, diffDays, dkey, dowShort, fmtLong, lastNDays, weekday, weekStart } from '../../lib/date'
import { useRoute } from '../../lib/router'
import { patch, useColl, useDoc } from '../../lib/store'
import type { Day, Product, ProductRole, Profile } from '../../lib/types'

type Tab = 'today' | 'plan' | 'shelf' | 'guide'

export default function Skin() {
  const { query } = useRoute()
  const [tab, setTab] = useState<Tab>((query.get('tab') as Tab) || 'today')
  const [edit, setEdit] = useState<Product | null>(null)
  const settings = useSettings()
  const products = settings.skincare.products

  function saveProduct(p: Product) {
    const exists = products.some((x) => x.id === p.id)
    saveSettings({ skincare: { products: exists ? products.map((x) => (x.id === p.id ? p : x)) : [...products, p] } })
  }
  function deleteProduct(id: string) {
    saveSettings({ skincare: { products: products.filter((x) => x.id !== id) } })
  }

  return (
    <Page accent="body" back="/body" title="Skincare">
      <div className="mt-1">
        <Segmented
          options={[
            { value: 'today', label: 'Today' },
            { value: 'plan', label: 'Plan' },
            { value: 'shelf', label: 'Shelf' },
            { value: 'guide', label: 'Guide' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'today' && <TodayTab products={products} onPlan={() => setTab('plan')} />}
      {tab === 'plan' && <PlanTab products={products} onAdd={(p) => setEdit(p)} />}
      {tab === 'shelf' && <ShelfTab products={products} onEdit={setEdit} />}
      {tab === 'guide' && <GuideTab products={products} />}
      <ProductSheet product={edit} onClose={() => setEdit(null)} onSave={saveProduct} onDelete={deleteProduct} />
    </Page>
  )
}

// ── Today ──
function TodayTab({ products, onPlan }: { products: Product[]; onPlan: () => void }) {
  const date = dkey()
  const { profile } = useProfile()
  const day = useDoc<Day>('days', date)
  const days = useColl<Day>('days')
  const [when, setWhen] = useState<'am' | 'pm'>(new Date().getHours() < 15 ? 'am' : 'pm')
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const night = skinNight({ skinStart: profile.skinStart, date, irritated: day?.skinIrritated, products })
  const steps = when === 'am' ? amSteps(products) : pmSteps(night, products)
  const doneKey = when === 'am' ? 'skin-am' : 'skin-pm'
  const isDone = !!day?.checks?.[doneKey]
  const phase = skinPhase(profile.skinStart, date)
  const week = profile.skinStart ? Math.floor(Math.max(0, diffDays(date, profile.skinStart)) / 7) + 1 : 1
  const mon = weekStart(date)
  const nights = Array.from({ length: 7 }, (_, i) => addDays(mon, i))
  const byId = new Map(days.map((d) => [d.id, d]))
  const recent = lastNDays(14).map((k) => ({ k, d: byId.get(k) }))

  return (
    <>
      {!profile.skinStart ? (
        <Card className="mt-3">
          <div className="text-[15px] font-semibold">Start your routine</div>
          <p className="mt-1 text-[13.5px] text-ink3">Forme ramps salicylic acid up from your start date and tells you what to do each night.</p>
          <Button className="mt-3" variant="soft" onClick={() => patch<Profile>('profile', 'main', { skinStart: date })}>
            Start today
          </Button>
        </Card>
      ) : (
        <button onClick={onPlan} className="press mt-3 flex w-full items-center justify-between rounded-2xl bg-acc-soft px-4 py-2.5 text-left">
          <span className="text-[13.5px] font-semibold text-acc">
            Phase {phase.n} · {phase.name} · week {week}
          </span>
          <span className="text-[12.5px] font-medium text-acc">See plan →</span>
        </button>
      )}

      <div className="mt-3">
        <Segmented
          options={[
            { value: 'am', label: '☀️ Morning' },
            { value: 'pm', label: '🌙 Tonight' },
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
            <div className="text-[15px] font-semibold">{NIGHT_LABEL[night]}</div>
            <div className="text-[12.5px] text-ink3">Irritated, sunburnt or just shaved? Switch to recovery.</div>
          </div>
          <Toggle label="Skin irritated today" checked={!!day?.skinIrritated} onChange={(v) => patchDay(date, { skinIrritated: v })} />
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        {steps.map((s, i) => {
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
                {s.product && <span className="mt-0.5 block text-[13px] text-ink3">{s.product}</span>}
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

      <Section title="Skin check">
        <Card>
          <div className="text-[13.5px] font-semibold text-ink2">How does it feel today?</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['oily', 'balanced', 'tight', 'irritated'] as const).map((f) => (
              <button
                key={f}
                aria-pressed={day?.skinFeel === f}
                onClick={() => patchDay(date, { skinFeel: f, ...(f === 'irritated' ? { skinIrritated: true } : {}) })}
                className={cx('press h-9 rounded-full border px-3.5 text-[13.5px] font-medium capitalize', day?.skinFeel === f ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2 bg-card text-ink2')}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="mt-4 text-[13.5px] font-semibold text-ink2">New breakouts?</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {([0, 1, 2] as const).map((b) => (
              <button
                key={b}
                aria-pressed={day?.skinBreakouts === b}
                onClick={() => patchDay(date, { skinBreakouts: b })}
                className={cx('press h-9 rounded-full border px-3.5 text-[13.5px] font-medium', day?.skinBreakouts === b ? 'border-transparent bg-acc-fill text-acc-on' : 'border-line2 bg-card text-ink2')}
              >
                {['None', 'A few', 'Many'][b]}
              </button>
            ))}
          </div>
          {day?.skinFeel === 'tight' && <p className="mt-3 text-[13px] text-ink2">Tight skin is the first sign of over-cleansing — tonight, wash gently and keep the acid light.</p>}
          <div className="mt-4 flex items-center gap-1" aria-label="Breakouts over the last 14 days">
            {recent.map(({ k, d }) => (
              <span
                key={k}
                title={`${fmtLong(k)}: ${d?.skinBreakouts === undefined ? 'not logged' : ['clear', 'a few', 'many'][d.skinBreakouts]}`}
                className="h-3 flex-1 rounded-full"
                style={{ background: d?.skinBreakouts === undefined ? 'var(--heat0)' : d.skinBreakouts === 0 ? 'var(--heat1)' : d.skinBreakouts === 1 ? 'var(--mood2)' : 'var(--mood1)' }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11.5px] text-ink3">
            <span>14 days ago</span>
            <span>blue clear · pink a few · red many</span>
          </div>
        </Card>
      </Section>

      <Section title="This week's nights">
        <Card>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {nights.map((k) => {
              const n = skinNight({ skinStart: profile.skinStart, date: k, irritated: k === date ? day?.skinIrritated : byId.get(k)?.skinIrritated, products })
              return (
                <div key={k} className={cx('rounded-xl py-2', k === date && 'ring-2 ring-acc', n === 'bha' || n === 'retinoid' ? 'bg-acc-soft' : 'bg-card2')}>
                  <div className="text-[11px] font-semibold text-ink3">{dowShort(weekday(k)).slice(0, 2)}</div>
                  <div className={cx('mt-0.5 text-[13px] font-bold', n === 'bha' || n === 'retinoid' ? 'text-acc' : 'text-ink2')}>{NIGHT_SHORT[n]}</div>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink3">
            SA = salicylic acid · AA = alpha arbutin{retinoidStart(products) ? ' · RT = retinoid' : ''} · — = recovery.
            {profile.skinStart && ` Started ${fmtLong(profile.skinStart)}.`}
          </p>
        </Card>
      </Section>
    </>
  )
}

// ── Plan ──
function PlanTab({ products, onAdd }: { products: Product[]; onAdd: (p: Product) => void }) {
  const { profile } = useProfile()
  const today = dkey()
  const cur = skinPhase(profile.skinStart, today)
  const r = retinoidStart(products)
  const sa = bhaNights(profile.skinStart, today, r).map((d) => dowShort(d))

  function buy(rec: Recommendation) {
    if (rec.role === 'retinoid' && cur.n < 4 && !confirm('A retinoid is best added after about 12 weeks of a stable routine. Add it now anyway?')) return
    onAdd({
      id: `${rec.role}-${Date.now().toString(36)}`,
      name: rec.examples[0].replace(/\s*\(.*\)$/, ''),
      role: rec.role,
      have: true,
      openedOn: today,
      lastsWeeks: rec.lastsWeeks,
    })
  }

  return (
    <>
      <Section title="Your 4-phase plan" className="mt-4">
        <div className="space-y-2.5">
          {PHASES.map((p) => {
            const now = p.n === cur.n
            return (
              <Card key={p.n} className={now ? 'border-acc/50' : 'opacity-80'}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[16px] font-semibold">
                    {p.n}. {p.name}
                  </div>
                  {now ? <Pill>you are here</Pill> : <span className="text-[12.5px] text-ink3">{p.weeks}</span>}
                </div>
                {now && <div className="text-[12.5px] text-ink3">{p.weeks}</div>}
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-relaxed text-ink2">
                  {p.does.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[13px] leading-relaxed text-ink3">
                  <b className="text-ink2">Expect:</b> {p.expect}
                </p>
              </Card>
            )
          })}
        </div>
      </Section>

      <Section title="Your rhythm right now">
        <Card>
          <ul className="space-y-1.5 text-[14px] leading-relaxed text-ink2">
            <li>
              <b>Every morning:</b> cleanse or rinse → vitamin C{hasProduct(products, 'niacinamide') ? ' → niacinamide' : ''}
              {r ? ' → alpha arbutin' : ''} → moisturiser → sunscreen → lip balm.
            </li>
            <li>
              <b>Salicylic acid nights:</b> {sa.join(', ')}.
            </li>
            {r && (
              <li>
                <b>Retinoid nights:</b> {diffDays(today, r) < 14 ? 'Tue, Sat' : 'Tue, Thu, Sat'}.
              </li>
            )}
            <li>
              <b>Other nights:</b> {r ? 'recovery / arbutin.' : 'alpha arbutin.'}
            </li>
            <li>
              <b>Weekly:</b> pillowcases ×2, progress photo every 4 weeks, shave on non-acid nights.
            </li>
          </ul>
        </Card>
      </Section>

      {(['Add next', 'When ready', 'Only if needed'] as const).map((tier) => (
        <Section key={tier} title={tier === 'Add next' ? 'Add next — recommended' : tier}>
          <div className="space-y-2.5">
            {RECOMMENDATIONS.filter((x) => x.tier === tier).map((rec) => {
              const have = hasProduct(products, rec.role)
              return (
                <Card key={rec.role}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[15.5px] font-semibold">{rec.title}</div>
                    {have && <Pill tone="good">on your shelf</Pill>}
                  </div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink2">{rec.why}</p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2">
                    <b>How:</b> {rec.how}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rec.examples.map((e) => (
                      <span key={e} className="rounded-full bg-card2 px-2.5 py-1 text-[12.5px] text-ink2">
                        {e}
                      </span>
                    ))}
                  </div>
                  {!have && (
                    <Button size="sm" variant="soft" className="mt-3" icon={<ShoppingBag size={15} />} onClick={() => buy(rec)}>
                      I bought it
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        </Section>
      ))}

      <Section title="Skip these">
        <Card>
          <div className="space-y-2.5">
            {SKIP.map(([t, d]) => (
              <div key={t}>
                <div className="text-[14.5px] font-semibold">✕ {t}</div>
                <div className="text-[13.5px] leading-relaxed text-ink2">{d}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>
    </>
  )
}

// ── Shelf ──
function ShelfTab({ products, onEdit }: { products: Product[]; onEdit: (p: Product) => void }) {
  const date = dkey()
  return (
    <>
      <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-card">
        {products.map((p) => {
          const weeksUsed = p.openedOn ? diffDays(date, p.openedOn) / 7 : 0
          const lasts = p.lastsWeeks ?? 10
          const leftW = Math.max(0, lasts - weeksUsed)
          return (
            <div key={p.id} className="border-b border-line px-4 py-3 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{p.name}</div>
                  <div className="text-[12.5px] text-ink3">
                    {ROLE_LABEL[p.role]}
                    {p.note ? ` · ${p.note}` : ''}
                  </div>
                </div>
                {p.have ? p.openedOn && leftW < 2 ? <Pill tone="bad">restock soon</Pill> : <Pill tone="good">have</Pill> : <Pill tone="bad">need</Pill>}
                <button aria-label={`Edit ${p.name}`} onClick={() => onEdit(p)} className="press p-1.5 text-ink3">
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
              {p.have && !p.openedOn && (
                <button onClick={() => onEdit({ ...p, openedOn: date })} className="press mt-1.5 text-[12.5px] font-semibold text-acc">
                  Set the date you opened it → restock reminder
                </button>
              )}
            </div>
          )
        })}
      </div>
      <Button
        full
        variant="outline"
        className="mt-3"
        icon={<Plus size={16} />}
        onClick={() => onEdit({ id: `p-${Date.now().toString(36)}`, name: '', role: 'other', have: true, openedOn: date, lastsWeeks: 10 })}
      >
        Add a product
      </Button>
      <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink3">Routines are built from what is on this shelf — mark something as owned and it appears in the right step automatically.</p>
    </>
  )
}

// ── Guide ──
function GuideTab({ products }: { products: Product[] }) {
  const [open, setOpen] = useState<number | null>(0)
  const roles = new Set(products.filter((p) => p.have).map((p) => p.role))
  return (
    <>
      <Section title="What each product does" className="mt-4">
        <div className="space-y-2.5">
          {WHAT_IT_DOES.filter((w) => roles.has(w.role) || roles.size === 0).map((w) => (
            <Card key={w.role}>
              <div className="text-[15px] font-semibold">{products.find((p) => p.role === w.role && p.have)?.name ?? w.name}</div>
              <div className="mt-1 text-[13.5px] leading-relaxed text-ink2">{w.does}</div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="What goes with what">
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {COMPAT.map((c) => (
            <div key={c.pair} className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold', c.ok === 'yes' ? 'bg-[#0ca30c]/15 text-good' : c.ok === 'separate' ? 'bg-acc-soft text-acc' : 'bg-bad/10 text-bad')}>
                {c.ok === 'yes' ? '✓' : c.ok === 'separate' ? '↔' : '!'}
              </span>
              <div>
                <div className="text-[14.5px] font-semibold">{c.pair}</div>
                <div className="text-[13px] leading-relaxed text-ink2">{c.note}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 px-1 text-[12px] text-ink3">✓ fine together · ↔ use at different times · ! watch for dryness</p>
      </Section>

      <Section title="If something goes wrong">
        <div className="space-y-2">
          {TROUBLESHOOT.map((t, i) => (
            <div key={t.q} className="overflow-hidden rounded-3xl border border-line bg-card">
              <button onClick={() => setOpen(open === i ? null : i)} className="press flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="flex-1 text-[14.5px] font-semibold">{t.q}</span>
                <ChevronDown size={17} className={cx('text-ink3 transition-transform', open === i && 'rotate-180')} />
              </button>
              {open === i && <div className="px-4 pb-4 text-[14px] leading-relaxed text-ink2">{t.a}</div>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Habits that matter as much as products">
        <Card>
          <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink2">
            {HABITS.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section title={HAIR.title}>
        <Card>
          <ol className="list-decimal space-y-1 pl-5 text-[14px] leading-relaxed text-ink2">
            {HAIR.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
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

      <Section title="Sources">
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {SOURCES.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="press flex items-start gap-2.5 border-b border-line px-4 py-2.5 last:border-b-0">
              <ExternalLink size={14} className="mt-1 shrink-0 text-ink3" />
              <span className="text-[13px] leading-snug text-ink2">{s.label}</span>
            </a>
          ))}
        </div>
        <p className="mt-2 px-1 text-[12px] leading-relaxed text-ink3">
          General guidance from brand directions and published research — not medical advice. Persistent acne, sudden changes or irritation that doesn’t settle: see a dermatologist.
        </p>
      </Section>
    </>
  )
}

const ROLES: ProductRole[] = ['cleanser', 'gentle', 'vitc', 'niacinamide', 'arbutin', 'bha', 'retinoid', 'moisturizer', 'sunscreen', 'lip', 'lipspf', 'hair', 'eye', 'aftershave', 'bodywash', 'shampoo', 'other']

function ProductSheet({ product, onClose, onSave, onDelete }: { product: Product | null; onClose: () => void; onSave: (p: Product) => void; onDelete: (id: string) => void }) {
  const [p, setP] = useState<Product | null>(null)
  const [src, setSrc] = useState<Product | null>(null)
  if (product !== src) {
    setSrc(product)
    setP(product)
  }
  if (!product || !p) return null
  return (
    <Sheet
      open
      onClose={onClose}
      title={p.name ? 'Product' : 'New product'}
      accent="body"
      full
      footer={
        <div className="flex gap-2">
          <Button
            variant="danger"
            icon={<Trash size={16} />}
            onClick={() => {
              if (!confirm(`Remove ${p.name || 'this product'} from your shelf?`)) return
              onDelete(p.id)
              onClose()
            }}
          >
            Remove
          </Button>
          <Button
            full
            onClick={() => {
              if (!p.name.trim()) return toast('Give it a name')
              onSave({ ...p, name: p.name.trim() })
              toast('Shelf updated — your routine follows it')
              onClose()
            }}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-4">
        <Field label="Name">
          <input className="field" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="e.g. Minimalist Vitamin B5 10% Moisturizer" />
        </Field>
        <Field label="What is it?" hint="This decides where it goes in your routine.">
          <Chips scroll={false} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} value={p.role} onChange={(r) => setP({ ...p, role: r })} />
        </Field>
        <div className="flex items-center justify-between rounded-2xl bg-card p-3">
          <span className="text-[15px] font-medium">I have this</span>
          <Toggle label="I have this" checked={p.have} onChange={(v) => setP({ ...p, have: v })} />
        </div>
        <Field label="Opened on" hint={p.role === 'retinoid' ? 'Retinoid nights start from this date.' : 'Used to estimate when you will run out.'}>
          <div className="flex gap-2">
            <input type="date" className="field" value={p.openedOn ?? ''} onChange={(e) => setP({ ...p, openedOn: e.target.value || undefined })} />
            <Button variant="outline" onClick={() => setP({ ...p, openedOn: dkey(), have: true })}>
              Today
            </Button>
          </div>
        </Field>
        <Field label={`Lasts about ${p.lastsWeeks ?? 10} weeks`}>
          <input type="range" className="slider" min={2} max={52} value={p.lastsWeeks ?? 10} onChange={(e) => setP({ ...p, lastsWeeks: Number(e.target.value) })} />
        </Field>
        <Field label="Note (optional)">
          <input className="field" value={p.note ?? ''} onChange={(e) => setP({ ...p, note: e.target.value || undefined })} placeholder="e.g. evenings only" />
        </Field>
      </div>
    </Sheet>
  )
}
