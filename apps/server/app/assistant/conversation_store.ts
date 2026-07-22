import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdir, open, readFile, readdir, realpath, rename, rm } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'

import { AssistantTurn, matchesContract, type AssistantError, type AssistantTurn as AssistantTurnValue } from '@graphitemd/contracts'
import { WorkspaceUnavailableError, type ConfiguredWorkspaceAuthority } from '@graphitemd/workspace'

const CONVERSATION_ID = /^conv_[a-z0-9]+$/

export type ConversationDocument = Readonly<{
  schemaVersion: 1
  conversationId: string
  turns: readonly AssistantTurnValue[]
}>

export class ConversationStoreError extends Error {
  constructor() {
    super('Assistant conversation state is unavailable.')
    this.name = 'ConversationStoreError'
  }
}

function isDocument(value: unknown): value is ConversationDocument {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const document = value as Partial<ConversationDocument>
  return document.schemaVersion === 1 && typeof document.conversationId === 'string' &&
    CONVERSATION_ID.test(document.conversationId) && Array.isArray(document.turns) &&
    document.turns.every((turn) => matchesContract(AssistantTurn, turn) && turn.conversationId === document.conversationId)
}

/** The workspace-local canonical record. Pi session scratch is never read or used here. */
export class ConversationStore {
  readonly #root: string
  #pending = new Map<string, Promise<unknown>>()

  constructor(workspaceRoot: string, private readonly workspace: ConfiguredWorkspaceAuthority) {
    if (!isAbsolute(workspaceRoot)) throw new ConversationStoreError()
    this.#root = resolve(workspaceRoot)
  }

