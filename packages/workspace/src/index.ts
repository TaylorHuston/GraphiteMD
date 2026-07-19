import { createHash, randomUUID } from 'node:crypto'
import { access, link, open, readdir, realpath, rename, stat, unlink } from 'node:fs/promises'
import { constants } from 'node:fs'
import { basename, dirname, join, posix } from 'node:path'
import { isMap, isScalar, parseDocument } from 'yaml'

export type WorkspaceId = `wrk_${string}`
export type ResourceId = `res_${string}`

export interface MarkdownNoteInventoryItem {
  readonly kind: 'note'
  readonly resourceId: ResourceId
  readonly displayPath: string
}

export interface MarkdownFolderInventoryItem {
  readonly kind: 'folder'
  readonly displayPath: string
}

export type MarkdownInventoryItem = MarkdownFolderInventoryItem | MarkdownNoteInventoryItem

export interface WorkspaceSnapshot {
  readonly workspaceId: WorkspaceId
  readonly available: true
  readonly notes: readonly MarkdownNoteInventoryItem[]
  readonly inventory: readonly MarkdownInventoryItem[]
}

export interface UnavailableWorkspaceSnapshot {
  readonly available: false
  readonly reason: 'not_configured' | 'unavailable' | 'identity_changed'
}

export type CurrentWorkspaceSnapshot = WorkspaceSnapshot | UnavailableWorkspaceSnapshot

export interface WorkspaceAuthority {
  openConfigured(): Promise<WorkspaceSnapshot>
  current(): Promise<CurrentWorkspaceSnapshot>
  readNote(resourceId: string): Promise<MarkdownNote>
  saveNote(resourceId: string, expectedRevision: string, source: string): Promise<MarkdownNote>
  renameNote(resourceId: string, expectedRevision: string, fileName: string): Promise<RenameNoteResult>
  refresh(): Promise<WorkspaceSnapshot>
}

export type MarkdownNoteYamlValue =
  | string
  | number
  | boolean
  | null
  | MarkdownNoteYamlValue[]
  | { [key: string]: MarkdownNoteYamlValue }

export interface MarkdownNoteYamlProperty {
  readonly name: string
  readonly value: MarkdownNoteYamlValue
}

export type NoteRevision = `rev_${string}`

export interface MarkdownNote {
  readonly resourceId: ResourceId
  readonly displayPath: string
  readonly source: string
  readonly revision: NoteRevision
  readonly yamlProperties: readonly MarkdownNoteYamlProperty[]
  readonly yamlParseError: string | null
}

export interface RenameNoteResult {
  readonly note: MarkdownNote
  readonly workspace: WorkspaceSnapshot
}

interface FileIdentity {
  readonly device: bigint
  readonly inode: bigint
}

interface OpenWorkspace {
  readonly root: string
  readonly identity: FileIdentity
  readonly snapshot: WorkspaceSnapshot
}

export interface WorkspaceInventoryOptions {
  readonly excludedPaths?: readonly string[]
  readonly maxSourceBytes?: number
}

const DEFAULT_MAX_SOURCE_BYTES = 1024 * 1024

export class WorkspaceUnavailableError extends Error {
  constructor(readonly reason: UnavailableWorkspaceSnapshot['reason']) {
    super('The configured workspace is unavailable.')
    this.name = 'WorkspaceUnavailableError'
  }
}

export class WorkspaceResourceUnavailableError extends Error {
  constructor() {
    super('The requested workspace resource is unavailable.')
    this.name = 'WorkspaceResourceUnavailableError'
  }
}

export class WorkspaceRevisionConflictError extends Error {
  constructor(readonly currentRevision: NoteRevision) {
    super('The note changed after it was opened.')
    this.name = 'WorkspaceRevisionConflictError'
  }
}

export class WorkspaceInvalidMutationError extends Error {
  constructor(readonly code: 'invalid_source' | 'invalid_name' | 'collision' | 'indeterminate') {
    super('The requested note mutation could not be applied.')
    this.name = 'WorkspaceInvalidMutationError'
  }
}

