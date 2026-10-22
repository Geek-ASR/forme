// Builds compact flashcard decks (public/deutsch/<level>.json) from the Deutschpfad vocabulary files.
// Usage: node scripts/build-deck.mjs ../Germantutor/data/vocabulary
// Content: Deutschpfad by Aditya Rekhe — CC BY-SA 4.0.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const src = process.argv[2]
if (!src) {
  console.error('Usage: node scripts/build-deck.mjs <path-to-vocabulary-dir>')
  process.exit(1)
}

const levels = { A1: [], A2: [], B1: [], B2: [], C1: [] }
const seen = new Set()

for (const file of readdirSync(src).filter((f) => f.endsWith('.json')).sort()) {
  const data = JSON.parse(readFileSync(join(src, file), 'utf8'))
  const items = Array.isArray(data) ? data : data.items || data.words || []
  for (const w of items) {
    if (!w?.german || !w?.english || !levels[w.cefr]) continue
    const key = `${w.cefr}|${w.german}|${w.english}`
    if (seen.has(key)) continue
    seen.add(key)
    let de = String(w.german).trim()
    let art = w.article && ['der', 'die', 'das'].includes(w.article) ? w.article : undefined
    const m = de.match(/^(der|die|das)\s+(.+)$/)
    if (m && w.partOfSpeech === 'noun') {
      art = art || m[1]
      de = m[2]
    }
    const ex = Array.isArray(w.examples) && w.examples[0] ? w.examples[0] : null
    const card = { i: w.id || key, d: de, e: String(w.english).trim(), s: w.partOfSpeech || '', t: w.topic || file.replace('.json', '') }
    if (art) card.a = art
    if (w.plural) card.p = String(w.plural).replace(/^die\s+/, '')
    if (ex?.de) {
      card.x = ex.de
      if (ex.en) card.y = ex.en
    }
    levels[w.cefr].push(card)
  }
}

mkdirSync('public/deutsch', { recursive: true })
const summary = {}
for (const [lvl, cards] of Object.entries(levels)) {
  writeFileSync(
    `public/deutsch/${lvl.toLowerCase()}.json`,
    JSON.stringify({ level: lvl, source: 'Deutschpfad vocabulary · CC BY-SA 4.0', cards }),
  )
  summary[lvl] = cards.length
}
writeFileSync('public/deutsch/index.json', JSON.stringify(summary))
console.log('Decks written:', summary)
