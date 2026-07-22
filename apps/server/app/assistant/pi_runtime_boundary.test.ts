import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

const pi = vi.hoisted(() => {
  const calls: { options?: Record<string, unknown>; prompt?: [string, Record<string, unknown>]; unsubscribed: number; disposed: number } = {
    unsubscribed: 0, disposed: 0,
  }
  const session = {
    subscribe: vi.fn((listener: (event: unknown) => void) => {
      session.listener = listener
      return () => { calls.unsubscribed += 1 }
    }),
    prompt: vi.fn(async (question: string, options: Record<string, unknown>) => {
      calls.prompt = [question, options]
      session.listener?.({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'Grounded answer.' } })
    }),
    dispose: vi.fn(() => { calls.disposed += 1 }),
    listener: undefined as ((event: unknown) => void) | undefined,
  }
  return {
    calls,
    session,
    createAgentSession: vi.fn(async (options: Record<string, unknown>) => {
      calls.options = options
      return { session }
    }),
    settingsInMemory: vi.fn(() => ({ scope: 'memory' })),
    sessionsInMemory: vi.fn(() => ({ scope: 'memory' })),
    resourceOptions: undefined as Record<string, unknown> | undefined,
    reload: vi.fn(async () => undefined),
  }
})

vi.mock('@earendil-works/pi-coding-agent', () => {
  class DefaultResourceLoader {
    constructor(options: Record<string, unknown>) { pi.resourceOptions = options }
    reload = pi.reload
  }
  return {
    AuthStorage: { create: vi.fn(() => ({ getOAuthProviders: () => [], getAuthStatus: () => ({ configured: false }), logout: vi.fn() })) },
    ModelRegistry: { create: vi.fn(() => ({ find: vi.fn(() => ({ id: 'gpt-5.4' })) })) },
    SettingsManager: { inMemory: pi.settingsInMemory },
    SessionManager: { inMemory: pi.sessionsInMemory },
    DefaultResourceLoader,
    createAgentSession: pi.createAgentSession,
    defineTool: (definition: Record<string, unknown>) => definition,
  }
})

import { PiModelSessionRuntime, PiRuntimeBoundary } from './index.js'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  vi.clearAllMocks()
  pi.calls.options = undefined
  pi.calls.prompt = undefined
  pi.calls.unsubscribed = 0
  pi.calls.disposed = 0
  pi.resourceOptions = undefined
  pi.session.listener = undefined
})

describe('GMD-004/S2 R1 Pi restricted model sessions', () => {
  it('constructs one ephemeral allowlisted session and disposes it after the answer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'graphitemd-pi-runtime-'))
    roots.push(root)
    const boundary = await PiRuntimeBoundary.create(join(root, 'state'), undefined)
    const runtime = new PiModelSessionRuntime(boundary, join(root, 'workspace'))

    await expect(runtime.run({
      question: 'What changed?',
      policy: { prompt: 'Use workspace evidence only.', tools: ['workspace_search'] },
      tools: { search: async () => [], read: async () => ({ text: 'unused' }) },
    })).resolves.toBe('Grounded answer.')

    expect(pi.settingsInMemory).toHaveBeenCalledOnce()
    expect(pi.sessionsInMemory).toHaveBeenCalledOnce()
    expect(pi.resourceOptions).toMatchObject({
      cwd: join(root, 'workspace'), noExtensions: true, noSkills: true, noPromptTemplates: true,
      noThemes: true, noContextFiles: true, systemPrompt: 'Use workspace evidence only.',
    })
    expect(pi.reload).toHaveBeenCalledOnce()
    expect(pi.calls.options).toMatchObject({ tools: ['workspace_search'], sessionManager: { scope: 'memory' }, settingsManager: { scope: 'memory' } })
    expect(pi.calls.options?.customTools).toEqual([expect.objectContaining({ name: 'workspace_search' })])
    expect(pi.calls.prompt).toEqual(['What changed?', { expandPromptTemplates: false }])
    expect(pi.calls.unsubscribed).toBe(1)
    expect(pi.calls.disposed).toBe(1)
  })
})