const mutationQueues = new Map<string, Promise<void>>()

/**
 * Owns host filesystem authority while exposing only an opaque browser-safe
 * projection. Note discovery is intentionally added by the confined inventory
 * requirement rather than leaking filesystem handles through this boundary.
 */
export class ConfiguredWorkspaceAuthority implements WorkspaceAuthority {
  #opened: OpenWorkspace | null = null

  readonly #inventoryOptions: Required<WorkspaceInventoryOptions>

  constructor(
    private readonly configuredRoot: string | undefined,
    inventoryOptions: WorkspaceInventoryOptions = {},
  ) {
    this.#inventoryOptions = {
      excludedPaths: normalizeExcludedPaths(inventoryOptions.excludedPaths ?? []),
      maxSourceBytes: inventoryOptions.maxSourceBytes ?? DEFAULT_MAX_SOURCE_BYTES,
    }
  }

  async openConfigured(): Promise<WorkspaceSnapshot> {
    try {
      const opened = await inspectRoot(this.configuredRoot)
      const workspaceId = `wrk_${randomUUID().replaceAll('-', '')}` as WorkspaceId
      const inventory = await inventoryMarkdown(opened.root, workspaceId, this.#inventoryOptions)
      const snapshot: WorkspaceSnapshot = {
        workspaceId,
        available: true,
        notes: inventory.filter((item): item is MarkdownNoteInventoryItem => item.kind === 'note'),
        inventory,
      }
      this.#opened = { ...opened, snapshot }
      return snapshot
    } catch (error) {
      this.#opened = null
      if (error instanceof WorkspaceUnavailableError) throw error
      throw new WorkspaceUnavailableError(this.configuredRoot ? 'unavailable' : 'not_configured')
    }
  }

  async current(): Promise<CurrentWorkspaceSnapshot> {
    if (!this.#opened) {
      return { available: false, reason: this.configuredRoot ? 'unavailable' : 'not_configured' }
    }

    try {
      const current = await inspectRoot(this.configuredRoot)
      if (
        current.root !== this.#opened.root ||
        current.identity.device !== this.#opened.identity.device ||
        current.identity.inode !== this.#opened.identity.inode
      ) {
        this.#opened = null
        return { available: false, reason: 'identity_changed' }
      }
      return this.#opened.snapshot
    } catch {
      this.#opened = null
      return { available: false, reason: 'unavailable' }
    }
  }

  async refresh(): Promise<WorkspaceSnapshot> {
    const current = await this.current()
    if (!current.available) return this.openConfigured()
    const opened = this.#opened
    if (!opened) throw new WorkspaceUnavailableError('unavailable')
    const inventory = await inventoryMarkdown(opened.root, current.workspaceId, this.#inventoryOptions)
    const snapshot: WorkspaceSnapshot = {
      workspaceId: current.workspaceId,
      available: true,
      notes: inventory.filter((item): item is MarkdownNoteInventoryItem => item.kind === 'note'),
      inventory,
    }
    this.#opened = { ...opened, snapshot }
    return snapshot
  }

  async readNote(resourceId: string): Promise<MarkdownNote> {
    const current = await this.current()
    if (!current.available) throw new WorkspaceUnavailableError(current.reason)

    const opened = this.#opened
    const note = current.notes.find((candidate) => candidate.resourceId === resourceId)
    if (!opened || !note) throw new WorkspaceResourceUnavailableError()

    const expectedPath = join(opened.root, ...note.displayPath.split('/'))
    let resolvedPath: string
    try {
      resolvedPath = await realpath(expectedPath)
    } catch {
      throw new WorkspaceResourceUnavailableError()
    }
    if (resolvedPath !== expectedPath) throw new WorkspaceResourceUnavailableError()

    let handle
    try {
      handle = await open(expectedPath, constants.O_RDONLY | constants.O_NOFOLLOW)
      const metadata = await handle.stat()
      if (!metadata.isFile() || metadata.size > this.#inventoryOptions.maxSourceBytes) {
        throw new WorkspaceResourceUnavailableError()
      }
      const bytes = Buffer.alloc(metadata.size)
      const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0)
      if (bytesRead !== metadata.size) throw new WorkspaceResourceUnavailableError()
      const source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
      const yaml = parseMarkdownYamlProperties(source)
      return {
        resourceId: note.resourceId,
        displayPath: note.displayPath,
        source,
        revision: `rev_${createHash('sha256').update(bytes).digest('hex')}`,
        ...yaml,
      }
    } catch (error) {
      if (error instanceof WorkspaceResourceUnavailableError) throw error
      throw new WorkspaceResourceUnavailableError()
    } finally {
      await handle?.close()
    }
  }

  async saveNote(resourceId: string, expectedRevision: string, source: string): Promise<MarkdownNote> {
    if (!isWellFormedUnicode(source) || Buffer.byteLength(source, 'utf8') > this.#inventoryOptions.maxSourceBytes) {
      throw new WorkspaceInvalidMutationError('invalid_source')
    }
    return this.#withIssuedResource(resourceId, async (opened, note, expectedPath) => {
      return withMutationLock(expectedPath, async () => {
        const current = await this.readNote(resourceId)
        if (current.revision !== expectedRevision) {
          throw new WorkspaceRevisionConflictError(current.revision)
        }
        const targetHandle = await open(expectedPath, constants.O_RDONLY | constants.O_NOFOLLOW)
        let mode: number
        try {
          const metadata = await targetHandle.stat()
          if (!metadata.isFile()) throw new WorkspaceResourceUnavailableError()
          mode = metadata.mode & 0o777
        } finally {
          await targetHandle.close()
        }
        const temporaryPath = join(dirname(expectedPath), `.${basename(expectedPath)}.${randomUUID()}.tmp`)
        let temporaryCreated = false
        try {
          const temporary = await open(
            temporaryPath,
            constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
            mode,
          )
          temporaryCreated = true
          try {
            await temporary.writeFile(source, 'utf8')
            await temporary.chmod(mode)
            await temporary.sync()
          } finally {
            await temporary.close()
          }
          const beforeCommit = await this.readNote(resourceId)
          if (beforeCommit.revision !== expectedRevision) {
            throw new WorkspaceRevisionConflictError(beforeCommit.revision)
          }
          await rename(temporaryPath, expectedPath)
          temporaryCreated = false
          return await this.readNote(resourceId)
        } finally {
          if (temporaryCreated) await unlink(temporaryPath).catch(() => undefined)
        }
      })
    })
  }

  async renameNote(
    resourceId: string,
    expectedRevision: string,
    requestedFileName: string,
  ): Promise<RenameNoteResult> {
    const fileName = normalizeMarkdownFileName(requestedFileName)
    return this.#withIssuedResource(resourceId, async (opened, note, sourcePath) => {
      const targetDisplayPath = posix.join(posix.dirname(note.displayPath), fileName)
      if (isExcluded(targetDisplayPath, this.#inventoryOptions.excludedPaths)) {
        throw new WorkspaceInvalidMutationError('invalid_name')
      }
      const targetPath = join(opened.root, ...targetDisplayPath.split('/'))
      return withMutationLocks([sourcePath, targetPath], async () => {
        const current = await this.readNote(resourceId)
        if (current.revision !== expectedRevision) {
          throw new WorkspaceRevisionConflictError(current.revision)
        }
        if (sourcePath === targetPath) return { note: current, workspace: opened.snapshot }
        try {
          await link(sourcePath, targetPath)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            throw new WorkspaceInvalidMutationError('collision')
          }
          throw error
        }
        try {
          await unlink(sourcePath)
        } catch {
          await unlink(targetPath).catch(() => undefined)
          throw new WorkspaceInvalidMutationError('indeterminate')
        }
        const inventory = await inventoryMarkdown(opened.root, opened.snapshot.workspaceId, this.#inventoryOptions)
        const snapshot: WorkspaceSnapshot = {
          available: true,
          workspaceId: opened.snapshot.workspaceId,
          notes: inventory.filter((item): item is MarkdownNoteInventoryItem => item.kind === 'note'),
          inventory,
        }
        this.#opened = { root: opened.root, identity: opened.identity, snapshot }
        const renamedItem = snapshot.notes.find((candidate) => candidate.displayPath === targetDisplayPath)
        if (!renamedItem) throw new WorkspaceInvalidMutationError('indeterminate')
        return { workspace: snapshot, note: await this.readNote(renamedItem.resourceId) }
      })
    })
  }

  async #withIssuedResource<T>(
    resourceId: string,
    operation: (opened: OpenWorkspace, note: MarkdownNoteInventoryItem, expectedPath: string) => Promise<T>,
  ): Promise<T> {
    const current = await this.current()
    if (!current.available) throw new WorkspaceUnavailableError(current.reason)
    const opened = this.#opened
    const note = current.notes.find((candidate) => candidate.resourceId === resourceId)
    if (!opened || !note) throw new WorkspaceResourceUnavailableError()
    const expectedPath = join(opened.root, ...note.displayPath.split('/'))
    let canonicalPath: string
    try {
      canonicalPath = await realpath(expectedPath)
    } catch {
      throw new WorkspaceResourceUnavailableError()
    }
    if (canonicalPath !== expectedPath) throw new WorkspaceResourceUnavailableError()
    return operation(opened, note, expectedPath)
  }
}

