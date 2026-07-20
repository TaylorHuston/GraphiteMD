import { chmod, lstat, mkdir, realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { Scrypt } from '@adonisjs/hash/drivers/scrypt'
import {
  acceptsPasswordInput,
  requirePassword,
} from '@graphitemd/domain'

export {
  acceptsPasswordInput,
  PASSWORD_MAXIMUM_BYTES,
  PASSWORD_MINIMUM_BYTES,
  PasswordPolicyError,
} from '@graphitemd/domain'

const DATABASE_FILE = 'security.sqlite'
const OWNER_ID = 1

export const AUTH_REVOCATION_GENERATION_SESSION_KEY = 'graphitemd_auth_generation'

class CredentialLock {
  #tail = Promise.resolve()

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#tail
    let release!: () => void
    this.#tail = new Promise<void>((resolve) => {
      release = resolve
    })
    await previous
    try {
      return await operation()
    } finally {
      release()
    }
  }
}

const credentialLocks = new Map<string, CredentialLock>()

function credentialLock(databasePath: string): CredentialLock {
  let lock = credentialLocks.get(databasePath)
  if (!lock) {
    lock = new CredentialLock()
    credentialLocks.set(databasePath, lock)
  }
  return lock
}
export class OwnerAlreadyExistsError extends Error {
  constructor() {
    super('An owner account already exists')
    this.name = 'OwnerAlreadyExistsError'
  }
}

export class OwnerNotFoundError extends Error {
  constructor() {
    super('No owner account exists')
    this.name = 'OwnerNotFoundError'
  }
}

export function resolveSecurityStateDirectory(environment = process.env): string {
  const configured = environment.GRAPHITEMD_STATE_DIR?.trim()
  if (configured && !isAbsolute(configured)) {
    throw new Error('GRAPHITEMD_STATE_DIR must be an absolute path')
  }
  const stateDirectory = configured ? resolve(configured) : join(homedir(), '.graphitemd')
  const workspaceRoot = environment.GRAPHITEMD_WORKSPACE_ROOT?.trim()
  if (workspaceRoot && isInside(resolve(workspaceRoot), stateDirectory)) {
    throw new Error('GRAPHITEMD_STATE_DIR must resolve outside GRAPHITEMD_WORKSPACE_ROOT')
  }
  return stateDirectory
}

function isInside(root: string, candidate: string): boolean {
  const path = relative(root, candidate)
  return path === '' || (path !== '..' && !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(path))
}

async function nearestExistingAncestor(path: string): Promise<string> {
  let current = path
  while (true) {
    try {
      await lstat(current)
      return current
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      const parent = dirname(current)
      if (parent === current) throw error
      current = parent
    }
  }
}

/** Denies a configured state path that reaches the workspace through a symlinked ancestor. */
export async function assertMachineLocalStateDirectory(
  stateDirectory: string,
  workspaceRoot = process.env.GRAPHITEMD_WORKSPACE_ROOT,
): Promise<void> {
  if (!workspaceRoot?.trim()) return
  const configuredWorkspace = resolve(workspaceRoot)
  if (isInside(configuredWorkspace, stateDirectory)) {
    throw new Error('Machine-local state must not be stored inside the configured workspace')
  }
  const ancestor = await nearestExistingAncestor(stateDirectory)
  const canonicalWorkspace = await realpath(configuredWorkspace).catch(() => configuredWorkspace)
  const canonicalState = resolve(await realpath(ancestor), relative(ancestor, stateDirectory))
  if (isInside(canonicalWorkspace, canonicalState)) {
    throw new Error('Machine-local state must not traverse into the configured workspace')
  }
}

export class OwnerSetupService {
  readonly #databasePath: string
  readonly #stateDirectory: string
  readonly #hasher = new Scrypt({})
  readonly #credentialLock: CredentialLock

