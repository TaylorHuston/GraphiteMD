import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

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

describe('GMD-001/S2 owner credential maintenance', () => {
  it('R1-S1 atomically replaces a proven password and invalidates every session', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'graphitemd-security-'))
    const service = new OwnerSetupService(stateDirectory)
    await service.createOwner('original password')

    expect(await service.changePassword('original password', 'replacement password')).toBe(true)

    expect(await service.verifyPassword('original password')).toBe(false)
    expect(await service.verifyPassword('replacement password')).toBe(true)
  })

  it('R2-S1 atomically replaces a forgotten password', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'graphitemd-security-'))
    const service = new OwnerSetupService(stateDirectory)
    await service.createOwner('forgotten password')

    await service.resetPassword('recovered password')

    expect(await service.verifyPassword('forgotten password')).toBe(false)
    expect(await service.verifyPassword('recovered password')).toBe(true)
  })

  it('R2-S2 rolls back the credential when session invalidation fails before commit', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'graphitemd-security-'))
    const service = new OwnerSetupService(stateDirectory)
    await service.createOwner('existing password')
    const database = new DatabaseSync(join(stateDirectory, 'security.sqlite'))
    database.prepare('INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)').run(
      'failure-fixture',
      '{}',
      '2099-01-01T00:00:00.000Z'
    )
    database.exec(`
      CREATE TRIGGER reject_session_deletion
      BEFORE DELETE ON sessions
      BEGIN
        SELECT RAISE(ABORT, 'fixture failure');
      END
    `)
    database.close()

    await expect(service.resetPassword('uncommitted password')).rejects.toThrow('fixture failure')

    expect(await service.verifyPassword('existing password')).toBe(true)
    expect(await service.verifyPassword('uncommitted password')).toBe(false)
  })
})
