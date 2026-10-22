// Calendar export: rock-solid native reminders as a backup to push notifications.
// Times are "floating" (no timezone), so 07:30 stays 07:30 wherever your phone is.

import { dkey } from './date'
import type { Reminder } from './types'

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

export function buildIcs(reminders: Reminder[], siteUrl: string): string {
  const start = dkey().replace(/-/g, '')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const events = reminders
    .filter((r) => r.enabled && r.days.length)
    .map((r) => {
      const [h, m] = r.time.split(':')
      const rule = r.days.length === 7 ? 'FREQ=DAILY' : `FREQ=WEEKLY;BYDAY=${r.days.map((d) => BYDAY[d]).join(',')}`
      return [
        'BEGIN:VEVENT',
        `UID:${r.id}@forme`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${start}T${h}${m}00`,
        'DURATION:PT10M',
        `RRULE:${rule}`,
        `SUMMARY:${esc(r.label)}`,
        `DESCRIPTION:${esc((r.body ?? '') + (r.url ? `\n${siteUrl}${r.url}` : ''))}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(r.label)}`,
        'TRIGGER:PT0M',
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n')
    })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Forme//Routines//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Forme routines', ...events, 'END:VCALENDAR', ''].join('\r\n')
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
