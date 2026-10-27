// Speaking practice by shadowing: hear a sentence, say it out loud, see which words came through.
// The phone's own German speech recognition checks you (it needs internet); without it you mark yourself.

import { ArrowRight, AudioLines, Eye, Mic, MicOff, RotateCcw, Snail, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '../../components/Toasts'
import { Button, Card, Page, Pill, Section, Segmented, cx } from '../../components/ui'
import { useByDate, useSettings } from '../../lib/app'
import { dkey, lastNDays } from '../../lib/date'
import { bestAttempt, pickSentences, tipFor, type Sentence, type WordMark } from '../../lib/speaking'
import { canListen, recognize, speak } from '../../lib/speech'
import { loadDeck, type Card as DeckCard } from '../../lib/srs'
import { put, useColl } from '../../lib/store'
import type { DeLog, SrsState } from '../../lib/types'

type Attempt = { heard: string; marks: WordMark[]; score: number }

const verdict = (s: number) => (s >= 0.9 ? 'Excellent' : s >= 0.75 ? 'Good' : s >= 0.5 ? 'Getting there' : 'Again, a little slower')
const MODE_KEY = 'forme.speak.mode'

export default function Speak() {
  const g = useSettings().german
  const srs = useColl<SrsState>('srs')
  const logBy = useByDate<DeLog>('deLog')
  const [deck, setDeck] = useState<DeckCard[] | null>(null)
  const [mode, setMode] = useState<'read' | 'listen'>(() => {
    try {
      return localStorage.getItem(MODE_KEY) === 'listen' ? 'listen' : 'read'
    } catch {
      return 'read'
    }
  })
  const [stage, setStage] = useState<'intro' | 'run' | 'done'>('intro')
  const [round, setRound] = useState<Sentence[]>([])
  const [i, setI] = useState(0)
  const [best, setBest] = useState<(number | null)[]>([])
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [minutes, setMinutes] = useState(0)
  const started = useRef(0)
  const stopRef = useRef<() => void>(() => {})
  const canCheck = canListen()
  const s = round[i]

  useEffect(() => {
    let alive = true
    loadDeck(g.level)
      .then((c) => alive && setDeck(c))
      .catch(() => alive && setDeck([]))
    return () => {
      alive = false
    }
  }, [g.level])
  useEffect(() => () => stopRef.current(), [])
  // each new sentence is played once, automatically — shadowing starts with listening
  useEffect(() => {
    if (stage === 'run' && s) speak(s.de, 'de-DE', 0.9)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, i])

  const week = useMemo(() => lastNDays(7).flatMap((k) => logBy.get(k) ?? []).filter((l) => l.kind === 'speaking'), [logBy])

  function start(again = false) {
    setRound(pickSentences(deck ?? [], srs, again ? `${dkey()}-${Date.now()}` : dkey(), 8, g.level === 'A1' || g.level === 'A2' ? 9 : 13))
    setI(0)
    setBest([])
    setAttempt(null)
    setReveal(false)
    setStage('run')
    started.current = Date.now()
  }

  async function sayIt() {
    if (listening) return stopRef.current()
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
    setInterim('')
    setListening(true)
    const rec = recognize('de-DE', setInterim)
    stopRef.current = rec.stop
    const { texts, error } = await rec.done
    setListening(false)
    if (!texts.length) {
      if (error === 'not-allowed') toast('Microphone blocked — allow it for Forme, then try again')
      else if (error === 'network') toast('The speech check needs internet')
      else toast("Didn't catch that — try again, a little louder")
      return
    }
    const a = bestAttempt(s.de, texts)
    setAttempt(a)
    setBest((b) => {
      const n = [...b]
      n[i] = Math.max(n[i] ?? 0, a.score)
      return n
    })
  }

  function next(selfRated = false) {
    stopRef.current()
    if (selfRated)
      setBest((b) => {
        const n = [...b]
        n[i] = n[i] ?? null
        return n
      })
    setAttempt(null)
    setInterim('')
    setReveal(false)
    if (i + 1 < round.length) return setI(i + 1)
    const mins = Math.max(1, Math.round((Date.now() - started.current) / 60000))
    const good = best.filter((x) => typeof x === 'number' && x >= 0.8).length
    put<DeLog>('deLog', { date: dkey(), minutes: mins, kind: 'speaking', reviewed: round.length, correct: good })
    setMinutes(mins)
    setStage('done')
  }

  if (stage === 'intro') {
    const weekMin = week.reduce((a, l) => a + l.minutes, 0)
    return (
      <Page accent="de" back="/deutsch" title="Speak">
        <Card className="mt-1">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-acc-soft text-acc">
              <AudioLines size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-semibold">Shadowing · 8 sentences</div>
              <div className="text-[13px] text-ink3">About 5 minutes · level {g.level}</div>
            </div>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-ink2">
            Listen, then say it out loud — same rhythm, same melody. Repeating native-speed speech like this is linked in small studies to smoother, more natural speaking. Your phone checks which words came
            through{canCheck ? ' (it needs internet)' : ''}.
          </p>
          <div className="mt-4">
            <Segmented
              options={[
                { value: 'read', label: 'Read along' },
                { value: 'listen', label: 'Listen only' },
              ]}
              value={mode}
              onChange={(m) => {
                setMode(m)
                try {
                  localStorage.setItem(MODE_KEY, m)
                } catch {
                  /* private mode */
                }
              }}
            />
            <p className="mt-1.5 px-1 text-[12.5px] text-ink3">{mode === 'read' ? 'See the sentence while you say it.' : 'Harder: just the sound and the English — the German appears after you speak.'}</p>
          </div>
          <Button full size="lg" className="mt-4" icon={<Mic size={18} />} disabled={!deck} onClick={() => start()}>
            {deck ? 'Start' : 'Loading sentences…'}
          </Button>
          {!canCheck && <p className="mt-2 text-[12.5px] text-ink3">This browser can't check speech, so you'll mark each sentence yourself. Chrome on Android can.</p>}
        </Card>
        <Section title="This week">
          <Card>
            <div className="text-[15px] font-semibold">
              {weekMin ? `${weekMin} min of speaking · ${week.length} round${week.length === 1 ? '' : 's'}` : 'No speaking yet this week'}
            </div>
            <div className="mt-0.5 text-[13px] text-ink3">Speaking minutes count toward your daily German goal.</div>
          </Card>
        </Section>
      </Page>
    )
  }

  if (stage === 'done') {
    const scored = best.filter((x): x is number => typeof x === 'number')
    const avg = scored.length ? Math.round((scored.reduce((a, x) => a + x, 0) / scored.length) * 100) : null
    return (
      <Page accent="de" back="/deutsch" title="Speak">
        <div className="flex flex-col items-center pt-4 text-center">
          <div className="text-[44px]">🗣️</div>
          <div className="mt-1 text-[22px] font-bold">{avg !== null ? `${avg}% understood` : 'Round done'}</div>
          <div className="text-[14px] text-ink3">
            {minutes} min logged · {scored.filter((x) => x >= 0.8).length} of {round.length} spot on
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-card">
          {round.map((x, k) => (
            <button key={k} onClick={() => speak(x.de, 'de-DE', 0.9)} className="press flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left last:border-b-0">
              <Volume2 size={15} className="shrink-0 text-acc" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px]">{x.de}</span>
                <span className="block truncate text-[12px] text-ink3">{x.en}</span>
              </span>
              <span className={cx('num shrink-0 text-[13.5px] font-semibold', typeof best[k] === 'number' && best[k]! >= 0.8 ? 'text-good' : 'text-ink3')}>
                {typeof best[k] === 'number' ? `${Math.round(best[k]! * 100)}%` : '–'}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <Button full variant="soft" icon={<RotateCcw size={16} />} onClick={() => start(true)}>
            Another round
          </Button>
          <Button full onClick={() => history.back()}>
            Done
          </Button>
        </div>
      </Page>
    )
  }

  const showText = mode === 'read' || reveal || !!attempt
  // a sound tip only when it's about sound: "almost" words, or misses in a sentence mostly said
  const near = attempt?.marks.filter((m) => m.mark === 'near').map((m) => m.text) ?? []
  const missed = attempt?.marks.filter((m) => m.mark === 'miss').map((m) => m.text) ?? []
  const saidMost = !!attempt && attempt.heard.split(/\s+/).length >= attempt.marks.length * 0.7
  const tip = attempt && attempt.score < 0.95 ? tipFor(near.length ? near : saidMost ? missed : []) : null
  return (
    <Page accent="de" back="/deutsch" title={`Speak · ${i + 1} of ${round.length}`}>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
        <div className="h-full rounded-full bg-acc-fill transition-all" style={{ width: `${(i / round.length) * 100}%` }} />
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-acc">{s.from === 'yours' ? 'From your cards' : s.from === 'phrase' ? 'For life in Germany' : `Level ${g.level}`}</span>
          {attempt && <Pill tone={attempt.score >= 0.75 ? 'good' : 'muted'}>{Math.round(attempt.score * 100)}%</Pill>}
        </div>
        <div className="mt-3 min-h-[76px] font-serif text-[24px] leading-snug">
          {showText ? (
            attempt ? (
              attempt.marks.map((m, k) => (
                <span
                  key={k}
                  className={cx(
                    m.mark === 'ok' && 'text-good',
                    m.mark === 'near' && 'acc-de text-acc underline decoration-dotted decoration-2 underline-offset-4',
                    m.mark === 'miss' && 'text-bad underline decoration-wavy decoration-1 underline-offset-4',
                  )}
                >
                  {m.text}{' '}
                </span>
              ))
            ) : (
              s.de
            )
          ) : (
            <button onClick={() => setReveal(true)} className="press flex items-center gap-2 text-[15px] font-sans font-semibold text-ink3">
              <Eye size={17} /> Show the German
            </button>
          )}
        </div>
        <div className="mt-2 text-[14.5px] text-ink3">{s.en}</div>
        <div className="mt-4 flex gap-2">
          <Button variant="soft" size="sm" icon={<Volume2 size={16} />} onClick={() => speak(s.de, 'de-DE', 0.9)}>
            Listen
          </Button>
          <Button variant="soft" size="sm" icon={<Snail size={16} />} onClick={() => speak(s.de, 'de-DE', 0.6)}>
            Slowly
          </Button>
        </div>
      </Card>

      {attempt && (
        <Card className="mt-3">
          <div className="text-[15px] font-semibold">{verdict(attempt.score)}</div>
          <div className="mt-1 text-[13.5px] text-ink3">
            Heard: “<span className="text-ink2">{attempt.heard}</span>”
          </div>
          {tip && <div className="acc-de mt-2 rounded-2xl bg-acc-soft px-3 py-2 text-[13.5px] leading-snug text-ink2">💡 {tip}</div>}
          <div className="mt-2 text-[12px] text-ink3">
            <span className="text-good">green</span> came through · <span className="acc-de text-acc underline decoration-dotted">dotted</span> almost · <span className="text-bad underline decoration-wavy">wavy</span> missed
          </div>
        </Card>
      )}

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          {canCheck ? (
            <>
              <button
                aria-label={listening ? 'Stop' : 'Say it'}
                onClick={sayIt}
                className={cx('press flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold', listening ? 'anim-pulse bg-bad text-white' : attempt ? 'bg-acc-soft text-acc' : 'bg-acc-fill text-acc-on')}
              >
                {listening ? <MicOff size={20} /> : <Mic size={20} />}
                {listening ? interim || 'Listening…' : attempt ? 'Try again' : 'Say it'}
              </button>
              {attempt && (
                <Button size="lg" icon={<ArrowRight size={18} />} onClick={() => next()}>
                  {i + 1 < round.length ? 'Next' : 'Finish'}
                </Button>
              )}
              {!attempt && !listening && (
                <button onClick={() => next(true)} className="press px-2 text-[13.5px] font-semibold text-ink3">
                  Skip
                </button>
              )}
            </>
          ) : (
            <Button full size="lg" onClick={() => next(true)}>
              I said it out loud ✓
            </Button>
          )}
        </div>
      </div>
    </Page>
  )
}
