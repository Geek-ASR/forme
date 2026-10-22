// Skincare plan engine. Routines are built from the products you actually own (your shelf lives in
// the private data repo). AM protects (vitamin C + sunscreen); PM treats, rotating salicylic acid
// nights with alpha-arbutin nights — and, from month 4 if you add one, retinoid nights.
//
// Evidence & brand directions behind the defaults are listed in SOURCES at the bottom.

import { diffDays, weekday } from '../lib/date'
import type { Product, ProductRole } from '../lib/types'

export type SkinStep = { role: ProductRole; title: string; how: string; key?: boolean; product?: string }
export type SkinNight = 'bha' | 'arbutin' | 'retinoid' | 'rest'

const owned = (products: Product[], role: ProductRole) => products.find((p) => p.role === role && p.have)
export const hasProduct = (products: Product[], role: ProductRole) => !!owned(products, role)

/** Start date of the retinoid (its "opened on" date), if you own one. */
export const retinoidStart = (products: Product[]) => owned(products, 'retinoid')?.openedOn

// ── schedule ──
/**
 * Salicylic acid: Minimalist's directions are evening use, every other day for two weeks, then up to daily.
 * We cap at four nights so arbutin keeps its nights and acid + charcoal wash don't over-dry the skin.
 * Once a retinoid starts, acid drops to Mon/Wed/Fri and the retinoid takes Tue & Sat (then Tue/Thu/Sat).
 */
export function bhaNights(skinStart: string | undefined, date: string, retinoid?: string): number[] {
  if (retinoid && date >= retinoid) return [1, 3, 5]
  const w = skinStart ? Math.floor(diffDays(date, skinStart) / 7) : 0
  return w < 2 ? [1, 3, 5] : [0, 1, 3, 5]
}

export function retinoidNights(retinoid: string | undefined, date: string): number[] {
  if (!retinoid || date < retinoid) return []
  return diffDays(date, retinoid) < 14 ? [2, 6] : [2, 4, 6]
}

export function skinNight(o: { skinStart?: string; date: string; irritated?: boolean; products: Product[] }): SkinNight {
  if (o.irritated) return 'rest'
  const r = retinoidStart(o.products)
  const wd = weekday(o.date)
  if (bhaNights(o.skinStart, o.date, r).includes(wd)) return 'bha'
  if (retinoidNights(r, o.date).includes(wd)) return 'retinoid'
  return 'arbutin'
}

export const NIGHT_LABEL: Record<SkinNight, string> = {
  bha: 'Salicylic acid night',
  arbutin: 'Alpha arbutin night',
  retinoid: 'Retinoid night',
  rest: 'Recovery night',
}
export const NIGHT_SHORT: Record<SkinNight, string> = { bha: 'SA', arbutin: 'AA', retinoid: 'RT', rest: '—' }

