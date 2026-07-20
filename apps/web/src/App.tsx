import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { FileText, Folder, FolderOpen, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X } from 'lucide-react'
import {
  MarkdownNoteResponse as MarkdownNoteSchema,
  OwnerResponse,
  PluginsResponse,
  RenameNoteResponse,
  SearchRebuildResponse,
  SearchResponse,
  WorkspaceResponse,
  type MarkdownNoteResponse as Note,
  type PluginInventoryItem,
  type WorkspaceResponse as Workspace,
} from '@graphitemd/contracts'
import { MarkdownEditor } from './MarkdownEditor.js'
import { AppRail } from './AppRail.js'
import { SettingsPanel } from './SettingsPanel.js'
import { AutosaveCoordinator, prepareAutosaveTransition, type AutosaveSnapshot } from './autosave.js'
import { InvalidApiResponseError, request, requestJson } from './api.js'

type NoteItem = Workspace['notes'][number]
type FolderItem = Extract<Workspace['inventory'][number], { kind: 'folder' }>
type InventoryItem = NoteItem | FolderItem
type AppState =
  | { kind: 'loading' }
  | { kind: 'login'; expired: boolean; error?: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'ready'; workspace: Workspace }

type TreeNode = { name: string; path: string; kind: 'folder'; children: TreeNode[] } | {
  name: string; path: string; kind: 'note'; resourceId: string
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
  const [focusPath, setFocusPath] = useState(() => nodes[0]?.path ?? '')
  const itemRefs = useRef(new Map<string, HTMLButtonElement>())
  const visible = useMemo(() => {
    const result: TreeNode[] = []
    const visit = (items: TreeNode[]) => items.forEach((node) => {
      result.push(node)
      if (node.kind === 'folder' && !collapsed.has(node.path)) visit(node.children)
    })
    visit(nodes)
    return result
  }, [collapsed, nodes])
  useEffect(() => {
    if (visible.some((node) => node.path === focusPath)) return
    const selectedNode = visible.find((node) => node.kind === 'note' && node.resourceId === selected)
    setFocusPath(selectedNode?.path ?? visible[0]?.path ?? '')
  }, [focusPath, selected, visible])
  const focus = (node: TreeNode | undefined) => {
    if (!node) return
    setFocusPath(node.path)
    queueMicrotask(() => itemRefs.current.get(node.path)?.focus())
  }
  const onTreeKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, node: TreeNode) => {
    const index = visible.findIndex((item) => item.path === node.path)
    if (event.key === 'ArrowDown') focus(visible[index + 1] ?? visible[0])
    else if (event.key === 'ArrowUp') focus(visible[index - 1] ?? visible.at(-1))
    else if (event.key === 'Home') focus(visible[0])
    else if (event.key === 'End') focus(visible.at(-1))
    else if (event.key === 'ArrowRight' && node.kind === 'folder') {
      if (collapsed.has(node.path)) setCollapsed((current) => { const next = new Set(current); next.delete(node.path); return next })
      else focus(node.children[0])
    } else if (event.key === 'ArrowLeft') {
      if (node.kind === 'folder' && !collapsed.has(node.path)) setCollapsed((current) => new Set(current).add(node.path))
      else {
        const parent = node.path.split('/').slice(0, -1).join('/')
        focus(visible.find((item) => item.path === parent))
      }
    } else return
    event.preventDefault()
  }

  const renderNodes = (items: TreeNode[], level: number): ReactNode => items.map((node) => node.kind === 'folder' ? (
    <li role="none" key={node.path}>
      <button
        ref={(element) => { if (element) itemRefs.current.set(node.path, element); else itemRefs.current.delete(node.path) }}
        className="tree-item tree-folder"
        type="button"
        role="treeitem"
        aria-expanded={!collapsed.has(node.path)}
        aria-level={level}
        tabIndex={focusPath === node.path ? 0 : -1}
        onFocus={() => setFocusPath(node.path)}
        onKeyDown={(event) => onTreeKeyDown(event, node)}
        onClick={() => setCollapsed((current) => {
          const next = new Set(current)
          if (next.has(node.path)) next.delete(node.path); else next.add(node.path)
          return next
        })}
      >{collapsed.has(node.path)
        ? <Folder size={14} strokeWidth={1.75} aria-hidden="true" focusable="false" />
        : <FolderOpen size={14} strokeWidth={1.75} aria-hidden="true" focusable="false" />}{node.name}</button>
      {!collapsed.has(node.path) && <ul role="group">{renderNodes(node.children, level + 1)}</ul>}
    </li>
  ) : (
    <li role="none" key={node.resourceId}>
      <button
        ref={(element) => { if (element) itemRefs.current.set(node.path, element); else itemRefs.current.delete(node.path) }}
        className="tree-item tree-note"
        type="button"
        role="treeitem"
        aria-level={level}
        aria-selected={selected === node.resourceId}
        tabIndex={focusPath === node.path ? 0 : -1}
        onFocus={() => setFocusPath(node.path)}
        onKeyDown={(event) => onTreeKeyDown(event, node)}
        onClick={() => onSelect({ kind: 'note', resourceId: node.resourceId, displayPath: node.path })}
      ><FileText size={14} strokeWidth={1.75} aria-hidden="true" focusable="false" />{node.name}</button>
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
      const result = await requestJson('/api/v1/auth/login', OwnerResponse, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-xsrf-token': xsrfToken() },
        body: JSON.stringify({ account: 'owner', password }),
      })
      if (!result.ok) { setError('The password was not accepted.'); return }
      onAuthenticated()
    } catch { setError('GraphiteMD could not reach the service.') }
    finally { setPending(false) }
  }
  return <main className="centered-state"><form name="owner-login" className="login-panel" onSubmit={submit}>
    <div className="brand-mark" aria-hidden="true">G</div><p className="eyebrow">GraphiteMD</p>
    <h1>Sign in to GraphiteMD</h1>
    <p>{expired ? 'Your session has expired. Sign in again to continue.' : 'Enter the owner password for this host.'}</p>
    <label htmlFor="password">Password</label>
    <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
  </form></main>
}

