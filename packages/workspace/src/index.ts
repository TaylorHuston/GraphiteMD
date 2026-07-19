import { createHash, randomUUID } from 'node:crypto'
import { access, link, lstat, mkdir, open, readFile, readdir, realpath, rename, stat, unlink } from 'node:fs/promises'
import { constants } from 'node:fs'
import { basename, dirname, join, posix } from 'node:path'
import type { WorkspaceId } from '@graphitemd/contracts'
import { isMap, isScalar, parseDocument } from 'yaml'

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

interface PendingRename {
  readonly sourcePath: string
  readonly targetPath: string
  readonly targetDisplayPath: string
  readonly expectedRevision: string
  readonly result?: RenameNoteResult
  readonly status?: 'prepared' | 'committed'
}

export interface WorkspaceInventoryOptions {
  readonly excludedPaths?: readonly string[]
  readonly maxSourceBytes?: number
  /** Fault boundary used by deterministic recovery tests after the native rename has committed. */
  readonly afterRenameCommit?: () => Promise<void>
  /** Fault boundary used by deterministic recovery tests after the exclusive link is created. */
  readonly afterRenameLink?: () => Promise<void>
  /** Fault boundary used by deterministic rollback tests immediately before source unlink. */
  readonly beforeSourceUnlink?: () => Promise<void>
  /** Fault boundary used to prove ancestor confinement at the final filesystem commit. */
  readonly beforeMutationCommit?: (context: Readonly<{ operation: 'save' | 'rename' }>) => Promise<void>
}

type NormalizedWorkspaceInventoryOptions = Required<Omit<WorkspaceInventoryOptions, 'afterRenameCommit' | 'afterRenameLink' | 'beforeSourceUnlink' | 'beforeMutationCommit'>>

