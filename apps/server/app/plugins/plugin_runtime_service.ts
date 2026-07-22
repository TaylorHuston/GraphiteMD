import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { lstat, mkdir, open, readFile, readdir, realpath, rename, rm, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

import {
  AssistantModelSessionRequest,
  type AssistantModelSessionRequest as AssistantModelSessionRequestValue,
  type AssistantQuestion,
  type AssistantTurn,
  matchesContract,
} from '@graphitemd/contracts'
import {
  type AssistantQuestionDispatch,
  PluginCapabilityDenied,
  PluginHost,
  type CapabilityProvider,
  type PluginInventoryItem,
  type PluginStateBackend,
} from '@graphitemd/plugin-sdk'
import { assistantPlugin } from '@graphitemd/plugin-assistant'
import { systemStatusPlugin } from '@graphitemd/plugin-system-status'
import { WorkspaceUnavailableError, type ConfiguredWorkspaceAuthority } from '@graphitemd/workspace'

type EnablementDocument = Readonly<{
  schemaVersion: 1
  enabled: Readonly<Record<string, boolean>>
}>

const DEFAULT_ENABLEMENT: EnablementDocument = { schemaVersion: 1, enabled: {} }
const PLUGIN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface AtomicPluginWriteOptions {
  /** Test seam immediately before the temporary file is created. */
  readonly beforeCreate?: () => Promise<void>
  /** Test seam at the last point where an attacker can swap a validated ancestor before commit. */
  readonly beforeCommit?: () => Promise<void>
  /** Authority check that binds every read and mutation to the accepted workspace identity. */
  readonly assertAuthority?: () => Promise<void>
}

type DirectoryIdentity = Readonly<{ canonicalPath: string; device: bigint; inode: bigint }>

async function directoryIdentity(path: string, workspaceRoot: string): Promise<DirectoryIdentity> {
  const metadata = await lstat(path, { bigint: true })
  if (!metadata.isDirectory()) throw new Error('Plugin storage parent is unavailable.')
  const canonicalPath = await realpath(path)
  const expectedCanonicalPath = join(await realpath(workspaceRoot), relative(workspaceRoot, path))
  if (canonicalPath !== expectedCanonicalPath) throw new Error('Plugin storage cannot escape the workspace.')
  return { canonicalPath, device: metadata.dev, inode: metadata.ino }
}

function sameDirectory(left: DirectoryIdentity, right: DirectoryIdentity): boolean {
  return left.canonicalPath === right.canonicalPath && left.device === right.device && left.inode === right.inode
}

async function atomicJsonWrite(
  workspaceRoot: string,
  path: string,
  value: unknown,
  options: AtomicPluginWriteOptions = {},
): Promise<void> {
  await options.assertAuthority?.()
  await ensureConfinedDirectory(workspaceRoot, dirname(path))
  const parent = await directoryIdentity(dirname(path), workspaceRoot)
  await options.beforeCreate?.()
  await options.assertAuthority?.()
  const parentBeforeCreate = await directoryIdentity(dirname(path), workspaceRoot)
  if (!sameDirectory(parent, parentBeforeCreate)) {
    throw new Error('Plugin storage parent changed before creation.')
  }
  const temporary = `${path}.${randomUUID()}.tmp`
  let created = false
  try {
    const handle = await open(
      temporary,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o600,
    )
    created = true
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    await options.beforeCommit?.()
    await options.assertAuthority?.()
    const currentParent = await directoryIdentity(dirname(path), workspaceRoot)
    if (!sameDirectory(parent, currentParent)) {
      // The temporary belongs to the retained directory identity. Avoid resolving
      // its former pathname through an attacker-controlled replacement directory.
      created = false
      throw new Error('Plugin storage parent changed before commit.')
    }
    await rename(temporary, path)
    created = false
    const directory = await open(dirname(path), constants.O_RDONLY)
    try {
      await directory.sync()
    } finally {
      await directory.close()
    }
  } finally {
    if (created) await rm(temporary, { force: true })
  }
}

async function ensureConfinedDirectory(workspaceRoot: string, directory: string): Promise<void> {
  const relativePath = relative(workspaceRoot, directory)
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new Error('Plugin storage cannot escape the workspace.')
  }
  let current = workspaceRoot
  for (const segment of relativePath.split(/[\\/]/)) {
    const next = join(current, segment)
    try {
      await mkdir(next, { mode: 0o700 })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
    await directoryIdentity(next, workspaceRoot)
    current = next
  }
}

async function readJson(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

async function assertNoSymlink(root: string, segments: readonly string[]): Promise<void> {
  let current = root
  for (const segment of segments) {
    current = join(current, segment)
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error('Plugin storage cannot traverse symbolic links.')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return
    }
  }
}

export class PluginEnablementStore {
  readonly #path: string
  #pending: Promise<unknown> = Promise.resolve()

  constructor(private readonly workspaceRoot: string, private readonly options: AtomicPluginWriteOptions = {}) {
    this.#path = join(workspaceRoot, '.graphitemd', 'plugins.json')
  }

  async read(): Promise<EnablementDocument> {
    await this.options.assertAuthority?.()
    await assertNoSymlink(dirname(dirname(this.#path)), ['.graphitemd', 'plugins.json'])
    const value = await readJson(this.#path)
    if (value === undefined) return DEFAULT_ENABLEMENT
    if (typeof value !== 'object' || value === null || Array.isArray(value) ||
        (value as { schemaVersion?: unknown }).schemaVersion !== 1 ||
        typeof (value as { enabled?: unknown }).enabled !== 'object' ||
        (value as { enabled?: unknown }).enabled === null ||
        Array.isArray((value as { enabled?: unknown }).enabled) ||
        !Object.entries((value as { enabled: Record<string, unknown> }).enabled)
          .every(([id, enabled]) => PLUGIN_ID.test(id) && typeof enabled === 'boolean')) {
      throw new Error('Plugin enablement configuration is invalid.')
    }
    return value as EnablementDocument
  }

  async set(id: string, enabled: boolean): Promise<EnablementDocument> {
    if (!PLUGIN_ID.test(id)) throw new Error('Invalid plugin identity.')
    const operation = this.#pending.then(async () => {
      const current = await this.read()
      const replacement = { schemaVersion: 1 as const, enabled: { ...current.enabled, [id]: enabled } }
      await atomicJsonWrite(this.workspaceRoot, this.#path, replacement, this.options)
      return replacement
    })
    this.#pending = operation.catch(() => undefined)
    return operation
  }
}

export class FilesystemPluginStateBackend implements PluginStateBackend {
  readonly #pending = new Map<string, Promise<unknown>>()
  constructor(
    private readonly workspaceRoot: string,
    private readonly options: AtomicPluginWriteOptions = {},
  ) {}

  #statePath(pluginId: string): string {
    if (!PLUGIN_ID.test(pluginId)) throw new Error('Invalid plugin identity.')
    return join(this.workspaceRoot, '.graphitemd', 'plugins', pluginId, 'state.json')
  }

  async read(pluginId: string): Promise<unknown | undefined> {
    await this.options.assertAuthority?.()
    await this.#assertSafe(pluginId)
    await this.recovery(pluginId)
    return readJson(this.#statePath(pluginId))
  }

  async transaction(pluginId: string, value: unknown): Promise<void> {
    await this.options.assertAuthority?.()
    await this.#assertSafe(pluginId)
    const previous = this.#pending.get(pluginId) ?? Promise.resolve()
    const operation = previous.then(() => atomicJsonWrite(this.workspaceRoot, this.#statePath(pluginId), value, this.options))
    this.#pending.set(pluginId, operation.catch(() => undefined))
    await operation
  }

  async recovery(pluginId: string): Promise<'clean' | 'recovered' | 'failed'> {
    await this.options.assertAuthority?.()
    await this.#assertSafe(pluginId)
    const path = this.#statePath(pluginId)
    const directory = dirname(path)
    const retainedDirectory = await directoryIdentity(directory, this.workspaceRoot).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })
    if (!retainedDirectory) return 'clean'
    const base = path.slice(directory.length + 1)
    const candidates = await readdir(directory).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    })
    const temporaryNames = candidates
      .filter((name) => name === `${base}.tmp` || (name.startsWith(`${base}.`) && name.endsWith('.tmp')))
      .sort()
    if (temporaryNames.length === 0) return 'clean'
    if (temporaryNames.length > 1) return 'failed'
    const temporary = join(directory, temporaryNames[0]!)
    try {
      await stat(temporary)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'clean'
      return 'failed'
    }
    try {
      await readJson(temporary)
      await this.options.beforeCommit?.()
      await this.options.assertAuthority?.()
      const currentDirectory = await directoryIdentity(directory, this.workspaceRoot)
      if (!sameDirectory(retainedDirectory, currentDirectory)) return 'failed'
      try {
        await stat(path)
        await rm(temporary)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        await rename(temporary, path)
      }
      return 'recovered'
    } catch {
      return 'failed'
    }
  }

  async #assertSafe(pluginId: string): Promise<void> {
    if (!PLUGIN_ID.test(pluginId)) throw new Error('Invalid plugin identity.')
    await assertNoSymlink(this.workspaceRoot, ['.graphitemd', 'plugins', pluginId])
  }
}

export class PluginRuntimeService {
  readonly #enablement: PluginEnablementStore
  readonly #state: FilesystemPluginStateBackend
  #authorityAccepted = false
  #host?: PluginHost

  constructor(
    workspaceRoot: string,
    private readonly workspace: ConfiguredWorkspaceAuthority,
    private readonly modelSession?: (request: AssistantModelSessionRequestValue) => Promise<Extract<AssistantTurn, { status: 'completed' }>>,
  ) {
    const assertAuthority = async () => {
      const current = await this.workspace.current()
      if (!current.available) {
        throw new WorkspaceUnavailableError(current.reason)
      }
      this.#authorityAccepted = true
    }
    this.#enablement = new PluginEnablementStore(workspaceRoot, { assertAuthority })
    this.#state = new FilesystemPluginStateBackend(workspaceRoot, { assertAuthority })
  }

  async start(): Promise<void> {
    if (!this.#authorityAccepted) {
      const current = await this.workspace.current()
      if (current.available) {
        this.#authorityAccepted = true
      } else {
        await this.workspace.openConfigured()
        this.#authorityAccepted = true
      }
    }
    const configuration = await this.#enablement.read()
    const provider: CapabilityProvider = {
      perform: async (operation) => {
        if (operation.permission === 'status:read' && operation.resource === 'system') {
          const current = await this.workspace.current()
          return { service: 'available', workspace: current.available ? 'available' : 'unavailable' }
        }
        if (operation.permission === 'assistant:model-session' && operation.resource === 'assistant' &&
          this.modelSession && matchesContract(AssistantModelSessionRequest, operation.input)) {
          return this.modelSession(operation.input)
        }
        throw new PluginCapabilityDenied('unavailable')
      },
    }
    this.#host = new PluginHost({
      hostVersion: '1.0.0',
      enabled: configuration.enabled,
      provider,
      stateBackend: this.#state,
    })
    await this.#host.load([systemStatusPlugin, assistantPlugin])
  }

  list(): readonly PluginInventoryItem[] {
    return this.#host?.list() ?? []
  }

  async askAssistant(input: AssistantQuestion): Promise<AssistantQuestionDispatch> {
    const host = this.#host
    if (!host) return { kind: 'unavailable' }
    return host.dispatchAssistantQuestion(input)
  }

  async setEnabled(id: string, enabled: boolean): Promise<PluginInventoryItem> {
    const host = this.#host
    const existing = host?.list().find((plugin) => plugin.id === id)
    if (!host || !existing) throw new Error('Plugin not found.')
    await this.#enablement.set(id, enabled)
    if (enabled) await host.enable(id)
    else await host.disable(id)
    return host.list().find((plugin) => plugin.id === id)!
  }
}
