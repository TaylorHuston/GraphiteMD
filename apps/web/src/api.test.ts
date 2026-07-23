import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { WorkspaceResponse } from '@anthracitemd/contracts'
import { InvalidApiResponseError, requestJson } from './api.js'

afterEach(() => vi.unstubAllGlobals())

describe('validated browser API adapter', () => {
  it('returns a validated successful response and preserves status metadata', async () => {
    const payload = { available: true, workspaceId: 'wrk_primary', notes: [], inventory: [] }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await requestJson('/api/v1/workspace', WorkspaceResponse)

    expect(result).toEqual(expect.objectContaining({ ok: true, status: 200, data: payload }))
    if (result.ok) expectTypeOf(result.data.workspaceId).toEqualTypeOf<string>()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/workspace', expect.objectContaining({ credentials: 'same-origin' }))
  })

  it('rejects malformed and non-JSON success bodies at the response boundary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ available: true, workspaceId: '/private/notes', notes: [], inventory: [] }), { status: 200 }),
    ).mockResolvedValueOnce(new Response('<html>proxy error</html>', { status: 200 })))

    await expect(requestJson('/api/v1/workspace', WorkspaceResponse)).rejects.toBeInstanceOf(InvalidApiResponseError)
    await expect(requestJson('/api/v1/workspace', WorkspaceResponse)).rejects.toBeInstanceOf(InvalidApiResponseError)
  })

  it('does not parse an unsuccessful response as successful data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'workspace_unavailable' } }), { status: 503 })))

    const result = await requestJson('/api/v1/workspace', WorkspaceResponse)

    expect(result).toEqual(expect.objectContaining({ ok: false, status: 503 }))
  })
})
