import { expect, it, vi } from 'vitest'

import { runPluginConformance } from '@graphitemd/plugin-testkit'
import { assistantPlugin, ASSISTANT_CONTEXT_VIEW_ID } from './index.js'

it('GMD-004/S2 R1-S1 declares exactly the bounded Context model-session policy', async () => {
  expect(assistantPlugin.manifest.contributions.views).toEqual([{ id: ASSISTANT_CONTEXT_VIEW_ID, title: 'Assistant', surface: 'context', renderer: 'assistant-conversation' }])
  expect(assistantPlugin.manifest.permissions).toEqual(['assistant:model-session', 'workspace:search', 'workspace:read'])

  const runModelSession = vi.fn(async () => ({
    turnId: 'turn_alpha', conversationId: 'conv_alpha', status: 'completed' as const, question: 'Which note explains GraphiteMD?',
    provider: 'openai-codex' as const, model: 'gpt-5.4', createdAt: '2026-07-20T12:00:00.000Z', completedAt: '2026-07-20T12:00:01.000Z',
    answer: 'The GraphiteMD note does.', error: null, sources: [],
  }))
  let policy: unknown
  let handler: ((input: { question: string; conversationId?: `conv_${string}` }, runner: typeof runModelSession) => Promise<unknown>) | undefined
  await assistantPlugin.activate({
    capabilities: {} as never,
    state: {} as never,
    registerAssistantQuestionHandler(nextPolicy, next) { policy = nextPolicy; handler = next; return () => undefined },
  })

  expect(policy).toEqual({
    prompt: expect.stringContaining('workspace evidence'),
    tools: ['workspace_search', 'workspace_read'],
  })
  await expect(handler?.({ question: 'Which note explains GraphiteMD?' }, runModelSession)).resolves.toMatchObject({ turnId: 'turn_alpha' })
  expect(runModelSession).toHaveBeenCalledWith({
    question: 'Which note explains GraphiteMD?',
    policy: {
      prompt: expect.stringContaining('workspace evidence'),
      tools: ['workspace_search', 'workspace_read'],
    },
  })
})

it('GMD-004/S2 R1-S1 passes shared bundled-plugin conformance', async () => {
  await expect(runPluginConformance(assistantPlugin)).resolves.toEqual({
    manifest: true, lifecycle: true, permissionDenial: true, stateIsolation: true, recovery: true, headless: true,
  })
})