// ── routines ──
export function amSteps(products: Product[]): SkinStep[] {
  const gentle = owned(products, 'gentle')
  const charcoal = owned(products, 'cleanser')
  const steps: SkinStep[] = [
    gentle
      ? { role: 'gentle', title: 'Cleanse', how: 'A quick 30-second wash with lukewarm water, pat dry.', product: gentle.name }
      : {
          role: 'cleanser',
          title: 'Rinse or cleanse',
          how: charcoal
            ? 'A splash of lukewarm water is enough most mornings. Use the charcoal wash only if you woke up very oily — once a day is plenty for most skin.'
            : 'A splash of lukewarm water, pat dry.',
          product: charcoal?.name,
        },
    { role: 'vitc', title: 'Vitamin C serum', how: '2–3 drops on dry skin, pressed into face and neck. Let it sink in for a minute — it boosts your sunscreen and fades dullness.', product: owned(products, 'vitc')?.name },
  ]
  const nia = owned(products, 'niacinamide')
  if (nia) steps.push({ role: 'niacinamide', title: 'Niacinamide', how: '2–3 drops after vitamin C (they work fine together). Controls oil and fades marks. Skip it on days your skin stings.', product: nia.name })
  if (retinoidStart(products)) steps.push({ role: 'arbutin', title: 'Alpha arbutin', how: 'Now that nights belong to acid and retinoid, arbutin moves to the morning: 2–3 drops, extra on dark spots.', product: owned(products, 'arbutin')?.name })
  steps.push(
    { role: 'moisturizer', title: 'Moisturiser', how: 'A thin layer, about a pea-to-almond size. Oily skin needs it too — dehydrated skin makes more oil.', product: owned(products, 'moisturizer')?.name },
    { role: 'sunscreen', title: 'Sunscreen SPF 50', how: 'Two finger-lengths for face and neck, 10–15 minutes before going out. Reapply every 2 hours outdoors and after sweating — it is not water-resistant.', key: true, product: owned(products, 'sunscreen')?.name },
  )
  const lipspf = owned(products, 'lipspf')
  steps.push(
    lipspf
      ? { role: 'lipspf', title: 'Lip balm with SPF', how: 'Lips burn and darken too. Reapply after eating.', product: lipspf.name }
      : { role: 'lip', title: 'Lip balm', how: 'A thin layer. (An SPF lip balm is on your “add next” list.)', product: owned(products, 'lip')?.name },
  )
  return steps
}

export function pmSteps(night: SkinNight, products: Product[]): SkinStep[] {
  const charcoal = owned(products, 'cleanser')
  const gentle = owned(products, 'gentle')
  const cleanse: SkinStep =
    night === 'rest'
      ? { role: gentle ? 'gentle' : 'cleanser', title: 'Cleanse gently', how: 'Lukewarm water and the mildest cleanser you have. No scrubbing.', product: (gentle ?? charcoal)?.name }
      : {
          role: 'cleanser',
          title: 'Cleanse',
          how: `Massage for 30–60 seconds to lift sunscreen, sweat and oil, then pat completely dry — actives sting on damp skin.${gentle ? ' If your face feels tight afterwards, use the gentle cleanser instead tonight.' : ''}`,
          product: charcoal?.name,
        }
  const treat: Record<SkinNight, SkinStep | null> = {
    bha: { role: 'bha', title: 'Salicylic acid + LHA', how: '2–3 drops on the T-zone, nose, chin and breakout areas. Avoid eyes and lips. Wait 1–2 minutes before moisturiser.', product: owned(products, 'bha')?.name },
    arbutin: { role: 'arbutin', title: 'Alpha arbutin', how: '2–3 drops over the whole face, a little extra on dark spots and acne marks.', product: owned(products, 'arbutin')?.name },
    retinoid: { role: 'retinoid', title: 'Retinoid', how: 'A pea-sized amount for the whole face on completely dry skin. Avoid the corners of the nose, eyes and mouth. For the first weeks, moisturiser before and after (the “sandwich”).', product: owned(products, 'retinoid')?.name },
    rest: null,
  }
  const steps: SkinStep[] = [cleanse]
  const t = treat[night]
  if (t) steps.push(t)
  steps.push(
    { role: 'moisturizer', title: 'Moisturiser', how: night === 'rest' ? 'Your skin is recovering — moisturiser is the whole treatment tonight.' : 'Seal everything in.', product: owned(products, 'moisturizer')?.name },
    { role: 'lip', title: 'Lip balm', how: 'A thick layer overnight.', product: (owned(products, 'lip') ?? owned(products, 'lipspf'))?.name },
  )
  return steps
}

