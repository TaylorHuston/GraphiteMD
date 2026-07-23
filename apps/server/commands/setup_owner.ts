import { BaseCommand } from '@adonisjs/core/ace'

import {
  OwnerSetupService,
  resolveSecurityStateDirectory,
} from '../app/security/owner_setup_service.js'

export interface OwnerSetupCommandIo {
  secure(message: string): Promise<string>
  info(message: string): void
  warning(message: string): void
}

export async function runOwnerSetup(
  io: OwnerSetupCommandIo,
  service: OwnerSetupService
): Promise<number> {
  if (await service.hasOwner()) {
    io.warning('An owner account already exists. Use the explicit owner password reset command.')
    return 1
  }

  const password = await io.secure('Enter owner password')
  const confirmation = await io.secure('Confirm owner password')
  if (password !== confirmation) {
    io.warning('Password confirmation did not match. No owner account was created.')
    return 1
  }

  await service.createOwner(password)
  io.info('Owner account is ready.')
  return 0
}

export default class SetupOwner extends BaseCommand {
  static commandName = 'owner:setup'
  static description = 'Interactively establish the first AnthraciteMD owner account'

  async run() {
    const service = new OwnerSetupService(resolveSecurityStateDirectory())
    this.exitCode = await runOwnerSetup(
      {
        secure: (message) => this.prompt.secure(message),
        info: (message) => this.logger.info(message),
        warning: (message) => this.logger.warning(message),
      },
      service
    )
  }
}
