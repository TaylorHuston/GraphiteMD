import { createHash, randomUUID } from 'node:crypto'
import { access, open, readdir, realpath, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join, posix } from 'node:path'

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