// ── phases ──
export type SkinPhase = { n: number; name: string; weeks: string; from: number; to: number; does: string[]; expect: string }
export const PHASES: SkinPhase[] = [
  {
    n: 1, name: 'Settle in', weeks: 'Weeks 1–2', from: 0, to: 13,
    does: ['Salicylic acid every other night (Mon, Wed, Fri) — Minimalist’s own starting pace', 'Alpha arbutin on the other nights', 'Vitamin C + sunscreen every single morning', 'Patch-test anything new behind the ear for 24–48 h'],
    expect: 'Skin adjusts. A few small bumps where you usually break out is normal “purging” — it settles within 4–6 weeks.',
  },
  {
    n: 2, name: 'Build', weeks: 'Weeks 3–8', from: 14, to: 55,
    does: ['Salicylic acid up to 4 nights (Sun, Mon, Wed, Fri) if there is no stinging or flaking', 'Add niacinamide in the mornings if you buy it — one new product at a time, two weeks apart', 'Take a progress photo in the same light every 4 weeks'],
    expect: 'Fewer blackheads, less shine and smoother texture by weeks 4–6.',
  },
  {
    n: 3, name: 'Results', weeks: 'Weeks 9–12', from: 56, to: 83,
    does: ['Keep everything steady — consistency now beats new products', 'Reapply sunscreen when outdoors; tan and marks fade only when sun damage stops'],
    expect: 'Dark spots, acne marks and tan visibly lighter at 8–12 weeks — if sunscreen has been daily.',
  },
  {
    n: 4, name: 'Level up (optional)', weeks: 'Month 4+', from: 84, to: 9999,
    does: ['Only if you want more: a retinoid on Tue & Sat, acid drops to Mon/Wed/Fri, arbutin moves to mornings', 'After 2 calm weeks, retinoid on Tue, Thu and Sat'],
    expect: 'Retinoids are the long game for acne and texture; expect some dryness in the first 4–6 weeks.',
  },
]
export function skinPhase(skinStart: string | undefined, date: string): SkinPhase {
  const d = skinStart ? Math.max(0, diffDays(date, skinStart)) : 0
  return PHASES.find((p) => d >= p.from && d <= p.to) ?? PHASES[0]
}

// ── recommendations ──
export type Recommendation = {
  role: ProductRole
  title: string
  tier: 'Add next' | 'When ready' | 'Only if needed'
  why: string
  how: string
  examples: string[]
  lastsWeeks: number
}
export const RECOMMENDATIONS: Recommendation[] = [
  {
    role: 'lipspf', title: 'Lip balm with SPF', tier: 'Add next', lastsWeeks: 10,
    why: 'Lips burn and darken in strong sun and have very little natural protection. Your current balm moisturises but does not block UV.',
    how: 'Use it during the day and after meals; keep your current balm for nights.',
    examples: ['Minimalist Lip Balm SPF 30 (ceramides + hyaluronic acid, fragrance-free)'],
  },
  {
    role: 'niacinamide', title: 'Niacinamide serum', tier: 'Add next', lastsWeeks: 12,
    why: 'The best-researched all-rounder for oily, acne-prone skin with marks: in studies 2% reduced oil within 2–4 weeks and 5% faded hyperpigmentation in 4 weeks by blocking pigment transfer. It also strengthens the barrier, which helps you tolerate the salicylic acid.',
    how: 'Mornings, after vitamin C (they are fine together — the “don’t mix” rule is an outdated myth). Start from week 3.',
    examples: ['Minimalist Niacinamide 10% + Zinc 1%', 'A 5% niacinamide if 10% stings'],
  },
  {
    role: 'gentle', title: 'A gentle, non-stripping cleanser', tier: 'Add next', lastsWeeks: 10,
    why: 'Charcoal washes are built to pull oil. Twice a day, plus salicylic acid, that can tip into tight, flaky, then oilier skin. A mild cleanser for mornings — and for nights your skin feels tight — protects the barrier.',
    how: 'Morning wash, and any evening your face feels tight. Keep the charcoal wash for evenings and after workouts.',
    examples: ['Cetaphil Gentle Skin Cleanser', 'CeraVe Foaming Cleanser (oily skin)', 'Simple Kind to Skin Refreshing Facial Wash'],
  },
  {
    role: 'retinoid', title: 'A retinoid — the long game', tier: 'When ready', lastsWeeks: 16,
    why: 'Retinoids are the gold standard for acne, texture and long-term skin quality. You don’t need one now — add it only after about 12 weeks of a stable routine.',
    how: 'Pea-sized amount on Tue & Sat nights, then Tue/Thu/Sat. Forme rearranges your nights automatically once you mark it as bought. Daily sunscreen is non-negotiable.',
    examples: ['Minimalist Retinol 0.3% (gentle start)', 'Adapalene 0.1% gel — ask a dermatologist'],
  },
  {
    role: 'aftershave', title: 'Alcohol-free aftershave balm', tier: 'Only if needed', lastsWeeks: 16,
    why: 'Shaving micro-exfoliates. Alcohol-based aftershaves sting and dry — worse when acids are in your routine.',
    how: 'Shave on arbutin or recovery nights (or mornings), then balm or simply your moisturiser.',
    examples: ['Any alcohol-free, fragrance-free balm', 'Your moisturiser works too'],
  },
  {
    role: 'bodywash', title: 'Salicylic acid body wash', tier: 'Only if needed', lastsWeeks: 10,
    why: 'Only if you get back or chest acne — workout sweat makes it more likely.',
    how: 'Lather on back and chest, leave 1–2 minutes, rinse. Shower soon after workouts.',
    examples: ['Any 2% salicylic acid body wash'],
  },
  {
    role: 'shampoo', title: 'Anti-dandruff shampoo', tier: 'Only if needed', lastsWeeks: 12,
    why: 'Only if you have dandruff — flakes can aggravate forehead and hairline breakouts.',
    how: 'Twice a week: lather and leave on the scalp for 3–5 minutes.',
    examples: ['Ketoconazole 2% shampoo'],
  },
  {
    role: 'eye', title: 'Eye serum', tier: 'Only if needed', lastsWeeks: 16,
    why: 'Only if dark circles bother you. Sleep is the real fix; creams help modestly.',
    how: 'A tiny amount tapped along the orbital bone at night.',
    examples: ['Look for caffeine or niacinamide; skip heavily fragranced ones'],
  },
]