  constructor(stateDirectory: string, private readonly workspaceRoot = process.env.GRAPHITEMD_WORKSPACE_ROOT) {
    if (!isAbsolute(stateDirectory)) {
      throw new Error('Security state directory must be an absolute path')
    }
    this.#stateDirectory = resolve(stateDirectory)
    this.#databasePath = join(this.#stateDirectory, DATABASE_FILE)
    this.#credentialLock = credentialLock(this.#databasePath)
  }

  async hasOwner(): Promise<boolean> {
    const database = await this.#openDatabase()
    try {
      return database.prepare('SELECT 1 FROM owners WHERE id = ?').get(OWNER_ID) !== undefined
    } finally {
      database.close()
    }
  }

  async createOwner(password: string): Promise<void> {
    requirePassword(password)
    const passwordHash = await this.#hasher.make(password)
    const database = await this.#openDatabase()
    try {
      database.exec('BEGIN IMMEDIATE')
      if (database.prepare('SELECT 1 FROM owners WHERE id = ?').get(OWNER_ID)) {
        database.exec('ROLLBACK')
        throw new OwnerAlreadyExistsError()
      }
      database
        .prepare('INSERT INTO owners (id, password_hash) VALUES (?, ?)')
        .run(OWNER_ID, passwordHash)
      database.exec('COMMIT')
    } catch (error) {
      if (database.isTransaction) database.exec('ROLLBACK')
      throw error
    } finally {
      database.close()
    }
  }

  async verifyPassword(password: string): Promise<boolean> {
    if (!acceptsPasswordInput(password)) return false
    const database = await this.#openDatabase()
    try {
      const owner = database
        .prepare('SELECT password_hash FROM owners WHERE id = ?')
        .get(OWNER_ID) as { password_hash: string } | undefined
      return owner ? this.#hasher.verify(owner.password_hash, password) : false
    } finally {
      database.close()
    }
  }

  async authenticate(
    password: string,
    establishSession: (revocationGeneration: number) => Promise<boolean | void>,
    invalidateSession: () => Promise<void> = async () => {},
  ): Promise<boolean> {
    if (!acceptsPasswordInput(password)) return false
    return this.#credentialLock.run(async () => {
      const database = await this.#openDatabase()
      let owner: { password_hash: string; revocation_generation: number } | undefined
      try {
        owner = database
          .prepare('SELECT password_hash, revocation_generation FROM owners WHERE id = ?')
          .get(OWNER_ID) as typeof owner
      } finally {
        database.close()
      }
      if (!owner || !(await this.#hasher.verify(owner.password_hash, password))) return false
      if ((await establishSession(owner.revocation_generation)) === false) return false

      const generationDatabase = await this.#openDatabase()
      let generation: number | undefined
      try {
        generation = (generationDatabase
          .prepare('SELECT revocation_generation FROM owners WHERE id = ?')
          .get(OWNER_ID) as { revocation_generation: number } | undefined)?.revocation_generation
      } finally {
        generationDatabase.close()
      }
      if (generation !== owner.revocation_generation) {
        await invalidateSession()
        return false
      }
      return true
    })
  }

  async isCurrentRevocationGeneration(generation: unknown): Promise<boolean> {
    if (!Number.isSafeInteger(generation) || (generation as number) < 0) return false
    const database = await this.#openDatabase()
    try {
      const owner = database
        .prepare('SELECT revocation_generation FROM owners WHERE id = ?')
        .get(OWNER_ID) as { revocation_generation: number } | undefined
      return owner?.revocation_generation === generation
    } finally {
      database.close()
    }
  }

