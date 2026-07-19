import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

type NoteItem = { kind: 'note'; resourceId: string; displayPath: string }
type FolderItem = { kind: 'folder'; displayPath: string }
type InventoryItem = NoteItem | FolderItem
type Workspace = { available: true; workspaceId: string; notes: NoteItem[]; inventory: InventoryItem[] }
type Note = {
  resourceId: string
  displayPath: string
  source: string
  revision: string
  yamlProperties: Array<{ name: string; value: unknown }>
  yamlParseError: string | null
}
type AppState =
  | { kind: 'loading' }
  | { kind: 'login'; expired: boolean; error?: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'ready'; workspace: Workspace }

type TreeNode = { name: string; path: string; kind: 'folder'; children: TreeNode[] } | {
  name: string; path: string; kind: 'note'; resourceId: string
}

async function getJson(path: string, init?: RequestInit) {
  return fetch(path, { credentials: 'same-origin', ...init })
}

function buildTree(inventory: InventoryItem[]): TreeNode[] {
  const roots: TreeNode[] = []
  const folders = new Map<string, Extract<TreeNode, { kind: 'folder' }>>()
  const ensureFolder = (path: string) => {
    const existing = folders.get(path)
    if (existing) return existing
    const parts = path.split('/')
    const name = parts.at(-1) ?? path
    const parentPath = parts.slice(0, -1).join('/')
    const folder: Extract<TreeNode, { kind: 'folder' }> = { name, path, kind: 'folder', children: [] }
    folders.set(path, folder)
    if (parentPath) ensureFolder(parentPath).children.push(folder)
    else roots.push(folder)
    return folder
  }

  for (const item of inventory) {
    if (item.kind === 'folder') ensureFolder(item.displayPath)
    else {
      const parts = item.displayPath.split('/')
      const node: TreeNode = {
        name: (parts.at(-1) ?? item.displayPath).replace(/\.md$/i, ''),
        path: item.displayPath,
        kind: 'note',
        resourceId: item.resourceId,
      }
      const parentPath = parts.slice(0, -1).join('/')
      if (parentPath) ensureFolder(parentPath).children.push(node)
      else roots.push(node)
    }
  }
  return roots
}

function FileTree({ inventory, selected, onSelect }: {
  inventory: InventoryItem[]; selected: string | null; onSelect: (note: NoteItem) => void
}) {
  const nodes = useMemo(() => buildTree(inventory), [inventory])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  const renderNodes = (items: TreeNode[], level: number): ReactNode => items.map((node) => node.kind === 'folder' ? (
    <li role="none" key={node.path}>
      <button
        className="tree-item tree-folder"
        type="button"
        role="treeitem"
        aria-expanded={!collapsed.has(node.path)}
        aria-level={level}
        onClick={() => setCollapsed((current) => {
          const next = new Set(current)
          if (next.has(node.path)) next.delete(node.path); else next.add(node.path)
          return next
        })}
      ><span aria-hidden="true">{collapsed.has(node.path) ? '›' : '⌄'}</span>{node.name}</button>
      {!collapsed.has(node.path) && <ul role="group">{renderNodes(node.children, level + 1)}</ul>}
    </li>
  ) : (
    <li role="none" key={node.resourceId}>
      <button
        className="tree-item tree-note"
        type="button"
        role="treeitem"
        aria-level={level}
        aria-selected={selected === node.resourceId}
        onClick={() => onSelect({ kind: 'note', resourceId: node.resourceId, displayPath: node.path })}
      ><span aria-hidden="true">◇</span>{node.name}</button>
    </li>
  ))

  return <ul className="file-tree" role="tree" aria-label="Workspace files">{renderNodes(nodes, 1)}</ul>
}

function EmptyState() {
  return <div className="empty-state"><div className="empty-mark" aria-hidden="true">◇</div>
    <h2>No notes found</h2><p>This workspace has no Markdown notes yet.</p>
    <p className="muted">Add a Markdown file on the host, then reload this page.</p></div>
}

function Login({ expired, initialError, onAuthenticated }: {
  expired: boolean; initialError?: string; onAuthenticated: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError)
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(undefined)
    try {
      const result = await getJson('/api/v1/auth/login', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ account: 'owner', password }),
      })
      if (!result.ok) { setError('The password was not accepted.'); return }
      onAuthenticated()
    } catch { setError('GraphiteMD could not reach the service.') }
    finally { setPending(false) }
  }
  return <main className="centered-state"><form className="login-panel" onSubmit={submit}>
    <div className="brand-mark" aria-hidden="true">G</div><p className="eyebrow">GraphiteMD</p>
    <h1>Sign in to GraphiteMD</h1>
    <p>{expired ? 'Your session has expired. Sign in again to continue.' : 'Enter the owner password for this host.'}</p>
    <label htmlFor="password">Password</label>
    <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
  </form></main>
}