export const SKIP = [
  ['Face scrubs with beads or grains', 'Salicylic acid already exfoliates inside the pores; scrubs on top cause micro-tears and redness.'],
  ['More acids (AHA peels, glycolic toners)', 'One exfoliant is enough. Stacking acids is the fastest way to a damaged barrier.'],
  ['DIY lemon, toothpaste, baking soda', 'Wrong pH, real burns, no benefit.'],
  ['Alcohol-heavy toners and strongly fragranced products', 'They dry and irritate — and you don’t need a toner at all.'],
]

// ── guide ──
export const WHAT_IT_DOES: { role: ProductRole; name: string; does: string }[] = [
  { role: 'bha', name: 'Salicylic acid + LHA 2%', does: 'An oil-soluble exfoliant (BHA) that works inside pores — blackheads, whiteheads, oiliness. LHA is a slower, gentler cousin of salicylic acid. Evenings only.' },
  { role: 'vitc', name: 'Vitamin C 10%', does: 'Minimalist’s uses ethyl ascorbic acid, a stable form of vitamin C at pH ~4. An antioxidant that boosts your sunscreen and fades dullness and marks. Mornings.' },
  { role: 'arbutin', name: 'Alpha arbutin 2%', does: 'Slows tyrosinase, the enzyme that makes pigment — for dark spots, tan and post-acne marks. Gentle; works over 8–12 weeks.' },
  { role: 'cleanser', name: 'Charcoal face wash', does: 'Charcoal binds surface oil and grime. Great after a sweaty day; too stripping for some people twice daily — tightness is the sign.' },
  { role: 'moisturizer', name: 'Moisturiser', does: 'Keeps the skin barrier intact so the actives don’t irritate. If unsure which Minimalist one you have: Vitamin B5 10% is the oil-free one for oily skin, Sepicalm 3% + Oat is for sensitive skin, Marula Oil is the richer one for dry winter skin.' },
  { role: 'sunscreen', name: 'Sunscreen SPF 50 PA++++', does: 'The most important product you own: it prevents tan and keeps marks from darkening — and vitamin C, acids and arbutin all need it. Minimalist’s is not water-resistant, so reapply after sweat.' },
  { role: 'hair', name: 'Hair serum (oil)', does: 'Smooths frizz and protects the ends. Keep it off the scalp, forehead and hairline — oils there can cause small bumps along the hairline.' },
  { role: 'lip', name: 'Lip balm', does: 'Repairs dry lips. Thick layer at night; an SPF balm for the day.' },
]

