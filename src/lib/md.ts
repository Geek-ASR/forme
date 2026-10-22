// Small, safe Markdown renderer: everything is HTML-escaped first, then a limited set of
// formatting is applied. Links are restricted to http(s) and mailto.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function inline(s: string): string {
  let out = esc(s)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, '$1<em>$2</em>')
  out = out.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  return out
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let para: string[] = []
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null
  let quote: string[] = []
  let code: string[] | null = null

  const flushPara = () => {
    if (para.length) html.push(`<p>${para.map(inline).join('<br>')}</p>`)
    para = []
  }
  const flushList = () => {
    if (list) html.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`)
    list = null
  }
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote>${quote.map(inline).join('<br>')}</blockquote>`)
    quote = []
  }
  const flushAll = () => {
    flushPara()
    flushList()
    flushQuote()
  }

  for (const line of lines) {
    if (code) {
      if (/^```/.test(line)) {
        html.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`)
        code = null
      } else code.push(line)
      continue
    }
    if (/^```/.test(line)) {
      flushAll()
      code = []
      continue
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      flushAll()
      html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`)
      continue
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushAll()
      html.push('<hr>')
      continue
    }
    const q = line.match(/^>\s?(.*)$/)
    if (q) {
      flushPara()
      flushList()
      quote.push(q[1])
      continue
    }
    const ul = line.match(/^\s*[-*•]\s+(.*)$/)
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (ul || ol) {
      flushPara()
      flushQuote()
      const type = ul ? 'ul' : 'ol'
      if (!list || list.type !== type) {
        flushList()
        list = { type, items: [] }
      }
      list.items.push((ul ?? ol)![1])
      continue
    }
    if (!line.trim()) {
      flushAll()
      continue
    }
    flushList()
    flushQuote()
    para.push(line)
  }
  if (code) html.push(`<pre><code>${esc((code as string[]).join('\n'))}</code></pre>`)
  flushAll()
  return html.join('\n')
}

export function wordCount(s: string): number {
  return (s.match(/[\p{L}\p{N}’']+/gu) ?? []).length
}

export function excerpt(s: string, n = 160): string {
  const plain = s.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`[\]]/g, '').replace(/\(https?:[^)]+\)/g, '').replace(/\s+/g, ' ').trim()
  return plain.length > n ? plain.slice(0, n).replace(/\s+\S*$/, '') + '…' : plain
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'post'
}
