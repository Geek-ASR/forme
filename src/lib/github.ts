// Minimal GitHub REST + Git Data API client used for syncing.
// Reads go through the tree/blob endpoints (one call tells us which files changed);
// writes are a single commit (tree → commit → fast-forward ref), so a sync is atomic.

const API = 'https://api.github.com'

export class GitHubError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type TreeItem = { path: string; mode: string; type: 'blob' | 'tree' | 'commit'; sha: string; size?: number }
export type TreeEntry =
  | { path: string; mode: '100644'; type: 'blob'; content: string }
  | { path: string; mode: '100644'; type: 'blob'; sha: null }

export function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** git's blob id: sha1("blob <len>\0<content>") — lets us compare with remote without downloading */
export async function gitBlobSha(text: string): Promise<string> {
  const body = new TextEncoder().encode(text)
  const header = new TextEncoder().encode(`blob ${body.length}\0`)
  const buf = new Uint8Array(header.length + body.length)
  buf.set(header)
  buf.set(body, header.length)
  const hash = await crypto.subtle.digest('SHA-1', buf)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export class GitHub {
  owner: string
  repo: string
  branch: string
  private token: string

  constructor(owner: string, repo: string, branch: string, token: string) {
    this.owner = owner
    this.repo = repo
    this.branch = branch
    this.token = token
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(API + path, {
        method,
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new GitHubError(0, 'Network unavailable')
    }
    if (!res.ok) {
      let msg = res.statusText
      try {
        const j = await res.json()
        msg = j.message || msg
      } catch {
        /* ignore */
      }
      throw new GitHubError(res.status, msg)
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  private get base() {
    return `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`
  }

  getRepo() {
    return this.req<{ private: boolean; full_name: string; default_branch: string; permissions?: { push?: boolean } }>('GET', this.base)
  }

  async getHead(): Promise<string | null> {
    try {
      const r = await this.req<{ object: { sha: string } }>('GET', `${this.base}/git/ref/heads/${encodeURIComponent(this.branch)}`)
      return r.object.sha
    } catch (e) {
      if (e instanceof GitHubError && (e.status === 404 || e.status === 409)) return null
      throw e
    }
  }

  async getCommitTree(sha: string): Promise<string> {
    const c = await this.req<{ tree: { sha: string } }>('GET', `${this.base}/git/commits/${sha}`)
    return c.tree.sha
  }

  async getTree(treeSha: string): Promise<TreeItem[]> {
    const t = await this.req<{ tree: TreeItem[] }>('GET', `${this.base}/git/trees/${treeSha}?recursive=1`)
    return t.tree
  }

  async getBlobText(sha: string): Promise<string> {
    const b = await this.req<{ content: string; encoding: string }>('GET', `${this.base}/git/blobs/${sha}`)
    return b.encoding === 'base64' ? decodeBase64Utf8(b.content) : b.content
  }

  async createTree(baseTree: string | null, entries: TreeEntry[]): Promise<string> {
    const t = await this.req<{ sha: string }>('POST', `${this.base}/git/trees`, baseTree ? { base_tree: baseTree, tree: entries } : { tree: entries })
    return t.sha
  }

  async createCommit(message: string, tree: string, parents: string[]): Promise<string> {
    const c = await this.req<{ sha: string }>('POST', `${this.base}/git/commits`, { message, tree, parents })
    return c.sha
  }

  async updateRef(sha: string): Promise<void> {
    await this.req('PATCH', `${this.base}/git/refs/heads/${encodeURIComponent(this.branch)}`, { sha, force: false })
  }

  async createRef(sha: string): Promise<void> {
    await this.req('POST', `${this.base}/git/refs`, { ref: `refs/heads/${this.branch}`, sha })
  }

  /** Commit a set of file changes on top of the branch head (creating the branch if needed). */
  async commitFiles(message: string, entries: TreeEntry[]): Promise<string> {
    const head = await this.getHead()
    const baseTree = head ? await this.getCommitTree(head) : null
    const tree = await this.createTree(baseTree, entries)
    const commit = await this.createCommit(message, tree, head ? [head] : [])
    if (head) await this.updateRef(commit)
    else await this.createRef(commit)
    return commit
  }

  async readFile(path: string): Promise<string | null> {
    try {
      const r = await this.req<{ content: string; encoding: string }>(
        'GET',
        `${this.base}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(this.branch)}`,
      )
      return decodeBase64Utf8(r.content)
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return null
      throw e
    }
  }

  /** Trigger a workflow_dispatch run (needs the token's Actions: write permission). */
  async dispatchWorkflow(file: string, inputs: Record<string, string> = {}): Promise<void> {
    await this.req('POST', `${this.base}/actions/workflows/${encodeURIComponent(file)}/dispatches`, { ref: this.branch, inputs })
  }

  listCommits(perPage = 20) {
    return this.req<{ sha: string; html_url: string; commit: { message: string; author: { date: string } } }[]>(
      'GET',
      `${this.base}/commits?sha=${encodeURIComponent(this.branch)}&per_page=${perPage}`,
    )
  }
}