type DrawerName = 'Files' | 'Search' | 'Context' | 'Settings'

function Drawer({ name, onClose, children }: { name: DrawerName; onClose: () => void; children: ReactNode }) {
  const modal = name === 'Settings'
  const drawerRef = useRef<HTMLElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    const drawer = drawerRef.current
    const background = drawer?.parentElement ? [...drawer.parentElement.parentElement!.children].filter((item) => item !== drawer.parentElement) as HTMLElement[] : []
    const priorInert = new Map(background.map((item) => [item, item.inert]))
    const priorOverflow = document.body.style.overflow
    background.forEach((item) => { item.inert = true })
    document.body.style.overflow = 'hidden'
    drawer?.querySelector<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])')?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      background.forEach((item) => { item.inert = priorInert.get(item) ?? false })
      document.body.style.overflow = priorOverflow
      previousFocus.current?.focus()
    }
  }, [onClose])
  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key !== 'Tab' || !drawerRef.current) return
    const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')]
    if (!focusable.length) return
    const first = focusable[0]!
    const last = focusable.at(-1)!
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  return <div className={modal ? 'modal-layer' : 'drawer-layer'} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={drawerRef} className={modal ? 'modal-dialog' : 'drawer'} role="dialog" aria-modal="true" aria-label={name} onKeyDown={onKeyDown}>
      <header className={modal ? 'modal-header' : 'drawer-header'}><h2>{name}</h2><button className="icon-button" type="button" aria-label={`Close ${name}`} onClick={onClose}><X size={19} strokeWidth={1.75} aria-hidden="true" /></button></header>
      {children}
    </section>
  </div>
}