const DEFAULT_MAX_SOURCE_BYTES = 1024 * 1024
const WORKSPACE_ID = /^wrk_[a-f0-9]{32}$/
const GRAPHITE_GITIGNORE = '/cache/\n/operations/\n'

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
  readonly #pendingRenames = new Map<string, PendingRename>()

  readonly #inventoryOptions: NormalizedWorkspaceInventoryOptions
  readonly #afterRenameCommit: (() => Promise<void>) | undefined
  readonly #afterRenameLink: (() => Promise<void>) | undefined
  readonly #beforeSourceUnlink: (() => Promise<void>) | undefined
  readonly #beforeMutationCommit: WorkspaceInventoryOptions['beforeMutationCommit']

  constructor(
    private readonly configuredRoot: string | undefined,
    inventoryOptions: WorkspaceInventoryOptions = {},
  ) {
    this.#inventoryOptions = {
      excludedPaths: normalizeExcludedPaths(inventoryOptions.excludedPaths ?? []),
      maxSourceBytes: inventoryOptions.maxSourceBytes ?? DEFAULT_MAX_SOURCE_BYTES,
    }
    this.#afterRenameCommit = inventoryOptions.afterRenameCommit
    this.#afterRenameLink = inventoryOptions.afterRenameLink
    this.#beforeSourceUnlink = inventoryOptions.beforeSourceUnlink
    this.#beforeMutationCommit = inventoryOptions.beforeMutationCommit
  }

  async openConfigured(): Promise<WorkspaceSnapshot> {
    try {
      const opened = await inspectRoot(this.configuredRoot)
      const workspaceId = await provisionWorkspaceState(opened.root)
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
        const parentIdentity = await inspectDirectoryIdentity(dirname(expectedPath))
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
          await this.#beforeMutationCommit?.({ operation: 'save' })
          try {
            await assertDirectoryIdentity(dirname(expectedPath), parentIdentity)
          } catch (error) {
            // The temporary file now belongs to the retained directory identity.
            // Do not resolve its former pathname through an attacker-controlled replacement.
            temporaryCreated = false
            throw error
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
    const currentWorkspace = await this.current()
    if (!currentWorkspace.available) throw new WorkspaceUnavailableError(currentWorkspace.reason)
    const opened = this.#opened
    const note = currentWorkspace.notes.find((candidate) => candidate.resourceId === resourceId)
    if (!opened) throw new WorkspaceResourceUnavailableError()
    if (!note) {
      const pending = this.#pendingRenames.get(resourceId) ?? await this.#loadRenameReceipt(opened, resourceId)
      if (!pending || pending.expectedRevision !== expectedRevision || basename(pending.targetPath) !== fileName) {
        throw new WorkspaceResourceUnavailableError()
      }
      return withMutationLocks([pending.sourcePath, pending.targetPath], () => this.#reconcileCommittedRename(
        resourceId,
        opened,
        pending.sourcePath,
        pending.targetPath,
        pending.targetDisplayPath,
        expectedRevision,
      ))
    }
    const sourcePath = join(opened.root, ...note.displayPath.split('/'))
    const targetDisplayPath = posix.join(posix.dirname(note.displayPath), fileName)
    if (isExcluded(targetDisplayPath, this.#inventoryOptions.excludedPaths)) {
      throw new WorkspaceInvalidMutationError('invalid_name')
    }
    const targetPath = join(opened.root, ...targetDisplayPath.split('/'))
    return withMutationLocks([sourcePath, targetPath], async () => {
        const sourceParentIdentity = await inspectDirectoryIdentity(dirname(sourcePath))
        const targetParentIdentity = sourcePath === targetPath
          ? sourceParentIdentity
          : await inspectDirectoryIdentity(dirname(targetPath))
        let current: MarkdownNote
        try {
          current = await this.readNote(resourceId)
        } catch (error) {
          if (!(error instanceof WorkspaceResourceUnavailableError)) throw error
          return this.#reconcileCommittedRename(resourceId, opened, sourcePath, targetPath, targetDisplayPath, expectedRevision)
        }
        if (current.revision !== expectedRevision) {
          throw new WorkspaceRevisionConflictError(current.revision)
        }
        if (sourcePath === targetPath) return { note: current, workspace: opened.snapshot }
        const receipt = await this.#loadRenameReceipt(opened, resourceId)
        if (receipt?.status === 'prepared' && receipt.sourcePath === sourcePath && receipt.targetPath === targetPath &&
            receipt.expectedRevision === expectedRevision) {
          return this.#finishPreparedRename(resourceId, opened, receipt)
        }
        await this.#persistRenameReceipt(opened, resourceId, note.displayPath, targetDisplayPath, expectedRevision, 'prepared')
        this.#pendingRenames.set(resourceId, { sourcePath, targetPath, targetDisplayPath, expectedRevision, status: 'prepared' })
        await this.#beforeMutationCommit?.({ operation: 'rename' })
        await assertDirectoryIdentity(dirname(sourcePath), sourceParentIdentity)
        await assertDirectoryIdentity(dirname(targetPath), targetParentIdentity)
        try {
          await link(sourcePath, targetPath)
        } catch (error) {
          await this.#clearRenameReceipt(opened, resourceId)
          if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            throw new WorkspaceInvalidMutationError('collision')
          }
          throw error
        }
        await this.#afterRenameLink?.()
        try {
          await this.#beforeSourceUnlink?.()
          await unlink(sourcePath)
        } catch {
          let rolledBack = false
          try {
            await unlink(targetPath)
            rolledBack = true
          } catch { /* Retain prepared intent when rollback outcome is not known. */ }
          if (rolledBack) await this.#clearRenameReceipt(opened, resourceId)
          throw new WorkspaceInvalidMutationError('indeterminate')
        }
        await this.#persistRenameReceipt(opened, resourceId, note.displayPath, targetDisplayPath, expectedRevision, 'committed')
        try {
          await this.#afterRenameCommit?.()
        } catch {
          throw new WorkspaceInvalidMutationError('indeterminate')
        }
      const result = await this.#issueRenamedResource(opened, targetDisplayPath, expectedRevision)
      this.#pendingRenames.set(resourceId, { sourcePath, targetPath, targetDisplayPath, expectedRevision, result })
      return result
    })
  }

  async #finishPreparedRename(
    resourceId: string,
    opened: OpenWorkspace,
    pending: PendingRename,
  ): Promise<RenameNoteResult> {
    const sourceParentIdentity = await inspectDirectoryIdentity(dirname(pending.sourcePath))
    const targetParentIdentity = await inspectDirectoryIdentity(dirname(pending.targetPath))
    let source
    let target
    try {
      source = await lstat(pending.sourcePath, { bigint: true })
      target = await lstat(pending.targetPath, { bigint: true })
    } catch {
      throw new WorkspaceInvalidMutationError('indeterminate')
    }
    if (!source.isFile() || !target.isFile() || source.dev !== target.dev || source.ino !== target.ino ||
        await revisionAtPath(pending.targetPath, this.#inventoryOptions.maxSourceBytes) !== pending.expectedRevision) {
      throw new WorkspaceInvalidMutationError('indeterminate')
    }
    await assertDirectoryIdentity(dirname(pending.sourcePath), sourceParentIdentity)
    await assertDirectoryIdentity(dirname(pending.targetPath), targetParentIdentity)
    await unlink(pending.sourcePath)
    await this.#persistRenameReceipt(
      opened,
      resourceId,
      opened.snapshot.notes.find((note) => note.resourceId === resourceId)?.displayPath ?? basename(pending.sourcePath),
      pending.targetDisplayPath,
      pending.expectedRevision,
      'committed',
    )
    this.#pendingRenames.set(resourceId, { ...pending, status: 'committed' })
    return this.#reconcileCommittedRename(
      resourceId, opened, pending.sourcePath, pending.targetPath, pending.targetDisplayPath, pending.expectedRevision,
    )
  }

  async #persistRenameReceipt(
    opened: OpenWorkspace,
    resourceId: string,
    sourceDisplayPath: string,
    targetDisplayPath: string,
    expectedRevision: string,
    status: 'prepared' | 'committed',
  ): Promise<void> {
    if (!/^res_[a-f0-9]{64}$/.test(resourceId)) throw new WorkspaceResourceUnavailableError()
    const directory = join(opened.root, '.graphite', 'operations', 'renames')
    await mkdir(directory, { recursive: true, mode: 0o700 })
    if (await realpath(directory) !== directory) throw new WorkspaceInvalidMutationError('indeterminate')
    await atomicWorkspaceFile(join(directory, `${resourceId}.json`), `${JSON.stringify({
      schemaVersion: 1,
      resourceId,
      sourceDisplayPath,
      targetDisplayPath,
      expectedRevision,
      status,
    }, null, 2)}\n`)
  }

  async #clearRenameReceipt(opened: OpenWorkspace, resourceId: string): Promise<void> {
    if (!/^res_[a-f0-9]{64}$/.test(resourceId)) throw new WorkspaceResourceUnavailableError()
    const receiptPath = join(opened.root, '.graphite', 'operations', 'renames', `${resourceId}.json`)
    try {
      await unlink(receiptPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    this.#pendingRenames.delete(resourceId)
  }

  async #loadRenameReceipt(opened: OpenWorkspace, resourceId: string): Promise<PendingRename | undefined> {
    if (!/^res_[a-f0-9]{64}$/.test(resourceId)) return undefined
    try {
      const value: unknown = JSON.parse(await readFile(
        join(opened.root, '.graphite', 'operations', 'renames', `${resourceId}.json`), 'utf8',
      ))
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
      const receipt = value as Record<string, unknown>
      if (receipt.schemaVersion !== 1 || receipt.resourceId !== resourceId ||
          (receipt.status !== 'prepared' && receipt.status !== 'committed') ||
          typeof receipt.sourceDisplayPath !== 'string' || typeof receipt.targetDisplayPath !== 'string' ||
          typeof receipt.expectedRevision !== 'string' ||
          !isSafeDisplayPath(receipt.sourceDisplayPath) || !isSafeDisplayPath(receipt.targetDisplayPath)) return undefined
      const status = receipt.status as 'prepared' | 'committed'
      const pending: PendingRename = {
        sourcePath: join(opened.root, ...receipt.sourceDisplayPath.split('/')),
        targetPath: join(opened.root, ...receipt.targetDisplayPath.split('/')),
        targetDisplayPath: receipt.targetDisplayPath,
        expectedRevision: receipt.expectedRevision,
        status,
      }
      this.#pendingRenames.set(resourceId, pending)
      return pending
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      return undefined
    }
  }

  async #reconcileCommittedRename(
    resourceId: string,
    opened: OpenWorkspace,
    sourcePath: string,
    targetPath: string,
    targetDisplayPath: string,
    expectedRevision: string,
  ): Promise<RenameNoteResult> {
    const pending = this.#pendingRenames.get(resourceId)
    if (!pending || pending.sourcePath !== sourcePath || pending.targetPath !== targetPath ||
      pending.targetDisplayPath !== targetDisplayPath || pending.expectedRevision !== expectedRevision) {
      throw new WorkspaceResourceUnavailableError()
    }
    try {
      await lstat(sourcePath)
      throw new WorkspaceInvalidMutationError('indeterminate')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        if (error instanceof WorkspaceInvalidMutationError) throw error
        throw new WorkspaceInvalidMutationError('indeterminate')
      }
    }
    let canonicalTarget: string
    try {
      canonicalTarget = await realpath(targetPath)
    } catch {
      throw new WorkspaceInvalidMutationError('indeterminate')
    }
    if (canonicalTarget !== targetPath) throw new WorkspaceInvalidMutationError('indeterminate')
    await revisionAtPath(targetPath, this.#inventoryOptions.maxSourceBytes)
    const result = await this.#issueRenamedResource(opened, targetDisplayPath)
    this.#pendingRenames.set(resourceId, { ...pending, result })
    return result
  }

  async #issueRenamedResource(
    opened: OpenWorkspace,
    targetDisplayPath: string,
    expectedRevision?: string,
  ): Promise<RenameNoteResult> {
    const inventory = await inventoryMarkdown(opened.root, opened.snapshot.workspaceId, this.#inventoryOptions)
    const snapshot: WorkspaceSnapshot = {
      available: true,
      workspaceId: opened.snapshot.workspaceId,
      notes: inventory.filter((item): item is MarkdownNoteInventoryItem => item.kind === 'note'),
      inventory,
    }
    const renamedItem = snapshot.notes.find((candidate) => candidate.displayPath === targetDisplayPath)
    if (!renamedItem) throw new WorkspaceInvalidMutationError('indeterminate')
    this.#opened = { root: opened.root, identity: opened.identity, snapshot }
    try {
      const renamedNote = await this.readNote(renamedItem.resourceId)
      if (expectedRevision && renamedNote.revision !== expectedRevision) throw new WorkspaceInvalidMutationError('indeterminate')
      return { workspace: snapshot, note: renamedNote }
    } catch (error) {
      this.#opened = opened
      throw error
    }
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

async function inspectDirectoryIdentity(path: string): Promise<FileIdentity> {
  if (await realpath(path) !== path) throw new WorkspaceResourceUnavailableError()
  const metadata = await stat(path, { bigint: true })
  if (!metadata.isDirectory()) throw new WorkspaceResourceUnavailableError()
  return { device: metadata.dev, inode: metadata.ino }
}

async function assertDirectoryIdentity(path: string, expected: FileIdentity): Promise<void> {
  const actual = await inspectDirectoryIdentity(path)
  if (actual.device !== expected.device || actual.inode !== expected.inode) {
    throw new WorkspaceResourceUnavailableError()
  }
}

async function provisionWorkspaceState(root: string): Promise<WorkspaceId> {
  const graphite = join(root, '.graphite')
  await mkdir(graphite, { recursive: true, mode: 0o700 })
  if (await realpath(graphite) !== graphite) throw new Error('Workspace state must not traverse symbolic links.')
  const configurationPath = join(graphite, 'workspace.json')
  let workspaceId: WorkspaceId
  try {
    const parsed: unknown = JSON.parse(await readFile(configurationPath, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) ||
        Object.keys(parsed).sort().join(',') !== 'schemaVersion,workspaceId' ||
        (parsed as { schemaVersion?: unknown }).schemaVersion !== 1 ||
        typeof (parsed as { workspaceId?: unknown }).workspaceId !== 'string' ||
        !WORKSPACE_ID.test((parsed as { workspaceId: string }).workspaceId)) {
      throw new Error('Workspace configuration is invalid.')
    }
    workspaceId = (parsed as { workspaceId: WorkspaceId }).workspaceId
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    workspaceId = `wrk_${randomUUID().replaceAll('-', '')}` as WorkspaceId
    await atomicWorkspaceFile(configurationPath, `${JSON.stringify({ schemaVersion: 1, workspaceId }, null, 2)}\n`)
  }
  const ignorePath = join(graphite, '.gitignore')
  try {
    await open(ignorePath, constants.O_RDONLY | constants.O_NOFOLLOW).then((handle) => handle.close())
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    await atomicWorkspaceFile(ignorePath, GRAPHITE_GITIGNORE)
  }
  return workspaceId
}

async function atomicWorkspaceFile(path: string, source: string): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`
  let created = false
  try {
    const handle = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
    created = true
    try {
      await handle.writeFile(source, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temporary, path)
    created = false
  } finally {
    if (created) await unlink(temporary).catch(() => undefined)
  }
}

async function revisionAtPath(path: string, maxSourceBytes: number): Promise<NoteRevision> {
  let handle
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    const metadata = await handle.stat()
    if (!metadata.isFile() || metadata.size > maxSourceBytes) {
      throw new WorkspaceInvalidMutationError('indeterminate')
    }
    const bytes = Buffer.alloc(metadata.size)
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0)
    if (bytesRead !== metadata.size) throw new WorkspaceInvalidMutationError('indeterminate')
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    return `rev_${createHash('sha256').update(bytes).digest('hex')}`
  } catch (error) {
    if (error instanceof WorkspaceInvalidMutationError) throw error
    throw new WorkspaceInvalidMutationError('indeterminate')
  } finally {
    await handle?.close()
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
  options: NormalizedWorkspaceInventoryOptions,
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

function isSafeDisplayPath(value: string): boolean {
  return value.length > 0 && value === value.replaceAll('\\', '/') && !posix.isAbsolute(value) &&
    value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
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
