import {
  AssistantQuestion as AssistantQuestionContract,
  AssistantModelSessionRequest,
  AssistantTurn,
  matchesContract,
  type AssistantQuestion as AssistantQuestionValue,
  type AssistantModelSessionRequest as AssistantModelSessionRequestValue,
  type AssistantTurn as AssistantTurnValue,
} from '@graphitemd/contracts'

export const PLUGIN_MANIFEST_SCHEMA_VERSION = 1 as const

export type PluginPermission = `${string}:${string}`
export type PluginContribution = Readonly<{
  id: string
  title: string
  surface?: 'context'
  renderer?: 'assistant-conversation' | 'system-status'
}>
export type PluginContributions = Readonly<{
  commands?: readonly PluginContribution[]
  views?: readonly PluginContribution[]
  tools?: readonly PluginContribution[]
  routes?: readonly PluginContribution[]
  events?: readonly PluginContribution[]
  background?: readonly PluginContribution[]
}>

export type PluginManifest = Readonly<{
  schemaVersion: 1
  id: string
  name: string
  version: string
  compatibility: Readonly<{ host: string }>
  permissions: readonly PluginPermission[]
  dependencies: readonly Readonly<{ id: string; version: string }>[]
  state: Readonly<{ schemaVersion: number }>
  contributions: PluginContributions
}>

export type ManifestValidation =
  | Readonly<{ ok: true; manifest: PluginManifest }>
  | Readonly<{ ok: false; code: 'invalid_manifest' | 'incompatible_host'; message: string }>

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hostCompatible(range: string, hostVersion: string): boolean {
  if (!range.startsWith('^')) return hostVersion === range
  const hostMatch = SEMVER.exec(hostVersion)
  const minimumMatch = SEMVER.exec(range.slice(1))
  if (!hostMatch || !minimumMatch) return false
  const host = hostMatch.slice(1).map(Number) as [number, number, number]
  const minimum = minimumMatch.slice(1).map(Number) as [number, number, number]
  const upper: [number, number, number] = minimum[0] > 0
    ? [minimum[0] + 1, 0, 0]
    : minimum[1] > 0
      ? [0, minimum[1] + 1, 0]
      : [0, 0, minimum[2] + 1]
  const compare = (left: [number, number, number], right: [number, number, number]) =>
    left[0] - right[0] || left[1] - right[1] || left[2] - right[2]
  return compare(host, minimum) >= 0 && compare(host, upper) < 0
}

export function validatePluginManifest(value: unknown, hostVersion: string): ManifestValidation {
  const contributionsValid = isRecord(value) && isRecord(value.contributions) &&
    Object.entries(value.contributions).every(([kind, entries]) =>
      ['commands', 'views', 'tools', 'routes', 'events', 'background'].includes(kind) && Array.isArray(entries) &&
      entries.every((entry) => isRecord(entry) && typeof entry.id === 'string' && IDENTIFIER.test(entry.id) && typeof entry.title === 'string' && entry.title.length > 0 &&
        (entry.surface === undefined || entry.surface === 'context') &&
        (entry.renderer === undefined || entry.renderer === 'assistant-conversation' || entry.renderer === 'system-status')),
    )
  if (!isRecord(value) || value.schemaVersion !== PLUGIN_MANIFEST_SCHEMA_VERSION ||
      typeof value.id !== 'string' || !IDENTIFIER.test(value.id) ||
      typeof value.name !== 'string' || value.name.length === 0 ||
      typeof value.version !== 'string' || !SEMVER.test(value.version) ||
      !isRecord(value.compatibility) || typeof value.compatibility.host !== 'string' ||
      !Array.isArray(value.permissions) || !value.permissions.every((item) => typeof item === 'string' && item.includes(':')) ||
      !Array.isArray(value.dependencies) || !value.dependencies.every((item) => isRecord(item) && typeof item.id === 'string' && IDENTIFIER.test(item.id) && typeof item.version === 'string' && (item.version.startsWith('^') ? SEMVER.test(item.version.slice(1)) : SEMVER.test(item.version))) ||
      !isRecord(value.state) || !Number.isInteger(value.state.schemaVersion) || Number(value.state.schemaVersion) < 1 ||
      !contributionsValid) {
    return { ok: false, code: 'invalid_manifest', message: 'Plugin manifest is invalid.' }
  }
  if (!hostCompatible(value.compatibility.host, hostVersion)) {
    return { ok: false, code: 'incompatible_host', message: `Plugin requires host ${value.compatibility.host}.` }
  }
  return { ok: true, manifest: value as PluginManifest }
}

