import { randomUUID } from 'node:crypto'
import { chmod, lstat, mkdir, stat } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  type AgentSession,
  type AgentSessionEvent,
  type ToolDefinition,
  defineTool,
} from '@earendil-works/pi-coding-agent'
import { Type } from 'typebox'
import { anthraciteEnvironmentValue } from '../../config/environment.js'
import type {
  AssistantError,
  AssistantFlowId,
  AssistantModelSessionPolicy,
  AssistantOAuthFlow,
  AssistantOAuthInput,
  AssistantProviderStatus,
} from '@anthracitemd/contracts'
import { assertMachineLocalStateDirectory } from '../security/owner_setup_service.js'

export const OPENAI_CODEX_PROVIDER = 'openai-codex' as const
export const DEFAULT_OPENAI_CODEX_MODEL = 'gpt-5.4' as const

const TERMINAL_FLOW_STATUSES = new Set<AssistantOAuthFlow['status']>([
  'succeeded',
  'failed',
  'cancelled',
])

export type PiOAuthCallbacks = Readonly<{
  onAuth: (info: Readonly<{ url: string; instructions?: string }>) => void
  onDeviceCode: (info: Readonly<{ verificationUri: string; userCode: string }>) => void
  onPrompt: (prompt: Readonly<{ message: string; placeholder?: string; allowEmpty?: boolean }>) => Promise<string>
  onProgress?: (message: string) => void
  onManualCodeInput?: () => Promise<string>
  onSelect: (prompt: Readonly<{ message: string; options: readonly Readonly<{ id: string; label: string }>[] }>) => Promise<string | undefined>
}>

export interface PiOAuthRuntime {
  providerStatus(): Promise<Readonly<{ oauthAvailable: boolean; configured: boolean }>>
  login(callbacks: PiOAuthCallbacks, signal?: AbortSignal): Promise<void>
  logout(): Promise<void>
}

export type PiStatePaths = Readonly<{
  root: string
  auth: string
  models: string
  settings: string
  sessions: string
}>

async function ensurePrivateDirectory(path: string): Promise<void> {
  try {
    const metadata = await lstat(path)
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error('Assistant state directory is unavailable.')
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    await mkdir(path, { recursive: true, mode: 0o700 })
  }
  await chmod(path, 0o700)
  const mode = (await stat(path)).mode & 0o777
  if (mode !== 0o700) throw new Error('Assistant state directory permissions are unsafe.')
}

