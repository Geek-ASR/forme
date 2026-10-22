// Public, non-secret configuration. The token is never here — it is entered on each device.

export const DEFAULT_DATA_REPO = { owner: 'Geek-ASR', repo: 'forme-data', branch: 'main' }

/** Public repo that hosts this site; published writings live on its `posts` branch. */
export const PUBLIC_REPO = { owner: 'Geek-ASR', repo: 'forme', branch: 'posts' }

/** VAPID public key for Web Push (the private half is a secret in the data repo). */
export const VAPID_PUBLIC_KEY = 'BCcUrSBW0JIm80Z9BaxS4mTi_wqqSh7PGkylkXWgOpRtH_USJrZIfetvTQKcS90pFBFcQD4OqmpMEqjb0OWpAYo'

export const TOKEN_HELP_URL = 'https://github.com/settings/personal-access-tokens/new'

export const rawPublicUrl = (path: string) =>
  `https://raw.githubusercontent.com/${PUBLIC_REPO.owner}/${PUBLIC_REPO.repo}/${PUBLIC_REPO.branch}/${path}`
