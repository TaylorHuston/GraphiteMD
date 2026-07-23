import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfiguredWorkspaceAuthority } from '@anthracitemd/workspace'
import { LocalSearchService } from './local_search_service.js'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'anthracitemd-search-'))
  roots.push(root)
  const authority = new ConfiguredWorkspaceAuthority(root)
  const service = new LocalSearchService(root, authority)
  return { root, authority, service }
}

describe('AMD-002/S3 local search', () => {
  it('R1-S1 searches title, path, frontmatter, and body with opaque bounded results', async () => {
    const { root, authority, service } = await fixture()
    await mkdir(join(root, 'Projects'))
    await writeFile(join(root, 'Projects', 'Roadmap.md'), '---\nowner: Taylor\n---\n# Plan\nGraphite launch details\n')
    await authority.openConfigured()

    for (const query of ['Roadmap', 'Projects', 'Taylor', 'launch']) {
      await expect(service.search(query)).resolves.toMatchObject([
        { resourceId: expect.stringMatching(/^res_/), title: 'Roadmap', displayPath: 'Projects/Roadmap.md' },
      ])
    }
    const [result] = await service.search('launch')
    expect(result!.snippet!.length).toBeLessThanOrEqual(320)
    expect(JSON.stringify(result)).not.toContain(root)
  })

  it('R1-S2 returns empty results for empty, punctuation-only, and unmatched queries', async () => {
    const { root, authority, service } = await fixture()
    await writeFile(join(root, 'Known.md'), '# Known\n')
    await authority.openConfigured()
    await expect(service.search('')).resolves.toEqual([])
    await expect(service.search('---')).resolves.toEqual([])
    await expect(service.search('absent')).resolves.toEqual([])
  })

  it('R2-S1 rebuilds an equivalent disposable index after deletion', async () => {
    const { root, authority, service } = await fixture()
    await writeFile(join(root, 'Known.md'), '# Known\nneedle\n')
    await authority.openConfigured()
    const before = await service.search('needle')
    await rm(service.databasePath)
    const after = await service.search('needle')
    expect(after).toEqual(before)
    expect(await readFile(join(root, 'Known.md'), 'utf8')).toContain('needle')
  })

  it('R2-S2 reconciles external create, edit, rename, and delete before answering', async () => {
    const { root, authority, service } = await fixture()
    await writeFile(join(root, 'Before.md'), '# Before\noldterm\n')
    await authority.openConfigured()
    expect(await service.search('oldterm')).toHaveLength(1)
    await writeFile(join(root, 'Before.md'), '# Before\nnewterm\n')
    expect(await service.search('oldterm')).toEqual([])
    await rename(join(root, 'Before.md'), join(root, 'After.md'))
    expect(await service.search('After')).toHaveLength(1)
    await rm(join(root, 'After.md'))
    expect(await service.search('newterm')).toEqual([])
  })

  it('R1-S3 reports a recoverable index failure when a refreshed note disappears before reading', async () => {
    const { root, authority } = await fixture()
    const notePath = join(root, 'Transient.md')
    await writeFile(notePath, '# Transient\nneedle\n')
    await authority.openConfigured()
    let removeBeforeRead = true
    const unstableAuthority = {
      refresh: () => authority.refresh(),
      readNote: async (resourceId: string) => {
        if (removeBeforeRead) {
          removeBeforeRead = false
          await rm(notePath)
        }
        return authority.readNote(resourceId)
      },
    } as unknown as ConfiguredWorkspaceAuthority
    const service = new LocalSearchService(root, unstableAuthority)

    await expect(service.rebuild()).rejects.toMatchObject({ name: 'LocalSearchUnavailableError' })
  })

  it('R2-S3 never indexes .anthracitemd Markdown state', async () => {
    const { root, authority, service } = await fixture()
    await mkdir(join(root, '.anthracitemd'))
    await writeFile(join(root, '.anthracitemd', 'Secret.md'), '# Secret\nforbiddenword\n')
    await writeFile(join(root, 'Visible.md'), '# Visible\nallowedword\n')
    await authority.openConfigured()
    await expect(service.search('forbiddenword')).resolves.toEqual([])
    await expect(service.search('allowedword')).resolves.toHaveLength(1)
  })

  it('R2-S3 refuses a cache path redirected through a symbolic link', async () => {
    const { root, authority, service } = await fixture()
    const outside = await mkdtemp(join(tmpdir(), 'anthracitemd-search-outside-'))
    roots.push(outside)
    await writeFile(join(root, 'Visible.md'), '# Visible\nneedle\n')
    await symlink(outside, join(root, '.anthracitemd'))
    await expect(authority.openConfigured()).rejects.toThrow('unavailable')
    await expect(service.search('needle')).rejects.toThrow('unavailable')
    await expect(readFile(join(outside, 'cache', 'search.sqlite'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