async function ensurePrivateCredential(path: string): Promise<void> {
  try {
    const metadata = await lstat(path)
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error('Assistant credential state is unavailable.')
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  await chmod(path, 0o600)
  if (((await stat(path)).mode & 0o777) !== 0o600) {
    throw new Error('Assistant credential permissions are unsafe.')
  }
}

/**
 * The only server-owned bridge to Pi. Its paths intentionally never derive
 * from a workspace root, plugin state, browser request, or conversation.
 */
export class PiRuntimeBoundary implements PiOAuthRuntime {
  readonly paths: PiStatePaths
  readonly #authStorage: AuthStorage
  readonly #modelRegistry: ModelRegistry

  private constructor(paths: PiStatePaths) {
    this.paths = paths
    this.#authStorage = AuthStorage.create(paths.auth)
    this.#modelRegistry = ModelRegistry.create(this.#authStorage, paths.models)
  }

  static async create(stateDirectory: string, workspaceRoot = anthraciteEnvironmentValue(process.env, 'WORKSPACE_ROOT')): Promise<PiRuntimeBoundary> {
    if (!isAbsolute(stateDirectory)) {
      throw new Error('Assistant state directory must be an absolute path.')
    }
    const stateRoot = resolve(stateDirectory)
    await assertMachineLocalStateDirectory(stateRoot, workspaceRoot)
    const root = join(stateRoot, 'assistant', 'pi')
    const paths: PiStatePaths = {
      root,
      auth: join(root, 'auth.json'),
      models: join(root, 'models.json'),
      settings: join(root, 'settings.json'),
      sessions: join(root, 'sessions'),
    }
    await ensurePrivateDirectory(stateRoot)
    await ensurePrivateDirectory(join(stateRoot, 'assistant'))
    await ensurePrivateDirectory(root)
    await ensurePrivateDirectory(paths.sessions)
    return new PiRuntimeBoundary(paths)
  }

  async assertProtectedState(): Promise<void> {
    await ensurePrivateDirectory(this.paths.root)
    await ensurePrivateDirectory(this.paths.sessions)
    await ensurePrivateCredential(this.paths.auth)
  }

  async providerStatus(): Promise<Readonly<{ oauthAvailable: boolean; configured: boolean }>> {
    await this.assertProtectedState()
    const oauthAvailable = this.#authStorage.getOAuthProviders().some(({ id }) => id === OPENAI_CODEX_PROVIDER)
    return {
      oauthAvailable,
      configured: this.#authStorage.getAuthStatus(OPENAI_CODEX_PROVIDER).configured,
    }
  }

  async login(callbacks: PiOAuthCallbacks, signal?: AbortSignal): Promise<void> {
    if (!(await this.providerStatus()).oauthAvailable) {
      throw new Error('The embedded Pi SDK does not expose OpenAI Codex OAuth.')
    }
    await this.#authStorage.login(
      OPENAI_CODEX_PROVIDER,
      callbacks as unknown as Parameters<AuthStorage['login']>[1],
    )
    if (signal?.aborted) {
      this.#authStorage.logout(OPENAI_CODEX_PROVIDER)
      await this.assertProtectedState()
      throw new AssistantOAuthFlowError('cancelled')
    }
    await this.assertProtectedState()
  }

  async logout(): Promise<void> {
    this.#authStorage.logout(OPENAI_CODEX_PROVIDER)
    await this.assertProtectedState()
  }

  async createRestrictedSession(options: Readonly<{
    workspaceCwd: string
    sessionId: string
    systemPrompt: string
    customTools: readonly ToolDefinition[]
    enabledTools: readonly AssistantModelSessionPolicy['tools'][number][]
    modelId?: string
  }>): Promise<Readonly<{ session: AgentSession; sessionFile: string | null }>> {
    await this.assertProtectedState()
    const workspaceCwd = resolve(options.workspaceCwd)
    const model = this.#modelRegistry.find(OPENAI_CODEX_PROVIDER, options.modelId ?? DEFAULT_OPENAI_CODEX_MODEL)
    if (!model) throw new Error('The configured Codex model is unavailable.')

    // Pi is an execution engine, not a second workspace configuration or
    // transcript store. The AnthraciteMD conversation store remains canonical.
    const settingsManager = SettingsManager.inMemory()
    const resourceLoader = new DefaultResourceLoader({
      cwd: workspaceCwd,
      agentDir: this.paths.root,
      settingsManager,
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
      systemPrompt: options.systemPrompt,
    })
    await resourceLoader.reload()
    const sessionManager = SessionManager.inMemory()
    const { session } = await createAgentSession({
      cwd: workspaceCwd,
      agentDir: this.paths.root,
      authStorage: this.#authStorage,
      modelRegistry: this.#modelRegistry,
      model,
      tools: [...options.enabledTools],
      customTools: [...options.customTools],
      resourceLoader,
      sessionManager,
      settingsManager,
    })
    await this.assertProtectedState()
    return { session, sessionFile: null }
  }

  async assistantRuntimeStatus(): Promise<Readonly<{ connected: boolean; model: string | null }>> {
    const provider = await this.providerStatus()
    const model = this.#modelRegistry.find(OPENAI_CODEX_PROVIDER, DEFAULT_OPENAI_CODEX_MODEL)
    return { connected: provider.configured && Boolean(model), model: provider.configured && model ? DEFAULT_OPENAI_CODEX_MODEL : null }
  }
}

/**
 * Policy-free Pi adapter. A bundled Assistant contribution supplies the
 * bounded prompt and declared tool list through the brokered model session.
 */
export class PiModelSessionRuntime {
  constructor(private readonly boundary: PiRuntimeBoundary, private readonly workspaceCwd: string) {}

  status() { return this.boundary.assistantRuntimeStatus() }

