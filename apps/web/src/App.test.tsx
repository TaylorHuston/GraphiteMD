import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as DOMRectList
}

describe('AMD-002/S1 responsive browse shell', () => {
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
    expect(screen.getByLabelText('AnthraciteMD')).toHaveTextContent('A')
    await user.click(screen.getByTestId('mobile-files'))

    const drawer = screen.getByRole('dialog', { name: 'Files' })
    expect(drawer).toBeVisible()
    expect(within(drawer).getByRole('button', { name: 'Close Files' })).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Files' })).not.toBeInTheDocument())
  })

  it('distinguishes an initial unauthenticated browser from an expired session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => response(401, {
      error: { code: 'unauthenticated', message: 'Authentication required.' },
    })))

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Sign in to AnthraciteMD' })).toBeVisible()
    expect(screen.getByText('Enter the owner password for this host.')).toBeVisible()
    expect(screen.queryByText(/session has expired/i)).not.toBeInTheDocument()
  })

  it('fails closed with recovery when the workspace success payload is malformed', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, { available: true, workspaceId: '/private/notes', notes: [], inventory: [] })))

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
    expect(screen.getByText(/invalid workspace response/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
  })

  it('traps drawer focus and restores it to the opener', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace)))
    const user = userEvent.setup()
    render(<App />)
    const opener = await screen.findByTestId('mobile-files')
    await user.click(opener)
    const drawer = screen.getByRole('dialog', { name: 'Files' })
    const close = within(drawer).getByRole('button', { name: 'Close Files' })
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(within(drawer).getByRole('treeitem', { name: /Alpha/ })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(opener).toHaveFocus()
  })

  it('moves one tree tab stop with Arrow, Home, End, Left, and Right', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace)))
    const user = userEvent.setup()
    render(<App />)
    const tree = await screen.findByRole('tree', { name: 'Workspace files' })
    const folder = within(tree).getByRole('treeitem', { name: /Areas/ })
    folder.focus()
    await user.keyboard('{ArrowRight}{ArrowDown}')
    expect(within(tree).getByRole('treeitem', { name: /Alpha/ })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(folder).toHaveFocus()
    await user.keyboard('{End}')
    expect(within(tree).getByRole('treeitem', { name: /Alpha/ })).toHaveFocus()
    expect(within(tree).getAllByRole('treeitem').filter((item) => item.tabIndex === 0)).toHaveLength(1)
  })

  it('keeps search and settings in the file sidebar and uses a single collapse control', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace)))
    const user = userEvent.setup()
    render(<App />)
    const tree = await screen.findByRole('tree', { name: 'Workspace files' })
    const workbench = tree.closest('main')!
    const navigation = screen.getByRole('complementary', { name: 'Workspace navigation' })

    expect(within(navigation).getByRole('searchbox', { name: 'Search notes' })).toBeVisible()
    expect(within(navigation).getByRole('tree', { name: 'Workspace files' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Files' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('navigation', { name: 'App switcher' })).toContainElement(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.queryByRole('button', { name: /Make (Files|Context) pane/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse navigation' }))
    expect(workbench).toHaveClass('navigation-collapsed')
    await user.click(screen.getByRole('button', { name: 'Expand navigation' }))
    expect(workbench).not.toHaveClass('navigation-collapsed')
  })

  it('guards logout with a dirty draft and sends the XSRF token after confirmation', async () => {
    document.cookie = 'XSRF-TOKEN=logout-token'
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Alpha\n', revision: 'rev_alpha', yamlProperties: [], yamlParseError: null }))
      .mockImplementationOnce(() => response(503, { error: { code: 'save_unavailable' } }))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, {}))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(await screen.findByRole('treeitem', { name: /Alpha/ }))
    const editor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(editor); await user.keyboard('{Control>}a{/Control}# Local draft')
    await screen.findByRole('button', { name: 'Retry save' }, { timeout: 2000 })
    await user.click(screen.getAllByRole('button', { name: 'Settings' })[0]!)
    const settings = screen.getByRole('dialog', { name: 'Settings' })
    await user.click(within(settings).getByRole('button', { name: 'Log out' }))
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    await user.click(within(settings).getByRole('button', { name: 'Log out' }))
    expect(await screen.findByText('Enter the owner password for this host.')).toBeVisible()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/auth/logout', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ 'x-xsrf-token': 'logout-token' }),
    }))
  })

  it('presents Settings as a modal dialog and restores focus when it closes', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] })))
    const user = userEvent.setup()
    render(<App />)
    const opener = await screen.findByRole('button', { name: 'Settings' })
    const context = screen.getByRole('complementary', { name: 'Note context' }) as HTMLElement
    context.inert = true
    await user.click(opener)
    const modal = screen.getByRole('dialog', { name: 'Settings' })
    expect(modal).toHaveClass('modal-dialog')
    const close = within(modal).getByRole('button', { name: 'Close Settings' })
    expect(close).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    expect((screen.getByRole('navigation', { name: 'App switcher' }) as HTMLElement).inert).toBe(true)
    const last = within(modal).getByLabelText('Confirm new password')
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(close).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    expect(context.inert).toBe(true)
    expect(opener).toHaveFocus()

    await user.click(opener)
    const reopened = screen.getByRole('dialog', { name: 'Settings' })
    fireEvent.mouseDown(reopened.parentElement!)
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
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

  it('R3-S2 keeps a failed draft visible when Back targets the empty workspace route', async () => {
    window.history.replaceState(null, '', '/?resource=res_alpha')
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, {
        resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Alpha\n',
        revision: 'rev_alpha', yamlProperties: [], yamlParseError: null,
      }))
      .mockImplementationOnce(() => response(500, { error: { code: 'save_failed' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    const view = render(<App />)
    expect(await screen.findByRole('heading', { name: 'Alpha', level: 1 })).toBeVisible()
    const editor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(editor)
    await user.keyboard('{Control>}a{/Control}# Local draft')
    expect(await screen.findByRole('button', { name: 'Retry save' }, { timeout: 2000 })).toBeVisible()

    window.history.replaceState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))

    await waitFor(() => expect(window.location.search).toBe('?resource=res_alpha'))
    expect(screen.getByRole('heading', { name: 'Alpha', level: 1 })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Retry save' })).toBeVisible()
    expect(window.confirm).toHaveBeenCalledOnce()
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
    await waitFor(() => expect(window.location.search).toBe(''))
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

    expect(await screen.findByRole('heading', { name: 'Sign in to AnthraciteMD' })).toBeVisible()
  })

  it('keeps the workspace shell usable when a note success payload is malformed', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, {
        resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Alpha\n',
        revision: 4, yamlProperties: [], yamlParseError: null,
      })))
    const user = userEvent.setup()
    render(<App />)

    const tree = await screen.findByRole('tree', { name: 'Workspace files' })
    await user.click(within(tree).getByRole('treeitem', { name: /Alpha/ }))

    expect(await screen.findByRole('heading', { name: 'Note unavailable' })).toBeVisible()
    expect(tree).toBeVisible()
    expect(window.location.search).toBe('')
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
    const navigation = await screen.findByRole('complementary', { name: 'Workspace navigation' })
    await user.type(within(navigation).getByRole('searchbox', { name: 'Search notes' }), 'launch')
    await user.keyboard('{Enter}')
    await user.click(await within(navigation).findByRole('button', { name: /Roadmap/ }))
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
    const navigation = await screen.findByRole('complementary', { name: 'Workspace navigation' })
    const searchbox = within(navigation).getByRole('searchbox', { name: 'Search notes' })
    await user.type(searchbox, 'missing')
    await user.keyboard('{Enter}')
    expect(await within(navigation).findByText('No notes match “missing”.')).toBeVisible()
    await user.clear(searchbox); await user.type(searchbox, 'broken')
    await user.keyboard('{Enter}')
    expect(await within(navigation).findByRole('button', { name: 'Rebuild index' })).toBeVisible()
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
    const navigation = await screen.findByRole('complementary', { name: 'Workspace navigation' })
    await user.type(within(navigation).getByRole('searchbox'), 'external')
    await user.keyboard('{Enter}')
    await user.click(await within(navigation).findByRole('button', { name: /External/ }))
    expect(await screen.findByRole('heading', { name: 'External', level: 1 })).toBeVisible()
    await waitFor(() => expect(within(navigation).getByRole('treeitem', { name: /External/ })).toHaveAttribute('aria-selected', 'true'))
    expect(window.location.search).toBe('?resource=res_external')
  })

  it('keeps desktop search and files simultaneously present while preserving the query', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] })))
    const user = userEvent.setup(); render(<App />)
    const navigation = await screen.findByRole('complementary', { name: 'Workspace navigation' })

    const searchbox = within(navigation).getByRole('searchbox', { name: 'Search notes' })
    await user.type(searchbox, 'kept query')
    expect(screen.queryByRole('dialog', { name: 'Search' })).not.toBeInTheDocument()
    expect(within(navigation).getByRole('tree', { name: 'Workspace files' })).toBeVisible()
    expect(within(navigation).getByRole('searchbox', { name: 'Search notes' })).toHaveValue('kept query')
  })

  it('turns a malformed search success response into a recoverable local-search error', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { results: [{ resourceId: 'res_alpha', title: 'Alpha' }] })))
    const user = userEvent.setup(); render(<App />)
    const navigation = await screen.findByRole('complementary', { name: 'Workspace navigation' })
    await user.type(within(navigation).getByRole('searchbox'), 'alpha')
    await user.keyboard('{Enter}')

    expect(await within(navigation).findByRole('button', { name: 'Rebuild index' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Your workspace', level: 1 })).toBeVisible()
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
    await waitFor(() => expect(screen.getAllByRole('treeitem').filter((item) => item.tabIndex === 0)).toHaveLength(1))
    const editor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(editor); await user.keyboard('{Control>}a{/Control}# Edited')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/notes/res_renamed', expect.objectContaining({ method: 'PUT' })), { timeout: 2000 })
    expect(screen.queryByText('Reopen the renamed note before editing.')).not.toBeInTheDocument()
  })

  it('S2/R3-S1 rebinds autosave after discarding a failed draft during rename', async () => {
    const renamed = { resourceId: 'res_renamed', displayPath: 'Renamed.md', source: '# Alpha\n', revision: 'rev_renamed', yamlProperties: [], yamlParseError: null }
    const renamedWorkspace = { ...workspace, notes: [{ kind: 'note', resourceId: 'res_renamed', displayPath: 'Renamed.md' }], inventory: [{ kind: 'note', resourceId: 'res_renamed', displayPath: 'Renamed.md' }] }
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Alpha\n', revision: 'rev_alpha', yamlProperties: [], yamlParseError: null }))
      .mockImplementationOnce(() => response(503, { error: { code: 'save_unavailable' } }))
      .mockImplementationOnce(() => response(200, { note: renamed, workspace: renamedWorkspace }))
      .mockImplementationOnce(() => response(200, { ...renamed, source: '# Edited\n', revision: 'rev_saved' }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(await screen.findByRole('treeitem', { name: /Alpha/ }))
    const editor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(editor); await user.keyboard('{Control>}a{/Control}# Failed draft')
    expect(await screen.findByText('Save failed', {}, { timeout: 2000 })).toBeVisible()

    const filename = screen.getByRole('textbox', { name: 'Filename' })
    await user.clear(filename); await user.type(filename, 'Renamed.md'); await user.click(screen.getByRole('button', { name: 'Rename' }))
    await screen.findByRole('heading', { name: 'Renamed', level: 1 })
    const reboundEditor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(reboundEditor); await user.keyboard('{Control>}a{/Control}# Edited')

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/notes/res_renamed', expect.objectContaining({ method: 'PUT' })), { timeout: 2000 })
  })

  it('S2/R3-S1 reloads authoritative source after discarding a conflicted draft during rename', async () => {
    const host = { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Host\n', revision: 'rev_host', yamlProperties: [], yamlParseError: null }
    const renamed = { resourceId: 'res_renamed', displayPath: 'Renamed.md', source: '# Host\n', revision: 'rev_renamed', yamlProperties: [], yamlParseError: null }
    const renamedWorkspace = { ...workspace, notes: [{ kind: 'note', resourceId: 'res_renamed', displayPath: 'Renamed.md' }], inventory: [{ kind: 'note', resourceId: 'res_renamed', displayPath: 'Renamed.md' }] }
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Alpha\n', revision: 'rev_alpha', yamlProperties: [], yamlParseError: null }))
      .mockImplementationOnce(() => response(409, { error: { code: 'revision_conflict' } }))
      .mockImplementationOnce(() => response(200, host))
      .mockImplementationOnce(() => response(200, { note: renamed, workspace: renamedWorkspace }))
      .mockImplementationOnce(() => response(200, { ...renamed, source: '# Edited\n', revision: 'rev_saved' }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(await screen.findByRole('treeitem', { name: /Alpha/ }))
    const filename = screen.getByRole('textbox', { name: 'Filename' })
    await user.clear(filename); await user.type(filename, 'Renamed.md')
    const editor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(editor); await user.keyboard('{Control>}a{/Control}# Conflicted draft')
    fireEvent.submit(screen.getByRole('button', { name: 'Rename' }).closest('form')!)
    await screen.findByRole('heading', { name: 'Renamed', level: 1 })
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/notes/res_alpha/rename', expect.objectContaining({
      body: JSON.stringify({ expectedRevision: 'rev_host', fileName: 'Renamed.md' }),
    }))
    const reboundEditor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(reboundEditor); await user.keyboard('{Control>}a{/Control}# Edited')

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/notes/res_renamed', expect.objectContaining({ method: 'PUT' })), { timeout: 2000 })
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
    const saved = { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Retried', revision: 'rev_saved', yamlProperties: [], yamlParseError: null }
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { ...saved, source: '# Alpha\n', revision: 'rev_alpha' }))
      .mockImplementationOnce(() => response(503, { error: { code: 'save_unavailable' } }))
      .mockImplementationOnce((_url, init) => response(200, {
        ...saved,
        source: JSON.parse(String(init?.body)).source,
      }))
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

  it.each([
    ['another resource', { resourceId: 'res_other', source: '# Edited\n' }],
    ['different source', { resourceId: 'res_alpha', source: '# Host changed\n' }],
  ])('rejects an autosave success response bound to %s', async (_case, mismatch) => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { resourceId: 'res_alpha', displayPath: 'Alpha.md', source: '# Alpha\n', revision: 'rev_alpha', yamlProperties: [], yamlParseError: null }))
      .mockImplementationOnce(() => response(200, { ...mismatch, displayPath: 'Alpha.md', revision: 'rev_other', yamlProperties: [], yamlParseError: null }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(await screen.findByRole('treeitem', { name: /Alpha/ }))
    const editor = view.container.querySelector('.cm-content') as HTMLElement
    await user.click(editor); await user.keyboard('{Control>}a{/Control}# Edited')

    expect(await screen.findByRole('button', { name: 'Retry save' }, { timeout: 2_000 })).toBeVisible()
    expect(screen.getByText('Save failed')).toBeVisible()
  })

  it('clears results for a subsequent failed query and announces a successful rebuild', async () => {
    let finishRebuild!: (response: Response) => void
    const rebuild = new Promise<Response>((resolve) => { finishRebuild = resolve })
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { owner: { id: 'owner' } }))
      .mockImplementationOnce(() => response(200, workspace))
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(200, { results: [{ resourceId: 'res_roadmap', title: 'Roadmap', displayPath: 'Areas/Roadmap.md', snippet: 'First result' }] }))
      .mockImplementationOnce(() => response(503, { error: { code: 'search_unavailable' } }))
      .mockImplementationOnce(() => rebuild)
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup(); render(<App />)
    const navigation = await screen.findByRole('complementary', { name: 'Workspace navigation' })
    const searchbox = within(navigation).getByRole('searchbox')
    await user.type(searchbox, 'roadmap')
    await user.keyboard('{Enter}')
    expect(await within(navigation).findByRole('button', { name: /Roadmap/ })).toBeVisible()

    await user.clear(searchbox); await user.type(searchbox, 'broken')
    await user.keyboard('{Enter}')
    expect(await within(navigation).findByRole('button', { name: 'Rebuild index' })).toBeVisible()
    expect(within(navigation).queryByRole('button', { name: /Roadmap/ })).not.toBeInTheDocument()

    await user.click(within(navigation).getByRole('button', { name: 'Rebuild index' }))
    expect(await within(navigation).findByText('Rebuilding local index…')).toBeVisible()
    finishRebuild(new Response(JSON.stringify({ indexed: 2 }), { status: 200 }))
    expect(await within(navigation).findByRole('status', { name: 'Search index status' })).toHaveTextContent('Index rebuilt. 2 notes indexed.')
  })

  it('AMD-003/S1 R2-S1 mounts and removes only the active declared System Status contribution', async () => {
    const active = { id: 'system-status', status: 'active', manifest: { name: 'System Status', version: '1.0.0', permissions: ['status:read'] }, contributions: { views: [{ id: 'system-status', title: 'System Status', surface: 'context', renderer: 'system-status' }] } }
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
    await user.click(screen.getByRole('button', { name: 'Context' }))
    const context = screen.getByRole('dialog', { name: 'Context' })
    expect(within(context).getByRole('heading', { name: 'Service connected' })).toBeVisible()
    await user.click(within(context).getByRole('button', { name: 'Close Context' }))
    await user.click(screen.getAllByRole('button', { name: 'Settings' })[0]!)
    await user.click(screen.getByRole('tab', { name: 'Plugins' }))
    await user.click(await screen.findByRole('button', { name: 'Disable System Status' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Service connected' })).not.toBeInTheDocument())
  })
})
