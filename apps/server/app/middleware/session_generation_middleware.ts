import type { HttpContext } from '@adonisjs/core/http'

import {
  AUTH_REVOCATION_GENERATION_SESSION_KEY,
  OwnerSetupService,
  resolveSecurityStateDirectory,
} from '../security/owner_setup_service.js'

const AUTH_SESSION_KEY = 'auth_web'
const ownerSetup = new OwnerSetupService(resolveSecurityStateDirectory())

export default class SessionGenerationMiddleware {
  async handle({ session }: HttpContext, next: () => Promise<unknown>) {
    if (session.get(AUTH_SESSION_KEY) !== undefined) {
      const generation = session.get(AUTH_REVOCATION_GENERATION_SESSION_KEY)
      if (!(await ownerSetup.isCurrentRevocationGeneration(generation))) {
        session.forget(AUTH_SESSION_KEY)
        session.forget(AUTH_REVOCATION_GENERATION_SESSION_KEY)
        session.regenerate()
      }
    }

    return next()
  }
}