  async run(input: Readonly<{
    question: string
    policy: AssistantModelSessionPolicy
    tools: Readonly<{ search(query: string): Promise<readonly Readonly<{ resourceId: string; title: string; displayPath: string; snippet: string | null }>[]>; read(resourceId: string): Promise<Readonly<{ text: string }>> }>
  }>): Promise<string> {
    const tools: ToolDefinition[] = []
    if (input.policy.tools.includes('workspace_search')) {
      tools.push(defineTool({
        name: 'workspace_search',
        label: 'Search workspace',
        description: 'Search eligible Markdown notes by question terms.',
        parameters: Type.Object({ query: Type.String() }),
        async execute(_id, params) {
          const results = await input.tools.search(params.query)
          return { content: [{ type: 'text' as const, text: JSON.stringify(results) }], details: {}, isError: false }
        },
      }))
    }
    if (input.policy.tools.includes('workspace_read')) {
      tools.push(defineTool({
        name: 'workspace_read',
        label: 'Read workspace note',
        description: 'Read one eligible note by opaque resource ID returned from workspace_search.',
        parameters: Type.Object({ resourceId: Type.String() }),
        async execute(_id, params) {
          const note = await input.tools.read(params.resourceId)
          return { content: [{ type: 'text' as const, text: note.text }], details: {}, isError: false }
        },
      }))
    }
    const { session } = await this.boundary.createRestrictedSession({
      workspaceCwd: this.workspaceCwd,
      sessionId: `run_${randomUUID().replaceAll('-', '')}`,
      systemPrompt: input.policy.prompt,
      customTools: tools,
      enabledTools: input.policy.tools,
    })
    let answer = ''
    const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') answer += event.assistantMessageEvent.delta
    })
    try {
      await session.prompt(input.question, { expandPromptTemplates: false })
      return answer.trim()
    } finally {
      unsubscribe()
      session.dispose()
    }
  }
}

export class AssistantOAuthFlowError extends Error {
  constructor(readonly code: AssistantError['code']) {
    super(code === 'cancelled' ? 'The authorization flow was cancelled.' : 'The authorization flow cannot continue.')
    this.name = 'AssistantOAuthFlowError'
  }
}

type PendingInput = Readonly<{
  kind: Extract<AssistantOAuthInput['kind'], 'text' | 'selection'>
  options: ReadonlyMap<string, string> | undefined
  resolve: (value: string | undefined) => void
  reject: (error: Error) => void
}>

type FlowRecord = {
  snapshot: AssistantOAuthFlow
  terminal: Promise<AssistantOAuthFlow>
  resolveTerminal: (flow: AssistantOAuthFlow) => void
  pendingInput: PendingInput | undefined
  abortController: AbortController
  cleanup: Promise<void>
}

function error(code: AssistantError['code'], retryable: boolean): AssistantError {
  const messages: Record<AssistantError['code'], string> = {
    provider_unavailable: 'Codex authorization is unavailable.',
    provider_failure: 'Codex authorization could not be completed.',
    flow_conflict: 'Another Codex authorization flow is already active.',
    invalid_input: 'The authorization input is invalid or no longer current.',
    workspace_unavailable: 'The workspace is unavailable.',
    question_in_flight: 'An Assistant question is already in progress.',
    no_relevant_evidence: 'No relevant workspace evidence is available.',
    context_limit: 'The available workspace evidence exceeded the configured context limit.',
    interrupted: 'The Assistant request was interrupted before it completed.',
    cancelled: 'Codex authorization was cancelled.',
  }
  return { code, message: messages[code], retryable }
}

function terminal(status: AssistantOAuthFlow['status']): boolean {
  return TERMINAL_FLOW_STATUSES.has(status)
}

export class AssistantOAuthFlowManager {
  readonly #flows = new Map<string, FlowRecord>()
  readonly #terminalOrder: string[] = []
  #activeFlowId: string | undefined
  #lastTerminalStatus: AssistantOAuthFlow['status'] | undefined
  #starting = false
  #startGeneration = 0
  #startingCheck: Promise<void> | undefined
  readonly #cleaningFlowIds = new Set<string>()

  constructor(
    private readonly runtime: PiOAuthRuntime,
    private readonly options: Readonly<{
      now: () => string
      nextFlowId: () => string
      terminalRetention?: number
      model?: string
    }> = {
      now: () => new Date().toISOString(),
      nextFlowId: () => `flow_${Math.random().toString(36).slice(2)}`,
    },
  ) {}

