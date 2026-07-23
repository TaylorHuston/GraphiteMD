import { describe, expect, it } from 'vitest'
import { Check } from 'typebox/value'
import {
  AssistantOAuthFlow,
  AssistantModelSessionPolicy,
  AssistantModelSessionRequest,
  AssistantProviderStatus,
  AssistantQuestion,
  AssistantSource,
  AssistantTurn,
  matchesContract,
  MarkdownNoteResponse,
  PluginsResponse,
  SearchResponse,
  WorkspaceId,
  WorkspaceResponse,
  serviceDescriptor,
} from './index.js'

describe('public contracts', () => {
  it('publishes a versioned service identity and opaque workspace IDs', () => {
    expect(serviceDescriptor).toEqual({ name: 'AnthraciteMD', apiVersion: 'v1' })
    expect(Check(WorkspaceId, 'wrk_primary')).toBe(true)
    expect(Check(WorkspaceId, '/Users/taylor/notes')).toBe(false)
  })

  it('validates browser workspace and note responses at runtime', () => {
    expect(matchesContract(WorkspaceResponse, {
      available: true,
      workspaceId: 'wrk_primary',
      notes: [{ kind: 'note', resourceId: 'res_alpha', displayPath: 'Alpha.md' }],
      inventory: [
        { kind: 'folder', displayPath: 'Areas' },
        { kind: 'note', resourceId: 'res_alpha', displayPath: 'Alpha.md' },
      ],
    })).toBe(true)
    expect(matchesContract(WorkspaceResponse, {
      available: true,
      workspaceId: '/Users/taylor/notes',
      notes: [],
      inventory: [],
    })).toBe(false)

    expect(matchesContract(MarkdownNoteResponse, {
      resourceId: 'res_alpha',
      displayPath: 'Alpha.md',
      source: '# Alpha\n',
      revision: 'rev_alpha',
      yamlProperties: [{ name: 'status', value: ['active', null] }],
      yamlParseError: null,
    })).toBe(true)
    expect(matchesContract(MarkdownNoteResponse, {
      resourceId: 'res_alpha',
      displayPath: 'Alpha.md',
      source: '# Alpha\n',
      revision: 4,
      yamlProperties: [],
      yamlParseError: null,
    })).toBe(false)
  })

  it('rejects malformed search and forward-incompatible plugin responses', () => {
    expect(matchesContract(SearchResponse, {
      results: [{ resourceId: 'res_alpha', title: 'Alpha', displayPath: 'Alpha.md', snippet: null }],
    })).toBe(true)
    expect(matchesContract(SearchResponse, { results: [{ resourceId: 'res_alpha', title: 'Alpha' }] })).toBe(false)

    expect(matchesContract(PluginsResponse, {
      plugins: [{ id: 'status', status: 'incompatible', message: 'Requires host 2.', contributions: {} }],
    })).toBe(true)
    expect(matchesContract(PluginsResponse, {
      plugins: [{ id: 'status', status: 'future-state', contributions: {} }],
    })).toBe(false)
  })

  it('normalizes sanitized Assistant provider, OAuth, question, turn, and source payloads', () => {
    expect(matchesContract(AssistantProviderStatus, {
      provider: 'openai-codex', status: 'disconnected', model: null,
    })).toBe(true)
    expect(matchesContract(AssistantProviderStatus, {
      provider: 'openai-codex', status: 'connected', model: 'gpt-5.4', token: 'must-never-cross-this-boundary',
    })).toBe(false)

    expect(matchesContract(AssistantOAuthFlow, {
      flowId: 'flow_alpha', provider: 'openai-codex', status: 'awaiting_input', authorization: null,
      createdAt: '2026-07-19T12:00:00.000Z', updatedAt: '2026-07-19T12:00:01.000Z',
      input: { kind: 'text', label: 'Paste verification code', secret: true, required: true },
      error: null,
    })).toBe(true)
    expect(matchesContract(AssistantOAuthFlow, {
      flowId: 'flow_alpha', provider: 'openai-codex', status: 'awaiting_input', authorization: null,
      createdAt: '2026-07-19T12:00:00.000Z', updatedAt: '2026-07-19T12:00:01.000Z',
      input: { kind: 'text', label: 'Paste verification code', secret: true, required: true },
      error: { code: 'provider_failure', message: 'No credential value here', credential: 'secret' },
    })).toBe(false)

    expect(matchesContract(AssistantQuestion, {
      conversationId: 'conv_alpha', question: 'Which note explains AnthraciteMD?',
    })).toBe(true)
    expect(matchesContract(AssistantSource, {
      resourceId: 'res_alpha', displayPath: 'Notes/AnthraciteMD.md', revision: 'rev_alpha',
      excerpt: 'AnthraciteMD is a service-first workbench.', truncated: false,
    })).toBe(true)
    expect(matchesContract(AssistantTurn, {
      turnId: 'turn_alpha', conversationId: 'conv_alpha', status: 'completed',
      question: 'Which note explains AnthraciteMD?', provider: 'openai-codex', model: 'gpt-5.4',
      createdAt: '2026-07-19T12:00:00.000Z', completedAt: '2026-07-19T12:00:02.000Z',
      answer: 'The AnthraciteMD note does.', error: null,
      sources: [{ resourceId: 'res_alpha', displayPath: 'Notes/AnthraciteMD.md', revision: 'rev_alpha', excerpt: 'AnthraciteMD is a service-first workbench.', truncated: false }],
    })).toBe(true)
  })

  it('fails closed for malformed or non-terminal Assistant turn data', () => {
    expect(matchesContract(AssistantQuestion, { conversationId: '/Users/private', question: 'Where?' })).toBe(false)
    expect(matchesContract(AssistantTurn, {
      turnId: 'turn_alpha', conversationId: 'conv_alpha', status: 'completed', question: 'Where?',
      provider: 'openai-codex', model: 'gpt-5.4', createdAt: '2026-07-19T12:00:00.000Z', completedAt: null,
      answer: 'Some answer', error: null, sources: [],
    })).toBe(false)
  })

  it('AMD-004/S2 R1-S1 accepts only bounded, declared model-session policy', () => {
    expect(matchesContract(AssistantModelSessionPolicy, {
      prompt: 'Answer only from the workspace evidence returned by the declared tools.',
      tools: ['workspace_search', 'workspace_read'],
    })).toBe(true)
    expect(matchesContract(AssistantModelSessionRequest, {
      conversationId: 'conv_alpha', question: 'Which note explains AnthraciteMD?',
      policy: { prompt: 'Ground answers in read notes.', tools: ['workspace_search', 'workspace_read'] },
    })).toBe(true)

    expect(matchesContract(AssistantModelSessionPolicy, { prompt: '   ', tools: ['workspace_search'] })).toBe(false)
    expect(matchesContract(AssistantModelSessionPolicy, { prompt: 'x'.repeat(4_001), tools: ['workspace_search'] })).toBe(false)
    expect(matchesContract(AssistantModelSessionPolicy, { prompt: 'Ground answers.', tools: ['workspace_search', 'workspace_search'] })).toBe(false)
    expect(matchesContract(AssistantModelSessionPolicy, { prompt: 'Ground answers.', tools: ['workspace_search', 'shell'] })).toBe(false)
    expect(matchesContract(AssistantModelSessionRequest, {
      question: 'x'.repeat(4_001), policy: { prompt: 'Ground answers.', tools: ['workspace_search'] },
    })).toBe(false)
  })
})
