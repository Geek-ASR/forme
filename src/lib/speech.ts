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
