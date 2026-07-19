import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { lstat, mkdir, open, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import {
  PluginCapabilityDenied,
  PluginHost,
  type CapabilityProvider,
  type PluginInventoryItem,
  type PluginStateBackend,
} from '@graphitemd/plugin-sdk'
import { systemStatusPlugin } from '@graphitemd/plugin-system-status'
import type { ConfiguredWorkspaceAuthority } from '@graphitemd/workspace'

type EnablementDocument = Readonly<{
  schemaVersion: 1
  enabled: Readonly<Record<string, boolean>>
}>

const DEFAULT_ENABLEMENT: EnablementDocument = { schemaVersion: 1, enabled: {} }
const PLUGIN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

async function atomicJsonWrite(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
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

  constructor(workspaceRoot: string) {
    this.#path = join(workspaceRoot, '.graphite', 'plugins.json')
  }

  async read(): Promise<EnablementDocument> {
    await assertNoSymlink(dirname(dirname(this.#path)), ['.graphite', 'plugins.json'])
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
      await atomicJsonWrite(this.#path, replacement)
      return replacement
    })
    this.#pending = operation.catch(() => undefined)
    return operation
  }
}

export class FilesystemPluginStateBackend implements PluginStateBackend {
  readonly #pending = new Map<string, Promise<unknown>>()
  constructor(private readonly workspaceRoot: string) {}

  #statePath(pluginId: string): string {
    if (!PLUGIN_ID.test(pluginId)) throw new Error('Invalid plugin identity.')
    return join(this.workspaceRoot, '.graphite', 'plugins', pluginId, 'state.json')
  }

  async read(pluginId: string): Promise<unknown | undefined> {
    await this.#assertSafe(pluginId)
    await this.recovery(pluginId)
    return readJson(this.#statePath(pluginId))
  }

  async transaction(pluginId: string, value: unknown): Promise<void> {
    await this.#assertSafe(pluginId)
    const previous = this.#pending.get(pluginId) ?? Promise.resolve()
    const operation = previous.then(() => atomicJsonWrite(this.#statePath(pluginId), value))
    this.#pending.set(pluginId, operation.catch(() => undefined))
    await operation
  }

  async recovery(pluginId: string): Promise<'clean' | 'recovered' | 'failed'> {
    await this.#assertSafe(pluginId)
    const path = this.#statePath(pluginId)
    const directory = dirname(path)
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
    await assertNoSymlink(this.workspaceRoot, ['.graphite', 'plugins', pluginId])
  }
}

export class PluginRuntimeService {
  readonly #enablement: PluginEnablementStore
  readonly #state: FilesystemPluginStateBackend
  #host?: PluginHost

  constructor(
    workspaceRoot: string,
    private readonly workspace: ConfiguredWorkspaceAuthority,
  ) {
    this.#enablement = new PluginEnablementStore(workspaceRoot)
    this.#state = new FilesystemPluginStateBackend(workspaceRoot)
  }

  async start(): Promise<void> {
    const configuration = await this.#enablement.read()
    const provider: CapabilityProvider = {
      perform: async (operation) => {
        if (operation.permission !== 'status:read' || operation.resource !== 'system') {
          throw new PluginCapabilityDenied('unavailable')
        }
        const current = await this.workspace.current()
        return { service: 'available', workspace: current.available ? 'available' : 'unavailable' }
      },
    }
    this.#host = new PluginHost({
      hostVersion: '1.0.0',
      enabled: configuration.enabled,
      provider,
      stateBackend: this.#state,
    })
    await this.#host.load([systemStatusPlugin])
  }

  list(): readonly PluginInventoryItem[] {
    return this.#host?.list() ?? []
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
