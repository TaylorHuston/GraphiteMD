import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { MarkdownEditor } from './MarkdownEditor.js'
import { SettingsPanel } from './SettingsPanel.js'
import { AutosaveCoordinator, prepareAutosaveTransition, type AutosaveSnapshot } from './autosave.js'

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

function xsrfToken(): string {
  const value = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
  return value ? decodeURIComponent(value) : ''
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

type SearchResult = { resourceId: string; title: string; displayPath: string; snippet: string | null }
type PluginContribution = { id: string; title: string }
type PluginInventoryItem = {
  id: string
  status: string
  contributions: Partial<Record<'commands' | 'views', PluginContribution[]>>
}
function SearchPanel({ onSelect, onSessionExpired }: { onSelect: (resourceId: string) => void; onSessionExpired: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) { setResults([]); setStatus('idle'); return }
    setStatus('loading')
    try {
      const response = await getJson(`/api/v1/search?q=${encodeURIComponent(query)}`)
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) { setStatus('error'); return }
      const body = await response.json() as { results: SearchResult[] }
      setResults(body.results); setStatus('ready')
    } catch { setStatus('error') }
  }
  const rebuild = async () => {
    setStatus('loading')
    try {
      const response = await getJson('/api/v1/search/rebuild', { method: 'POST', headers: { 'x-xsrf-token': xsrfToken() } })
      if (response.status === 401) { onSessionExpired(); return }
      setStatus(response.ok ? 'idle' : 'error')
    } catch { setStatus('error') }
  }
  return <div className="search-panel"><form onSubmit={(event) => void submit(event)}><label htmlFor="search">Search notes</label><div className="search-controls"><input id="search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, path, properties, or body" /><button type="submit" disabled={status === 'loading'}>Search</button></div></form>
    {status === 'loading' && <p aria-live="polite">Searching locally…</p>}
    {status === 'ready' && results.length === 0 && <p>No notes match “{query}”.</p>}
    {status === 'error' && <div role="alert"><p>Local search is unavailable. Your note and draft are unchanged.</p><button type="button" onClick={() => void rebuild()}>Rebuild index</button></div>}
    {results.length > 0 && <ul className="search-results">{results.map((result) => <li key={result.resourceId}><button type="button" onClick={() => onSelect(result.resourceId)}><strong>{result.title}</strong><span>{result.displayPath}</span>{result.snippet && <small>{result.snippet}</small>}</button></li>)}</ul>}
  </div>
}
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
function resourceFromLocation(workspace: Workspace): string | null {
  const resourceId = new URLSearchParams(window.location.search).get('resource')
  return resourceId && /^res_[a-z0-9]+$/.test(resourceId) && workspace.notes.some((note) => note.resourceId === resourceId)
    ? resourceId
    : null
}

function noteLocation(resourceId: string | null): string {
  const url = new URL(window.location.href)
  url.search = ''
  if (resourceId) url.searchParams.set('resource', resourceId)
  return `${url.pathname}${url.search}`
}

function reconcileDiscoveredNote(workspace: Workspace, note: Note): Workspace {
  if (workspace.notes.some((item) => item.resourceId === note.resourceId)) return workspace
  const folderPaths = note.displayPath.split('/').slice(0, -1).map((_, index, parts) => parts.slice(0, index + 1).join('/'))
  const existing = new Set(workspace.inventory.map((item) => `${item.kind}:${item.displayPath}`))
  const additions: InventoryItem[] = [
    ...folderPaths.filter((path) => !existing.has(`folder:${path}`)).map((displayPath) => ({ kind: 'folder' as const, displayPath })),
    { kind: 'note', resourceId: note.resourceId, displayPath: note.displayPath },
  ]
  return {
    ...workspace,
    notes: [...workspace.notes, { kind: 'note', resourceId: note.resourceId, displayPath: note.displayPath }],
    inventory: [...workspace.inventory, ...additions],
  }
}

