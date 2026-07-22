import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SettingsPanel } from './SettingsPanel.js'

function response(status: number, body?: unknown) {
  return Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  }))
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('owner Settings', () => {
  it('navigates between settings areas without leaving the modal content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => response(200, { plugins: [] })))
    const user = userEvent.setup()
    render(<SettingsPanel onSessionExpired={vi.fn()} />)

    const areas = screen.getByRole('tablist', { name: 'Settings areas' })
    expect(within(areas).getByRole('tab', { name: 'Account' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Change password' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Bundled plugins' })).not.toBeInTheDocument()

    await user.click(within(areas).getByRole('tab', { name: 'Plugins' }))
    expect(screen.getByRole('heading', { name: 'Bundled plugins' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Change password' })).not.toBeInTheDocument()

    await user.keyboard('{Home}')
    expect(within(areas).getByRole('tab', { name: 'Account' })).toHaveFocus()
    expect(within(areas).getByRole('tab', { name: 'Account' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(within(areas).getByRole('tab', { name: 'Assistant' })).toHaveFocus()
    expect(within(areas).getByRole('tab', { name: 'Assistant' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(within(areas).getByRole('tab', { name: 'Plugins' })).toHaveFocus()
    expect(within(areas).getByRole('tab', { name: 'Plugins' })).toHaveAttribute('aria-selected', 'true')
  })

  it('announces horizontal settings navigation in the narrow layout', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => response(200, { plugins: [] })))

    render(<SettingsPanel onSessionExpired={vi.fn()} />)

    expect(screen.getByRole('tablist', { name: 'Settings areas' })).toHaveAttribute('aria-orientation', 'horizontal')
  })

  it('GMD-004/S1 R1-S2a makes the OAuth choice and continuation action explicit', async () => {
    const flow = {
      flowId: 'flow_choice', provider: 'openai-codex', status: 'awaiting_input',
      createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-20T12:00:00.000Z',
      input: {
        kind: 'selection', label: 'Select an authorization option', required: true,
        options: [{ id: 'browser', label: 'Browser login' }, { id: 'device', label: 'Use a device code' }],
      }, authorization: null, error: null,
    }
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/v1/plugins') return response(200, { plugins: [] })
      if (url === '/api/v1/assistant/provider') return response(200, { provider: 'openai-codex', status: 'disconnected', model: null })
      if (url === '/api/v1/assistant/oauth' && init?.method === 'POST') return response(200, flow)
      if (url === '/api/v1/assistant/oauth/flow_choice/answer') return response(200, flow)
      if (url === '/api/v1/assistant/oauth/flow_choice/cancel') return response(200, { ...flow, status: 'cancelled', input: null })
      return response(404)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<SettingsPanel onSessionExpired={vi.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'Assistant' }))
    await user.click(await screen.findByRole('button', { name: 'Connect Codex' }))

    const choices = await screen.findByRole('group', { name: 'Choose how to connect' })
    expect(within(choices).getByRole('radio', { name: 'Browser login' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Continue with Browser login' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Cancel connection' })).toBeVisible()

    await user.click(within(choices).getByRole('radio', { name: 'Use a device code' }))
    await user.click(screen.getByRole('button', { name: 'Continue with Use a device code' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/assistant/oauth/flow_choice/answer', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ value: 'device' }),
    }))
  })

  it('GMD-004/S1 R1-S2 restores an active OAuth choice after Settings remounts', async () => {
    const flow = {
      flowId: 'flow_recover', provider: 'openai-codex', status: 'awaiting_input',
      createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-20T12:00:00.000Z',
      input: {
        kind: 'selection', label: 'Select an authorization option', required: true,
        options: [{ id: 'browser', label: 'Browser login (default)' }],
      }, authorization: null, error: null,
    }
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/v1/plugins') return response(200, { plugins: [] })
      if (url === '/api/v1/assistant/provider') return response(200, { provider: 'openai-codex', status: 'connecting', model: null })
      if (url === '/api/v1/assistant/oauth/active') return response(200, flow)
      return response(404)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<SettingsPanel onSessionExpired={vi.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'Assistant' }))

    expect(await screen.findByRole('group', { name: 'Choose how to connect' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue with Browser login (default)' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Connect Codex' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/assistant/oauth/active', expect.objectContaining({ credentials: 'same-origin' }))
  })

  it('GMD-004/S1 R1-S1 presents Pi’s browser authorization link before the manual fallback', async () => {
    const flow = {
      flowId: 'flow_browser', provider: 'openai-codex', status: 'awaiting_input',
      createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-20T12:00:00.000Z',
      authorization: { url: 'https://auth.example.test/authorize', instructions: 'Complete login in your browser.' },
      input: { kind: 'text', label: 'Authorization response', secret: true, required: true }, error: null,
    }
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url === '/api/v1/plugins') return response(200, { plugins: [] })
      if (url === '/api/v1/assistant/provider') return response(200, { provider: 'openai-codex', status: 'connecting', model: null })
      if (url === '/api/v1/assistant/oauth/active') return response(200, flow)
      return response(404)
    }))
    const user = userEvent.setup()
    render(<SettingsPanel onSessionExpired={vi.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'Assistant' }))

    const login = await screen.findByRole('link', { name: 'Open secure OpenAI login' })
    expect(login).toHaveAttribute('href', 'https://auth.example.test/authorize')
    expect(login).toHaveAttribute('target', '_blank')
    expect(screen.getByText('Complete login in your browser.')).toBeVisible()
    expect(screen.getByLabelText('Authorization response')).toBeVisible()
    expect(screen.getByText('Status: connecting.')).toBeVisible()
  })

  it('GMD-001/S2 R1 changes a confirmed password and returns to sign in', async () => {
    document.cookie = 'XSRF-TOKEN=settings-token'
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { plugins: [] }))
      .mockImplementationOnce(() => response(204))
    vi.stubGlobal('fetch', fetchMock)
    const expired = vi.fn()
    const user = userEvent.setup()
    render(<SettingsPanel onSessionExpired={expired} />)

    await user.type(screen.getByLabelText('Current password'), 'old secret')
    await user.type(screen.getByLabelText('New password'), 'new secret')
    await user.type(screen.getByLabelText('Confirm new password'), 'new secret')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    await waitFor(() => expect(expired).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/auth/password', expect.objectContaining({
      method: 'PUT', credentials: 'same-origin',
      headers: expect.objectContaining({ 'x-xsrf-token': 'settings-token' }),
      body: JSON.stringify({ currentPassword: 'old secret', password: 'new secret' }),
    }))
  })

  it('rejects mismatched confirmation locally without transmitting credentials', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(() => response(200, { plugins: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<SettingsPanel onSessionExpired={vi.fn()} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

    await user.type(screen.getByLabelText('Current password'), 'old')
    await user.type(screen.getByLabelText('New password'), 'first')
    await user.type(screen.getByLabelText('Confirm new password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(screen.getByRole('alert')).toHaveTextContent('New passwords do not match.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('GMD-003/S1 presents inventory, status, permissions, and active contributions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => response(200, { plugins: [{
      id: 'system-status', status: 'active',
      manifest: { name: 'System Status', version: '0.1.0', permissions: ['workspace:read'] },
      contributions: { views: [{ id: 'status', title: 'System status' }], commands: [{ id: 'refresh', title: 'Refresh status' }] },
    }] })))
    const user = userEvent.setup()
    render(<SettingsPanel onSessionExpired={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: 'Plugins' }))

    const plugin = await screen.findByRole('article', { name: 'System Status plugin' })
    expect(within(plugin).getByText('Active')).toBeVisible()
    expect(within(plugin).getByText('workspace:read')).toBeVisible()
    expect(within(plugin).getByText('View: System status')).toBeVisible()
    expect(within(plugin).getByText('Command: Refresh status')).toBeVisible()
    expect(within(plugin).getByRole('button', { name: 'Disable System Status' })).toBeEnabled()
  })

  it('recovers when the plugin inventory success payload has an unsupported status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => response(200, {
      plugins: [{ id: 'system-status', status: 'future-state', contributions: {} }],
    })))

    const user = userEvent.setup()
    render(<SettingsPanel onSessionExpired={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: 'Plugins' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Plugin status is unavailable.')
    expect(screen.getByRole('heading', { name: 'Bundled plugins' })).toBeVisible()
  })

  it('persists enablement, reflects removed contributions, and handles an expired session', async () => {
    document.cookie = 'XSRF-TOKEN=plugin-token'
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { plugins: [{ id: 'system-status', status: 'active', manifest: { name: 'System Status', version: '0.1.0', permissions: [] }, contributions: { views: [{ id: 'status', title: 'System status' }] } }] }))
      .mockImplementationOnce(() => response(200, { plugin: { id: 'system-status', status: 'disabled', manifest: { name: 'System Status', version: '0.1.0', permissions: [] }, contributions: {} } }))
      .mockImplementationOnce(() => response(401, { error: { code: 'unauthenticated' } }))
    vi.stubGlobal('fetch', fetchMock)
    const expired = vi.fn()
    const user = userEvent.setup()
    render(<SettingsPanel onSessionExpired={expired} />)
    await user.click(screen.getByRole('tab', { name: 'Plugins' }))

    await user.click(await screen.findByRole('button', { name: 'Disable System Status' }))
    expect(await screen.findByText('Disabled')).toBeVisible()
    expect(screen.getByText('No active contributions.')).toBeVisible()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/plugins/system-status', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ enabled: false }),
      headers: expect.objectContaining({ 'x-xsrf-token': 'plugin-token' }),
    }))

    await user.click(screen.getByRole('button', { name: 'Enable System Status' }))
    await waitFor(() => expect(expired).toHaveBeenCalledOnce())
  })
})
