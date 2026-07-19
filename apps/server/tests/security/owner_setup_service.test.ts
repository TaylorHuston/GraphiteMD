import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  OwnerAlreadyExistsError,
  OwnerSetupService,
} from '../../app/security/owner_setup_service.js'

describe('GMD-001/S1 R1 host-local owner setup', () => {
  it('R1-S1 stores only a password hash in machine-local security state', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'graphitemd-security-'))
    const service = new OwnerSetupService(stateDirectory)
    const password = 'correct horse battery staple'

    await service.createOwner(password)

    expect(await service.hasOwner()).toBe(true)
    expect(await service.verifyPassword(password)).toBe(true)
    expect(await service.verifyPassword('not the password')).toBe(false)

    const databasePath = join(stateDirectory, 'security.sqlite')
    const databaseBytes = await readFile(databasePath)
    expect(databaseBytes.includes(Buffer.from(password))).toBe(false)
    expect((await stat(databasePath)).mode & 0o777).toBe(0o600)
  })

  it('R1-S2 refuses to overwrite an existing owner', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'graphitemd-security-'))
    const service = new OwnerSetupService(stateDirectory)

    await service.createOwner('original password')

    await expect(service.createOwner('replacement password')).rejects.toBeInstanceOf(
      OwnerAlreadyExistsError
    )
    expect(await service.verifyPassword('original password')).toBe(true)
    expect(await service.verifyPassword('replacement password')).toBe(false)
  })
})
