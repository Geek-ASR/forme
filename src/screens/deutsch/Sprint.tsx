import { Timer, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from '../../components/Toasts'
import { Button, Spinner, cx } from '../../components/ui'
import { useSettings } from '../../lib/app'
import { dkey } from '../../lib/date'
import { back } from '../../lib/router'
import { buzz, speak } from '../../lib/speech'
import { customToCard, loadDecksUpTo, type Card } from '../../lib/srs'
import { all, put } from '../../lib/store'
import type { CustomWord, DeLog, SrsState } from '../../lib/types'

const ARTS = ['der', 'die', 'das'] as const
const BTN: Record<string, string> = { der: 'art-der', die: 'art-die', das: 'art-das' }
const SECONDS = 60
const bestKey = (lvl: string) => `forme.sprint.best.${lvl}`

function shuffle<T>(a: T[]): T[] {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

export default function Sprint() {
  const level = useSettings().german.level
  const [pool, setPool] = useState<Card[] | null>(null)
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready')
  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(SECONDS)
  const [score, setScore] = useState(0)
  const [run, setRun] = useState(0)
  const [flash, setFlash] = useState<{ ok: boolean; art: string } | null>(null)
  const [mistakes, setMistakes] = useState<Card[]>([])
  const endAt = useRef(0)
  const answered = useRef(0)
  let best = 0
  try {
    best = Number(localStorage.getItem(bestKey(level)) || 0)
  } catch {
    /* ignore */
  }

  useEffect(() => {
    loadDecksUpTo(level).then((cards) => {
      const mine = all<CustomWord>('words').map(customToCard)
      setPool(shuffle([...mine, ...cards].filter((c) => c.a && c.s === 'noun')))
    })
  }, [level])

  useEffect(() => {
    if (phase !== 'play') return
    const t = setInterval(() => {
      const l = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))
      setLeft(l)
      if (l === 0) finish()
    }, 200)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function start() {
    setPool((p) => (p ? shuffle(p) : p))
    setIdx(0)
    setScore(0)
    setRun(0)
    setMistakes([])
    answered.current = 0
    endAt.current = Date.now() + SECONDS * 1000
    setLeft(SECONDS)
    setPhase('play')
  }

  function finish() {
    setPhase('done')
    put<DeLog>('deLog', { date: dkey(), kind: 'sprint', minutes: 1, reviewed: answered.current, correct: scoreRef.current })
    try {
      if (scoreRef.current > best) localStorage.setItem(bestKey(level), String(scoreRef.current))
    } catch {
      /* ignore */
    }
  }
  const scoreRef = useRef(0)
  scoreRef.current = score

  function answer(art: string) {
    if (!pool || flash) return
    const c = pool[idx % pool.length]
    const ok = c.a === art
    answered.current++
    if (ok) {
      setScore((s) => s + 1)
      setRun((r) => r + 1)
      buzz(10)
    } else {
      setRun(0)
      setMistakes((m) => [...m, c])
      buzz([40, 30, 40])
    }
    setFlash({ ok, art: c.a! })
    setTimeout(
      () => {
        setFlash(null)
        setIdx((i) => i + 1)
      },
      ok ? 180 : 900,
    )
  }

  function reviewMistakes() {
    const today = dkey()
    for (const c of mistakes) {
      const prev = all<SrsState>('srs').find((s) => s.id === c.i)
      put<SrsState>('srs', { ...(prev ?? { id: c.i, ease: 2.5, ivl: 0, reps: 0, lapses: 0, intro: today }), id: c.i, due: today })
    }
    toast(`${mistakes.length} words added to today's review`)
  }

  if (!pool)
    return (
      <div className="acc-de flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    )

  const card = pool[idx % Math.max(1, pool.length)]

  return (
    <div className="acc-de safe-top flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between px-3 pt-2">
        <button aria-label="Close" onClick={() => back('/deutsch')} className="press flex h-11 w-11 items-center justify-center rounded-full text-ink2">
          <X size={22} />
        </button>
        {phase === 'play' && (
          <div className="flex items-center gap-4 text-[15px] font-semibold">
            <span className="flex items-center gap-1.5">
              <Timer size={17} /> {left}s
            </span>
            <span>{score} ✓</span>
            {run >= 3 && <span className="text-acc">🔥 {run}</span>}
          </div>
        )}
        <div className="w-11" />
      </div>

      {phase === 'ready' && (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="text-[44px]">⚡</div>
          <h1 className="font-display mt-2 text-[30px] font-semibold">der · die · das</h1>
          <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-ink2">
            60 seconds. Tap the right article for each noun ({pool.length} nouns up to {level}). Mistakes can go straight into your review.
          </p>
          <div className="mt-2 text-[14px] text-ink3">Best: {best}</div>
          <Button size="lg" className="mt-6 w-48" onClick={start}>
            Start
          </Button>
        </div>
      )}

      {phase === 'play' && card && (
        <>
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 text-center">
            <div className={cx('font-display text-[46px] font-semibold leading-tight transition-colors', flash ? (flash.ok ? 'text-good' : 'text-bad') : '')}>
              {flash && <span>{flash.art} </span>}
              {card.d}
            </div>
            <div className="mt-2 text-[15px] text-ink3">{card.e}</div>
          </div>
          <div className="safe-bottom mx-auto grid w-full max-w-xl grid-cols-3 gap-3 px-4 pb-6">
            {ARTS.map((a) => (
              <button key={a} onClick={() => answer(a)} className={cx('press h-20 rounded-3xl text-[22px] font-bold shadow-sm', BTN[a])}>
                {a}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'done' && (
        <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-5 pt-8 pb-10 text-center">
          <div className="text-[44px]">{score > best ? '🏆' : '✨'}</div>
          <h1 className="font-display mt-1 text-[32px] font-semibold">{score} correct</h1>
          <p className="mt-1 text-[14.5px] text-ink3">
            {answered.current} answered · {score > best ? 'new best!' : `best ${best}`}
          </p>
          {mistakes.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-card text-left">
              {mistakes.map((m, i) => (
                <button key={m.i + i} onClick={() => speak(`${m.a} ${m.d}`)} className="flex w-full items-center justify-between border-b border-line px-4 py-2.5 last:border-b-0">
                  <span className="text-[15.5px] font-semibold">
                    <span className={m.a === 'der' ? 'text-der' : m.a === 'die' ? 'text-die' : 'text-das'}>{m.a}</span> {m.d}
                  </span>
                  <span className="text-[13px] text-ink3">{m.e}</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 flex flex-col gap-2">
            {mistakes.length > 0 && (
              <Button variant="soft" onClick={reviewMistakes}>
                Add mistakes to today's review
              </Button>
            )}
            <Button onClick={start}>Play again</Button>
            <Button variant="ghost" onClick={() => back('/deutsch')}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
