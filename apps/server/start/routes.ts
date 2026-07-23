import router from '@adonisjs/core/services/router'
import { AssistantQuestion as AssistantQuestionContract, matchesContract, serviceDescriptor, type AssistantQuestion } from '@anthracitemd/contracts'
import { AssistantModelSessionError } from '@anthracitemd/plugin-sdk'
import {
  ConfiguredWorkspaceAuthority,
  WorkspaceInvalidMutationError,
  WorkspaceResourceUnavailableError,
  WorkspaceRevisionConflictError,
  WorkspaceUnavailableError,
} from '@anthracitemd/workspace'

import Owner from '#models/owner'
import {
  acceptsPasswordInput,
  AUTH_REVOCATION_GENERATION_SESSION_KEY,
  OwnerSetupService,
  PasswordPolicyError,
  resolveSecurityStateDirectory,
} from '../app/security/owner_setup_service.js'
import { PluginRuntimeService } from '../app/plugins/plugin_runtime_service.js'
import { LocalSearchService, LocalSearchUnavailableError } from '../app/search/local_search_service.js'
import { LoginAttemptLimiter } from '../app/security/login_attempt_limiter.js'
import { AssistantOAuthFlowError, AssistantOAuthFlowManager, PiModelSessionRuntime, PiRuntimeBoundary } from '../app/assistant/index.js'
import { AssistantQuestionError, AssistantQuestionService, type AssistantRunRuntime } from '../app/assistant/question_service.js'
import { ConversationStore } from '../app/assistant/conversation_store.js'
import { AssistantWorkspaceContext } from '../app/assistant/workspace_context.js'
import { anthraciteEnvironmentValue, assistantTestRuntimeEnabled } from '../config/environment.js'

const workspaceRoot = anthraciteEnvironmentValue(process.env, 'WORKSPACE_ROOT')
const ownerSetup = new OwnerSetupService(resolveSecurityStateDirectory())
const workspace = new ConfiguredWorkspaceAuthority(workspaceRoot)
const search = workspaceRoot
  ? new LocalSearchService(workspaceRoot, workspace)
  : undefined
const plugins = workspaceRoot
  ? new PluginRuntimeService(workspaceRoot, workspace, async (request) => {
    const service = await questionService()
    if (!service) throw new AssistantModelSessionError({ code: 'workspace_unavailable', message: 'The workspace is unavailable.', retryable: true })
    try { return await service.ask(request) } catch (error) {
      if (error instanceof AssistantQuestionError) {
        throw new AssistantModelSessionError({ code: error.code, message: error.message, retryable: error.code !== 'invalid_input' })
      }
      throw error
    }
  })
  : undefined
let pluginsStarted: Promise<void> | undefined
const loginAttempts = new LoginAttemptLimiter()
let assistantOAuth: Promise<AssistantOAuthFlowManager> | undefined
let assistantBoundary: Promise<PiRuntimeBoundary> | undefined
let assistantQuestions: Promise<AssistantQuestionService> | undefined

/**
 * A deterministic production-server test seam. It is unavailable unless the
 * test process explicitly opts in, so normal hosts can never fall back from
 * Pi/Codex to a synthetic provider.
 */
function testAssistantRuntime(): AssistantRunRuntime | undefined {
  if (process.env.NODE_ENV !== 'test' || !assistantTestRuntimeEnabled(process.env)) return undefined
  return {
    status: async () => ({ connected: true, model: 'anthracitemd-test-model' }),
    run: async ({ question, tools }) => {
      if (question.toLowerCase().includes('hold concurrent')) {
        await new Promise((resolve) => setTimeout(resolve, 2_000))
      }
      const query = question.toLowerCase().includes('silver graphite') ? 'silver graphite' : 'unique grounded fact'
      const [result] = await tools.search(query)
      if (!result) return 'I could not find supporting workspace evidence.'
      const note = await tools.read(result.resourceId)
      return `Grounded test answer: ${note.text.trim()}`
    },
  }
}

