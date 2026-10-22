// Shared vocabulary for the book notebook. Mirrors the status discipline of a canon-managed project:
// nothing becomes CANON unless the author says so; ideas live in an inbox until promoted.

import { saveSettings, useSettings } from '../../lib/app'
import { dkey } from '../../lib/date'
import { patch } from '../../lib/store'
import type { HBook, HKind, HybridNote } from '../../lib/types'

export const KINDS: { value: HKind; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'thought', label: 'Thought' },
  { value: 'question', label: 'Open question' },
  { value: 'decision', label: 'Decision' },
  { value: 'character', label: 'Character' },
  { value: 'world', label: 'World' },
  { value: 'scene', label: 'Scene' },
  { value: 'dialogue', label: 'Dialogue / line' },
  { value: 'research', label: 'Research' },
]
export const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label])) as Record<HKind, string>

export const CANON_TAGS = ['CANON', 'PROPOSED', 'UNRESOLVED', 'LEGACY', 'ALTERNATIVE', 'RETCON', 'ARCHIVED'] as const
export const IDEA_TAGS = ['NEW', 'EXPLORING', 'PROPOSED', 'APPROVED', 'REJECTED', 'ARCHIVED'] as const

export const statusesFor = (kind: HKind): readonly string[] => (kind === 'idea' ? IDEA_TAGS : CANON_TAGS)
export const defaultStatus = (kind: HKind) => (kind === 'idea' ? 'NEW' : kind === 'question' ? 'UNRESOLVED' : 'PROPOSED')

/** Status pill colours (UI tones, each paired with its text label — never colour alone). */
export const STATUS_TONE: Record<string, string> = {
  CANON: 'bg-[#0ca30c]/15 text-good',
  APPROVED: 'bg-[#0ca30c]/15 text-good',
  PROPOSED: 'bg-[#2a78d6]/15 text-[var(--der)]',
  NEW: 'bg-[#2a78d6]/15 text-[var(--der)]',
  EXPLORING: 'bg-[#6250d6]/15 text-[#6250d6]',
  UNRESOLVED: 'bg-[#eda100]/20 text-[#855600]',
  LEGACY: 'bg-card2 text-ink3',
  ALTERNATIVE: 'bg-[#6250d6]/15 text-[#6250d6]',
  RETCON: 'bg-[#e34948]/15 text-bad',
  REJECTED: 'bg-[#e34948]/15 text-bad',
  ARCHIVED: 'bg-card2 text-ink3',
}

export const BOOK_ORDER: HBook[] = ['series', 'b1', 'b2', 'b3']

export function useBooks(): Record<HBook, string> {
  const s = useSettings()
  const b = s.hybrid?.books ?? {}
  return { series: 'Series', b1: b.b1 ?? 'Book 1', b2: b.b2 ?? 'Book 2', b3: b.b3 ?? 'Book 3' }
}

/** Markdown in the IDEAS_INBOX entry format, numbered from settings.hybrid.nextIdea. */
export function exportIdeas(notes: HybridNote[], nextIdea: number): { md: string; next: number } {
  let n = nextIdea
  const blocks = notes.map((x) => {
    const no = x.ideaNo ?? n++
    if (!x.ideaNo) patch<HybridNote>('hybrid', x.id, { ideaNo: no, exported: true })
    else patch<HybridNote>('hybrid', x.id, { exported: true })
    const date = new Date(x.createdAt).toISOString().slice(0, 10)
    return [
      `## I-${String(no).padStart(3, '0')} · ${x.title}`,
      '',
      `**DATE:** ${date} · **SOURCE:** Author (Forme) · **STATUS:** ${x.status}`,
      '',
      `**DESCRIPTION:** ${(x.body ?? '').trim() || '—'}`,
      '',
      `**WHY IT IS INTERESTING:** ${(x.why ?? '').trim() || '—'}`,
      '',
      `**RELATED CANON:** ${(x.related ?? '').trim() || '—'}`,
      '',
      `**POTENTIAL PROBLEMS:** ${(x.problems ?? '').trim() || '—'}`,
      '',
      '---',
    ].join('\n')
  })
  if (n !== nextIdea) saveSettings({ hybrid: { nextIdea: n } })
  return { md: blocks.join('\n\n') + '\n', next: n }
}

export function noteMarkdown(x: HybridNote, books: Record<HBook, string>): string {
  return [
    `### ${x.ref ? `${x.ref} · ` : ''}${x.title}`,
    `**${KIND_LABEL[x.kind]}** · ${books[x.book]} · \`${x.status}\` · ${dkey()}`,
    '',
    (x.body ?? '').trim(),
    x.why ? `\n**Why it is interesting:** ${x.why}` : '',
    x.related ? `**Related:** ${x.related}` : '',
    x.problems ? `**Potential problems:** ${x.problems}` : '',
  ]
    .filter((l) => l !== '')
    .join('\n')
}
