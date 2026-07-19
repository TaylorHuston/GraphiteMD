import router from '@adonisjs/core/services/router'
import { serviceDescriptor } from '@graphitemd/contracts'
import { ConfiguredWorkspaceAuthority, WorkspaceUnavailableError } from '@graphitemd/workspace'

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
