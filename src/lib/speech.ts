// Text-to-speech (German pronunciation) and speech-to-text (dictating meals).

let voices: SpeechSynthesisVoice[] = []
if (typeof speechSynthesis !== 'undefined') {
  const load = () => (voices = speechSynthesis.getVoices())
  load()
  speechSynthesis.addEventListener?.('voiceschanged', load)
}

export const canSpeak = () => typeof speechSynthesis !== 'undefined'

export function speak(text: string, lang = 'de-DE', rate = 0.9) {
  if (!canSpeak()) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = rate
  const v = voices.find((x) => x.lang === lang) ?? voices.find((x) => x.lang.startsWith(lang.slice(0, 2)))
  if (v) u.voice = v
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}

type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

function ctor(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const canListen = () => typeof window !== 'undefined' && !!ctor()

/** Starts dictation; returns a stop function. onText receives the running transcript. */
export function listen(onText: (text: string, final: boolean) => void, onEnd: (error?: string) => void, lang = 'en-IN'): () => void {
  const C = ctor()
  if (!C) {
    onEnd('unsupported')
    return () => {}
  }
  const r = new C()
  r.lang = lang
  r.interimResults = true
  r.continuous = false
  r.onresult = (e) => {
    let text = ''
    let final = false
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript
      final = e.results[i].isFinal
    }
    onText(text, final)
  }
  r.onerror = (e) => onEnd(e.error)
  r.onend = () => onEnd()
  r.start()
  return () => r.stop()
}

/**
 * One spoken sentence → the recogniser's top guesses (up to 5, best first), for checking pronunciation.
 * Interim text streams to `onInterim`. Never rejects: failures come back as `error`.
 */
export function recognize(lang: string, onInterim?: (text: string) => void): { done: Promise<{ texts: string[]; error?: string }>; stop: () => void } {
  const C = ctor()
  if (!C) return { done: Promise.resolve({ texts: [], error: 'unsupported' }), stop: () => {} }
  const r = new C()
  r.lang = lang
  r.interimResults = true
  r.continuous = false
  r.maxAlternatives = 5
  let texts: string[] = []
  let error: string | undefined
  const done = new Promise<{ texts: string[]; error?: string }>((resolve) => {
    r.onresult = (e) => {
      const n = e.results.length
      const before = Array.from({ length: n - 1 }, (_, i) => e.results[i][0].transcript).join(' ')
      const last = e.results[n - 1]
      if (last.isFinal) texts = Array.from({ length: last.length }, (_, j) => `${before} ${last[j].transcript}`.trim())
      else onInterim?.(`${before} ${last[0].transcript}`.trim())
    }
    r.onerror = (e) => (error = e.error)
    r.onend = () => resolve({ texts, error: texts.length ? undefined : error ?? 'no-speech' })
  })
  try {
    r.start()
  } catch {
    return { done: Promise.resolve({ texts: [], error: 'busy' }), stop: () => {} }
  }
  return { done, stop: () => r.stop() }
}

/** Short beep for workout timers (WebAudio, no assets) */
let ctx: AudioContext | null = null
export function beep(freq = 880, ms = 140, vol = 0.08) {
  try {
    ctx ??= new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = freq
    g.gain.value = vol
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + ms / 1000)
  } catch {
    /* audio unavailable */
  }
}

export function buzz(pattern: number | number[] = 15) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}