  async create(turn: Extract<AssistantTurnValue, { status: 'in_progress' }>): Promise<ConversationDocument> {
    return this.#exclusive(turn.conversationId, async () => {
      const path = await this.#path(turn.conversationId)
      try {
        await lstat(path)
        throw new ConversationStoreError()
      } catch (error) {
        if (error instanceof ConversationStoreError) throw error
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new ConversationStoreError()
      }
      const document: ConversationDocument = { schemaVersion: 1, conversationId: turn.conversationId, turns: [turn] }
      await this.#write(path, document)
      return document
    })
  }

  /**
   * Starts the next turn in an existing conversation or creates its first
   * record. Any retained in-progress turn is first recovered so a restart
   * cannot leave the canonical transcript ambiguous.
   */
  async start(turn: Extract<AssistantTurnValue, { status: 'in_progress' }>): Promise<ConversationDocument> {
    return this.#exclusive(turn.conversationId, async () => {
      const path = await this.#path(turn.conversationId)
      try {
        await lstat(path)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          const document: ConversationDocument = { schemaVersion: 1, conversationId: turn.conversationId, turns: [turn] }
          await this.#write(path, document)
          return document
        }
        throw new ConversationStoreError()
      }
      const current = await this.read(turn.conversationId)
      const recovered = current.turns.map((candidate) => candidate.status === 'in_progress' ? {
        ...candidate,
        status: 'failed' as const,
        completedAt: new Date().toISOString(),
        answer: null,
        error: this.#error('interrupted', true),
      } : candidate)
      const document: ConversationDocument = { ...current, turns: [...recovered, turn] }
      await this.#write(path, document)
      return document
    })
  }

  async read(conversationId: string): Promise<ConversationDocument> {
    const path = await this.#path(conversationId)
    let metadata
    try { metadata = await lstat(path) } catch { throw new ConversationStoreError() }
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new ConversationStoreError()
    try {
      const value: unknown = JSON.parse(await readFile(path, 'utf8'))
      if (!isDocument(value) || value.conversationId !== conversationId) throw new ConversationStoreError()
      return value
    } catch (error) {
      if (error instanceof ConversationStoreError) throw error
      throw new ConversationStoreError()
    }
  }

  async replaceTurn(turn: Exclude<AssistantTurnValue, { status: 'in_progress' }>): Promise<ConversationDocument> {
    return this.#exclusive(turn.conversationId, async () => {
      const current = await this.read(turn.conversationId)
      const index = current.turns.findIndex((candidate) => candidate.turnId === turn.turnId)
      if (index < 0 || current.turns[index]?.status !== 'in_progress') throw new ConversationStoreError()
      const replacement: ConversationDocument = { ...current, turns: current.turns.map((candidate, position) => position === index ? turn : candidate) }
      await this.#write(await this.#path(turn.conversationId), replacement)
      return replacement
    })
  }

  async recover(conversationId: string): Promise<ConversationDocument> {
    return this.#exclusive(conversationId, async () => {
      const current = await this.read(conversationId)
      const recovered = current.turns.map((turn) => turn.status === 'in_progress' ? {
        ...turn,
        status: 'failed' as const,
        completedAt: new Date().toISOString(),
        answer: null,
        error: this.#error('interrupted', true),
      } : turn)
      const replacement: ConversationDocument = { ...current, turns: recovered }
      if (recovered.some((turn, index) => turn !== current.turns[index])) await this.#write(await this.#path(conversationId), replacement)
      return replacement
    })
  }

  async recoverAll(): Promise<readonly ConversationDocument[]> {
    await this.#assertAuthority()
    const directory = await this.#directory()
    let entries
    try { entries = await readdir(directory, { withFileTypes: true }) } catch { throw new ConversationStoreError() }
    const ids = entries
      .filter((entry) => entry.isFile() && !entry.isSymbolicLink() && /^conv_[a-z0-9]+\.json$/.test(entry.name))
      .map((entry) => entry.name.slice(0, -'.json'.length))
    return Promise.all(ids.map((conversationId) => this.recover(conversationId)))
  }

  #error(code: Extract<AssistantError['code'], 'interrupted'>, retryable: boolean): AssistantError {
    return { code, message: 'The Assistant request was interrupted before it completed.', retryable }
  }

  async #path(conversationId: string): Promise<string> {
    if (!CONVERSATION_ID.test(conversationId)) throw new ConversationStoreError()
    await this.#assertAuthority()
    const directory = await this.#directory()
    return join(directory, `${conversationId}.json`)
  }

  async #directory(): Promise<string> {
    const graphite = join(this.#root, '.graphitemd')
    const directory = join(graphite, 'conversations')
    for (const path of [graphite, directory]) {
      let metadata
      try { metadata = await lstat(path) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new ConversationStoreError()
        try { await mkdir(path, { mode: 0o700 }) } catch (creationError) {
          if ((creationError as NodeJS.ErrnoException).code !== 'EEXIST') throw new ConversationStoreError()
        }
        try { metadata = await lstat(path) } catch { throw new ConversationStoreError() }
      }
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new ConversationStoreError()
      const expected = join(await realpath(this.#root), relative(this.#root, path))
      if ((await realpath(path)) !== expected) throw new ConversationStoreError()
    }
    return directory
  }

  async #assertAuthority(): Promise<void> {
    try {
      const current = await this.workspace.current()
      if (current.available) return
      await this.workspace.openConfigured()
    } catch (error) {
      if (error instanceof WorkspaceUnavailableError) throw new ConversationStoreError()
      throw error
    }
  }

  async #write(path: string, document: ConversationDocument): Promise<void> {
    const directory = await this.#directory()
    const temporary = join(directory, `.${randomUUID()}.tmp`)
    let created = false
    try {
      const handle = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
      created = true
      try { await handle.writeFile(`${JSON.stringify(document, null, 2)}\n`, 'utf8'); await handle.sync() } finally { await handle.close() }
      await this.#assertAuthority()
      await this.#directory()
      await rename(temporary, path)
      created = false
    } catch (error) {
      if (error instanceof ConversationStoreError) throw error
      throw new ConversationStoreError()
    } finally {
      if (created) await rm(temporary, { force: true })
    }
  }

  async #exclusive<T>(conversationId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.#pending.get(conversationId) ?? Promise.resolve()
    const current = previous.then(operation)
    this.#pending.set(conversationId, current.catch(() => undefined))
    return current
  }
}
