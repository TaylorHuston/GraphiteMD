import { chmod, mkdir } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { Scrypt } from '@adonisjs/hash/drivers/scrypt'

const DATABASE_FILE = 'security.sqlite'
const OWNER_ID = 1
export const PASSWORD_MINIMUM_BYTES = 12
export const PASSWORD_MAXIMUM_BYTES = 1024

export class PasswordPolicyError extends Error {
  constructor() {
    super(`Password must be between ${PASSWORD_MINIMUM_BYTES} and ${PASSWORD_MAXIMUM_BYTES} UTF-8 bytes`)
    this.name = 'PasswordPolicyError'
  }
}

export function acceptsPasswordInput(password: unknown): password is string {
  if (typeof password !== 'string') return false
  const bytes = Buffer.byteLength(password, 'utf8')
  return bytes >= PASSWORD_MINIMUM_BYTES && bytes <= PASSWORD_MAXIMUM_BYTES
}

function requirePassword(password: unknown): asserts password is string {
  if (!acceptsPasswordInput(password)) throw new PasswordPolicyError()
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
  if (!configured) {
    throw new Error('GRAPHITEMD_STATE_DIR must identify the machine-local state directory')
  }
  if (!isAbsolute(configured)) {
    throw new Error('GRAPHITEMD_STATE_DIR must be an absolute path')
  }
  return resolve(configured)
}

export class OwnerSetupService {
  readonly #databasePath: string
  readonly #stateDirectory: string
  readonly #hasher = new Scrypt({})

  constructor(stateDirectory: string) {
    if (!isAbsolute(stateDirectory)) {
      throw new Error('Security state directory must be an absolute path')
    }
    this.#stateDirectory = resolve(stateDirectory)
    this.#databasePath = join(this.#stateDirectory, DATABASE_FILE)
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

  async changePassword(currentPassword: string, replacementPassword: string): Promise<boolean> {
    if (!acceptsPasswordInput(currentPassword)) return false
    requirePassword(replacementPassword)
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
  }

  async resetPassword(replacementPassword: string): Promise<void> {
    requirePassword(replacementPassword)
    const replacementHash = await this.#hasher.make(replacementPassword)
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
  }

  async #openDatabase(): Promise<DatabaseSync> {
    await mkdir(this.#stateDirectory, { recursive: true, mode: 0o700 })
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
      CREATE INDEX IF NOT EXISTS sessions_expires_at_index ON sessions (expires_at)
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