function normalizeMarkdownFileName(input: string): string {
  const trimmed = input.trim()
  if (!trimmed || trimmed === '.' || trimmed === '..' || /[\\/]/.test(trimmed)
    || [...trimmed].some((character) => character.charCodeAt(0) < 32)) {
    throw new WorkspaceInvalidMutationError('invalid_name')
  }
  const withExtension = trimmed.toLowerCase().endsWith('.md') ? trimmed : `${trimmed}.md`
  const stem = withExtension.slice(0, -3)
  if (!stem || stem.startsWith('.') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) {
    throw new WorkspaceInvalidMutationError('invalid_name')
  }
  return withExtension
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (next < 0xdc00 || next > 0xdfff) return false
      index += 1
    } else if (code >= 0xdc00 && code <= 0xdfff) return false
  }
  return true
}

async function withMutationLock<T>(path: string, operation: () => Promise<T>): Promise<T> {
  const previous = mutationQueues.get(path) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  const current = previous.then(() => gate)
  mutationQueues.set(path, current)
  await previous
  try {
    return await operation()
  } finally {
    release()
    if (mutationQueues.get(path) === current) mutationQueues.delete(path)
  }
}

async function withMutationLocks<T>(paths: string[], operation: () => Promise<T>): Promise<T> {
  const ordered = [...new Set(paths)].sort()
  const run = async (index: number): Promise<T> => index === ordered.length
    ? operation()
    : withMutationLock(ordered[index]!, () => run(index + 1))
  return run(0)
}

