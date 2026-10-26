import { useEffect, useState } from 'react'
import { BottomNav, hideNavFor } from './components/Nav'
import { Toasts, toast } from './components/Toasts'
import { getConn, isLocked, useAuthVersion } from './lib/auth'
import { drainInbox } from './lib/inbox'
import { match, useRoute } from './lib/router'
import { hasAnyData, loadStore } from './lib/store'
import { initSync, isSettled, scheduleSync, useSync } from './lib/sync'
import Challenge from './screens/Challenge'
import Connect from './screens/Connect'
import Evening from './screens/Evening'
import Lock from './screens/Lock'
import QuickLog from './screens/QuickLog'
import Share from './screens/Share'
import Today from './screens/Today'
import Body from './screens/body/Body'
import Food from './screens/body/Food'
import AddFood from './screens/body/AddFood'
import Foods from './screens/body/Foods'
import Move from './screens/body/Move'
import Plan from './screens/body/Plan'
import Workout from './screens/body/Workout'
import Weight from './screens/body/Weight'
import Spine from './screens/body/Spine'
import Skin from './screens/body/Skin'
import Mind from './screens/mind/Mind'
import Editor from './screens/mind/Editor'
import Read from './screens/mind/Read'
import Hybrid from './screens/hybrid/Hybrid'
import HybridEditor from './screens/hybrid/HybridEditor'
import HybridNoteView from './screens/hybrid/HybridNoteView'
import Loop from './screens/hybrid/Loop'
import Deutsch from './screens/deutsch/Deutsch'
import Review from './screens/deutsch/Review'
import Sprint from './screens/deutsch/Sprint'
import Grammar from './screens/deutsch/Grammar'
import Words from './screens/deutsch/Words'
import Me from './screens/me/Me'
import Insights from './screens/me/Insights'
import WeeklyReview from './screens/me/WeeklyReview'
import Goals from './screens/me/Goals'
import Manual from './screens/me/Manual'
import Letters from './screens/me/Letters'
import Routine from './screens/me/Routine'
import ProfileScreen from './screens/me/Profile'
import Settings from './screens/me/Settings'
import Blog from './screens/public/Blog'
import Ratings from './screens/ratings/Ratings'
import RatingEdit from './screens/ratings/RatingEdit'
import RatingView from './screens/ratings/RatingView'
import { Spinner } from './components/ui'

type R = [string, (p: Record<string, string>) => React.ReactNode]
const ROUTES: R[] = [
  ['/', () => <Today />],
  ['/evening', () => <Evening />],
  ['/challenge', () => <Challenge />],
  ['/log', () => <QuickLog />],
  ['/share', () => <Share />],
  ['/body', () => <Body />],
  ['/body/food', () => <Food />],
  ['/body/food/add', () => <AddFood />],
  ['/body/foods', () => <Foods />],
  ['/body/move', () => <Move />],
  ['/body/plan', () => <Plan />],
  ['/body/workout/:id', (p) => <Workout id={p.id} />],
  ['/body/weight', () => <Weight />],
  ['/body/spine', () => <Spine />],
  ['/body/skin', () => <Skin />],
  ['/mind', () => <Mind />],
  ['/mind/new', () => <Editor />],
  ['/mind/edit/:id', (p) => <Editor id={p.id} />],
  ['/mind/p/:id', (p) => <Read id={p.id} />],
  ['/hybrid', () => <Hybrid />],
  ['/hybrid/new', () => <HybridEditor />],
  ['/hybrid/edit/:id', (p) => <HybridEditor id={p.id} />],
  ['/hybrid/n/:id', (p) => <HybridNoteView id={p.id} />],
  ['/hybrid/loop', () => <Loop />],
  ['/ratings', () => <Ratings />],
  ['/ratings/new', () => <RatingEdit />],
  ['/ratings/edit/:id', (p) => <RatingEdit id={p.id} />],
  ['/ratings/r/:id', (p) => <RatingView id={p.id} />],
  ['/deutsch', () => <Deutsch />],
  ['/deutsch/review', () => <Review />],
  ['/deutsch/sprint', () => <Sprint />],
  ['/deutsch/grammar', () => <Grammar />],
  ['/deutsch/words', () => <Words />],
  ['/me', () => <Me />],
  ['/me/insights', () => <Insights />],
  ['/me/review', () => <WeeklyReview />],
  ['/me/goals', () => <Goals />],
  ['/me/manual', () => <Manual />],
  ['/me/letters', () => <Letters />],
  ['/me/routine', () => <Routine />],
  ['/me/profile', () => <ProfileScreen />],
  ['/me/settings', () => <Settings />],
]

function Screen({ path }: { path: string }) {
  for (const [pattern, render] of ROUTES) {
    const params = match(pattern, path)
    if (params) return <>{render(params)}</>
  }
  return <Today />
}

function Splash({ text }: { text?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-ink3">
      <img src="./favicon.svg" alt="" width={56} height={56} className="rounded-2xl" />
      <Spinner />
      {text && <div className="text-[14px]">{text}</div>}
    </div>
  )
}

export default function App() {
  useAuthVersion()
  const route = useRoute()
  const sync = useSync()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void (async () => {
      await loadStore()
      await initSync()
      setReady(true)
      scheduleSync(0)
    })()
  }, [])

  const conn = getConn()
  const locked = isLocked()
  useEffect(() => {
    if (ready && conn && !locked) scheduleSync(0)
  }, [ready, conn, locked])

  // Logs made from notification buttons wait in the service worker's inbox until the app is open
  // and has pulled the latest data (so "+250 ml" adds to the real total).
  const settled = isSettled(sync)
  useEffect(() => {
    if (!ready || !conn || locked || !settled) return
    const run = () =>
      void drainInbox().then((done) => {
        if (done.length) toast(`From your notifications: ${done.join(' · ')}`)
      })
    const onVisible = () => document.visibilityState === 'visible' && run()
    run()
    window.addEventListener('forme:inbox', run)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('forme:inbox', run)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ready, conn, locked, settled])

  if (route.path === '/blog' || route.path.startsWith('/p/')) return <Blog path={route.path} />
  if (!ready) return <Splash />
  if (!conn) return <Connect />
  if (isLocked()) return <Lock />
  if (conn.mode === 'github' && !sync.firstPullDone && !hasAnyData()) {
    if (sync.state === 'auth' || sync.state === 'error') return <Connect error={sync.message} />
    return <Splash text="Fetching your data from GitHub…" />
  }

  return (
    <>
      <Screen path={route.path} />
      {!hideNavFor(route.path) && <BottomNav path={route.path} />}
      <Toasts />
    </>
  )
}
