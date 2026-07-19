import { describe, expect, it } from 'vitest'
import { Check } from 'typebox/value'
import {
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
    expect(serviceDescriptor).toEqual({ name: 'GraphiteMD', apiVersion: 'v1' })
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
})
