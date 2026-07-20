import router from '@adonisjs/core/services/router'
import { serviceDescriptor } from '@graphitemd/contracts'
import {
  ConfiguredWorkspaceAuthority,
  WorkspaceInvalidMutationError,
  WorkspaceResourceUnavailableError,
  WorkspaceRevisionConflictError,
  WorkspaceUnavailableError,
} from '@graphitemd/workspace'

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

const ownerSetup = new OwnerSetupService(resolveSecurityStateDirectory())
const workspace = new ConfiguredWorkspaceAuthority(process.env.GRAPHITEMD_WORKSPACE_ROOT)
const search = process.env.GRAPHITEMD_WORKSPACE_ROOT
  ? new LocalSearchService(process.env.GRAPHITEMD_WORKSPACE_ROOT, workspace)
  : undefined
const plugins = process.env.GRAPHITEMD_WORKSPACE_ROOT
  ? new PluginRuntimeService(process.env.GRAPHITEMD_WORKSPACE_ROOT, workspace)
  : undefined
let pluginsStarted: Promise<void> | undefined
const loginAttempts = new LoginAttemptLimiter()

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