function Workbench({ workspace, onSessionExpired }: { workspace: Workspace; onSessionExpired: () => void }) {
  const [workspaceState, setWorkspaceState] = useState(workspace)
  const workspaceRef = useRef(workspace)
  const [selected, setSelected] = useState<Note | null>(null)
  const selectedRef = useRef<Note | null>(null)
  const [noteStatus, setNoteStatus] = useState<'idle' | 'loading' | 'unavailable'>('idle')
  const [drawer, setDrawer] = useState<DrawerName | null>(null)
  const requestSequence = useRef(0)
  const autosave = useMemo(() => new AutosaveCoordinator(750), [])
  const [save, setSave] = useState<AutosaveSnapshot>(() => autosave.snapshot())
  const [renameDraft, setRenameDraft] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [plugins, setPlugins] = useState<PluginInventoryItem[]>([])

  useEffect(() => autosave.subscribe(setSave), [autosave])
  useEffect(() => { workspaceRef.current = workspaceState }, [workspaceState])
  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => {
    const protectDraft = (event: BeforeUnloadEvent) => {
      if (!autosave.snapshot().dirty && !autosave.snapshot().pending) return
      event.preventDefault(); event.returnValue = ''
    }
    window.addEventListener('beforeunload', protectDraft)
    return () => window.removeEventListener('beforeunload', protectDraft)
  }, [autosave])

  const guardTransition = useCallback(async () => prepareAutosaveTransition(
    autosave,
    () => window.confirm('This note has unsaved work. Discard the local draft?'),
  ), [autosave])

  const refreshPlugins = useCallback(async () => {
    try {
      const response = await getJson('/api/v1/plugins')
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) return
      const result = await response.json() as { plugins: PluginInventoryItem[] }
      if (Array.isArray(result.plugins)) setPlugins(result.plugins)
    } catch { /* Plugin inventory failure must not take down the workbench. */ }
  }, [onSessionExpired])

  useEffect(() => { void refreshPlugins() }, [refreshPlugins])

  const bindAutosave = useCallback((note: Note) => {
    autosave.open({
      resourceId: note.resourceId,
      source: note.source,
      revision: note.revision,
      eligible: true,
      save: async ({ resourceId: savingResource, source, expectedRevision }) => {
        const response = await getJson(`/api/v1/notes/${encodeURIComponent(savingResource)}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json', 'x-xsrf-token': xsrfToken() },
          body: JSON.stringify({ source, expectedRevision }),
        })
        if (response.status === 401) { onSessionExpired(); throw new Error('Authentication required.') }
        if (response.status === 409) return { status: 'conflict' as const }
        if (!response.ok) throw new Error('Unable to save Markdown.')
        const saved = await response.json() as Note
        setSelected((current) => current?.resourceId === saved.resourceId ? saved : current)
        return { status: 'saved' as const, revision: saved.revision }
      },
    })
  }, [autosave, onSessionExpired])

  const openNote = useCallback(async (resourceId: string, history: 'push' | 'restore', allowDiscovery = false) => {
    if (selectedRef.current?.resourceId !== resourceId && !(await guardTransition())) return
    const issued = workspaceRef.current.notes.some((note) => note.resourceId === resourceId)
    if (!issued && !allowDiscovery) {
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
      if (history === 'push') window.history.pushState(null, '', noteLocation(resourceId))
      setSelected(note); setNoteStatus('idle')
      setRenameDraft(note.displayPath.split('/').at(-1) ?? '')
      setRenameError(null)
      bindAutosave(note)
      if (!issued) setWorkspaceState((current) => {
        const next = reconcileDiscoveredNote(current, note)
        workspaceRef.current = next
        return next
      })
    } catch {
      if (sequence !== requestSequence.current) return
      setSelected(null); setNoteStatus('unavailable')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [bindAutosave, guardTransition, onSessionExpired])

  useEffect(() => {
    const restore = () => {
      const resourceId = resourceFromLocation(workspaceRef.current)
      if (resourceId) {
        const displayedResource = selectedRef.current?.resourceId ?? null
        void openNote(resourceId, 'restore').then(() => {
          if (selectedRef.current?.resourceId !== resourceId) window.history.replaceState(null, '', noteLocation(displayedResource))
        })
      }
      else {
        requestSequence.current += 1
        setSelected(null); setNoteStatus('idle')
        if (window.location.search) window.history.replaceState(null, '', window.location.pathname)
      }
    }
    restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [openNote])
  const renameSelected = async (event: FormEvent) => {
    event.preventDefault(); setRenameError(null)
    if (!selected || !(await guardTransition())) return
    const snapshot = autosave.snapshot()
    if (!snapshot.revision) return
    const response = await getJson(`/api/v1/notes/${encodeURIComponent(selected.resourceId)}/rename`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-xsrf-token': xsrfToken() },
      body: JSON.stringify({ expectedRevision: snapshot.revision, fileName: renameDraft }),
    })
    if (response.status === 401) { onSessionExpired(); return }
    if (!response.ok) { setRenameError(response.status === 409 ? 'The note changed or the rename outcome needs reconciliation.' : 'Choose a valid unused Markdown filename.'); return }
    const result = await response.json() as { note: Note; workspace: Workspace }
    workspaceRef.current = result.workspace; setWorkspaceState(result.workspace); setSelected(result.note); setRenameDraft(result.note.displayPath.split('/').at(-1) ?? '')
    bindAutosave(result.note)
    const url = new URL(window.location.href); url.search = ''; url.searchParams.set('resource', result.note.resourceId)
    window.history.replaceState(null, '', `${url.pathname}${url.search}`)
  }
  const systemStatusMounted = plugins?.some((plugin) => plugin.id === 'system-status' && plugin.status === 'active'
    && plugin.contributions.views?.some((view) => view.id === 'system-status'))
  const navigation = <><div className="panel-switcher"><button type="button" aria-pressed="true">Files</button><button type="button" onClick={() => setDrawer('Search')}>Search</button></div>
    {workspaceState.inventory.length ? <FileTree inventory={workspaceState.inventory} selected={selected?.resourceId ?? null} onSelect={(note) => { void openNote(note.resourceId, 'push'); setDrawer(null) }} /> : <p className="panel-empty">No Markdown notes</p>}</>

  return <main className="workbench">
    <header className="mobile-bar"><span className="wordmark">GraphiteMD</span><nav aria-label="Workspace tools">
      <button data-testid="mobile-files" type="button" onClick={() => setDrawer('Files')}>Files</button>
      <button type="button" onClick={() => setDrawer('Search')}>Search</button>
      <button type="button" onClick={() => setDrawer('Context')}>Context</button>
      <button type="button" onClick={() => setDrawer('Settings')}>Settings</button>
    </nav></header>
    <aside className="navigation-panel" aria-label="Workspace navigation"><div className="panel-brand"><span className="brand-mark small" aria-hidden="true">G</span><span>GraphiteMD</span></div>{navigation}</aside>
    <article className="document-region">
      <header className="document-header"><div><p className="document-path">{selected?.displayPath ?? 'Workspace'}</p><h1>{selected ? selected.displayPath.split('/').at(-1)?.replace(/\.md$/i, '') : 'Your workspace'}</h1></div><span className="status-chip">{save.phase === 'saving' || save.phase === 'scheduled' ? 'Saving…' : save.phase === 'conflict' ? 'Conflict' : save.phase === 'error' ? 'Save failed' : save.dirty ? 'Unsaved' : 'Saved'}</span></header>
      <div className="document-body">{workspaceState.inventory.length === 0 ? <EmptyState /> : noteStatus === 'loading' ? <div className="empty-state" aria-live="polite"><h2>Opening note…</h2></div> : selected ? <>{(save.phase === 'error' || save.phase === 'conflict') && <div className="save-recovery" role="alert"><p>{save.phase === 'conflict' ? 'This note changed on the host. Your local draft has not been overwritten.' : 'GraphiteMD could not save this draft.'}</p>{save.phase === 'error' ? <button type="button" onClick={() => void autosave.retry()}>Retry save</button> : <button type="button" onClick={() => { autosave.discard(); void openNote(selected.resourceId, 'restore') }}>Discard draft and reload</button>}</div>}<form className="rename-note" onSubmit={(event) => void renameSelected(event)}><label htmlFor="note-filename">Filename</label><input id="note-filename" value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} disabled={save.pending} /><button type="submit" disabled={save.pending}>Rename</button>{renameError && <p role="alert">{renameError}</p>}</form><MarkdownEditor source={save.resourceId === selected.resourceId ? save.draft : selected.source} onChange={(source) => autosave.edit(source)} /></> : noteStatus === 'unavailable' ? <div className="empty-state" role="alert"><h2>Note unavailable</h2><p>The requested note could not be opened. Select another note from Files.</p></div> : <div className="empty-state"><div className="empty-mark" aria-hidden="true">◇</div><h2>Select a note</h2><p>Choose a Markdown file from Files to open it here.</p></div>}</div>
    </article>
    <aside className="context-panel" aria-label="Note context"><ContextPlaceholder note={selected} />{systemStatusMounted && <section className="system-status-contribution" aria-labelledby="system-status-title"><p className="panel-label">System Status</p><h2 id="system-status-title">Service connected</h2><dl><div><dt>Workspace</dt><dd>Available</dd></div><div><dt>Markdown notes</dt><dd>{workspaceState.notes.length}</dd></div></dl></section>}<div className="context-actions"><button type="button" onClick={() => setDrawer('Settings')}>Settings</button></div></aside>
    {drawer && <Drawer name={drawer} onClose={() => setDrawer(null)}>{drawer === 'Files' ? navigation : drawer === 'Search' ? <SearchPanel onSessionExpired={onSessionExpired} onSelect={(resourceId) => { void openNote(resourceId, 'push', true); setDrawer(null) }} /> : drawer === 'Context' ? <ContextPlaceholder note={selected} /> : <SettingsPanel onSessionExpired={onSessionExpired} onPluginsChanged={refreshPlugins} />}</Drawer>}
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