  async changePassword(currentPassword: string, replacementPassword: string): Promise<boolean> {
    if (!acceptsPasswordInput(currentPassword)) return false
    requirePassword(replacementPassword)
    return this.#credentialLock.run(async () => {
      const database = await this.#openDatabase()
      try {
        const owner = database
          .prepare('SELECT password_hash FROM owners WHERE id = ?')
          .get(OWNER_ID) as { password_hash: string } | undefined
        if (!owner || !(await this.#hasher.verify(owner.password_hash, currentPassword))) return false

        const replacementHash = await this.#hasher.make(replacementPassword)
        database.exec('BEGIN IMMEDIATE')
        const result = database
          .prepare(`
            UPDATE owners
            SET password_hash = ?, revocation_generation = revocation_generation + 1
            WHERE id = ? AND password_hash = ?
          `)
          .run(replacementHash, OWNER_ID, owner.password_hash)
        if (result.changes !== 1) {
          database.exec('ROLLBACK')
          return false
        }
        database.prepare('DELETE FROM sessions').run()
        database.exec('COMMIT')
        return true
      } catch (error) {
        if (database.isTransaction) database.exec('ROLLBACK')
        throw error
      } finally {
        database.close()
      }
    })
  }

  async resetPassword(replacementPassword: string): Promise<void> {
    requirePassword(replacementPassword)
    const replacementHash = await this.#hasher.make(replacementPassword)
    await this.#credentialLock.run(async () => {
      const database = await this.#openDatabase()
      try {
        database.exec('BEGIN IMMEDIATE')
        const result = database
          .prepare(`
            UPDATE owners
            SET password_hash = ?, revocation_generation = revocation_generation + 1
            WHERE id = ?
          `)
          .run(replacementHash, OWNER_ID)
        if (result.changes !== 1) {
          database.exec('ROLLBACK')
          throw new OwnerNotFoundError()
        }
        database.prepare('DELETE FROM sessions').run()
        database.exec('COMMIT')
      } catch (error) {
        if (database.isTransaction) database.exec('ROLLBACK')
        throw error
      } finally {
        database.close()
      }
    })
  }

  async #openDatabase(): Promise<DatabaseSync> {
    await assertMachineLocalStateDirectory(this.#stateDirectory, this.workspaceRoot)
    await mkdir(this.#stateDirectory, { recursive: true, mode: 0o700 })
    const metadata = await lstat(this.#stateDirectory)
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error('Security state directory is unavailable')
    }
    await chmod(this.#stateDirectory, 0o700)
    const database = new DatabaseSync(this.#databasePath)
    await chmod(this.#databasePath, 0o600)
    database.exec(`
      CREATE TABLE IF NOT EXISTS owners (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        password_hash TEXT NOT NULL,
        revocation_generation INTEGER NOT NULL DEFAULT 0
      ) STRICT;
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        user_id TEXT,
        expires_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS sessions_user_id_index ON sessions (user_id);
      CREATE INDEX IF NOT EXISTS sessions_expires_at_index ON sessions (expires_at);
      CREATE TRIGGER IF NOT EXISTS reject_revoked_session_insert
      BEFORE INSERT ON sessions
      WHEN json_extract(NEW.data, '$.message.auth_web') IS NOT NULL
        AND json_extract(NEW.data, '$.message.graphitemd_auth_generation') IS NOT (
          SELECT revocation_generation FROM owners WHERE id = 1
        )
      BEGIN
        SELECT RAISE(ABORT, 'session credential generation is no longer current');
      END;
      CREATE TRIGGER IF NOT EXISTS reject_revoked_session_update
      BEFORE UPDATE OF data ON sessions
      WHEN json_extract(NEW.data, '$.message.auth_web') IS NOT NULL
        AND json_extract(NEW.data, '$.message.graphitemd_auth_generation') IS NOT (
          SELECT revocation_generation FROM owners WHERE id = 1
        )
      BEGIN
        SELECT RAISE(ABORT, 'session credential generation is no longer current');
      END
    `)
    const ownerColumns = database.prepare('PRAGMA table_info(owners)').all() as Array<{ name: string }>
    if (!ownerColumns.some(({ name }) => name === 'revocation_generation')) {
      database.exec(
        'ALTER TABLE owners ADD COLUMN revocation_generation INTEGER NOT NULL DEFAULT 0'
      )
    }
    return database
  }
}