type SearchResult = SearchResponse['results'][number]
function SearchPanel({ onSelect, onSessionExpired }: { onSelect: (resourceId: string) => void; onSessionExpired: () => void }) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [indexedNotes, setIndexedNotes] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'searching' | 'ready' | 'error' | 'rebuilding' | 'rebuilt'>('idle')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const submitted = query.trim()
    setResults([]); setIndexedNotes(null); setSubmittedQuery(submitted)
    if (!submitted) { setStatus('idle'); return }
    setStatus('searching')
    try {
      const response = await requestJson(`/api/v1/search?q=${encodeURIComponent(submitted)}`, SearchResponse)
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) { setStatus('error'); return }
      setResults(response.data.results); setStatus('ready')
    } catch { setStatus('error') }
  }
  const rebuild = async () => {
    setResults([]); setIndexedNotes(null); setStatus('rebuilding')
    try {
      const response = await requestJson('/api/v1/search/rebuild', SearchRebuildResponse, { method: 'POST', headers: { 'x-xsrf-token': xsrfToken() } })
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) { setStatus('error'); return }
      setIndexedNotes(response.data.indexed); setStatus('rebuilt')
    } catch { setStatus('error') }
  }
  const busy = status === 'searching' || status === 'rebuilding'
  return <div className="search-panel" aria-busy={busy}><form name="workspace-search" onSubmit={(event) => void submit(event)}><label htmlFor={searchId}>Search notes</label><div className="search-controls"><input id={searchId} name="query" type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" disabled={busy} /></div></form>
    {status === 'searching' && <p aria-live="polite">Searching locally…</p>}
    {status === 'rebuilding' && <p aria-live="polite">Rebuilding local index…</p>}
    {status === 'rebuilt' && indexedNotes !== null && <p role="status" aria-label="Search index status" aria-live="polite">Index rebuilt. {indexedNotes} {indexedNotes === 1 ? 'note' : 'notes'} indexed.</p>}
    {status === 'ready' && results.length === 0 && <p role="status" aria-live="polite">No notes match “{submittedQuery}”.</p>}
    {status === 'error' && <div role="alert"><p>Local search is unavailable. Your note and draft are unchanged.</p><button type="button" onClick={() => void rebuild()}>Rebuild index</button></div>}
    {status === 'ready' && results.length > 0 && <ul className="search-results">{results.map((result) => <li key={result.resourceId}><button type="button" onClick={() => onSelect(result.resourceId)}><strong>{result.title}</strong><span>{result.displayPath}</span>{result.snippet && <small>{result.snippet}</small>}</button></li>)}</ul>}
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