export const COMPAT: { pair: string; ok: 'yes' | 'separate' | 'careful'; note: string }[] = [
  { pair: 'Vitamin C + sunscreen', ok: 'yes', note: 'Better together — vitamin C adds antioxidant protection under SPF.' },
  { pair: 'Vitamin C + niacinamide', ok: 'yes', note: 'Fine together. The “they cancel out” idea comes from old lab tests with pure ingredients, not modern serums.' },
  { pair: 'Alpha arbutin + anything here', ok: 'yes', note: 'Gentle and plays well with vitamin C, niacinamide and acids.' },
  { pair: 'Salicylic acid + vitamin C', ok: 'separate', note: 'Different times of day: vitamin C mornings, acid evenings.' },
  { pair: 'Salicylic acid + retinoid', ok: 'separate', note: 'Different nights — both exfoliate, together they irritate.' },
  { pair: 'Charcoal wash + salicylic acid', ok: 'careful', note: 'Both remove oil. Tight, squeaky or flaky skin means switch to a gentler wash.' },
]

export const TROUBLESHOOT: { q: string; a: string }[] = [
  { q: 'Small bumps where I usually break out', a: 'Likely purging: salicylic acid pushes existing clogs out faster. It usually settles in 4–6 weeks — keep going.' },
  { q: 'Breakouts in new places, burning, itching or redness', a: 'That is irritation, not purging. Mark your skin as irritated (recovery nights), skip actives 3–5 nights, then restart at 2 acid nights a week. Still going after 6–8 weeks → see a dermatologist.' },
  { q: 'Tight, flaky or stinging skin', a: 'Over-exfoliation. Recovery nights, gentle cleanser, moisturiser twice a day. Restart the acid slowly.' },
  { q: 'Bumps along the forehead and hairline', a: 'Usually hair oil, sweat or pillowcases. Keep the hair serum off the hairline, wash your face after workouts, change pillowcases twice a week.' },
  { q: 'Breakouts after starting whey protein', a: 'The evidence is mixed — a 2024 trial found no effect, some observational studies did. Test it yourself: four to six weeks of a plant protein, and watch your skin check-ins.' },
  { q: 'Dark spots still there after 3 months', a: 'Check sunscreen first (enough, every day, reapplied). If it is consistent and spots remain, a dermatologist can add stronger options.' },
]

export const HABITS = [
  'Wash your face soon after workouts — sweat plus sunscreen clogs pores.',
  'Change pillowcases twice a week; wipe your phone screen.',
  'Sleep helps everything, including your skin and your back.',
  'Diet: dermatology guidelines don’t prescribe a diet for acne. Some evidence links high-sugar foods and skim milk to breakouts — your whole-food plan helps either way.',
  'Shave on arbutin or recovery nights, or mornings — never right before acid or retinoid.',
]

export const HAIR = {
  title: 'Hair serum',
  steps: [
    'After washing, towel-dry until hair is damp, not dripping.',
    'Rub 2–3 drops between your palms.',
    'Work it through the mid-lengths and ends — keep it off the scalp, forehead and hairline.',
    'Style as usual. On dry days, a single drop tames frizz.',
  ],
}

export const SKIN_TIMELINE = [
  { w: 'Weeks 1–2', d: 'Skin adjusts; some purging is normal with salicylic acid.' },
  { w: 'Weeks 4–6', d: 'Fewer blackheads, less oil, smoother texture.' },
  { w: 'Weeks 8–12', d: 'Dark spots, tan and acne marks visibly lighter — with daily sunscreen.' },
]