type DrawerName = 'Files' | 'Search' | 'Context' | 'Settings'

function Drawer({ name, onClose, children }: { name: DrawerName; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [onClose])
  return <div className="drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="drawer" role="dialog" aria-modal="true" aria-label={name}>
      <header className="drawer-header"><h2>{name}</h2><button autoFocus className="icon-button" type="button" aria-label={`Close ${name}`} onClick={onClose}>×</button></header>
      {children}
    </section>
  </div>
}

function SearchPlaceholder() { return <div className="placeholder"><label htmlFor="search">Search notes</label><input id="search" type="search" disabled placeholder="Search arrives in the next slice" /><p>Workspace search is not available yet.</p></div> }
function displayProperty(value: unknown): string {
  if (Array.isArray(value)) return value.map(displayProperty).join(', ')
  if (value !== null && typeof value === 'object') return JSON.stringify(value)
  return String(value ?? 'null')
}

function ContextPlaceholder({ note }: { note: Note | null }) {
  return <div className="placeholder"><p className="panel-label">Context</p><h2>{note ? note.displayPath.split('/').at(-1)?.replace(/\.md$/i, '') : 'No note selected'}</h2>
    <p>{note ? note.displayPath : 'Select a note to inspect its properties.'}</p>
    {note?.yamlParseError && <p className="form-error" role="alert">Properties could not be parsed.</p>}
    {note && !note.yamlParseError && note.yamlProperties.length > 0 && <dl className="properties-list">{note.yamlProperties.map((property) => <div key={property.name}><dt>{property.name}</dt><dd>{displayProperty(property.value)}</dd></div>)}</dl>}
  </div>
}
function SettingsPlaceholder() { return <div className="placeholder"><p className="panel-label">Settings</p><h2>Workspace settings</h2><p>Host and plugin controls arrive in a later slice.</p></div> }

function resourceFromLocation(workspace: Workspace): string | null {
  const resourceId = new URLSearchParams(window.location.search).get('resource')
  return resourceId && /^res_[a-z0-9]+$/.test(resourceId) && workspace.notes.some((note) => note.resourceId === resourceId)
    ? resourceId
    : null
}