function piBoundary(): Promise<PiRuntimeBoundary> {
  assistantBoundary ??= PiRuntimeBoundary.create(resolveSecurityStateDirectory()).catch((error) => {
    assistantBoundary = undefined
    throw error
  })
  return assistantBoundary
}

function oauthManager(): Promise<AssistantOAuthFlowManager> {
  assistantOAuth ??= piBoundary()
    .then((runtime) => new AssistantOAuthFlowManager(runtime))
    .catch((error) => {
      assistantOAuth = undefined
      throw error
    })
  return assistantOAuth
}

async function questionService(): Promise<AssistantQuestionService | undefined> {
  if (!search || !workspaceRoot) return undefined
  if (!assistantQuestions) {
    assistantQuestions = (async () => {
      const runtime = testAssistantRuntime() ?? new PiModelSessionRuntime(await piBoundary(), workspaceRoot)
      const conversationStore = new ConversationStore(workspaceRoot, workspace)
      await conversationStore.recoverAll()
      return new AssistantQuestionService({
        runtime,
        context: () => new AssistantWorkspaceContext(workspace, search!),
        conversationStore,
      })
    })().catch((error) => { assistantQuestions = undefined; throw error })
  }
  return assistantQuestions
}

async function requireOwner(auth: { use: (guard: 'web') => { authenticate: () => Promise<unknown> } }, response: { unauthorized: (body: unknown) => unknown }): Promise<boolean> {
  try {
    await auth.use('web').authenticate()
    return true
  } catch {
    response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
    return false
  }
}

function assistantOAuthErrorResponse(error: unknown, response: { badRequest: (body: unknown) => unknown; conflict: (body: unknown) => unknown; serviceUnavailable: (body: unknown) => unknown }): unknown {
  if (error instanceof AssistantOAuthFlowError) {
    const body = { error: { code: error.code, message: error.message } }
    return error.code === 'flow_conflict' ? response.conflict(body) : response.badRequest(body)
  }
  return response.serviceUnavailable({ error: { code: 'provider_unavailable', message: 'Codex authorization is unavailable.' } })
}

async function pluginRuntime(): Promise<PluginRuntimeService | undefined> {
  if (!plugins) return undefined
  pluginsStarted ??= plugins.start().catch((error) => {
    pluginsStarted = undefined
    throw error
  })
  await pluginsStarted
  return plugins
}

router.get('/api/v1/health', () => serviceDescriptor)

router.post('/api/v1/auth/login', async ({ auth, request, response, session }) => {
  const source = `login:${request.ip()}`
  const attempt = loginAttempts.acquire(source)
  if (!attempt) {
    return response.tooManyRequests({ error: { code: 'invalid_credentials', message: 'Invalid credentials.' } })
  }
  const account = request.input('account')
  const password = request.input('password')
  const validAccount = account === 'owner'
  const owner = validAccount ? await Owner.find(1) : null
  let authenticated: boolean
  try {
    authenticated = acceptsPasswordInput(password) && await ownerSetup.authenticate(
      password,
      async (revocationGeneration) => {
        if (!owner) return false
        await auth.use('web').login(owner)
        session.put(AUTH_REVOCATION_GENERATION_SESSION_KEY, revocationGeneration)
        await session.commit()
        return true
      },
      async () => auth.use('web').logout(),
    )
  } catch (error) {
    attempt.cancelled()
    throw error
  }

  if (!authenticated) {
    attempt.failed()
    return response.unauthorized({ error: { code: 'invalid_credentials', message: 'Invalid credentials.' } })
  }

  attempt.succeeded()
  return { owner: { id: 'owner' } }
})

router.get('/api/v1/auth/current', async ({ auth, response }) => {
  try {
    await auth.use('web').authenticate()
    return { owner: { id: 'owner' } }
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }
})

