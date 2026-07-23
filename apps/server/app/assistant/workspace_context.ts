import { Buffer } from 'node:buffer'

import type { AssistantError, AssistantSource } from '@anthracitemd/contracts'
import { WorkspaceResourceUnavailableError, WorkspaceUnavailableError, type ConfiguredWorkspaceAuthority } from '@anthracitemd/workspace'
import { LocalSearchUnavailableError, type LocalSearchResult, type LocalSearchService } from '../search/local_search_service.js'

export class AssistantWorkspaceContextError extends Error {
  constructor(readonly code: Extract<AssistantError['code'], 'workspace_unavailable' | 'context_limit'>) {
    super(code === 'context_limit' ? 'The available workspace evidence exceeded the configured context limit.' : 'The workspace is unavailable.')
    this.name = 'AssistantWorkspaceContextError'
  }
}

export type AssistantRead = Readonly<{ text: string; source: AssistantSource }>

function truncateUtf8(source: string, maximumBytes: number): Readonly<{ text: string; truncated: boolean }> {
  if (Buffer.byteLength(source, 'utf8') <= maximumBytes) return { text: source, truncated: false }
  let bytes = 0
  let text = ''
  for (const character of source) {
    const characterBytes = Buffer.byteLength(character, 'utf8')
    if (bytes + characterBytes > maximumBytes) break
    text += character
    bytes += characterBytes
  }
  return { text, truncated: true }
}

export class AssistantWorkspaceContext {
  readonly #sources = new Map<string, AssistantSource>()
  readonly #searchResults = new Set<string>()
  #totalBytes = 0

  constructor(
    private readonly workspace: ConfiguredWorkspaceAuthority,
    private readonly searchService: LocalSearchService,
    private readonly options: Readonly<{ maxResults?: number; maxSourceBytes?: number; maxTotalBytes?: number }> = {},
  ) {}

  async search(query: string): Promise<readonly LocalSearchResult[]> {
    const normalized = query.trim()
    if (!normalized) return []
    try {
      const results = await this.searchService.search(normalized, this.options.maxResults ?? 5)
      for (const result of results) this.#searchResults.add(result.resourceId)
      return results.map((result) => ({ ...result, snippet: null }))
    } catch (error) {
      if (error instanceof WorkspaceUnavailableError || error instanceof LocalSearchUnavailableError) {
        throw new AssistantWorkspaceContextError('workspace_unavailable')
      }
      throw error
    }
  }

  async read(resourceId: string): Promise<AssistantRead> {
    if (!this.#searchResults.has(resourceId)) throw new AssistantWorkspaceContextError('workspace_unavailable')
    let note
    try {
      note = await this.workspace.readNote(resourceId)
    } catch (error) {
      if (error instanceof WorkspaceUnavailableError || error instanceof WorkspaceResourceUnavailableError) {
        throw new AssistantWorkspaceContextError('workspace_unavailable')
      }
      throw error
    }
    const maximum = Math.min(this.options.maxSourceBytes ?? 12_000, (this.options.maxTotalBytes ?? 40_000) - this.#totalBytes)
    if (maximum <= 0) throw new AssistantWorkspaceContextError('context_limit')
    const excerpt = truncateUtf8(note.source, maximum)
    const text = excerpt.text
    const source: AssistantSource = {
      resourceId: note.resourceId,
      displayPath: note.displayPath,
      revision: note.revision,
      excerpt: text,
      truncated: excerpt.truncated,
    }
    this.#totalBytes += Buffer.byteLength(text, 'utf8')
    this.#sources.set(note.resourceId, source)
    return { text, source }
  }

  sources(): readonly AssistantSource[] {
    return [...this.#sources.values()]
  }
}
