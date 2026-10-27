// How hard to train today, from this morning's check-in. Built on the pain-monitoring idea physios use
// (mild discomfort that settles is fine; pain that's up the morning after training means back off) and
// NASS's flare advice for axial SpA (keep moving — little and often, lower intensity, no high impact).

import { useMemo } from 'react'
import { useByDate } from './app'
import { addDays } from './date'
import { useDoc } from './store'
import type { Activity, Day } from './types'

export type Readiness = { level: 'unknown' | 'full' | 'easy' | 'flare'; reason: string }

export function readiness(today: Day | undefined, yesterday: Day | undefined, yesterdayActs: Activity[]): Readiness {
  if (today?.flare) return { level: 'flare', reason: 'You switched today to flare care.' }
  const pain = today?.pain
  const stiff = today?.stiffMin
  if (pain === undefined && stiff === undefined) return { level: 'unknown', reason: 'Check in with pain and stiffness, and today’s session adjusts to your back.' }
  if ((pain ?? 0) >= 7) return { level: 'flare', reason: `Pain ${pain}/10 this morning — rest from intensity, not from movement.` }
  if ((stiff ?? 0) >= 120) return { level: 'flare', reason: 'Two hours or more of morning stiffness — a gentle day.' }
  if ((pain ?? 0) >= 4) return { level: 'easy', reason: `Pain ${pain}/10 this morning.` }
  if ((stiff ?? 0) >= 60) return { level: 'easy', reason: `${stiff} minutes of morning stiffness.` }
  const trained = yesterdayActs.filter((a) => a.kind !== 'mobility')
  if (trained.length && pain !== undefined && yesterday?.pain !== undefined && pain >= yesterday.pain + 2) {
    return { level: 'easy', reason: `Pain is up ${pain - yesterday.pain} points since yesterday’s session.` }
  }
  const hurt = trained.find((a) => (a.pain ?? 0) >= 6)
  if (hurt) return { level: 'easy', reason: `Yesterday’s ${hurt.title.split(' · ')[0].replace(' (easy)', '')} hurt (${hurt.pain}/10 during).` }
  return { level: 'full', reason: pain !== undefined ? `Pain ${pain}/10 — train as planned.` : 'Train as planned.' }
}

export function useReadiness(date: string): Readiness {
  const today = useDoc<Day>('days', date)
  const yesterday = useDoc<Day>('days', addDays(date, -1))
  const actBy = useByDate<Activity>('activity')
  return useMemo(() => readiness(today, yesterday, actBy.get(addDays(date, -1)) ?? []), [today, yesterday, actBy, date])
}

/** What changes in the easy version — shown wherever it's offered. */
export const EASY_WHAT = 'One set fewer per exercise, gentler swaps for spine-loading moves, 30 s more rest, shorter walks and intervals. Mild discomfort that settles within the hour is fine — stop anything sharp or climbing.'