export const SOURCES: { label: string; url: string }[] = [
  { label: 'Minimalist Salicylic Acid 2% — directions (evening; alternate days, then daily after 2 weeks)', url: 'https://www.beautybay.com/p/minimalist/salicylic-acid-2-face-serum/salicylic-acid-2-face-serum-30/' },
  { label: 'Minimalist Vitamin C 10% — ethyl ascorbic acid, pH ~4, use with sunscreen', url: 'https://www.myaster.com/en/online-pharmacy/p/minimalist-10-vitamin-c-face-serum-30ml/1068276' },
  { label: 'Minimalist Alpha Arbutin 2% — product page', url: 'https://beminimalist.co/collections/all/products/alpha-arbutin-2' },
  { label: 'Minimalist SPF 50 PA++++ — filters, not water-resistant', url: 'https://apollopharmacy.in/otc/minimalist-spf-50-pa-sunscreen-cream-50g' },
  { label: 'Minimalist moisturisers compared (B5, Sepicalm, Marula)', url: 'https://skinsort.com/products/minimalist-moisturizers' },
  { label: 'Minimalist Lip Balm SPF 30', url: 'https://skinsort.com/products/minimalist/lip-balm-spf-30' },
  { label: 'Niacinamide: a multi-functional cosmeceutical (sebum & pigment studies)', url: 'https://practicaldermatology.com/topics/esthetics-cosmeceuticals/niacinamide-a-multi-functional-cosmeceutical-ingredient/23720/' },
  { label: 'Niacinamide and vitamin C — origin of the myth', url: 'https://www.vegalab.com/beauty-science/knowledge/myths/niacinamide-vitamin-c' },
  { label: 'Purging vs breakouts — dermatologists (4–6 weeks)', url: 'https://www.nbcnews.com/select/shopping/skin-purging-vs-breakouts-rcna261398' },
  { label: 'Retinoid start-up and pairing with salicylic acid', url: 'https://dermatologytimes.com/view/optimal-topical-retinoid-use-acne' },
  { label: 'Whey protein and male acne — 2024 randomised trial', url: 'https://nutrition-evidence.com/article/512984/whey-protein-and-male-acne-a-double-blind-randomized-controlled-trial' },
  { label: 'AAD — can the right diet get rid of acne?', url: 'https://www.aad.org/diseases/acne/acne-diet' },
]

/** Generic shelf for new installs; the private data repo stores your actual products. */
export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'cleanser', name: 'Face wash', role: 'cleanser', have: false, lastsWeeks: 8 },
  { id: 'vitc', name: 'Vitamin C serum', role: 'vitc', have: false, lastsWeeks: 12 },
  { id: 'bha', name: 'Salicylic acid serum', role: 'bha', have: false, lastsWeeks: 20 },
  { id: 'arbutin', name: 'Alpha arbutin serum', role: 'arbutin', have: false, lastsWeeks: 16 },
  { id: 'moisturizer', name: 'Moisturiser', role: 'moisturizer', have: false, lastsWeeks: 7 },
  { id: 'sunscreen', name: 'Sunscreen SPF 50 PA++++', role: 'sunscreen', have: false, lastsWeeks: 6 },
  { id: 'lip', name: 'Lip balm', role: 'lip', have: false, lastsWeeks: 12 },
  { id: 'hair', name: 'Hair serum', role: 'hair', have: false, lastsWeeks: 30 },
]

export const ROLE_LABEL: Record<ProductRole, string> = {
  cleanser: 'Face wash', gentle: 'Gentle cleanser', vitc: 'Vitamin C', niacinamide: 'Niacinamide', arbutin: 'Alpha arbutin',
  bha: 'Salicylic acid', retinoid: 'Retinoid', moisturizer: 'Moisturiser', sunscreen: 'Sunscreen', lip: 'Lip balm',
  lipspf: 'Lip balm SPF', hair: 'Hair serum', eye: 'Eye serum', aftershave: 'Aftershave balm', bodywash: 'Body wash',
  shampoo: 'Shampoo', other: 'Other',
}
