// Skincare routine logic. AM protects (vitamin C + sunscreen); PM treats, alternating
// salicylic acid (BHA) nights with alpha-arbutin nights, ramping BHA up slowly.
// Rule of thumb: never layer the BHA and vitamin C in the same routine, never skip sunscreen.

import { diffDays, weekday } from '../lib/date'
import type { Product, ProductRole } from '../lib/types'

export type SkinStep = { role: ProductRole; title: string; how: string; key?: boolean }

export const AM: SkinStep[] = [
  { role: 'cleanser', title: 'Cleanse', how: 'Gentle face wash with lukewarm water, 30 seconds, pat dry. (No cleanser yet? A splash of water is fine in the morning.)' },
  { role: 'vitc', title: 'Vitamin C serum', how: '3–4 drops on dry skin, pressed in with fingertips over face and neck. Wait about a minute.' },
  { role: 'moisturizer', title: 'Moisturiser', how: 'A pea-to-almond-sized amount of a light gel moisturiser.' },
  { role: 'sunscreen', title: 'Sunscreen SPF 50', how: 'Two finger-lengths for face and neck, every single day — even indoors near windows. Reapply every 2–3 hours outdoors.', key: true },
  { role: 'lip', title: 'Lip balm', how: 'A thin layer (one with SPF is even better in the day).' },
]

export const PM_BHA: SkinStep[] = [
  { role: 'cleanser', title: 'Cleanse', how: 'Wash off the day and the sunscreen. Pat completely dry — actives sting on damp skin.' },
  { role: 'bha', title: 'Salicylic acid + LHA', how: '3–4 drops focused on the T-zone, nose, chin and breakout areas. Avoid eyes and lips. Wait 1–2 minutes.' },
  { role: 'moisturizer', title: 'Moisturiser', how: 'Seal everything in.' },
  { role: 'lip', title: 'Lip balm', how: 'A thick layer overnight.' },
]

export const PM_ARBUTIN: SkinStep[] = [
  { role: 'cleanser', title: 'Cleanse', how: 'Wash off the day and the sunscreen, pat dry.' },
  { role: 'arbutin', title: 'Alpha arbutin', how: '2–3 drops over the whole face, a little extra on dark spots and uneven patches.' },
  { role: 'moisturizer', title: 'Moisturiser', how: 'Seal everything in.' },
  { role: 'lip', title: 'Lip balm', how: 'A thick layer overnight.' },
]

export const PM_REST: SkinStep[] = [
  { role: 'cleanser', title: 'Cleanse gently', how: 'Lukewarm water, no scrubbing.' },
  { role: 'moisturizer', title: 'Moisturiser only', how: 'Skin is irritated, so no actives tonight. Let the barrier recover.' },
  { role: 'lip', title: 'Lip balm', how: 'A thick layer overnight.' },
]

/** BHA nights ramp up: weeks 1–2 twice, weeks 3–5 three times, then four nights a week. */
export function bhaNights(skinStart: string | undefined, date: string): number[] {
  const w = skinStart ? Math.floor(diffDays(date, skinStart) / 7) : 0
  if (w < 2) return [1, 4]
  if (w < 5) return [1, 3, 5]
  return [0, 1, 3, 5]
}

export type Tonight = 'bha' | 'arbutin' | 'rest'
export function tonight(skinStart: string | undefined, date: string, irritated?: boolean): Tonight {
  if (irritated) return 'rest'
  return bhaNights(skinStart, date).includes(weekday(date)) ? 'bha' : 'arbutin'
}

export const TONIGHT_LABEL: Record<Tonight, string> = {
  bha: 'Salicylic acid night',
  arbutin: 'Alpha arbutin night',
  rest: 'Recovery night',
}

export const pmSteps = (t: Tonight) => (t === 'bha' ? PM_BHA : t === 'arbutin' ? PM_ARBUTIN : PM_REST)

export const HAIR = {
  title: 'Hair serum',
  steps: [
    'After washing, towel-dry until hair is damp, not dripping.',
    'Rub 2–3 drops between your palms.',
    'Work it through the mid-lengths and ends — keep it off the scalp.',
    'Style as usual. On dry days, a single drop tames frizz.',
  ],
}

export const SKIN_RULES = [
  { t: 'Sunscreen is the whole game', d: 'Vitamin C, salicylic acid and arbutin all make skin more sun-sensitive — and pigmentation fades only when sun damage stops. No sunscreen = wasted serums.' },
  { t: 'Never mix the two acids', d: 'Vitamin C stays in the morning; salicylic acid stays at night. Layering them together invites redness and stinging.' },
  { t: 'Shaving nights skip the acid', d: 'Shaved skin is micro-scratched. Make shaving nights arbutin or recovery nights.' },
  { t: 'Patch test anything new', d: 'Dab a little behind the ear or along the jaw for 24–48 hours before using it on your whole face.' },
  { t: 'Irritated? Pause the actives', d: 'Burning, peeling or redness → two or three recovery nights (cleanse + moisturise), then restart slower.' },
  { t: 'Vitamin C goes off', d: 'Keep it capped, cool and out of sunlight. If it turns dark orange or brown, replace it.' },
  { t: 'After the gym', d: 'Rinse your face soon after sweaty workouts and change pillowcases weekly.' },
]

export const SKIN_TIMELINE = [
  { w: 'Weeks 1–2', d: 'Skin adjusts. Some purging (small breakouts where you already break out) is normal with salicylic acid.' },
  { w: 'Weeks 4–6', d: 'Fewer blackheads, less oil, smoother texture.' },
  { w: 'Weeks 8–12', d: 'Dark spots and uneven tone visibly lighter — if sunscreen has been daily.' },
]

/** Generic shelf for new installs; the private data repo stores your actual products. */
export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'cleanser', name: 'Gentle face wash', role: 'cleanser', have: false, lastsWeeks: 10 },
  { id: 'vitc', name: 'Vitamin C serum', role: 'vitc', have: true, lastsWeeks: 10 },
  { id: 'bha', name: 'Salicylic acid serum', role: 'bha', have: true, lastsWeeks: 12 },
  { id: 'arbutin', name: 'Alpha arbutin serum', role: 'arbutin', have: true, lastsWeeks: 10 },
  { id: 'moisturizer', name: 'Light gel moisturiser', role: 'moisturizer', have: false, lastsWeeks: 8 },
  { id: 'sunscreen', name: 'Sunscreen SPF 50 PA++++', role: 'sunscreen', have: false, lastsWeeks: 5 },
  { id: 'lip', name: 'Lip balm', role: 'lip', have: true, lastsWeeks: 10 },
  { id: 'hair', name: 'Hair serum', role: 'hair', have: true, lastsWeeks: 20 },
]

export const ROLE_LABEL: Record<ProductRole, string> = {
  cleanser: 'Cleanser', vitc: 'Vitamin C', arbutin: 'Alpha arbutin', bha: 'Salicylic acid', moisturizer: 'Moisturiser',
  sunscreen: 'Sunscreen', lip: 'Lip balm', hair: 'Hair serum', other: 'Other',
}
