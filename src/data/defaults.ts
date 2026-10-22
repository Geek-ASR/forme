// Generic defaults for a fresh install. Your personal settings live in the private data repo
// and override these on first sync.

import type { Reminder, RoutineItem, Settings } from '../lib/types'
import { DEFAULT_PRODUCTS } from './skincare'

const ALL = [0, 1, 2, 3, 4, 5, 6]

export const DEFAULT_ROUTINE: RoutineItem[] = [
  { id: 'mobility', label: 'Morning mobility', time: '07:30', icon: 'stretch', auto: 'mobility', link: '#/body/workout/mobility', enabled: true },
  { id: 'skin-am', label: 'AM skincare + sunscreen', time: '08:15', icon: 'sun', auto: 'skin-am', link: '#/body/skin', enabled: true },
  { id: 'checkin', label: 'Daily check-in', icon: 'heart', auto: 'checkin', enabled: true },
  { id: 'water', label: 'Water goal', icon: 'droplet', auto: 'water', enabled: true },
  { id: 'steps', label: 'Step goal', icon: 'footprints', auto: 'steps', link: '#/body/move', enabled: true },
  { id: 'workout', label: "Today's workout", time: '18:00', icon: 'dumbbell', auto: 'workout', link: '#/body/plan', enabled: true },
  { id: 'protein', label: 'Protein target', icon: 'zap', auto: 'protein', link: '#/body/food', enabled: true },
  { id: 'meals', label: 'Log every meal', icon: 'utensils', auto: 'meals', link: '#/body/food', enabled: true },
  { id: 'german', label: 'German practice', time: '20:30', icon: 'languages', auto: 'german', link: '#/deutsch', enabled: true },
  { id: 'skin-pm', label: 'PM skincare', time: '22:30', icon: 'moon', auto: 'skin-pm', link: '#/body/skin', enabled: true },
  { id: 'write', label: 'Write one thought', icon: 'feather', auto: 'write', link: '#/mind/new?type=thought', enabled: true },
  { id: 'sleep', label: 'Lights out on time', time: '23:15', icon: 'bed', enabled: true },
]

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'r-mobility', label: 'Morning mobility', body: 'Ten minutes for your spine before the day starts.', time: '07:30', days: ALL, enabled: true, kind: 'mobility', url: '#/body/workout/mobility' },
  { id: 'r-skin-am', label: 'AM skincare', body: 'Vitamin C → moisturiser → sunscreen.', time: '08:15', days: ALL, enabled: true, kind: 'skin-am', url: '#/body/skin' },
  { id: 'r-water', label: 'Water check', body: 'Have a glass of water and log it.', time: '11:30', days: ALL, enabled: false, kind: 'water', url: '#/' },
  { id: 'r-lunch', label: 'Log lunch', body: 'Tell Forme what you ate.', time: '14:30', days: ALL, enabled: true, kind: 'food', url: '#/body/food/add' },
  { id: 'r-workout', label: 'Workout time', body: "Today's session is ready.", time: '18:00', days: [1, 2, 3, 4, 5, 6], enabled: true, kind: 'workout', url: '#/body/plan' },
  { id: 'r-german', label: 'Deutsch', body: 'Your cards are waiting.', time: '20:30', days: ALL, enabled: true, kind: 'german', url: '#/deutsch/review' },
  { id: 'r-dinner', label: 'Log dinner', body: 'Close the day: dinner, water, steps.', time: '21:45', days: ALL, enabled: true, kind: 'food', url: '#/body/food/add' },
  { id: 'r-skin-pm', label: 'PM skincare', body: 'Cleanse, serum, moisturiser.', time: '22:30', days: ALL, enabled: true, kind: 'skin-pm', url: '#/body/skin' },
  { id: 'r-sleep', label: 'Wind down', body: 'Screens away, a gentle stretch, lights out by 11:30.', time: '23:15', days: ALL, enabled: true, kind: 'sleep', url: '#/' },
  { id: 'r-weekly', label: 'Weekly check', body: 'Weigh-in and your weekly review.', time: '10:00', days: [0], enabled: true, kind: 'weekly', url: '#/me/review' },
]

export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'updatedAt'> = {
  targets: { kcal: 1650, protein: 100, waterMl: 3000, sleepHours: 7.5, germanMinutes: 20 },
  routine: DEFAULT_ROUTINE,
  reminders: DEFAULT_REMINDERS,
  skincare: { products: DEFAULT_PRODUCTS },
  german: { level: 'A1', newPerDay: 10, direction: 'de-en' },
  hybrid: { nextIdea: 1 },
}
