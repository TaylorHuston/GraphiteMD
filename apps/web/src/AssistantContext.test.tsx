import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssistantContext } from './AssistantContext.js'

function response(status: number, body?: unknown) {
  return Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  }))
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Assistant Context contribution', () => {
  it('AMD-004/S2 R1-S1 keeps the submitted question visible while one grounded turn is in progress', async () => {
    let complete!: (value: Response) => void
    const pending = new Promise<Response>((resolve) => { complete = resolve })
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/v1/assistant/provider') return response(200, { provider: 'openai-codex', status: 'connected', model: 'gpt-5.4' })
      if (url === '/api/v1/assistant/questions') return pending
      return response(404)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<AssistantContext title="Assistant" onSessionExpired={vi.fn()} onOpenSettings={vi.fn()} onOpenNote={vi.fn()} />)

    const input = await screen.findByRole('textbox', { name: 'Ask Codex' })
    await user.type(input, 'What changed?')
    await user.click(screen.getByRole('button', { name: 'Ask Codex' }))
    expect(screen.getByRole('button', { name: 'Asking Codex…' })).toBeDisabled()
    expect(input).toHaveValue('What changed?')
    expect(screen.getByRole('status')).toHaveTextContent('Your question will remain here')
    expect(input.closest('form')).toHaveAttribute('aria-busy', 'true')

    complete(new Response(JSON.stringify({
      turnId: 'turn_alpha', conversationId: 'conv_alpha', status: 'completed', question: 'What changed?', provider: 'openai-codex', model: 'gpt-5.4',
      createdAt: '2026-07-20T00:00:00.000Z', completedAt: '2026-07-20T00:00:01.000Z', answer: 'The launch moved.', error: null,
      sources: [{ resourceId: 'res_alpha', displayPath: 'Notes/Launch.md', revision: 'rev_alpha', excerpt: 'Moved.', truncated: false }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }))

    expect(await screen.findByText('The launch moved.')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Sources used' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Notes/Launch.md' }))
  })

  it('offers a clear Settings path while Codex is disconnected', async () => {
    const openSettings = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => response(200, { provider: 'openai-codex', status: 'disconnected', model: null })))
    const user = userEvent.setup()
    render(<AssistantContext title="Assistant" onSessionExpired={vi.fn()} onOpenSettings={openSettings} onOpenNote={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Open Assistant settings' }))
    expect(openSettings).toHaveBeenCalledOnce()
  })

  it('refreshes provider availability after Assistant settings change', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response(200, { provider: 'openai-codex', status: 'disconnected', model: null }))
      .mockImplementationOnce(() => response(200, { provider: 'openai-codex', status: 'connected', model: 'gpt-5.4' }))
    vi.stubGlobal('fetch', fetchMock)
    const props = { title: 'Assistant', onSessionExpired: vi.fn(), onOpenSettings: vi.fn(), onOpenNote: vi.fn() }
    const view = render(<AssistantContext {...props} providerRevision={0} />)
    expect(await screen.findByRole('button', { name: 'Open Assistant settings' })).toBeVisible()

    view.rerender(<AssistantContext {...props} providerRevision={1} />)
    expect(await screen.findByRole('textbox', { name: 'Ask Codex' })).toBeVisible()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the question available behind an explicit retry action after a recoverable error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url === '/api/v1/assistant/provider') return response(200, { provider: 'openai-codex', status: 'connected', model: 'gpt-5.4' })
      return response(503, { error: { code: 'provider_unavailable', message: 'Codex is temporarily unavailable.' } })
    }))
    const user = userEvent.setup()
    render(<AssistantContext title="Assistant" onSessionExpired={vi.fn()} onOpenSettings={vi.fn()} onOpenNote={vi.fn()} />)

    const input = await screen.findByRole('textbox', { name: 'Ask Codex' })
    await user.type(input, 'Try again')
    await user.click(screen.getByRole('button', { name: 'Ask Codex' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Codex is temporarily unavailable.')
    expect(input).toHaveValue('Try again')
    expect(screen.getByRole('button', { name: 'Retry Codex' })).toBeEnabled()
  })
})