router.get('/api/v1/assistant/provider', async ({ auth, response }) => {
  if (!(await requireOwner(auth, response))) return
  if (testAssistantRuntime()) return { provider: 'openai-codex' as const, status: 'connected' as const, model: 'anthracitemd-test-model' }
  try {
    return await (await oauthManager()).providerStatus()
  } catch (error) {
    return assistantOAuthErrorResponse(error, response)
  }
})

router.post('/api/v1/assistant/oauth', async ({ auth, response }) => {
  if (!(await requireOwner(auth, response))) return
  try {
    return await (await oauthManager()).start()
  } catch (error) {
    return assistantOAuthErrorResponse(error, response)
  }
})

router.get('/api/v1/assistant/oauth/active', async ({ auth, response }) => {
  if (!(await requireOwner(auth, response))) return
  try {
    return await (await oauthManager()).activeFlow()
  } catch (error) {
    return assistantOAuthErrorResponse(error, response)
  }
})

router.get('/api/v1/assistant/oauth/:flowId', async ({ auth, params, response }) => {
  if (!(await requireOwner(auth, response))) return
  try {
    return await (await oauthManager()).flow(params.flowId)
  } catch (error) {
    return assistantOAuthErrorResponse(error, response)
  }
})

router.post('/api/v1/assistant/oauth/:flowId/answer', async ({ auth, params, request, response }) => {
  if (!(await requireOwner(auth, response))) return
  const value = request.input('value')
  if (typeof value !== 'string') {
    return response.badRequest({ error: { code: 'invalid_input', message: 'The authorization input is invalid or no longer current.' } })
  }
  try {
    return await (await oauthManager()).answer(params.flowId, value)
  } catch (error) {
    return assistantOAuthErrorResponse(error, response)
  }
})

router.post('/api/v1/assistant/oauth/:flowId/cancel', async ({ auth, params, response }) => {
  if (!(await requireOwner(auth, response))) return
  try {
    return await (await oauthManager()).cancel(params.flowId)
  } catch (error) {
    return assistantOAuthErrorResponse(error, response)
  }
})

router.post('/api/v1/assistant/disconnect', async ({ auth, response }) => {
  if (!(await requireOwner(auth, response))) return
  try {
    return await (await oauthManager()).disconnect()
  } catch (error) {
    return assistantOAuthErrorResponse(error, response)
  }
})

router.post('/api/v1/assistant/questions', async ({ auth, request, response }) => {
  if (!(await requireOwner(auth, response))) return
  const question = request.input('question')
  const conversationId = request.input('conversationId')
  if (typeof question !== 'string' || !question.trim() || Buffer.byteLength(question, 'utf8') > 4_000 ||
      (conversationId !== undefined && typeof conversationId !== 'string')) {
    return response.badRequest({ error: { code: 'invalid_input', message: 'The Assistant question is invalid.' } })
  }
  const assistantQuestion = { question, ...(conversationId === undefined ? {} : { conversationId }) }
  if (!matchesContract(AssistantQuestionContract, assistantQuestion)) {
    return response.badRequest({ error: { code: 'invalid_input', message: 'The Assistant question is invalid.' } })
  }
  const runtime = await pluginRuntime()
  if (!runtime) return response.serviceUnavailable({ error: { code: 'workspace_unavailable', message: 'The workspace is unavailable.' } })
  try {
    const result = await runtime.askAssistant(assistantQuestion as AssistantQuestion)
    if (result.kind === 'handled') return result.turn
    if (result.kind === 'denied') return response.badRequest({ error: { code: 'invalid_input', message: 'The Assistant question is invalid.' } })
    if (result.kind === 'failed') {
      const body = { error: result.error }
      if (result.error.code === 'invalid_input') return response.badRequest(body)
      return response.serviceUnavailable(body)
    }
    return response.serviceUnavailable({ error: { code: 'provider_unavailable', message: 'The Assistant is unavailable.' } })
  } catch {
    return response.serviceUnavailable({ error: { code: 'workspace_unavailable', message: 'The workspace is unavailable.' } })
  }
})

