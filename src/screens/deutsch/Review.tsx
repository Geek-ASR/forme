import { Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Empty, Spinner, cx } from '../../components/ui'
import { useSettings } from '../../lib/app'
import { dkey } from '../../lib/date'
import { back } from '../../lib/router'
import { speak } from '../../lib/speech'
import { ART_COLOR, customToCard, intervalLabel, loadDeck, loadDecksUpTo, schedule, type Card, type Grade } from '../../lib/srs'
import { all, put } from '../../lib/store'
import type { CustomWord, DeLog, SrsState } from '../../lib/types'

const GRADES: { g: Grade; label: string; cls: string }[] = [
  { g: 0, label: 'Again', cls: 'bg-bad/10 text-bad' },
  { g: 1, label: 'Hard', cls: 'bg-card2 text-ink2' },
  { g: 2, label: 'Good', cls: 'bg-acc-soft text-acc' },
  { g: 3, label: 'Easy', cls: 'bg-acc-fill text-acc-on' },
]

export default function Review() {
  const today = dkey()
  const settings = useSettings()
  const g = settings.german
  const [cards, setCards] = useState<Card[] | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [shown, setShown] = useState(false)
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 })
  const [flipEn, setFlipEn] = useState(false)
  const started = useRef(Date.now())
  const logged = useRef(false)
  const statsRef = useRef(stats)
  statsRef.current = stats

  useEffect(() => {
    let alive = true
    Promise.all([loadDecksUpTo(g.level), loadDeck(g.level)]).then(([upTo, current]) => {
      if (!alive) return
      const mine = all<CustomWord>('words').map(customToCard)
      const pool = [...mine, ...upTo]
      const states = new Map(all<SrsState>('srs').map((s) => [s.id, s]))
      const due = pool.filter((c) => states.get(c.i) && states.get(c.i)!.due <= today).sort((a, b) => (states.get(a.i)!.due < states.get(b.i)!.due ? -1 : 1))
      const newToday = all<SrsState>('srs').filter((s) => s.intro === today).length
      const fresh = [...mine.filter((c) => !states.has(c.i)), ...current.filter((c) => !states.has(c.i))].slice(0, Math.max(0, g.newPerDay - newToday))
      setCards(pool)
      setQueue([...due.map((c) => c.i), ...fresh.map((c) => c.i)])
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.level])

  const byId = useMemo(() => new Map((cards ?? []).map((c) => [c.i, c])), [cards])
  const card = queue.length ? byId.get(queue[0]) : undefined
  const state = card ? all<SrsState>('srs').find((s) => s.id === card.i) : undefined
  const enFirst = g.direction === 'en-de' || (g.direction === 'mixed' && flipEn)

  useEffect(() => {
    setShown(false)
    setFlipEn(Math.random() < 0.5)
  }, [queue[0]]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!shown) reveal()
      } else if (shown && ['1', '2', '3', '4'].includes(e.key)) grade((Number(e.key) - 1) as Grade)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // log the study time once, when leaving the session
  useEffect(() => {
    logged.current = false
    return () => {
      if (logged.current) return
      logged.current = true
      const minutes = Math.round((Date.now() - started.current) / 60000)
      if (statsRef.current.reviewed > 0) put<DeLog>('deLog', { date: dkey(), kind: 'review', minutes: Math.max(1, minutes), reviewed: statsRef.current.reviewed, correct: statsRef.current.correct })
    }
  }, [])

  function reveal() {
    setShown(true)
    if (card && enFirst) speak(`${card.a ? card.a + ' ' : ''}${card.d}`)
  }

  function grade(gr: Grade) {
    if (!card) return
    const next = schedule(state, card.i, gr, today)
    put<SrsState>('srs', next)
    setStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (gr >= 2 ? 1 : 0) }))
    setQueue((q) => {
      const rest = q.slice(1)
      if (gr === 0) rest.splice(Math.min(3, rest.length), 0, card.i)
      return rest
    })
  }

  if (!cards)
    return (
      <div className="acc-de flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    )

  const total = stats.reviewed + queue.length

  return (
    <div className="acc-de safe-top flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-3 pt-2">
        <button aria-label="Close" onClick={() => back('/deutsch')} className="press flex h-11 w-11 items-center justify-center rounded-full text-ink2">
          <X size={22} />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
          <div className="h-full rounded-full bg-acc-fill transition-all" style={{ width: `${total ? (stats.reviewed / total) * 100 : 100}%` }} />
        </div>
        <div className="w-14 text-right text-[13px] font-semibold text-ink3">{queue.length} left</div>
      </div>

      {!card ? (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6">
          <Empty
            title={stats.reviewed ? 'Session done — sehr gut! 🎉' : 'Nothing due right now'}
            body={stats.reviewed ? `${stats.reviewed} cards · ${Math.round((stats.correct / Math.max(1, stats.reviewed)) * 100)}% remembered. Come back tomorrow — spacing is the magic.` : 'New words unlock each day. Try the der·die·das sprint, or add your own words.'}
            action={<Button onClick={() => back('/deutsch')}>Back to German</Button>}
          />
        </div>
      ) : (
        <>
          <button onClick={() => !shown && reveal()} className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-ink3">
              {[card.s, card.t].filter(Boolean).join(' · ')}
              {!state && <span className="ml-1.5 rounded-full bg-acc-soft px-2 py-0.5 text-acc">new</span>}
            </div>
            {enFirst ? (
              <div className="mt-4 text-[30px] font-semibold leading-tight">{card.e}</div>
            ) : (
              <div className="mt-4 text-[36px] font-bold leading-tight">
                {card.a && <span className={ART_COLOR[card.a]}>{card.a} </span>}
                {card.d}
              </div>
            )}
            {shown && (
              <div className="anim-fade mt-6 w-full">
                <div className="mx-auto h-px w-24 bg-line2" />
                {enFirst ? (
                  <div className="mt-6 text-[32px] font-bold leading-tight">
                    {card.a && <span className={ART_COLOR[card.a]}>{card.a} </span>}
                    {card.d}
                  </div>
                ) : (
                  <div className="mt-6 text-[24px] font-semibold leading-snug">{card.e}</div>
                )}
                {card.p && <div className="mt-1 text-[14.5px] text-ink3">plural: die {card.p}</div>}
                {card.x && (
                  <div className="mx-auto mt-5 max-w-md rounded-2xl bg-card p-4 text-left">
                    <div className="text-[16px] italic">{card.x}</div>
                    {card.y && <div className="mt-1 text-[14px] text-ink3">{card.y}</div>}
                  </div>
                )}
              </div>
            )}
            {!shown && <div className="mt-10 text-[13px] text-ink3">Tap to reveal</div>}
          </button>

          <div className="safe-bottom mx-auto w-full max-w-xl px-4 pb-4">
            <div className="mb-3 flex justify-center">
              <button
                aria-label="Pronounce"
                onClick={() => speak(`${card.a ? card.a + ' ' : ''}${card.d}${shown && card.x ? '. ' + card.x : ''}`)}
                className="press flex h-11 items-center gap-2 rounded-full bg-card px-4 text-[14px] font-semibold text-ink2"
              >
                <Volume2 size={18} /> Hear it
              </button>
            </div>
            {shown ? (
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map((b) => (
                  <button key={b.g} onClick={() => grade(b.g)} className={cx('press flex h-16 flex-col items-center justify-center rounded-2xl text-[15px] font-semibold', b.cls)}>
                    {b.label}
                    <span className="text-[11.5px] font-medium opacity-75">{intervalLabel(state, b.g)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <Button full size="lg" onClick={reveal}>
                Show answer
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
