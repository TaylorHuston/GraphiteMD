import { chmod, mkdir } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { Scrypt } from '@adonisjs/hash/drivers/scrypt'

const DATABASE_FILE = 'security.sqlite'
const OWNER_ID = 1

export class OwnerAlreadyExistsError extends Error {
  constructor() {
    super('An owner account already exists')
    this.name = 'OwnerAlreadyExistsError'
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

  async #openDatabase(): Promise<DatabaseSync> {
    await mkdir(this.#stateDirectory, { recursive: true, mode: 0o700 })
    await chmod(this.#stateDirectory, 0o700)
    const database = new DatabaseSync(this.#databasePath)
    await chmod(this.#databasePath, 0o600)
    database.exec(`
      CREATE TABLE IF NOT EXISTS owners (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        password_hash TEXT NOT NULL
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
    return database
  }
}