router.post('/api/v1/auth/logout', async ({ auth, response }) => {
  try {
    await auth.use('web').authenticate()
    await auth.use('web').logout()
    return response.noContent()
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }
})

router.put('/api/v1/auth/password', async ({ auth, request, response }) => {
  try {
    await auth.use('web').authenticate()
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }

  const currentPassword = request.input('currentPassword')
  const replacementPassword = request.input('password')
  if (typeof currentPassword !== 'string' || typeof replacementPassword !== 'string') {
    return response.badRequest({ error: { code: 'invalid_request', message: 'Invalid request.' } })
  }

  const attempt = loginAttempts.acquire(`password-change:${request.ip()}`)
  if (!attempt) {
    return response.tooManyRequests({ error: { code: 'invalid_credentials', message: 'Invalid credentials.' } })
  }
  try {
    if (!(await ownerSetup.changePassword(currentPassword, replacementPassword))) {
      attempt.failed()
      return response.unauthorized({ error: { code: 'invalid_credentials', message: 'Invalid credentials.' } })
    }
  } catch (error) {
    if (error instanceof PasswordPolicyError) {
      attempt.cancelled()
      return response.badRequest({ error: { code: 'invalid_request', message: 'Invalid request.' } })
    }
    attempt.cancelled()
    throw error
  }

  attempt.succeeded()
  await auth.use('web').logout()
  return response.noContent()
})

router.get('/api/v1/workspace', async ({ auth, response }) => {
  try {
    await auth.use('web').authenticate()
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }

  try {
    const current = await workspace.current()
    return current.available ? await workspace.refresh() : await workspace.openConfigured()
  } catch (error) {
    if (error instanceof WorkspaceUnavailableError) {
      return response.serviceUnavailable({ available: false, reason: error.reason })
    }
    throw error
  }
})

router.get('/api/v1/notes/:resourceId', async ({ auth, params, response }) => {
  try {
    await auth.use('web').authenticate()
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }

  try {
    return await workspace.readNote(params.resourceId)
  } catch (error) {
    if (error instanceof WorkspaceResourceUnavailableError) {
      return response.notFound({
        error: { code: 'resource_unavailable', message: 'The requested note is unavailable.' },
      })
    }
    if (error instanceof WorkspaceUnavailableError) {
      return response.serviceUnavailable({
        error: { code: 'workspace_unavailable', message: 'The configured workspace is unavailable.' },
      })
    }
    throw error
  }
})

router.put('/api/v1/notes/:resourceId', async ({ auth, params, request, response }) => {
  try {
    await auth.use('web').authenticate()
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }
  const expectedRevision = request.input('expectedRevision')
  const source = request.input('source')
  if (typeof expectedRevision !== 'string' || typeof source !== 'string') {
    return response.badRequest({ error: { code: 'invalid_request', message: 'Invalid request.' } })
  }
  try {
    return await workspace.saveNote(params.resourceId, expectedRevision, source)
  } catch (error) {
    return mutationErrorResponse(error, response)
  }
})

router.patch('/api/v1/notes/:resourceId/rename', async ({ auth, params, request, response }) => {
  try {
    await auth.use('web').authenticate()
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }
  const expectedRevision = request.input('expectedRevision')
  const fileName = request.input('fileName')
  if (typeof expectedRevision !== 'string' || typeof fileName !== 'string') {
    return response.badRequest({ error: { code: 'invalid_request', message: 'Invalid request.' } })
  }
  try {
    return await workspace.renameNote(params.resourceId, expectedRevision, fileName)
  } catch (error) {
    return mutationErrorResponse(error, response)
  }
})

