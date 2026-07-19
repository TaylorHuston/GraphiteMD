import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'

const workspace = {
  available: true,
  workspaceId: 'wrk_primary',
  notes: [
    { kind: 'note', resourceId: 'res_alpha', displayPath: 'Alpha.md' },
    { kind: 'note', resourceId: 'res_roadmap', displayPath: 'Areas/Roadmap.md' },
  ],
  inventory: [
    { kind: 'folder', displayPath: 'Areas' },
    { kind: 'note', resourceId: 'res_roadmap', displayPath: 'Areas/Roadmap.md' },
    { kind: 'note', resourceId: 'res_alpha', displayPath: 'Alpha.md' },
  ],
}

function response(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as DOMRectList
}

describe('GMD-002/S1 responsive browse shell', () => {
  it('R2-S1 presents a deterministic accessible tree with selection and collapse', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, {
        resourceId: 'res_roadmap', displayPath: 'Areas/Roadmap.md',
        source: '---\nstatus: active\ntags: [product, now]\n---\n# Roadmap\nExact source.\n',
        revision: 'rev_roadmap', yamlProperties: [
          { name: 'status', value: 'active' }, { name: 'tags', value: ['product', 'now'] },
        ], yamlParseError: null,
      }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    const tree = await screen.findByRole('tree', { name: 'Workspace files' })
    expect(within(tree).getAllByRole('treeitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Areas'),
      expect.stringContaining('Roadmap'),
      expect.stringContaining('Alpha'),
    ])

    await user.click(within(tree).getByRole('treeitem', { name: /Roadmap/ }))
    expect(within(tree).getByRole('treeitem', { name: /Roadmap/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Roadmap', level: 1 })).toBeVisible()
    expect(await screen.findByText(/Exact source\./)).toBeVisible()
    expect(screen.getByText('active')).toBeVisible()
    expect(screen.getByText('product, now')).toBeVisible()
    expect(window.location.search).toBe('?resource=res_roadmap')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/notes/res_roadmap', expect.objectContaining({ credentials: 'same-origin' }))

    await user.click(within(tree).getByRole('treeitem', { name: /Areas/ }))
    expect(within(tree).queryByRole('treeitem', { name: /Roadmap/ })).not.toBeInTheDocument()
  })

  it('R2-S3 keeps files, search, context, and settings reachable in an empty workspace', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, { ...workspace, notes: [], inventory: [] })))

    render(<App />)

    expect(await screen.findByText('This workspace has no Markdown notes yet.')).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Files' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Search' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Context' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Settings' }).length).toBeGreaterThan(0)
  })

  it('R4-S2 opens keyboard-accessible narrow-layout drawers and closes them with Escape', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace)))
    const user = userEvent.setup()

    render(<App />)
    await screen.findByRole('tree', { name: 'Workspace files' })
    await user.click(screen.getByTestId('mobile-files'))

    const drawer = screen.getByRole('dialog', { name: 'Files' })
    expect(drawer).toBeVisible()
    expect(within(drawer).getByRole('button', { name: 'Close Files' })).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Files' })).not.toBeInTheDocument())
  })

  it('returns an expired session to an honest login state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => response(401, {
      error: { code: 'unauthenticated', message: 'Authentication required.' },
    })))

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Sign in to GraphiteMD' })).toBeVisible()
    expect(screen.getByText('Your session has expired. Sign in again to continue.')).toBeVisible()
  })

  it('R3-S2 restores valid reload and Back navigation through the note API', async () => {
    window.history.replaceState(null, '', '/?resource=res_alpha')
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, {
        resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Alpha\n',
        revision: 'rev_alpha', yamlProperties: [], yamlParseError: null,
      }))
      .mockImplementationOnce(() => response(200, {
        resourceId: 'res_roadmap', displayPath: 'Areas/Roadmap.md', source: '# Roadmap\n',
        revision: 'rev_roadmap', yamlProperties: [], yamlParseError: null,
      }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Alpha', level: 1 })).toBeVisible()
    expect(screen.getByText('# Alpha')).toBeVisible()

    window.history.replaceState(null, '', '/?resource=res_roadmap')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(await screen.findByRole('heading', { name: 'Roadmap', level: 1 })).toBeVisible()
    expect(screen.getByText('# Roadmap')).toBeVisible()
  })

  it('R3-S2 fails closed for an invalid history resource and retains the shell', async () => {
    window.history.replaceState(null, '', '/?resource=../../private')
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByRole('tree', { name: 'Workspace files' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Your workspace', level: 1 })).toBeVisible()
    expect(window.location.search).toBe('')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('returns a note-read 401 to the expired-session login state', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(401, {
        error: { code: 'unauthenticated', message: 'Authentication required.' },
      })))
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('treeitem', { name: /Alpha/ }))

    expect(await screen.findByRole('heading', { name: 'Sign in to GraphiteMD' })).toBeVisible()
  })

  it('S3/R1-S1 searches locally and opens an opaque result through the guarded note transition', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { results: [{ resourceId: 'res_roadmap', title: 'Roadmap', displayPath: 'Areas/Roadmap.md', snippet: 'Graphite launch details' }] }))
      .mockImplementationOnce(() => response(200, { resourceId: 'res_roadmap', displayPath: 'Areas/Roadmap.md', source: '# Roadmap\n', revision: 'rev_roadmap', yamlProperties: [], yamlParseError: null }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('tree', { name: 'Workspace files' })
    await user.click(screen.getAllByRole('button', { name: 'Search' })[0]!)
    const drawer = screen.getByRole('dialog', { name: 'Search' })
    await user.type(within(drawer).getByRole('searchbox', { name: 'Search notes' }), 'launch')
    await user.click(within(drawer).getByRole('button', { name: 'Search' }))
    await user.click(await within(drawer).findByRole('button', { name: /Roadmap/ }))
    expect(await screen.findByRole('heading', { name: 'Roadmap', level: 1 })).toBeVisible()
    expect(window.location.search).toBe('?resource=res_roadmap')
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/v1/search?q=launch', expect.objectContaining({ credentials: 'same-origin' }))
  })

  it('S3/R1-S2 and R1-S3 show honest no-result and recoverable failure states', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { results: [] }))
      .mockImplementationOnce(() => response(503, { error: { code: 'search_unavailable' } })))
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('tree', { name: 'Workspace files' })
    await user.click(screen.getAllByRole('button', { name: 'Search' })[0]!)
    const drawer = screen.getByRole('dialog', { name: 'Search' })
    const searchbox = within(drawer).getByRole('searchbox', { name: 'Search notes' })
    await user.type(searchbox, 'missing')
    await user.click(within(drawer).getByRole('button', { name: 'Search' }))
    expect(await within(drawer).findByText('No notes match “missing”.')).toBeVisible()
    await user.clear(searchbox); await user.type(searchbox, 'broken')
    await user.click(within(drawer).getByRole('button', { name: 'Search' }))
    expect(await within(drawer).findByRole('button', { name: 'Rebuild index' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Your workspace', level: 1 })).toBeVisible()
  })

  it('S3/R2-S2 opens a server-authorized external search result and safely adds it to inventory', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { results: [{ resourceId: 'res_external', title: 'External', displayPath: 'New/External.md', snippet: null }] }))
      .mockImplementationOnce(() => response(200, { resourceId: 'res_external', displayPath: 'New/External.md', source: '# External\n', revision: 'rev_external', yamlProperties: [], yamlParseError: null }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup(); render(<App />)
    await screen.findByRole('tree', { name: 'Workspace files' })
    await user.click(screen.getAllByRole('button', { name: 'Search' })[0]!)
    const drawer = screen.getByRole('dialog', { name: 'Search' })
    await user.type(within(drawer).getByRole('searchbox'), 'external')
    await user.click(within(drawer).getByRole('button', { name: 'Search' }))
    await user.click(await within(drawer).findByRole('button', { name: /External/ }))
    expect(await screen.findByRole('heading', { name: 'External', level: 1 })).toBeVisible()
    await waitFor(() => expect(screen.getByRole('treeitem', { name: /External/ })).toHaveAttribute('aria-selected', 'true'))
    expect(window.location.search).toBe('?resource=res_external')
  })

  it('S2/R2-S4 restores the displayed note URL when a dirty popstate transition is cancelled', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Alpha\n', revision: 'rev_alpha', yamlProperties: [], yamlParseError: null }))
      .mockImplementationOnce(() => response(503, { error: { code: 'save_unavailable' } }))
    vi.stubGlobal('fetch', fetchMock); vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(await screen.findByRole('treeitem', { name: /Alpha/ }))
    const editor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(editor); await user.keyboard('{Control>}a{/Control}# Local draft')
    window.history.replaceState(null, '', '/?resource=res_roadmap')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await waitFor(() => expect(window.location.search).toBe('?resource=res_alpha'))
    expect(screen.getByRole('heading', { name: 'Alpha', level: 1 })).toBeVisible()
  })

  it('S2/R3-S1 keeps the renamed resource saveable without reopening it', async () => {
    const renamed = { resourceId: 'res_renamed', displayPath: 'Renamed.md', source: '# Alpha\n', revision: 'rev_renamed', yamlProperties: [], yamlParseError: null }
    const renamedWorkspace = { ...workspace, notes: [{ kind: 'note', resourceId: 'res_renamed', displayPath: 'Renamed.md' }], inventory: [{ kind: 'note', resourceId: 'res_renamed', displayPath: 'Renamed.md' }] }
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Alpha\n', revision: 'rev_alpha', yamlProperties: [], yamlParseError: null }))
      .mockImplementationOnce(() => response(200, { note: renamed, workspace: renamedWorkspace }))
      .mockImplementationOnce(() => response(200, { ...renamed, source: '# Edited\n', revision: 'rev_saved' }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(await screen.findByRole('treeitem', { name: /Alpha/ }))
    const filename = screen.getByRole('textbox', { name: 'Filename' })
    await user.clear(filename); await user.type(filename, 'Renamed.md'); await user.click(screen.getByRole('button', { name: 'Rename' }))
    await screen.findByRole('heading', { name: 'Renamed', level: 1 })
    const editor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(editor); await user.keyboard('{Control>}a{/Control}# Edited')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/notes/res_renamed', expect.objectContaining({ method: 'PUT' })), { timeout: 2000 })
    expect(screen.queryByText('Reopen the renamed note before editing.')).not.toBeInTheDocument()
  })

  it('S2/R2-S3 exposes conflict discard and reload without overwriting the local draft', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Alpha\n', revision: 'rev_alpha', yamlProperties: [], yamlParseError: null }))
      .mockImplementationOnce(() => response(409, { error: { code: 'revision_conflict' } }))
      .mockImplementationOnce(() => response(200, { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Host version\n', revision: 'rev_host', yamlProperties: [], yamlParseError: null }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(await screen.findByRole('treeitem', { name: /Alpha/ }))
    const editor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(editor); await user.keyboard('{Control>}a{/Control}# Local draft')
    const reload = await screen.findByRole('button', { name: 'Discard draft and reload' }, { timeout: 2000 })
    expect(screen.getByText(/local draft has not been overwritten/i)).toBeVisible()
    await user.click(reload)
    expect(await screen.findByText('# Host version')).toBeVisible()
  })

  it('S2/R2-S3 exposes a recoverable retry after a transient save failure', async () => {
    const saved = { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Retried\n', revision: 'rev_saved', yamlProperties: [], yamlParseError: null }
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { ...saved, source: '# Alpha\n', revision: 'rev_alpha' }))
      .mockImplementationOnce(() => response(503, { error: { code: 'save_unavailable' } }))
      .mockImplementationOnce(() => response(200, saved))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(await screen.findByRole('treeitem', { name: /Alpha/ }))
    const editor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(editor); await user.keyboard('{Control>}a{/Control}# Retried')
    const retry = await screen.findByRole('button', { name: 'Retry save' }, { timeout: 2000 })
    await user.click(retry)
    await waitFor(() => expect(screen.getByText('Saved')).toBeVisible())
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/notes/res_alpha', expect.objectContaining({ method: 'PUT' }))
  })

  it('GMD-003/S1 R2-S1 mounts and removes only the active declared System Status contribution', async () => {
    const active = { id: 'system-status', status: 'active', manifest: { name: 'System Status', version: '1.0.0', permissions: ['status:read'] }, contributions: { views: [{ id: 'system-status', title: 'System Status' }] } }
    const disabled = { ...active, status: 'disabled', contributions: {} }
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [active] }))
      .mockImplementationOnce(() => response(200, { plugins: [active] }))
      .mockImplementationOnce(() => response(200, { plugin: disabled }))
      .mockImplementationOnce(() => response(200, { plugins: [disabled] }))
    vi.stubGlobal('fetch', fetchMock); document.cookie = 'XSRF-TOKEN=plugin-token'
    const user = userEvent.setup(); render(<App />)
    expect(await screen.findByRole('heading', { name: 'Service connected' })).toBeVisible()
    await user.click(screen.getAllByRole('button', { name: 'Settings' })[0]!)
    await user.click(await screen.findByRole('button', { name: 'Disable System Status' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Service connected' })).not.toBeInTheDocument())
  })
})
