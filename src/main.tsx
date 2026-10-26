import './lib/install' // first: Chrome's install prompt can fire before the app renders
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme } from './lib/theme'
import './index.css'

applyTheme()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    location.reload()
  })
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'navigate' && typeof e.data.url === 'string') {
      const hash = e.data.url.includes('#') ? e.data.url.slice(e.data.url.indexOf('#')) : '#/'
      location.hash = hash
    }
    // a notification arrived / a notification button logged something
    if (e.data?.type === 'push') window.dispatchEvent(new Event('forme:push'))
    if (e.data?.type === 'inbox') window.dispatchEvent(new Event('forme:inbox'))
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