function normalizeYamlValue(value: unknown): MarkdownNoteYamlValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeYamlValue)
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        normalizeYamlValue(nested),
      ]),
    )
  }
  return String(value)
}

function frontmatterBlock(source: string): string | null {
  const opening = /^---[ \t]*(?:\r\n|\r|\n)/.exec(source)
  if (!opening) return null
  const rest = source.slice(opening[0].length)
  const closing = /(?:^|\r\n|\r|\n)---[ \t]*(?:(?:\r\n|\r|\n)|$)/.exec(rest)
  return closing?.index === undefined ? null : rest.slice(0, closing.index)
}

export function parseMarkdownYamlProperties(source: string): {
  yamlProperties: MarkdownNoteYamlProperty[]
  yamlParseError: string | null
} {
  const block = frontmatterBlock(source)
  if (block === null) {
    return /^---[ \t]*(?:\r\n|\r|\n)/.test(source)
      ? { yamlProperties: [], yamlParseError: 'YAML frontmatter is missing a closing delimiter' }
      : { yamlProperties: [], yamlParseError: null }
  }
  if (block.trim() === '') return { yamlProperties: [], yamlParseError: null }

  const document = parseDocument(block.replace(/\r\n|\r/g, '\n'), { prettyErrors: false })
  if (document.errors.length > 0) {
    return {
      yamlProperties: [],
      yamlParseError: document.errors[0]?.message ?? 'Invalid YAML frontmatter',
    }
  }
  if (!isMap(document.contents)) return { yamlProperties: [], yamlParseError: null }
  const parsed = document.toJS() as Record<string, unknown> | null
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { yamlProperties: [], yamlParseError: null }
  }
  return {
    yamlProperties: document.contents.items.map((item) => {
      const key = isScalar(item.key) ? item.key.value : item.key?.toString()
      const name = String(key ?? '')
      return { name, value: normalizeYamlValue(parsed[name]) }
    }),
    yamlParseError: null,
  }
}