function Workbench({ workspace, onSessionExpired }: { workspace: Workspace; onSessionExpired: () => void }) {
  const [selected, setSelected] = useState<Note | null>(null)
  const [noteStatus, setNoteStatus] = useState<'idle' | 'loading' | 'unavailable'>('idle')
  const [drawer, setDrawer] = useState<DrawerName | null>(null)
  const requestSequence = useRef(0)
  const openNote = useCallback(async (resourceId: string, history: 'push' | 'restore') => {
    const issued = workspace.notes.some((note) => note.resourceId === resourceId)
    if (!issued) {
      setSelected(null); setNoteStatus('unavailable')
      window.history.replaceState(null, '', window.location.pathname)
      return
    }
    const sequence = ++requestSequence.current
    setNoteStatus('loading')
    try {
      const response = await getJson(`/api/v1/notes/${encodeURIComponent(resourceId)}`)
      if (sequence !== requestSequence.current) return
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) {
        setSelected(null); setNoteStatus('unavailable')
        window.history.replaceState(null, '', window.location.pathname)
        return
      }
      const note = await response.json() as Note
      if (note.resourceId !== resourceId) throw new Error('Resource response mismatch')
      setSelected(note); setNoteStatus('idle')
      if (history === 'push') {
        const url = new URL(window.location.href)
        url.search = ''
        url.searchParams.set('resource', resourceId)
        window.history.pushState(null, '', `${url.pathname}${url.search}`)
      }
    } catch {
      if (sequence !== requestSequence.current) return
      setSelected(null); setNoteStatus('unavailable')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [onSessionExpired, workspace])

  useEffect(() => {
    const restore = () => {
      const resourceId = resourceFromLocation(workspace)
      if (resourceId) void openNote(resourceId, 'restore')
      else {
        requestSequence.current += 1
        setSelected(null); setNoteStatus('idle')
        if (window.location.search) window.history.replaceState(null, '', window.location.pathname)
      }
    }
    restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [openNote, workspace])
  const navigation = <><div className="panel-switcher"><button type="button" aria-pressed="true">Files</button><button type="button" onClick={() => setDrawer('Search')}>Search</button></div>
    {workspace.inventory.length ? <FileTree inventory={workspace.inventory} selected={selected?.resourceId ?? null} onSelect={(note) => { void openNote(note.resourceId, 'push'); setDrawer(null) }} /> : <p className="panel-empty">No Markdown notes</p>}</>

  return <main className="workbench">
    <header className="mobile-bar"><span className="wordmark">GraphiteMD</span><nav aria-label="Workspace tools">
      <button data-testid="mobile-files" type="button" onClick={() => setDrawer('Files')}>Files</button>
      <button type="button" onClick={() => setDrawer('Search')}>Search</button>
      <button type="button" onClick={() => setDrawer('Context')}>Context</button>
      <button type="button" onClick={() => setDrawer('Settings')}>Settings</button>
    </nav></header>
    <aside className="navigation-panel" aria-label="Workspace navigation"><div className="panel-brand"><span className="brand-mark small" aria-hidden="true">G</span><span>GraphiteMD</span></div>{navigation}</aside>
    <article className="document-region">
      <header className="document-header"><div><p className="document-path">{selected?.displayPath ?? 'Workspace'}</p><h1>{selected ? selected.displayPath.split('/').at(-1)?.replace(/\.md$/i, '') : 'Your workspace'}</h1></div><span className="status-chip">Connected</span></header>
      <div className="document-body">{workspace.inventory.length === 0 ? <EmptyState /> : noteStatus === 'loading' ? <div className="empty-state" aria-live="polite"><h2>Opening note…</h2></div> : selected ? <pre className="note-source" aria-label="Markdown source">{selected.source}</pre> : noteStatus === 'unavailable' ? <div className="empty-state" role="alert"><h2>Note unavailable</h2><p>The requested note could not be opened. Select another note from Files.</p></div> : <div className="empty-state"><div className="empty-mark" aria-hidden="true">◇</div><h2>Select a note</h2><p>Choose a Markdown file from Files to open it here.</p></div>}</div>
    </article>
    <aside className="context-panel" aria-label="Note context"><ContextPlaceholder note={selected} /><div className="context-actions"><button type="button" onClick={() => setDrawer('Settings')}>Settings</button></div></aside>
    {drawer && <Drawer name={drawer} onClose={() => setDrawer(null)}>{drawer === 'Files' ? navigation : drawer === 'Search' ? <SearchPlaceholder /> : drawer === 'Context' ? <ContextPlaceholder note={selected} /> : <SettingsPlaceholder />}</Drawer>}
  </main>
}

export function App() {
  const [state, setState] = useState<AppState>({ kind: 'loading' })
  const load = async () => {
    setState({ kind: 'loading' })
    try {
      const auth = await getJson('/api/v1/auth/current')
      if (auth.status === 401) { setState({ kind: 'login', expired: true }); return }
      if (!auth.ok) { setState({ kind: 'unavailable', message: 'The authentication service is unavailable.' }); return }
      const workspace = await getJson('/api/v1/workspace')
      if (workspace.status === 401) { setState({ kind: 'login', expired: true }); return }
      if (!workspace.ok) { setState({ kind: 'unavailable', message: 'The configured workspace is unavailable on this host.' }); return }
      setState({ kind: 'ready', workspace: await workspace.json() as Workspace })
    } catch { setState({ kind: 'unavailable', message: 'GraphiteMD could not reach the service.' }) }
  }
  useEffect(() => { void load() }, [])

  if (state.kind === 'loading') return <main className="centered-state" aria-busy="true"><p className="eyebrow">GraphiteMD</p><h1>Opening your workspace…</h1></main>
  if (state.kind === 'login') return <Login expired={state.expired} {...(state.error ? { initialError: state.error } : {})} onAuthenticated={() => void load()} />
  if (state.kind === 'unavailable') return <main className="centered-state"><div className="service-error"><p className="eyebrow">Service unavailable</p><h1>Workspace unavailable</h1><p>{state.message}</p><button className="primary-button" type="button" onClick={() => void load()}>Try again</button></div></main>
  return <Workbench workspace={state.workspace} onSessionExpired={() => setState({ kind: 'login', expired: true })} />
}
