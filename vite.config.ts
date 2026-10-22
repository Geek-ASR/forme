import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// Content-Security-Policy for the production build only (the dev server needs inline scripts).
// The GitHub token lives in this origin's storage, so nothing else is allowed to run here.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://api.github.com https://raw.githubusercontent.com",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

// Emits sw.js with a precache list of every built asset, so the app opens offline.
function serviceWorker(): Plugin {
  return {
    name: 'forme-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      const publicFiles = walk('public')
        .map((f) => relative('public', f).split(sep).join('/'))
        // German decks are large and only fetched when used; they are cached at runtime.
        .filter((f) => !f.startsWith('deutsch/') && !f.startsWith('.'))
      const precache = Array.from(new Set(['./', ...built, ...publicFiles]))
      const version = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
      const source = readFileSync('scripts/sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

function csp(): Plugin {
  return {
    name: 'forme-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
    },
  }
}

// Relative base so the build works from the GitHub Pages project path (/forme/).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), serviceWorker(), csp()],
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
})
