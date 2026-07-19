import { randomUUID } from 'node:crypto'
import { access, realpath, stat } from 'node:fs/promises'
import { constants } from 'node:fs'

export type WorkspaceId = `wrk_${string}`

export interface WorkspaceSnapshot {
  readonly workspaceId: WorkspaceId
  readonly available: true
  readonly notes: readonly []
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

  constructor(private readonly configuredRoot: string | undefined) {}

  async openConfigured(): Promise<WorkspaceSnapshot> {
    try {
      const opened = await inspectRoot(this.configuredRoot)
      const snapshot: WorkspaceSnapshot = {
        workspaceId: `wrk_${randomUUID().replaceAll('-', '')}`,
        available: true,
        notes: [],
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

async function inspectRoot(configuredRoot: string | undefined): Promise<Pick<OpenWorkspace, 'root' | 'identity'>> {
  if (!configuredRoot) throw new WorkspaceUnavailableError('not_configured')

  const root = await realpath(configuredRoot)
  const metadata = await stat(root, { bigint: true })
  if (!metadata.isDirectory()) throw new WorkspaceUnavailableError('unavailable')
  await access(root, constants.R_OK)
  return { root, identity: { device: metadata.dev, inode: metadata.ino } }
}