router.get('/api/v1/search', async ({ auth, request, response }) => {
  try {
    await auth.use('web').authenticate()
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }
  if (!search) {
    return response.serviceUnavailable({ error: { code: 'workspace_unavailable', message: 'The configured workspace is unavailable.' } })
  }
  const query = request.input('q', '')
  if (typeof query !== 'string') {
    return response.badRequest({ error: { code: 'invalid_request', message: 'Invalid request.' } })
  }
  try {
    return { results: await search.search(query) }
  } catch (error) {
    if (error instanceof WorkspaceUnavailableError) {
      return response.serviceUnavailable({ error: { code: 'workspace_unavailable', message: 'The configured workspace is unavailable.' } })
    }
    if (error instanceof LocalSearchUnavailableError) {
      return response.serviceUnavailable({ error: { code: 'search_unavailable', message: 'Local search is unavailable.' } })
    }
    throw error
  }
})

router.post('/api/v1/search/rebuild', async ({ auth, response }) => {
  try {
    await auth.use('web').authenticate()
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }
  if (!search) {
    return response.serviceUnavailable({ error: { code: 'workspace_unavailable', message: 'The configured workspace is unavailable.' } })
  }
  try {
    return await search.rebuild()
  } catch (error) {
    if (error instanceof WorkspaceUnavailableError) {
      return response.serviceUnavailable({ error: { code: 'workspace_unavailable', message: 'The configured workspace is unavailable.' } })
    }
    if (error instanceof LocalSearchUnavailableError) {
      return response.serviceUnavailable({ error: { code: 'search_unavailable', message: 'Local search is unavailable.' } })
    }
    throw error
  }
})

function mutationErrorResponse(error: unknown, response: {
  conflict(body: unknown): unknown
  badRequest(body: unknown): unknown
  notFound(body: unknown): unknown
  serviceUnavailable(body: unknown): unknown
}) {
  if (error instanceof WorkspaceRevisionConflictError) {
    return response.conflict({
      error: { code: 'revision_conflict', message: 'The note changed after it was opened.' },
      currentRevision: error.currentRevision,
    })
  }
  if (error instanceof WorkspaceInvalidMutationError) {
    const status = error.code === 'indeterminate' ? 'conflict' : 'badRequest'
    return response[status]({
      error: { code: error.code, message: 'The note could not be changed safely.' },
    })
  }
  if (error instanceof WorkspaceResourceUnavailableError) {
    return response.notFound({ error: { code: 'resource_unavailable', message: 'The requested note is unavailable.' } })
  }
  if (error instanceof WorkspaceUnavailableError) {
    return response.serviceUnavailable({ error: { code: 'workspace_unavailable', message: 'The configured workspace is unavailable.' } })
  }
  throw error
}

router.get('/api/v1/plugins', async ({ auth, response }) => {
  try {
    await auth.use('web').authenticate()
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }
  try {
    const runtime = await pluginRuntime()
    if (!runtime) return response.serviceUnavailable({ error: { code: 'workspace_unavailable', message: 'The configured workspace is unavailable.' } })
    return { plugins: runtime.list() }
  } catch {
    return response.serviceUnavailable({ error: { code: 'plugin_runtime_unavailable', message: 'The plugin runtime is unavailable.' } })
  }
})

router.put('/api/v1/plugins/:pluginId', async ({ auth, params, request, response }) => {
  try {
    await auth.use('web').authenticate()
  } catch {
    return response.unauthorized({ error: { code: 'unauthenticated', message: 'Authentication required.' } })
  }
  const enabled = request.input('enabled')
  if (typeof enabled !== 'boolean') {
    return response.badRequest({ error: { code: 'invalid_request', message: 'Invalid request.' } })
  }
  try {
    const runtime = await pluginRuntime()
    if (!runtime) return response.serviceUnavailable({ error: { code: 'workspace_unavailable', message: 'The configured workspace is unavailable.' } })
    if (!runtime.list().some((plugin) => plugin.id === params.pluginId)) {
      return response.notFound({ error: { code: 'plugin_not_found', message: 'Plugin not found.' } })
    }
    return { plugin: await runtime.setEnabled(params.pluginId, enabled) }
  } catch {
    return response.serviceUnavailable({ error: { code: 'plugin_runtime_unavailable', message: 'The plugin runtime is unavailable.' } })
  }
})