async function inventoryMarkdown(
  root: string,
  workspaceId: WorkspaceId,
  options: Required<WorkspaceInventoryOptions>,
): Promise<MarkdownInventoryItem[]> {
  async function visit(directory: string, relativeDirectory: string): Promise<MarkdownInventoryItem[]> {
    const inventory: MarkdownInventoryItem[] = []
    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) return left.isDirectory() ? -1 : 1
      return left.name.localeCompare(right.name, 'en', { sensitivity: 'base', numeric: true })
    })

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const displayPath = relativeDirectory ? posix.join(relativeDirectory, entry.name) : entry.name
      if (isExcluded(displayPath, options.excludedPaths)) continue
      if (entry.isDirectory()) {
        const descendants = await visit(join(directory, entry.name), displayPath)
        if (descendants.length > 0) inventory.push({ kind: 'folder', displayPath }, ...descendants)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        if (!(await isEligibleUtf8Markdown(join(directory, entry.name), options.maxSourceBytes))) continue
        inventory.push({
          kind: 'note',
          displayPath,
          resourceId: `res_${createHash('sha256').update(workspaceId).update('\0').update(displayPath).digest('hex')}`,
        })
      }
    }
    return inventory
  }

  return visit(root, '')
}

function normalizeExcludedPaths(paths: readonly string[]): readonly string[] {
  return ['.graphite', ...paths]
    .map((path) => path.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, ''))
    .filter((path) => path.length > 0 && !posix.isAbsolute(path) && path !== '..' && !path.startsWith('../'))
}

function isExcluded(displayPath: string, excludedPaths: readonly string[]): boolean {
  return excludedPaths.some((excluded) => displayPath === excluded || displayPath.startsWith(`${excluded}/`))
}

async function isEligibleUtf8Markdown(path: string, maxSourceBytes: number): Promise<boolean> {
  let handle
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    const metadata = await handle.stat()
    if (!metadata.isFile() || metadata.size > maxSourceBytes) return false
    const bytes = Buffer.alloc(metadata.size)
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0)
    if (bytesRead !== metadata.size) return false
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    return true
  } catch {
    return false
  } finally {
    await handle?.close()
  }
}

async function inspectRoot(configuredRoot: string | undefined): Promise<Pick<OpenWorkspace, 'root' | 'identity'>> {
  if (!configuredRoot) throw new WorkspaceUnavailableError('not_configured')

  const root = await realpath(configuredRoot)
  const metadata = await stat(root, { bigint: true })
  if (!metadata.isDirectory()) throw new WorkspaceUnavailableError('unavailable')
  await access(root, constants.R_OK)
  return { root, identity: { device: metadata.dev, inode: metadata.ino } }
}
