import { mkdir, mkdtemp, readFile, stat, symlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { describe, expect, it } from 'vitest'

import {
  OwnerAlreadyExistsError,
  OwnerSetupService,
  PasswordPolicyError,
  migrateImplicitSecurityStateDirectory,
  resolveSecurityStateDirectory,
} from '../../app/security/owner_setup_service.js'

describe('AMD-001/S1 R1 host-local owner setup', () => {
  it('AMD-004/S1 R2-S1 defaults secret state to the machine vault and rejects workspace-local overrides', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'anthracitemd-workspace-'))
    expect(resolveSecurityStateDirectory({})).toBe(join(homedir(), '.anthracitemd'))
    expect(() => resolveSecurityStateDirectory({
      GRAPHITEMD_WORKSPACE_ROOT: workspaceRoot,
      GRAPHITEMD_STATE_DIR: join(workspaceRoot, '.graphitemd'),
    })).toThrow('must resolve outside')
  })

  it('AMD-001/S1 R4-S2 atomically migrates the implicit machine state and preserves provider files', async () => {
    const fakeHome = await mkdtemp(join(tmpdir(), 'anthracitemd-home-'))
    const legacy = join(fakeHome, '.graphitemd')
    await mkdir(join(legacy, 'assistant', 'pi'), { recursive: true })
    await writeFile(join(legacy, 'assistant', 'pi', 'auth.json'), '{"provider":"preserved"}\n')
    await new OwnerSetupService(legacy).createOwner('preserved owner password')

    expect(migrateImplicitSecurityStateDirectory(fakeHome)).toBe(join(fakeHome, '.anthracitemd'))
    expect(await readFile(join(fakeHome, '.anthracitemd', 'assistant', 'pi', 'auth.json'), 'utf8'))
      .toBe('{"provider":"preserved"}\n')
    await expect(new OwnerSetupService(join(fakeHome, '.anthracitemd')).verifyPassword('preserved owner password'))
      .resolves.toBe(true)
    await expect(stat(legacy)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each([
    ['both paths exist', async (home: string) => {
      await mkdir(join(home, '.graphitemd'))
      await mkdir(join(home, '.anthracitemd'))
    }],
    ['legacy is a symlink', async (home: string) => {
      const outside = await mkdtemp(join(tmpdir(), 'anthracitemd-outside-'))
      await symlink(outside, join(home, '.graphitemd'))
    }],
    ['canonical is a symlink', async (home: string) => {
      const outside = await mkdtemp(join(tmpdir(), 'anthracitemd-outside-'))
      await mkdir(join(home, '.graphitemd'))
      await symlink(outside, join(home, '.anthracitemd'))
    }],
  ])('AMD-001/S1 R4-S2 fails closed when %s', async (_case, arrange) => {
    const fakeHome = await mkdtemp(join(tmpdir(), 'anthracitemd-home-'))
    await arrange(fakeHome)
    expect(() => migrateImplicitSecurityStateDirectory(fakeHome)).toThrow()
    await expect(stat(join(fakeHome, '.graphitemd'))).resolves.toBeDefined()
  })

  it('AMD-001/S1 R4-S2 keeps explicit state overrides exact', () => {
    const explicit = join(tmpdir(), 'operator-owned-anthracitemd-state')
    expect(resolveSecurityStateDirectory({ ANTHRACITEMD_STATE_DIR: explicit })).toBe(explicit)
  })

  it('AMD-001/S1 R4-S2 rejects unsafe implicit placement before migrating legacy state', async () => {
    const fakeHome = await mkdtemp(join(tmpdir(), 'anthracitemd-home-'))
    const legacy = join(fakeHome, '.graphitemd')
    await mkdir(legacy)
    await writeFile(join(legacy, 'preserved.txt'), 'legacy state\n')

    expect(() => migrateImplicitSecurityStateDirectory(fakeHome, fakeHome)).toThrow('must resolve outside')
    await expect(readFile(join(legacy, 'preserved.txt'), 'utf8')).resolves.toBe('legacy state\n')
    await expect(stat(join(fakeHome, '.anthracitemd'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('AMD-004/S1 R2-S1 rejects a state override whose symlinked ancestor enters the workspace', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'anthracitemd-state-parent-'))
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'anthracitemd-workspace-'))
    const linked = join(parent, 'linked')
    await symlink(workspaceRoot, linked)

    await expect(new OwnerSetupService(join(linked, 'state'), workspaceRoot).hasOwner())
      .rejects.toThrow('must not traverse')
  })

  it('R1-S1 stores only a password hash in machine-local security state', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-security-'))
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
    const stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-security-'))
    const service = new OwnerSetupService(stateDirectory)

    await service.createOwner('original password')

    await expect(service.createOwner('replacement password')).rejects.toBeInstanceOf(
      OwnerAlreadyExistsError
    )
    expect(await service.verifyPassword('original password')).toBe(true)
    expect(await service.verifyPassword('replacement password')).toBe(false)
  })
})

