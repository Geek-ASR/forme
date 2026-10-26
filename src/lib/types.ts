// Every record syncs to the private repo. `updatedAt` decides merges (last write wins per record);
// deletions are tombstones so they propagate between devices instead of being resurrected.
export type Rec = { id: string; updatedAt: number; deleted?: boolean }

export type Meal = 'breakfast' | 'lunch' | 'snack' | 'dinner'
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
export type PostType = 'thought' | 'blog' | 'philosophy' | 'journal' | 'quote' | 'poem'

export type AutoRule =
  | 'water' | 'steps' | 'workout' | 'mobility' | 'german' | 'meals'
  | 'protein' | 'write' | 'checkin' | 'skin-am' | 'skin-pm' | 'sleep'

export type Profile = Rec & {
  name: string
  birth?: string // YYYY-MM or YYYY-MM-DD
  sex: 'male' | 'female'
  heightCm: number
  startWeightKg: number
  peakWeightKg?: number
  goalWeightKg: number
  milestoneWeightKg?: number
  milestoneDate?: string
  bodyFat?: string
  diet?: string
  conditions?: string[]
  medications?: { name: string; note?: string }[]
  timezone: string
  planStart: string
  planWeeks: number
  skinStart?: string
  about?: string
}

export type MeDoc = Rec & { sections: Record<string, string> }

export type RoutineItem = {
  id: string
  label: string
  time?: string
  icon: string
  auto?: AutoRule
  link?: string
  days?: number[]
  enabled: boolean
}

export type Reminder = {
  id: string
  label: string
  body?: string
  time: string
  days: number[]
  enabled: boolean
  kind?: string
  url?: string
}

export type ProductRole =
  | 'cleanser' | 'gentle' | 'vitc' | 'niacinamide' | 'arbutin' | 'bha' | 'retinoid' | 'moisturizer' | 'sunscreen'
  | 'lip' | 'lipspf' | 'hair' | 'eye' | 'aftershave' | 'bodywash' | 'shampoo' | 'other'
export type Product = {
  id: string
  name: string
  role: ProductRole
  have: boolean
  openedOn?: string
  lastsWeeks?: number
  note?: string
}

export type Settings = Rec & {
  targets: { kcal: number; protein: number; waterMl: number; sleepHours: number; germanMinutes: number; stepsOverride?: number }
  routine: RoutineItem[]
  reminders: Reminder[]
  skincare: { products: Product[] }
  german: { level: Level; newPerDay: number; direction: 'de-en' | 'en-de' | 'mixed'; goalLabel?: string; goalDate?: string }
  hybrid?: { nextIdea: number; books?: Partial<Record<HBook, string>> }
  ratingCats?: RatingCat[]
  training?: { dumbbellKg?: number; dumbbells?: number }
}

export type Day = Rec & {
  mood?: number
  energy?: number
  pain?: number
  stiffMin?: number
  sleepH?: number
  sleepQ?: number
  waterMl?: number
  steps?: number
  checks?: Record<string, boolean>
  flare?: boolean
  skinIrritated?: boolean
  skinFeel?: 'oily' | 'balanced' | 'tight' | 'irritated'
  skinBreakouts?: 0 | 1 | 2
  note?: string
  skipped?: Meal[] // meals deliberately not eaten — they count as logged
  closedAt?: number // evening check-in finished
}

export type FoodEntry = Rec & {
  date: string
  meal: Meal
  foodId?: string
  name: string
  qty: number
  unit: string
  kcal: number
  p: number
  c: number
  f: number
  fb?: number
  at?: number
}

export type CustomFood = Rec & {
  name: string
  aliases?: string
  unit: string
  g: number
  kcal: number
  p: number
  c: number
  f: number
  fb?: number
  recipe?: { foodId: string; name: string; qty: number }[]
  servings?: number
}

export type MealTemplate = Rec & { name: string; items: { foodId: string; name: string; qty: number }[] }

export type Activity = Rec & {
  date: string
  kind: 'workout' | 'walk' | 'activity' | 'mobility'
  session?: string
  title: string
  minutes: number
  met: number
  kcal: number
  rpe?: number
  pain?: number
  note?: string
}

export type BodyEntry = Rec & {
  date: string
  kg?: number
  waist?: number
  chest?: number
  hips?: number
  arm?: number
  thigh?: number
  bf?: number
  chestExp?: number
  wallHead?: number
  pushups?: number
  plank?: number
  wallSit?: number
  chairStand?: number
  note?: string
}

export type Basdai = Rec & { date: string; q: number[]; score: number }
export type MedLog = Rec & { date: string; time: string; name: string; dose?: string; note?: string }

export type Post = Rec & {
  date: string
  type: PostType
  title?: string
  body: string
  tags?: string[]
  mood?: number
  pinned?: boolean
  public?: boolean
  slug?: string
  publishedAt?: number
  createdAt: number
}

export type HKind = 'idea' | 'question' | 'decision' | 'character' | 'world' | 'scene' | 'dialogue' | 'research' | 'thought' | 'loop'
export type HBook = 'series' | 'b1' | 'b2' | 'b3'
export type HybridNote = Rec & {
  kind: HKind
  book: HBook
  status: string
  title: string
  body?: string
  why?: string
  related?: string
  problems?: string
  ref?: string
  tier?: string
  tags?: string[]
  pinned?: boolean
  exported?: boolean
  ideaNo?: number
  createdAt: number
  // loop tool
  chapters?: number
  pairs?: { title: string; first?: string; second?: string }[]
}

export type WritingSession = Rec & { date: string; project: string; minutes: number; words: number; note?: string }

export type SrsState = Rec & { ease: number; ivl: number; due: string; reps: number; lapses: number; last?: string; intro?: string }
export type CustomWord = Rec & { de: string; en: string; art?: string; pl?: string; ex?: string; lvl?: string; createdAt: number }
export type DeLog = Rec & { date: string; minutes: number; kind: string; reviewed?: number; correct?: number; note?: string }

export type Goal = Rec & {
  title: string
  area: 'body' | 'health' | 'mind' | 'german' | 'book' | 'life'
  why?: string
  due?: string
  metric?: 'weight'
  target?: number
  start?: number
  milestones?: { text: string; done: boolean }[]
  done?: boolean
  createdAt: number
}

export type Letter = Rec & { title?: string; body: string; writtenOn: string; openOn: string; opened?: boolean }

export type Review = Rec & {
  week: string
  wins?: string
  hard?: string
  learned?: string
  focus?: string
  stats?: Record<string, number | string>
  createdAt: number
}

export type PushSub = Rec & { endpoint: string; keys: { p256dh: string; auth: string }; device: string; createdAt: number }

export type RatingCat = { id: string; label: string; emoji: string; by?: string; where?: string; doing?: string; want?: string; hidden?: boolean }
export type RatingStatus = 'done' | 'want' | 'doing'
export type Rating = Rec & {
  title: string
  cat: string
  status: RatingStatus
  stars?: number // 0.5–5 in halves
  date?: string
  by?: string
  where?: string
  year?: number
  price?: number
  progress?: string
  notes?: string
  tags?: string[]
  fav?: boolean
  again?: boolean
  createdAt: number
}

/** One exercise in one session: reps (or seconds) achieved per set. */
export type Lift = Rec & { date: string; session: string; exId: string; reps: number[]; unit: 'reps' | 'sec'; kg?: number }
