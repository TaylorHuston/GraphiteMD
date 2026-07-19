import router from '@adonisjs/core/services/router'
import { serviceDescriptor } from '@graphitemd/contracts'
import {
  ConfiguredWorkspaceAuthority,
  WorkspaceResourceUnavailableError,
  WorkspaceUnavailableError,
} from '@graphitemd/workspace'

import Owner from '#models/owner'
import {
  OwnerSetupService,
  resolveSecurityStateDirectory,
} from '../app/security/owner_setup_service.js'

const ownerSetup = new OwnerSetupService(resolveSecurityStateDirectory())
const workspace = new ConfiguredWorkspaceAuthority(process.env.GRAPHITEMD_WORKSPACE_ROOT)

router.get('/api/v1/health', () => serviceDescriptor)

router.post('/api/v1/auth/login', async ({ auth, request, response }) => {
  const account = request.input('account')
  const password = request.input('password')
  const validAccount = account === 'owner'
  const validPassword = typeof password === 'string' && (await ownerSetup.verifyPassword(password))

  if (!validAccount || !validPassword) {
    return response.unauthorized({ error: { code: 'invalid_credentials', message: 'Invalid credentials.' } })
  }

  const owner = await Owner.find(1)
  if (!owner) {
    return response.unauthorized({ error: { code: 'invalid_credentials', message: 'Invalid credentials.' } })
  }

  await auth.use('web').login(owner)
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

  if (!(await ownerSetup.changePassword(currentPassword, replacementPassword))) {
    return response.unauthorized({ error: { code: 'invalid_credentials', message: 'Invalid credentials.' } })
  }

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
    return current.available ? current : await workspace.openConfigured()
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