  async providerStatus(): Promise<AssistantProviderStatus> {
    const status = await this.runtime.providerStatus()
    if (!status.oauthAvailable) return { provider: OPENAI_CODEX_PROVIDER, status: 'unavailable', model: null }
    if (this.#activeFlowId || this.#starting || this.#cleaningFlowIds.size > 0) return { provider: OPENAI_CODEX_PROVIDER, status: 'connecting', model: null }
    if (status.configured) return { provider: OPENAI_CODEX_PROVIDER, status: 'connected', model: this.options.model ?? DEFAULT_OPENAI_CODEX_MODEL }
    if (this.#lastTerminalStatus === 'failed') return { provider: OPENAI_CODEX_PROVIDER, status: 'failed', model: null }
    return { provider: OPENAI_CODEX_PROVIDER, status: 'disconnected', model: null }
  }

  async start(): Promise<AssistantOAuthFlow> {
    if (this.#activeFlowId || this.#starting || this.#cleaningFlowIds.size > 0) throw new AssistantOAuthFlowError('flow_conflict')
    this.#starting = true
    const generation = this.#startGeneration
    let finishCheck!: () => void
    this.#startingCheck = new Promise((resolve) => { finishCheck = resolve })
    let available = false
    try { available = (await this.runtime.providerStatus()).oauthAvailable } finally {
      this.#starting = false
      finishCheck()
      this.#startingCheck = undefined
    }
    if (generation !== this.#startGeneration) throw new AssistantOAuthFlowError('cancelled')
    if (this.#activeFlowId) throw new AssistantOAuthFlowError('flow_conflict')
    if (!available) throw new AssistantOAuthFlowError('provider_unavailable')
    const flowId = this.options.nextFlowId()
    if (!/^flow_[a-z0-9]+$/.test(flowId)) throw new Error('OAuth flow IDs must be opaque.')
    const now = this.options.now()
    let resolveTerminal!: (flow: AssistantOAuthFlow) => void
    const record: FlowRecord = {
      snapshot: {
        flowId: flowId as AssistantFlowId,
        provider: OPENAI_CODEX_PROVIDER,
        status: 'awaiting_provider',
        createdAt: now,
        updatedAt: now,
        authorization: null,
        input: null,
        error: null,
      },
      terminal: new Promise((resolve) => { resolveTerminal = resolve }),
      resolveTerminal,
      pendingInput: undefined,
      abortController: new AbortController(),
      cleanup: Promise.resolve(),
    }
    this.#flows.set(flowId, record)
    this.#activeFlowId = flowId
    record.cleanup = this.#run(record)
    void record.cleanup
    return record.snapshot
  }

  async flow(flowId: string): Promise<AssistantOAuthFlow> {
    const record = this.#flows.get(flowId)
    if (!record) throw new AssistantOAuthFlowError('invalid_input')
    return record.snapshot
  }

  async activeFlow(): Promise<AssistantOAuthFlow | null> {
    if (!this.#activeFlowId) return null
    return this.#flows.get(this.#activeFlowId)?.snapshot ?? null
  }

  async listTerminal(): Promise<readonly AssistantOAuthFlow[]> {
    return this.#terminalOrder
      .map((flowId) => this.#flows.get(flowId)?.snapshot)
      .filter((flow): flow is AssistantOAuthFlow => flow !== undefined)
  }

  async waitForTerminal(flowId: string): Promise<AssistantOAuthFlow> {
    const record = this.#flows.get(flowId)
    if (!record) throw new AssistantOAuthFlowError('invalid_input')
    return terminal(record.snapshot.status) ? record.snapshot : record.terminal
  }

  async answer(flowId: string, value: string): Promise<AssistantOAuthFlow> {
    const record = this.#flows.get(flowId)
    const pending = record?.pendingInput
    if (!record || !pending || record.snapshot.status !== 'awaiting_input') {
      throw new AssistantOAuthFlowError('invalid_input')
    }
    const trimmed = value.trim()
    if (!trimmed) throw new AssistantOAuthFlowError('invalid_input')
    const response = pending.kind === 'selection' ? pending.options?.get(trimmed) : trimmed
    if (!response) throw new AssistantOAuthFlowError('invalid_input')
    record.pendingInput = undefined
    this.#replace(record, { status: 'awaiting_provider', input: null, error: null })
    pending.resolve(response)
    return record.snapshot
  }

  async cancel(flowId: string): Promise<AssistantOAuthFlow> {
    const record = this.#flows.get(flowId)
    if (!record) throw new AssistantOAuthFlowError('invalid_input')
    if (!terminal(record.snapshot.status)) {
      this.#cleaningFlowIds.add(record.snapshot.flowId)
      record.abortController.abort()
      record.pendingInput?.reject(new AssistantOAuthFlowError('cancelled'))
      record.pendingInput = undefined
      this.#finish(record, 'cancelled', error('cancelled', true))
    }
    return record.snapshot
  }

  async disconnect(): Promise<AssistantProviderStatus> {
    this.#startGeneration++
    await this.#startingCheck
    if (this.#activeFlowId) {
      const record = this.#flows.get(this.#activeFlowId)
      await this.cancel(this.#activeFlowId)
      await record?.cleanup
    }
    await this.runtime.logout()
    this.#lastTerminalStatus = undefined
    return this.providerStatus()
  }

  async #run(record: FlowRecord): Promise<void> {
    try {
      await this.runtime.login({
        onAuth: (authorization) => this.#setAwaitingProvider(record, authorization),
        onDeviceCode: (info) => this.#setDeviceCode(record, info),
        onProgress: () => this.#setAwaitingProvider(record),
        onPrompt: () => this.#waitForText(record),
        onManualCodeInput: () => this.#waitForText(record),
        onSelect: (prompt) => this.#waitForSelection(record, prompt.options),
      }, record.abortController.signal)
      if (record.abortController.signal.aborted) await this.runtime.logout()
      if (!terminal(record.snapshot.status)) this.#finish(record, 'succeeded')
    } catch {
      if (!terminal(record.snapshot.status)) this.#finish(record, 'failed', error('provider_failure', true))
    } finally {
      this.#cleaningFlowIds.delete(record.snapshot.flowId)
    }
  }

  #setAwaitingProvider(
    record: FlowRecord,
    authorization: AssistantOAuthFlow['authorization'] = record.snapshot.authorization,
  ): void {
    if (terminal(record.snapshot.status)) return
    this.#replace(record, { status: 'awaiting_provider', authorization, input: null, error: null })
  }

  #setDeviceCode(record: FlowRecord, info: Readonly<{ verificationUri: string; userCode: string }>): void {
    if (terminal(record.snapshot.status)) return
    this.#replace(record, {
      status: 'awaiting_provider',
      input: {
        kind: 'device_code',
        label: 'Complete Codex authorization in your browser.',
        verificationUri: info.verificationUri,
        userCode: info.userCode,
      },
      error: null,
    })
  }

  #waitForText(record: FlowRecord): Promise<string> {
    return this.#waitForInput(record, {
      kind: 'text',
      label: 'Authorization response',
      secret: true,
      required: true,
    }).then((value) => value ?? '')
  }