function Workbench({ workspace, onSessionExpired, onSignedOut }: { workspace: Workspace; onSessionExpired: () => void; onSignedOut: () => void }) {
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
  const [navigationOpen, setNavigationOpen] = useState(true)
  const [contextOpen, setContextOpen] = useState(true)
  const closeDrawer = useCallback(() => setDrawer(null), [])

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
  const logout = useCallback(async () => {
    if (!(await guardTransition())) return
    try {
      const response = await request('/api/v1/auth/logout', { method: 'POST', headers: { 'x-xsrf-token': xsrfToken() } })
      if (response.ok || response.status === 401) onSignedOut()
    } catch { /* Keep the signed-in workbench when logout cannot be confirmed. */ }
  }, [guardTransition, onSignedOut])

  const refreshPlugins = useCallback(async () => {
    try {
      const response = await requestJson('/api/v1/plugins', PluginsResponse)
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) return
      setPlugins(response.data.plugins)
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
        const response = await requestJson(`/api/v1/notes/${encodeURIComponent(savingResource)}`, MarkdownNoteSchema, {
          method: 'PUT',
          headers: { 'content-type': 'application/json', 'x-xsrf-token': xsrfToken() },
          body: JSON.stringify({ source, expectedRevision }),
        })
        if (response.status === 401) { onSessionExpired(); throw new Error('Authentication required.') }
        if (response.status === 409) return { status: 'conflict' as const }
        if (!response.ok) throw new Error('Unable to save Markdown.')
        const saved = response.data
        if (saved.resourceId !== savingResource || saved.source !== source) {
          throw new InvalidApiResponseError(`/api/v1/notes/${encodeURIComponent(savingResource)}`)
        }
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
      const response = await requestJson(`/api/v1/notes/${encodeURIComponent(resourceId)}`, MarkdownNoteSchema)
      if (sequence !== requestSequence.current) return
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) {
        setSelected(null); setNoteStatus('unavailable')
        window.history.replaceState(null, '', window.location.pathname)
        return
      }
      const note = response.data
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
    const restore = async () => {
      const resourceId = resourceFromLocation(workspaceRef.current)
      if (resourceId) {
        const displayedResource = selectedRef.current?.resourceId ?? null
        await openNote(resourceId, 'restore').then(() => {
          if (selectedRef.current?.resourceId !== resourceId) window.history.replaceState(null, '', noteLocation(displayedResource))
        })
      }
      else {
        const displayedResource = selectedRef.current?.resourceId ?? null
        if (displayedResource && !(await guardTransition())) {
          window.history.replaceState(null, '', noteLocation(displayedResource))
          return
        }
        requestSequence.current += 1
        setSelected(null); setNoteStatus('idle')
        if (window.location.search) window.history.replaceState(null, '', window.location.pathname)
      }
    }
    const onPopState = () => { void restore() }
    void restore()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [guardTransition, openNote])
  const renameSelected = async (event: FormEvent) => {
    event.preventDefault(); setRenameError(null)
    const beforeTransition = autosave.snapshot()
    if (!selected || !(await guardTransition())) return
    let renameSource = selected
    let snapshot = autosave.snapshot()
    if (!snapshot.revision) {
      if (beforeTransition.phase === 'conflict') {
        await openNote(selected.resourceId, 'restore')
        const refreshed = selectedRef.current
        if (!refreshed || refreshed.resourceId !== selected.resourceId) return
        renameSource = refreshed
      } else {
        bindAutosave(selected)
      }
      snapshot = autosave.snapshot()
    }
    if (!snapshot.revision) return
    try {
      const response = await requestJson(`/api/v1/notes/${encodeURIComponent(renameSource.resourceId)}/rename`, RenameNoteResponse, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-xsrf-token': xsrfToken() },
        body: JSON.stringify({ expectedRevision: snapshot.revision, fileName: renameDraft }),
      })
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) { setRenameError(response.status === 409 ? 'The note changed or the rename outcome needs reconciliation.' : 'Choose a valid unused Markdown filename.'); return }
      const result = response.data
      workspaceRef.current = result.workspace; setWorkspaceState(result.workspace); setSelected(result.note); setRenameDraft(result.note.displayPath.split('/').at(-1) ?? '')
      bindAutosave(result.note)
      const url = new URL(window.location.href); url.search = ''; url.searchParams.set('resource', result.note.resourceId)
      window.history.replaceState(null, '', `${url.pathname}${url.search}`)
    } catch {
      setRenameError('GraphiteMD received an invalid rename response. Your note was not replaced.')
    }
  }
  const systemStatusMounted = plugins?.some((plugin) => plugin.id === 'system-status' && plugin.status === 'active'
    && plugin.contributions.views?.some((view) => view.id === 'system-status'))
  const contextPanel = () => <><ContextPlaceholder note={selected} />{systemStatusMounted && <section className="system-status-contribution" aria-label="System Status"><p className="panel-label">System Status</p><h2>Service connected</h2><dl><div><dt>Workspace</dt><dd>Available</dd></div><div><dt>Markdown notes</dt><dd>{workspaceState.notes.length}</dd></div></dl></section>}</>
  const filesPanel = workspaceState.inventory.length
    ? <FileTree inventory={workspaceState.inventory} selected={selected?.resourceId ?? null} onSelect={(note) => { void openNote(note.resourceId, 'push'); setDrawer(null) }} />
    : <p className="panel-empty">No Markdown notes</p>
  const navigation = <>
    <SearchPanel onSessionExpired={onSessionExpired} onSelect={(resourceId) => void openNote(resourceId, 'push', true)} />
    <div className="files-panel">{filesPanel}</div>
  </>

  return <main className={`workbench ${navigationOpen ? '' : 'navigation-collapsed'} ${contextOpen ? '' : 'context-collapsed'}`}>
    <AppRail onOpenFiles={() => setDrawer('Files')} onOpenSearch={() => setDrawer('Search')} onOpenContext={() => setDrawer('Context')} onOpenSettings={() => setDrawer('Settings')} />
    <aside className="navigation-panel" aria-label="Workspace navigation">{navigation}</aside>
    <article className="document-region">
      <header className="document-header"><button className="edge-toggle edge-toggle-left" type="button" aria-label={navigationOpen ? 'Collapse navigation' : 'Expand navigation'} onClick={() => setNavigationOpen((open) => !open)}>{navigationOpen ? <PanelLeftClose size={18} strokeWidth={1.75} aria-hidden="true" /> : <PanelLeftOpen size={18} strokeWidth={1.75} aria-hidden="true" />}</button><div><p className="document-path">{selected?.displayPath ?? 'Workspace'}</p><h1>{selected ? selected.displayPath.split('/').at(-1)?.replace(/\.md$/i, '') : 'Your workspace'}</h1></div><span className="status-chip" role="status" aria-live="polite">{save.phase === 'saving' || save.phase === 'scheduled' ? 'Saving…' : save.phase === 'conflict' ? 'Conflict' : save.phase === 'error' ? 'Save failed' : save.dirty ? 'Unsaved' : 'Saved'}</span><button className="edge-toggle edge-toggle-right" type="button" aria-label={contextOpen ? 'Collapse context' : 'Expand context'} onClick={() => setContextOpen((open) => !open)}>{contextOpen ? <PanelRightClose size={18} strokeWidth={1.75} aria-hidden="true" /> : <PanelRightOpen size={18} strokeWidth={1.75} aria-hidden="true" />}</button></header>
      <div className="document-body">{workspaceState.inventory.length === 0 ? <EmptyState /> : noteStatus === 'loading' ? <div className="empty-state" aria-live="polite"><h2>Opening note…</h2></div> : selected ? <>{(save.phase === 'error' || save.phase === 'conflict') && <div className="save-recovery" role="alert"><p>{save.phase === 'conflict' ? 'This note changed on the host. Your local draft has not been overwritten.' : 'GraphiteMD could not save this draft.'}</p>{save.phase === 'error' ? <button type="button" onClick={() => void autosave.retry()}>Retry save</button> : <button type="button" onClick={() => { autosave.discard(); void openNote(selected.resourceId, 'restore') }}>Discard draft and reload</button>}</div>}<form name="rename-note" className="rename-note" onSubmit={(event) => void renameSelected(event)}><label htmlFor="note-filename">Filename</label><input id="note-filename" name="filename" autoComplete="off" value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} disabled={save.pending} /><button type="submit" disabled={save.pending}>Rename</button>{renameError && <p role="alert">{renameError}</p>}</form><MarkdownEditor key={selected.resourceId} source={save.resourceId === selected.resourceId ? save.draft : selected.source} onChange={(source) => autosave.edit(source)} /></> : noteStatus === 'unavailable' ? <div className="empty-state" role="alert"><h2>Note unavailable</h2><p>The requested note could not be opened. Select another note from Files.</p></div> : <div className="empty-state"><div className="empty-mark" aria-hidden="true">◇</div><h2>Select a note</h2><p>Choose a Markdown file from Files to open it here.</p></div>}</div>
    </article>
    <aside className="context-panel" aria-label="Note context">{contextPanel()}</aside>
    {drawer && <Drawer name={drawer} onClose={closeDrawer}>{drawer === 'Files' ? filesPanel : drawer === 'Search' ? <SearchPanel onSessionExpired={onSessionExpired} onSelect={(resourceId) => { void openNote(resourceId, 'push', true); setDrawer(null) }} /> : drawer === 'Context' ? contextPanel() : <SettingsPanel onSessionExpired={onSessionExpired} onPluginsChanged={refreshPlugins} onLogout={() => void logout()} />}</Drawer>}
  </main>
}

