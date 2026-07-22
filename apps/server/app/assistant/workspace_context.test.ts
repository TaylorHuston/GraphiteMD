import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'
import { ConfiguredWorkspaceAuthority } from '@graphitemd/workspace'
import { LocalSearchService } from '../search/local_search_service.js'
import { AssistantWorkspaceContext } from './workspace_context.js'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'graphitemd-assistant-context-'))
  roots.push(root)
  const workspace = new ConfiguredWorkspaceAuthority(root)
  const search = new LocalSearchService(root, workspace)
  return { root, workspace, context: new AssistantWorkspaceContext(workspace, search, { maxResults: 3, maxSourceBytes: 64, maxTotalBytes: 80 }) }
}

describe('GMD-004/S2 R2 confined context and provenance', () => {
  it('R2-S1 revalidates opaque resources and excludes internal or symlinked content before returning it to the model', async () => {
    const { root, workspace, context } = await fixture()
    await mkdir(join(root, '.graphitemd'))
    await writeFile(join(root, 'Visible.md'), '# Visible\nverified workspace fact')
    await writeFile(join(root, 'Other.md'), '# Other\nunsearched-only fact')
    await writeFile(join(root, '.graphitemd', 'Hidden.md'), '# Hidden\nsecret assistant state')
    await workspace.openConfigured()

    const results = await context.search('workspace')
    expect(results).toHaveLength(1)
    expect(results[0]?.snippet).toBeNull()
    await expect(context.read(results[0]!.resourceId)).resolves.toMatchObject({
      source: expect.objectContaining({ displayPath: 'Visible.md' }),
      text: expect.stringContaining('verified workspace fact'),
    })
    await expect(context.read('res_missing')).rejects.toMatchObject({ code: 'workspace_unavailable' })

    const [unsearched] = await new LocalSearchService(root, workspace).search('unsearched-only')
    await expect(context.read(unsearched!.resourceId)).rejects.toMatchObject({ code: 'workspace_unavailable' })

    const outside = await mkdtemp(join(tmpdir(), 'graphitemd-assistant-outside-'))
    roots.push(outside)
    await writeFile(join(outside, 'Outside.md'), '# Outside\nnever disclose')
    await symlink(join(outside, 'Outside.md'), join(root, 'Linked.md'))
    await expect(context.search('never')).resolves.toEqual([])
  })

  it('R2-S2 enforces deterministic per-source and total context budgets while recording truncation', async () => {
    const { root, workspace, context } = await fixture()
    await writeFile(join(root, 'First.md'), `# First\n${'1234567890'.repeat(10)}`)
    await writeFile(join(root, 'Second.md'), `# Second\n${'1234567890'.repeat(10)}`)
    await writeFile(join(root, 'Third.md'), `# Third\n${'1234567890'.repeat(10)}`)
    await workspace.openConfigured()
    const [first, second, third] = await context.search('1234567890')

    const firstRead = await context.read(first!.resourceId)
    expect(firstRead.text).toHaveLength(64)
    expect(firstRead.source.truncated).toBe(true)
    const secondRead = await context.read(second!.resourceId)
    expect(secondRead.text).toHaveLength(16)
    expect(secondRead.source.truncated).toBe(true)
    await expect(context.read(third!.resourceId)).rejects.toMatchObject({ code: 'context_limit' })
    expect(context.sources()).toEqual([firstRead.source, secondRead.source])
  })

  it('R2-S2 truncates at a valid UTF-8 boundary instead of publishing replacement characters', async () => {
    const { root, workspace } = await fixture()
    await writeFile(join(root, 'Unicode.md'), '# Unicode\n🙂🙂🙂')
    await workspace.openConfigured()
    const search = new LocalSearchService(root, workspace)
    const context = new AssistantWorkspaceContext(workspace, search, { maxSourceBytes: 14, maxTotalBytes: 14 })
    const [result] = await context.search('Unicode')

    const read = await context.read(result!.resourceId)
    expect(read.text).toBe('# Unicode\n🙂')
    expect(read.text).not.toContain('�')
    expect(read.source.truncated).toBe(true)
  })

  it('R2-S3 derives source evidence only from successful brokered reads', async () => {
    const { root, workspace, context } = await fixture()
    await writeFile(join(root, 'Evidence.md'), '# Evidence\nsource-only-after-read')
    await workspace.openConfigured()
    const [result] = await context.search('source-only')

    expect(context.sources()).toEqual([])
    await context.read(result!.resourceId)
    expect(context.sources()).toEqual([expect.objectContaining({ displayPath: 'Evidence.md' })])
  })
})