export type OpaqueResourceId = string & { readonly __opaqueResourceId: unique symbol }
export function resourceId(value: string): OpaqueResourceId {
  if (!value || value.includes('/') || value.includes('\\')) throw new PluginCapabilityDenied('invalid_resource', 'A raw path is not a resource identity.')
  return value as OpaqueResourceId
}

export class PluginCapabilityDenied extends Error {
  readonly code = 'plugin_capability_denied'
  constructor(readonly reason: 'undeclared' | 'invalid_resource' | 'unavailable', message = 'Plugin capability denied.') {
    super(message)
    this.name = 'PluginCapabilityDenied'
  }
}

export type CapabilityOperation = Readonly<{ permission: PluginPermission; resource: OpaqueResourceId; input?: unknown }>
export interface CapabilityProvider { perform(operation: CapabilityOperation): Promise<unknown> }

export function createCapabilityBroker(manifest: PluginManifest, provider: CapabilityProvider) {
  const declared = new Set(manifest.permissions)
  return Object.freeze({
    async perform(operation: CapabilityOperation): Promise<unknown> {
      if (!declared.has(operation.permission)) throw new PluginCapabilityDenied('undeclared')
      if (typeof operation.resource !== 'string' || operation.resource.includes('/') || operation.resource.includes('\\')) {
        throw new PluginCapabilityDenied('invalid_resource', 'A raw path is not a resource identity.')
      }
      try { return await provider.perform(operation) }
      catch (error) {
        if (error instanceof PluginCapabilityDenied) throw error
        throw new PluginCapabilityDenied('unavailable')
      }
    },
  })
}

export interface PluginStateBackend {
  read(pluginId: string): Promise<unknown | undefined>
  transaction(pluginId: string, value: unknown): Promise<void>
  recovery(pluginId: string): Promise<'clean' | 'recovered' | 'failed'>
}

export function createPluginStateAdapter(pluginId: string, schemaVersion: number, backend: PluginStateBackend) {
  if (!IDENTIFIER.test(pluginId)) throw new Error('Invalid plugin identity.')
  return Object.freeze({
    namespace: `.graphitemd/plugins/${pluginId}/`,
    read: async (): Promise<unknown | undefined> => {
      const envelope = await backend.read(pluginId)
      if (envelope === undefined) return undefined
      if (!isRecord(envelope) || envelope.schemaVersion !== schemaVersion || !('value' in envelope)) throw new Error('Plugin state schema mismatch.')
      return envelope.value
    },
    write: (value: unknown): Promise<void> => backend.transaction(pluginId, { schemaVersion, value }),
    recoveryStatus: (): Promise<'clean' | 'recovered' | 'failed'> => backend.recovery(pluginId),
  })
}

export type PluginContext = Readonly<{
  capabilities: ReturnType<typeof createCapabilityBroker>
  state: ReturnType<typeof createPluginStateAdapter>
  registerAssistantQuestionHandler(policy: AssistantModelSessionRequestValue['policy'], handler: AssistantQuestionHandler): () => void
}>
export type AssistantQuestion = AssistantQuestionValue
/** A model-session runner exists only for the duration of a host-dispatched question. */
export type AssistantModelSessionRunner = (request: AssistantModelSessionRequestValue) => Promise<AssistantTurnValue>
export type AssistantQuestionHandler = (input: AssistantQuestionValue, runModelSession: AssistantModelSessionRunner) => Promise<AssistantTurnValue>
export type AssistantQuestionDispatch =
  | Readonly<{ kind: 'handled'; turn: AssistantTurnValue }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'denied' }>
export interface GraphitePlugin {
  manifest: PluginManifest
  activate(context: PluginContext): Promise<void | (() => void | Promise<void>)>
}

export type PluginStatus = 'active' | 'disabled' | 'invalid' | 'incompatible' | 'duplicate' | 'dependency_missing' | 'activation_failed'
export type PluginInventoryItem = Readonly<{ manifest?: PluginManifest; id: string; status: PluginStatus; message?: string; contributions: PluginContributions }>
export interface PluginHostOptions {
  hostVersion: string
  enabled: Readonly<Record<string, boolean>>
  provider: CapabilityProvider
  stateBackend: PluginStateBackend
}

