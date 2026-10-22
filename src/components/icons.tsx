import {
  Bed, Droplet, Dumbbell, Feather, Footprints, HeartPulse, Languages, Moon, PersonStanding, Sparkles, Sun, Utensils, Zap,
  type LucideIcon,
} from 'lucide-react'

export const ROUTINE_ICONS: Record<string, LucideIcon> = {
  stretch: PersonStanding,
  sun: Sun,
  heart: HeartPulse,
  droplet: Droplet,
  footprints: Footprints,
  dumbbell: Dumbbell,
  zap: Zap,
  utensils: Utensils,
  languages: Languages,
  moon: Moon,
  feather: Feather,
  bed: Bed,
  sparkles: Sparkles,
}

export function RoutineIcon({ name, size = 18 }: { name: string; size?: number }) {
  const I = ROUTINE_ICONS[name] ?? Sparkles
  return <I size={size} />
}
