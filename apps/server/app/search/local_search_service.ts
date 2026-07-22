import { randomUUID } from 'node:crypto'
import { lstat, mkdir, realpath, rename, rm, stat } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'
import Database from 'better-sqlite3'
import { WorkspaceResourceUnavailableError, type ConfiguredWorkspaceAuthority } from '@graphitemd/workspace'

export interface LocalSearchResult {
  resourceId: string
  title: string
  displayPath: string
  snippet: string | null
}

export class LocalSearchUnavailableError extends Error {
  constructor() {
    super('The local search index is unavailable.')
    this.name = 'LocalSearchUnavailableError'
  }
}

export class LocalSearchService {
  readonly databasePath: string

  constructor(
    private readonly workspaceRoot: string,
    private readonly workspace: ConfiguredWorkspaceAuthority,
    private readonly options: Readonly<{ beforeCommit?: () => Promise<void> }> = {},
  ) {
    this.databasePath = join(workspaceRoot, '.graphitemd', 'cache', 'search.sqlite')
  }

  async rebuild(): Promise<{ indexed: number }> {
    const snapshot = await this.workspace.refresh()
    const cacheDirectory = join(this.workspaceRoot, '.graphitemd', 'cache')
    const retainedCache = await ensureConfinedDirectory(this.workspaceRoot, ['.graphitemd', 'cache'])
    await assertOrdinaryDatabase(this.databasePath)
    const temporaryPath = join(cacheDirectory, `.search.${randomUUID()}.sqlite`)
    const database = new Database(temporaryPath)
    let temporaryOwnedByPath = true
    try {
      database.exec(`
        PRAGMA journal_mode = DELETE;
        CREATE VIRTUAL TABLE notes USING fts5(
          resource_id UNINDEXED,
          title,
          display_path,
          frontmatter,
          body,
          tokenize = 'unicode61'
        );
      `)
      const insert = database.prepare(
        'INSERT INTO notes (resource_id, title, display_path, frontmatter, body) VALUES (?, ?, ?, ?, ?)',
      )
      const transaction = database.transaction((rows: Array<[string, string, string, string, string]>) => {
        for (const row of rows) insert.run(...row)
      })
      const rows: Array<[string, string, string, string, string]> = []
      for (const item of snapshot.notes) {
        let note
        try {
          note = await this.workspace.readNote(item.resourceId)
        } catch (error) {
          if (error instanceof WorkspaceResourceUnavailableError) throw new LocalSearchUnavailableError()
          throw error
        }
        rows.push([
          note.resourceId,
          basename(note.displayPath, '.md'),
          note.displayPath,
          note.yamlProperties.map(({ name, value }) => `${name} ${JSON.stringify(value)}`).join('\n'),
          note.source,
        ])
      }
      transaction(rows)
      database.close()
      await this.options.beforeCommit?.()
      const currentCache = await directoryIdentity(cacheDirectory, this.workspaceRoot)
      if (!sameDirectory(retainedCache, currentCache)) {
        temporaryOwnedByPath = false
        throw new LocalSearchUnavailableError()
      }
      await rename(temporaryPath, this.databasePath)
      temporaryOwnedByPath = false
      return { indexed: rows.length }
    } catch (error) {
      if (database.open) database.close()
      if (temporaryOwnedByPath) await rm(temporaryPath, { force: true })
      throw error
    }
  }

  async search(query: string, limit = 30): Promise<LocalSearchResult[]> {
    const normalized = normalizeQuery(query)
    if (!normalized) return []
    await this.rebuild()
    try {
      const database = new Database(this.databasePath, { readonly: true, fileMustExist: true })
      try {
        const boundedLimit = Math.max(1, Math.min(limit, 100))
        const rows = database.prepare(`
          SELECT resource_id AS resourceId, title, display_path AS displayPath,
            snippet(notes, -1, '', '', ' … ', 20) AS snippet
          FROM notes WHERE notes MATCH ?
          ORDER BY bm25(notes), display_path LIMIT ?
        `).all(normalized, boundedLimit) as LocalSearchResult[]
        return rows.map((row) => ({ ...row, snippet: row.snippet ? row.snippet.slice(0, 320) : null }))
      } finally {
        database.close()
      }
    } catch {
      throw new LocalSearchUnavailableError()
    }
  }
}

type DirectoryIdentity = Readonly<{ canonicalPath: string; device: bigint; inode: bigint }>

async function directoryIdentity(path: string, root: string): Promise<DirectoryIdentity> {
  const metadata = await stat(path, { bigint: true })
  const canonicalPath = await realpath(path)
  const expectedCanonicalPath = join(await realpath(root), relative(root, path))
  if (!metadata.isDirectory() || canonicalPath !== expectedCanonicalPath) {
    throw new LocalSearchUnavailableError()
  }
  return { canonicalPath, device: metadata.dev, inode: metadata.ino }
}

function sameDirectory(left: DirectoryIdentity, right: DirectoryIdentity): boolean {
  return left.canonicalPath === right.canonicalPath && left.device === right.device && left.inode === right.inode
}

async function ensureConfinedDirectory(root: string, segments: readonly string[]): Promise<DirectoryIdentity> {
  let current = root
  for (const segment of segments) {
    current = join(current, segment)
    try {
      const metadata = await lstat(current)
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new LocalSearchUnavailableError()
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      try {
        await mkdir(current, { mode: 0o700 })
      } catch (creationError) {
        if ((creationError as NodeJS.ErrnoException).code !== 'EEXIST') throw creationError
      }
      const metadata = await lstat(current)
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new LocalSearchUnavailableError()
    }
  }
  return directoryIdentity(current, root)
}

function normalizeQuery(query: string): string | null {
  const terms = query.match(/[\p{L}\p{N}_]+/gu) ?? []
  const unique = [...new Set(terms.map((term) => term.toLocaleLowerCase()))]
  return unique.length ? unique.map((term) => `"${term.replaceAll('"', '""')}"*`).join(' AND ') : null
}

async function assertOrdinaryDatabase(path: string): Promise<void> {
  const metadata = await lstat(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  if (metadata && (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1)) {
    throw new LocalSearchUnavailableError()
  }
}