export class PluginHost {
  readonly #inventory = new Map<string, PluginInventoryItem>()
  readonly #plugins = new Map<string, GraphitePlugin>()
  readonly #disposers = new Map<string, () => void | Promise<void>>()
  #assistantQuestionHandler: Readonly<{
    pluginId: string
    capabilities: ReturnType<typeof createCapabilityBroker>
    policy: AssistantModelSessionRequestValue['policy']
    handler: AssistantQuestionHandler
  }> | undefined = undefined
  constructor(private readonly options: PluginHostOptions) {}

  async load(candidates: readonly unknown[]): Promise<void> {
    const identities = candidates.map((candidate) => isRecord(candidate) && isRecord(candidate.manifest) && typeof candidate.manifest.id === 'string' ? candidate.manifest.id : 'unknown')
    const pending = new Set<string>()
    for (const candidate of candidates) {
      const raw = isRecord(candidate) ? candidate.manifest : undefined
      const id = isRecord(raw) && typeof raw.id === 'string' ? raw.id : 'unknown'
      if (identities.filter((identity) => identity === id).length > 1) {
        this.#inventory.set(id, { id, status: 'duplicate', message: 'Duplicate plugin identity.', contributions: {} })
        continue
      }
      const validation = validatePluginManifest(raw, this.options.hostVersion)
      if (!validation.ok) {
        this.#inventory.set(id, { id, status: validation.code === 'incompatible_host' ? 'incompatible' : 'invalid', message: validation.message, contributions: {} })
        continue
      }
      const plugin = candidate as unknown as GraphitePlugin
      this.#plugins.set(id, plugin)
      this.#inventory.set(id, { id, manifest: validation.manifest, status: 'disabled', contributions: {} })
      if (this.options.enabled[id] !== false) pending.add(id)
    }

    while (pending.size > 0) {
      let progressed = false
      for (const id of pending) {
        const plugin = this.#plugins.get(id)!
        const unavailable = plugin.manifest.dependencies.find((dependency) => {
          const item = this.#inventory.get(dependency.id)
          const candidate = this.#plugins.get(dependency.id)
          return !item || !candidate || !hostCompatible(dependency.version, candidate.manifest.version) ||
            this.options.enabled[dependency.id] === false ||
            ['duplicate', 'invalid', 'incompatible', 'activation_failed', 'dependency_missing'].includes(item.status)
        })
        if (unavailable) {
          this.#inventory.set(id, { id, manifest: plugin.manifest, status: 'dependency_missing', message: `Missing or inactive dependency ${unavailable.id}.`, contributions: {} })
          pending.delete(id); progressed = true
          continue
        }
        if (plugin.manifest.dependencies.some((dependency) => this.#inventory.get(dependency.id)?.status !== 'active')) continue
        await this.enable(id)
        pending.delete(id); progressed = true
      }
      if (progressed) continue
      for (const id of pending) {
        const plugin = this.#plugins.get(id)!
        this.#inventory.set(id, { id, manifest: plugin.manifest, status: 'dependency_missing', message: 'Plugin dependency cycle detected.', contributions: {} })
      }
      pending.clear()
    }
  }

  list(): readonly PluginInventoryItem[] { return [...this.#inventory.values()] }

  async enable(id: string): Promise<void> {
    const plugin = this.#plugins.get(id)
    const current = this.#inventory.get(id)
    if (!plugin || !current || (current.status !== 'disabled' && current.status !== 'dependency_missing')) return
    const unavailable = plugin.manifest.dependencies.find((dependency) => {
      const candidate = this.#plugins.get(dependency.id)
      return !candidate || !hostCompatible(dependency.version, candidate.manifest.version) || this.#inventory.get(dependency.id)?.status !== 'active'
    })
    if (unavailable) {
      this.#inventory.set(id, { id, manifest: plugin.manifest, status: 'dependency_missing', message: `Missing or inactive dependency ${unavailable.id}.`, contributions: {} })
      return
    }
    try {
      if (await this.options.stateBackend.recovery(id) === 'failed') {
        throw new Error('Plugin state recovery failed.')
      }
      const capabilities = createCapabilityBroker(plugin.manifest, this.options.provider)
      const activationCapabilities: ReturnType<typeof createCapabilityBroker> = Object.freeze({
        perform: (operation) => operation.permission === 'assistant:model-session'
          ? Promise.reject(new PluginCapabilityDenied('unavailable', 'Model sessions are available only while handling an owner question.'))
          : capabilities.perform(operation),
      })
      const dispose = await plugin.activate({
        capabilities: activationCapabilities,
        state: createPluginStateAdapter(id, plugin.manifest.state.schemaVersion, this.options.stateBackend),
        registerAssistantQuestionHandler: (policy, handler) => this.#registerAssistantQuestionHandler(plugin, capabilities, policy, handler),
      })
      if (dispose) this.#disposers.set(id, dispose)
      this.#inventory.set(id, { id, manifest: plugin.manifest, status: 'active', contributions: plugin.manifest.contributions })
    } catch (error) {
      this.#removeAssistantQuestionHandler(id)
      this.#inventory.set(id, { id, manifest: plugin.manifest, status: 'activation_failed', message: error instanceof Error ? error.message : 'Activation failed.', contributions: {} })
    }
  }

  async disable(id: string): Promise<void> {
    for (const [dependentId, plugin] of this.#plugins) {
      if (this.#inventory.get(dependentId)?.status === 'active' && plugin.manifest.dependencies.some((dependency) => dependency.id === id)) {
        await this.disable(dependentId)
      }
    }
    await this.#disposers.get(id)?.()
    this.#disposers.delete(id)
    this.#removeAssistantQuestionHandler(id)
    const plugin = this.#plugins.get(id)
    this.#inventory.set(id, { id, ...(plugin ? { manifest: plugin.manifest } : {}), status: 'disabled', contributions: {} })
  }

  async dispatchAssistantQuestion(input: AssistantQuestionValue): Promise<AssistantQuestionDispatch> {
    const registered = this.#assistantQuestionHandler
    if (!registered || !matchesContract(AssistantQuestionContract, input) || !input.question.trim()) {
      return registered ? { kind: 'denied' } : { kind: 'unavailable' }
    }
    try {
      let modelTurn: AssistantTurnValue | undefined
      const turn = await registered.handler(input, async (request) => {
        if (modelTurn) throw new PluginCapabilityDenied('unavailable', 'An Assistant handler may start only one model session per question.')
        if (!matchesContract(AssistantModelSessionRequest, request) ||
            request.question !== input.question || request.conversationId !== input.conversationId ||
            !sameModelSessionPolicy(request.policy, registered.policy)) {
          throw new PluginCapabilityDenied('undeclared', 'Assistant handlers may run only their registered policy for the dispatched question.')
        }
        const value = await registered.capabilities.perform({ permission: 'assistant:model-session', resource: resourceId('assistant'), input: request })
        if (!matchesContract(AssistantTurn, value)) throw new PluginCapabilityDenied('unavailable', 'Assistant model session returned an invalid turn.')
        modelTurn = value
        return modelTurn
      })
      return modelTurn && turn === modelTurn ? { kind: 'handled', turn } : { kind: 'unavailable' }
    } catch {
      return { kind: 'unavailable' }
    }
  }

  #registerAssistantQuestionHandler(
    plugin: GraphitePlugin,
    capabilities: ReturnType<typeof createCapabilityBroker>,
    policy: AssistantModelSessionRequestValue['policy'],
    handler: AssistantQuestionHandler,
  ): () => void {
    const hasContextContribution = plugin.manifest.contributions.views?.some((view) =>
      view.id === 'assistant-context' && view.surface === 'context' && view.renderer === 'assistant-conversation') ?? false
    const requiredToolPermissions: Record<AssistantModelSessionRequestValue['policy']['tools'][number], PluginPermission> = {
      workspace_search: 'workspace:search', workspace_read: 'workspace:read',
    }
    if (!hasContextContribution || !matchesContract(AssistantModelSessionRequest, { question: 'policy validation', policy }) ||
        !plugin.manifest.permissions.includes('assistant:model-session') ||
        !policy.tools.every((tool) => plugin.manifest.permissions.includes(requiredToolPermissions[tool]))) {
      throw new PluginCapabilityDenied('undeclared', 'Assistant Context handlers require their declared view and read-only capabilities.')
    }
    if (this.#assistantQuestionHandler) {
      throw new PluginCapabilityDenied('unavailable', 'Only one Assistant Context handler may be active.')
    }
    const registered = { pluginId: plugin.manifest.id, capabilities, policy, handler }
    this.#assistantQuestionHandler = registered
    return () => {
      if (this.#assistantQuestionHandler === registered) this.#assistantQuestionHandler = undefined
    }
  }

  #removeAssistantQuestionHandler(pluginId: string): void {
    if (this.#assistantQuestionHandler?.pluginId === pluginId) this.#assistantQuestionHandler = undefined
  }
}

function sameModelSessionPolicy(left: AssistantModelSessionRequestValue['policy'], right: AssistantModelSessionRequestValue['policy']): boolean {
  return left.prompt === right.prompt && left.tools.length === right.tools.length && left.tools.every((tool, index) => tool === right.tools[index])
}