describe('AMD-001/S2 owner credential maintenance', () => {
  it('R2-S1 upgrades legacy owner/session tables before installing generation guards', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-security-'))
    const databasePath = join(stateDirectory, 'security.sqlite')
    const legacy = new DatabaseSync(databasePath)
    legacy.exec(`
      CREATE TABLE owners (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        password_hash TEXT NOT NULL
      ) STRICT;
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        user_id TEXT,
        expires_at TEXT NOT NULL
      ) STRICT
    `)
    legacy.prepare('INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)').run(
      'legacy-session',
      JSON.stringify({ message: { auth_web: 1, graphitemd_auth_generation: 0 } }),
      new Date(Date.now() + 60_000).toISOString(),
    )
    legacy.close()

    await expect(new OwnerSetupService(stateDirectory).hasOwner()).resolves.toBe(false)

    const migrated = new DatabaseSync(databasePath)
    const ownerColumns = migrated.prepare('PRAGMA table_info(owners)').all() as Array<{ name: string }>
    const triggers = migrated.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'").all() as Array<{ name: string }>
    const sessions = migrated.prepare('SELECT id FROM sessions').all()
    migrated.close()
    expect(ownerColumns.map(({ name }) => name)).toContain('revocation_generation')
    expect(sessions).toEqual([])
    expect(triggers.map(({ name }) => name)).toEqual(expect.arrayContaining([
      'anthracitemd_reject_revoked_session_insert',
      'anthracitemd_reject_revoked_session_update',
    ]))
  })

  it('R1-S1 does not let an old-password authentication complete after credential revocation', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-security-'))
    const loginService = new OwnerSetupService(stateDirectory)
    const maintenanceService = new OwnerSetupService(stateDirectory)
    await loginService.createOwner('original password')

    let releaseSession!: () => void
    const sessionCanComplete = new Promise<void>((resolve) => {
      releaseSession = resolve
    })
    let sessionIssuanceStarted!: () => void
    const sessionIssuanceDidStart = new Promise<void>((resolve) => {
      sessionIssuanceStarted = resolve
    })

    const login = loginService.authenticate('original password', async () => {
      sessionIssuanceStarted()
      await sessionCanComplete
    })
    await sessionIssuanceDidStart

    let passwordChangeCompleted = false
    const passwordChange = maintenanceService
      .changePassword('original password', 'replacement password')
      .then((result) => {
        passwordChangeCompleted = true
        return result
      })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(passwordChangeCompleted).toBe(false)

    releaseSession()
    await expect(login).resolves.toBe(true)
    await expect(passwordChange).resolves.toBe(true)
    await expect(loginService.authenticate('original password', async () => {})).resolves.toBe(false)
  })

  it('R2-S1 rejects and cleans up a session issued across a host-reset generation change', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-security-'))
    const service = new OwnerSetupService(stateDirectory)
    await service.createOwner('original password')
    let sessionWasInvalidated = false

    const authenticated = await service.authenticate(
      'original password',
      async () => {
        const externalProcess = new DatabaseSync(join(stateDirectory, 'security.sqlite'))
        externalProcess
          .prepare('UPDATE owners SET revocation_generation = revocation_generation + 1 WHERE id = 1')
          .run()
        externalProcess.close()
      },
      async () => {
        sessionWasInvalidated = true
      }
    )

    expect(authenticated).toBe(false)
    expect(sessionWasInvalidated).toBe(true)
  })

  it('R1-S1 atomically replaces a proven password and invalidates every session', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-security-'))
    const service = new OwnerSetupService(stateDirectory)
    await service.createOwner('original password')

    expect(await service.changePassword('original password', 'replacement password')).toBe(true)

    expect(await service.verifyPassword('original password')).toBe(false)
    expect(await service.verifyPassword('replacement password')).toBe(true)
  })

  it('R2-S1 atomically replaces a forgotten password', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-security-'))
    const service = new OwnerSetupService(stateDirectory)
    await service.createOwner('forgotten password')

    await service.resetPassword('recovered password')

    expect(await service.verifyPassword('forgotten password')).toBe(false)
    expect(await service.verifyPassword('recovered password')).toBe(true)
  })

  it('R2-S2 rolls back the credential when session invalidation fails before commit', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-security-'))
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

describe('AMD-001 password input policy', () => {
  it('applies one UTF-8 byte policy to setup, verification, change, and reset', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-security-'))
    const service = new OwnerSetupService(stateDirectory)
    await expect(service.createOwner('short')).rejects.toBeInstanceOf(PasswordPolicyError)
    await service.createOwner('valid password')
    await expect(service.verifyPassword('x'.repeat(1025))).resolves.toBe(false)
    await expect(service.changePassword('valid password', 'tiny')).rejects.toBeInstanceOf(PasswordPolicyError)
    await expect(service.resetPassword('tiny')).rejects.toBeInstanceOf(PasswordPolicyError)
    expect(await service.verifyPassword('valid password')).toBe(true)
  })
})