export function App() {
  const [state, setState] = useState<AppState>({ kind: 'loading' })
  const load = async () => {
    setState({ kind: 'loading' })
    try {
      const auth = await requestJson('/api/v1/auth/current', OwnerResponse)
      if (auth.status === 401) { setState({ kind: 'login', expired: false }); return }
      if (!auth.ok) { setState({ kind: 'unavailable', message: 'The authentication service is unavailable.' }); return }
      const workspace = await requestJson('/api/v1/workspace', WorkspaceResponse)
      if (workspace.status === 401) { setState({ kind: 'login', expired: true }); return }
      if (!workspace.ok) { setState({ kind: 'unavailable', message: 'The configured workspace is unavailable on this host.' }); return }
      setState({ kind: 'ready', workspace: workspace.data })
    } catch (error) {
      setState({
        kind: 'unavailable',
        message: error instanceof InvalidApiResponseError && error.path === '/api/v1/workspace'
          ? 'GraphiteMD received an invalid workspace response. Try again after checking the host service.'
          : 'GraphiteMD could not reach the service.',
      })
    }
  }
  useEffect(() => { void load() }, [])

  if (state.kind === 'loading') return <main className="centered-state" aria-busy="true"><p className="eyebrow">GraphiteMD</p><h1>Opening your workspace…</h1></main>
  if (state.kind === 'login') return <Login expired={state.expired} {...(state.error ? { initialError: state.error } : {})} onAuthenticated={() => void load()} />
  if (state.kind === 'unavailable') return <main className="centered-state"><div className="service-error"><p className="eyebrow">Service unavailable</p><h1>Workspace unavailable</h1><p>{state.message}</p><button className="primary-button" type="button" onClick={() => void load()}>Try again</button></div></main>
  return <Workbench workspace={state.workspace} onSessionExpired={() => setState({ kind: 'login', expired: true })} onSignedOut={() => setState({ kind: 'login', expired: false })} />
}
