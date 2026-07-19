import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ConfiguredWorkspaceAuthority } from '@graphitemd/workspace'
import { afterEach, describe, expect, it } from 'vitest'

import { LocalSearchService } from '../../app/search/local_search_service.js'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

describe('GMD-002/S3 R2 confined local search rebuild', () => {
  it('supports a configured workspace root reached through a canonical symlink alias', async () => {
    const canonicalRoot = await mkdtemp(join(tmpdir(), 'graphitemd-search-canonical-'))
    const aliasRoot = `${canonicalRoot}-alias`
    roots.push(aliasRoot, canonicalRoot)
    await symlink(canonicalRoot, aliasRoot)
    await writeFile(join(canonicalRoot, 'Note.md'), '# Searchable\naliasedneedle\n')
    const authority = new ConfiguredWorkspaceAuthority(aliasRoot)
    await authority.openConfigured()
    const service = new LocalSearchService(aliasRoot, authority)

    await expect(service.search('aliasedneedle')).resolves.toMatchObject([
      { displayPath: 'Note.md' },
    ])
  })

  it('fails closed when the cache directory is replaced immediately before database commit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'graphitemd-search-'))
    const outside = await mkdtemp(join(tmpdir(), 'graphitemd-search-outside-'))
    roots.push(root, outside)
    await writeFile(join(root, 'Note.md'), '# Searchable\nneedle\n')
    const authority = new ConfiguredWorkspaceAuthority(root)
    await authority.openConfigured()
    const cache = join(root, '.graphite', 'cache')
    const retained = join(root, '.graphite', 'cache-retained')
    const service = new LocalSearchService(root, authority, {
      beforeCommit: async () => {
        await rename(cache, retained)
        await mkdir(cache)
      },
    })

    await expect(service.rebuild()).rejects.toMatchObject({ name: 'LocalSearchUnavailableError' })
    await expect(readFile(join(cache, 'search.sqlite'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(outside, 'search.sqlite'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
