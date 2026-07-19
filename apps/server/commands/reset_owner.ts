import { BaseCommand } from '@adonisjs/core/ace'

import {
  OwnerSetupService,
  resolveSecurityStateDirectory,
} from '../app/security/owner_setup_service.js'

export interface OwnerResetCommandIo {
  confirm(message: string): Promise<boolean>
  secure(message: string): Promise<string>
  info(message: string): void
  warning(message: string): void
}

export async function runOwnerReset(
  io: OwnerResetCommandIo,
  service: OwnerSetupService
): Promise<number> {
  if (!(await service.hasOwner())) {
    io.warning('No owner account exists. Run the owner setup command first.')
    return 1
  }

  const confirmed = await io.confirm(
    'Reset the owner password and invalidate every authenticated browser session?'
  )
  if (!confirmed) {
    io.info('Owner password reset cancelled. No access state was changed.')
    return 1
  }

  const password = await io.secure('Enter replacement owner password')
  const confirmation = await io.secure('Confirm replacement owner password')
  if (password !== confirmation) {
    io.warning('Password confirmation did not match. No access state was changed.')
    return 1
  }

  await service.resetPassword(password)
  io.info('Owner password was reset. Every browser session must sign in again.')
  return 0
}

export default class ResetOwner extends BaseCommand {
  static commandName = 'owner:reset'
  static description = 'Interactively reset the GraphiteMD owner password and sessions'

  async run() {
    const service = new OwnerSetupService(resolveSecurityStateDirectory())
    this.exitCode = await runOwnerReset(
      {
        confirm: (message) => this.prompt.confirm(message),
        secure: (message) => this.prompt.secure(message),
        info: (message) => this.logger.info(message),
        warning: (message) => this.logger.warning(message),
      },
      service
    )
  }
}
