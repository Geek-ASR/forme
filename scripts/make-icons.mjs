// Renders the PWA icons from public/favicon.svg using headless Chrome.
// Usage: node scripts/make-icons.mjs   (needs Google Chrome installed)

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const svg = readFileSync('public/favicon.svg', 'utf8')
const tmp = mkdtempSync(join(tmpdir(), 'forme-icons-'))
mkdirSync('public/icons', { recursive: true })

// Full-bleed variants (maskable / apple) drop the rounded corners; iOS and Android round them.
const square = svg.replace('rx="15"', 'rx="0"')
// Maskable: keep the artwork inside the central 80% safe zone.
const maskable = square.replace(/(<rect width="64" height="64" rx="0" fill="url\(#bg\)"\/>)([\s\S]*)(<\/svg>)/, '$1<g transform="translate(6.4 6.4) scale(0.8)">$2</g>$3')
// Monochrome status-bar badge (Android): white silhouette on transparent.
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="s"><rect width="64" height="40"/></clipPath></defs><circle cx="32" cy="40" r="15" fill="#fff" clip-path="url(#s)"/><rect x="11" y="41" width="42" height="3.4" rx="1.7" fill="#fff"/><ellipse cx="32" cy="33" rx="24" ry="8" fill="none" stroke="#fff" stroke-width="2.6" transform="rotate(-18 32 33)"/><circle cx="52.6" cy="23.4" r="4" fill="#fff"/></svg>`

const jobs = [
  ['icon-192.png', svg, 192],
  ['icon-512.png', svg, 512],
  ['maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', square, 180],
  ['badge-96.png', badge, 96],
]

for (const [name, source, size] of jobs) {
  const html = join(tmp, name + '.html')
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:transparent">${source.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${size},${size}`,
    '--default-background-color=00000000',
    `--screenshot=${resolve('public/icons', name)}`,
    `file://${html}`,
  ], { stdio: 'ignore' })
  console.log('wrote', name)
}