  #waitForSelection(
    record: FlowRecord,
    choices: readonly Readonly<{ id: string; label: string }>[],
  ): Promise<string | undefined> {
    const values = new Map<string, string>()
    const options = choices.map((choice, index) => {
      const id = `option_${index + 1}`
      values.set(id, choice.id)
      return { id, label: choice.label || `Authorization option ${index + 1}` }
    })
    return this.#waitForInput(record, {
      kind: 'selection',
      label: 'Select an authorization option',
      options,
      required: true,
    }, values)
  }

  #waitForInput(
    record: FlowRecord,
    input: Extract<AssistantOAuthInput, { kind: 'text' | 'selection' }>,
    options?: ReadonlyMap<string, string>,
  ): Promise<string | undefined> {
    if (terminal(record.snapshot.status)) return Promise.reject(new AssistantOAuthFlowError('cancelled'))
    if (record.pendingInput) return Promise.reject(new AssistantOAuthFlowError('invalid_input'))
    this.#replace(record, { status: 'awaiting_input', input, error: null })
    return new Promise((resolve, reject) => {
      record.pendingInput = { kind: input.kind, options, resolve, reject }
    })
  }

  #replace(
    record: FlowRecord,
    update: Pick<AssistantOAuthFlow, 'status' | 'input' | 'error'> & Partial<Pick<AssistantOAuthFlow, 'authorization'>>,
  ): void {
    record.snapshot = { ...record.snapshot, ...update, updatedAt: this.options.now() }
  }

  #finish(record: FlowRecord, status: Extract<AssistantOAuthFlow['status'], 'succeeded' | 'failed' | 'cancelled'>, flowError: AssistantError | undefined = undefined): void {
    const pending = record.pendingInput
    record.pendingInput = undefined
    if (pending) pending.reject(new AssistantOAuthFlowError(status === 'cancelled' ? 'cancelled' : 'invalid_input'))
    this.#replace(record, { status, authorization: null, input: null, error: flowError ?? null })
    if (this.#activeFlowId === record.snapshot.flowId) this.#activeFlowId = undefined
    this.#lastTerminalStatus = status
    this.#terminalOrder.push(record.snapshot.flowId)
    const maximum = this.options.terminalRetention ?? 4
    while (this.#terminalOrder.length > maximum) {
      const expired = this.#terminalOrder.shift()
      if (expired) this.#flows.delete(expired)
    }
    record.resolveTerminal(record.snapshot)
  }
}
