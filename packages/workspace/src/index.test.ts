import { chmod, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfiguredWorkspaceAuthority } from './index.js'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

async function createWorkspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'graphitemd-workspace-'))
  temporaryDirectories.push(directory)
  return directory
}

describe('ConfiguredWorkspaceAuthority', () => {
  it('GMD-002/S1/R1-S1 opens the configured directory without exposing its host path', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Welcome.md'), '# Welcome\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)

    const workspace = await authority.openConfigured()

    expect(workspace).toMatchObject({
      available: true,
      workspaceId: expect.stringMatching(/^wrk_[a-z0-9]+$/),
      notes: [
        {
          kind: 'note',
          displayPath: 'Welcome.md',
          resourceId: expect.stringMatching(/^res_[a-f0-9]{64}$/),
        },
      ],
    })
    expect(JSON.stringify(workspace)).not.toContain(workspaceRoot)
  })

  it('GMD-002/S1/R1-S2 clears authority when the configured root changes identity', async () => {
    const workspaceRoot = await createWorkspace()
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const replacedRoot = `${workspaceRoot}-replaced`
    temporaryDirectories.push(replacedRoot)

    await rename(workspaceRoot, replacedRoot)
    await mkdir(workspaceRoot)

    await expect(authority.current()).resolves.toEqual({
      available: false,
      reason: 'identity_changed',
    })
    await expect(authority.current()).resolves.toEqual({ available: false, reason: 'identity_changed' })
    expect(JSON.stringify(await authority.current())).not.toContain(opened.workspaceId)
  })

  it('GMD-002/S1/R1-S2 never reauthorizes a replacement root in the same service lifetime', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Original.md'), '# Original\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    await authority.openConfigured()
    const retainedRoot = `${workspaceRoot}-retained`
    temporaryDirectories.push(retainedRoot)

    await rename(workspaceRoot, retainedRoot)
    await mkdir(workspaceRoot)
    await writeFile(join(workspaceRoot, 'Replacement.md'), '# Replacement\n', 'utf8')

    await expect(authority.current()).resolves.toEqual({ available: false, reason: 'identity_changed' })
    await expect(authority.refresh()).rejects.toMatchObject({
      name: 'WorkspaceUnavailableError',
      reason: 'identity_changed',
    })
    await expect(authority.openConfigured()).rejects.toMatchObject({
      name: 'WorkspaceUnavailableError',
      reason: 'identity_changed',
    })
    await expect(readFile(join(workspaceRoot, '.graphite', 'workspace.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('GMD-002/S1/R1-S2 fails closed for missing, non-directory, and unreadable roots', async () => {
    const fixture = await createWorkspace()
    const missingRoot = join(fixture, 'missing')
    const fileRoot = join(fixture, 'note.md')
    const unreadableRoot = join(fixture, 'unreadable')
    await writeFile(fileRoot, '# Not a workspace\n', 'utf8')
    await mkdir(unreadableRoot)
    await chmod(unreadableRoot, 0o000)

    try {
      for (const configuredRoot of [missingRoot, fileRoot, unreadableRoot]) {
        const authority = new ConfiguredWorkspaceAuthority(configuredRoot)
        await expect(authority.openConfigured()).rejects.toMatchObject({
          name: 'WorkspaceUnavailableError',
          reason: 'unavailable',
        })
        await expect(authority.current()).resolves.toEqual({
          available: false,
          reason: 'unavailable',
        })
      }
    } finally {
      await chmod(unreadableRoot, 0o700)
    }
  })

  it('GMD-002/S1/R1-S3 reconnects to the service-owned workspace identity', async () => {
    const workspaceRoot = await createWorkspace()
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)

    const opened = await authority.openConfigured()

    await expect(authority.current()).resolves.toEqual(opened)
    await expect(authority.current()).resolves.toBe(opened)
  })

  it('GMD-002/S1/R1-S3 keeps workspace and note identities stable across service restart', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Welcome.md'), '# Welcome\n', 'utf8')

    const first = await new ConfiguredWorkspaceAuthority(workspaceRoot).openConfigured()
    const restarted = await new ConfiguredWorkspaceAuthority(workspaceRoot).openConfigured()

    expect(restarted.workspaceId).toBe(first.workspaceId)
    expect(restarted.notes[0]?.resourceId).toBe(first.notes[0]?.resourceId)
    expect(JSON.parse(await readFile(join(workspaceRoot, '.graphite', 'workspace.json'), 'utf8')))
      .toEqual({ schemaVersion: 1, workspaceId: first.workspaceId })
    expect(await readFile(join(workspaceRoot, '.graphite', '.gitignore'), 'utf8'))
      .toBe('/cache/\n/operations/\n')
  })

  it('GMD-002/S1/R1-S1 fails closed for malformed persisted workspace identity', async () => {
    const workspaceRoot = await createWorkspace()
    await mkdir(join(workspaceRoot, '.graphite'))
    await writeFile(join(workspaceRoot, '.graphite', 'workspace.json'), '{"schemaVersion":2,"workspaceId":"bad"}')

    await expect(new ConfiguredWorkspaceAuthority(workspaceRoot).openConfigured()).rejects.toMatchObject({
      name: 'WorkspaceUnavailableError',
      reason: 'unavailable',
    })
  })

  it('GMD-002/S1/R1-S3 preserves an existing installation across open and restart', async () => {
    const workspaceRoot = await createWorkspace()
    const graphite = join(workspaceRoot, '.graphite')
    const pluginState = join(graphite, 'plugins', 'system-status', 'state.json')
    await mkdir(join(graphite, 'plugins', 'system-status'), { recursive: true })
    await writeFile(join(graphite, 'workspace.json'), JSON.stringify({
      schemaVersion: 1, workspaceId: 'wrk_0123456789abcdef0123456789abcdef',
    }))
    await writeFile(join(graphite, '.gitignore'), '# owner managed\n/custom-cache/\n')
    await writeFile(join(graphite, 'plugins.json'), '{"schemaVersion":1,"enabled":{"system-status":false}}\n')
    await writeFile(pluginState, '{"schemaVersion":1,"value":{"healthy":true}}\n')

    const first = await new ConfiguredWorkspaceAuthority(workspaceRoot).openConfigured()
    const restarted = await new ConfiguredWorkspaceAuthority(workspaceRoot).openConfigured()

    expect(first.workspaceId).toBe('wrk_0123456789abcdef0123456789abcdef')
    expect(restarted.workspaceId).toBe(first.workspaceId)
    expect(await readFile(join(graphite, '.gitignore'), 'utf8')).toBe('# owner managed\n/custom-cache/\n')
    expect(await readFile(join(graphite, 'plugins.json'), 'utf8'))
      .toBe('{"schemaVersion":1,"enabled":{"system-status":false}}\n')
    expect(await readFile(pluginState, 'utf8')).toBe('{"schemaVersion":1,"value":{"healthy":true}}\n')
  })

  it('GMD-002/S1/R2-S1 inventories nested Markdown in deterministic tree order', async () => {
    const workspaceRoot = await createWorkspace()
    await mkdir(join(workspaceRoot, 'Zulu'))
    await mkdir(join(workspaceRoot, 'alpha'))
    await writeFile(join(workspaceRoot, 'Zulu', 'Second.MD'), '# Second\n', 'utf8')
    await writeFile(join(workspaceRoot, 'alpha', 'First.md'), '# First\n', 'utf8')
    await writeFile(join(workspaceRoot, 'Root.md'), '# Root\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)

    const workspace = await authority.openConfigured()

    expect(workspace.inventory).toEqual([
      { kind: 'folder', displayPath: 'alpha' },
      {
        kind: 'note',
        displayPath: 'alpha/First.md',
        resourceId: expect.stringMatching(/^res_[a-f0-9]{64}$/),
      },
      { kind: 'folder', displayPath: 'Zulu' },
      {
        kind: 'note',
        displayPath: 'Zulu/Second.MD',
        resourceId: expect.stringMatching(/^res_[a-f0-9]{64}$/),
      },
      {
        kind: 'note',
        displayPath: 'Root.md',
        resourceId: expect.stringMatching(/^res_[a-f0-9]{64}$/),
      },
    ])
    expect(workspace.notes.map(({ displayPath }) => displayPath)).toEqual([
      'alpha/First.md',
      'Zulu/Second.MD',
      'Root.md',
    ])
    expect(JSON.stringify(workspace)).not.toContain(workspaceRoot)
  })

  it('GMD-002/S1/R2-S2 excludes internal, configured, symlinked, unsupported, and oversized sources', async () => {
    const workspaceRoot = await createWorkspace()
    const outsideRoot = await createWorkspace()
    await mkdir(join(workspaceRoot, '.graphite'))
    await mkdir(join(workspaceRoot, 'private'))
    await writeFile(join(workspaceRoot, '.graphite', 'Internal.md'), '# Internal\n', 'utf8')
    await writeFile(join(workspaceRoot, 'private', 'Ignored.md'), '# Ignored\n', 'utf8')
    await writeFile(join(workspaceRoot, 'binary.md'), Buffer.from([0xff, 0xfe, 0xfd]))
    await writeFile(join(workspaceRoot, 'large.md'), '123456789')
    await writeFile(join(workspaceRoot, 'ordinary.txt'), '# Not Markdown\n', 'utf8')
    await writeFile(join(outsideRoot, 'Outside.md'), '# Outside\n', 'utf8')
    await symlink(join(outsideRoot, 'Outside.md'), join(workspaceRoot, 'Alias.md'))
    await writeFile(join(workspaceRoot, 'Visible.md'), '# V\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot, {
      excludedPaths: ['private'],
      maxSourceBytes: 8,
    })

    const workspace = await authority.openConfigured()

    expect(workspace.inventory).toEqual([
      {
        kind: 'note',
        displayPath: 'Visible.md',
        resourceId: expect.stringMatching(/^res_[a-f0-9]{64}$/),
      },
    ])
    expect(JSON.stringify(workspace)).not.toContain(workspaceRoot)
    expect(JSON.stringify(workspace)).not.toContain(outsideRoot)
  })

  it('GMD-002/S1/R2-S3 returns an honest empty inventory for a workspace without eligible Markdown', async () => {
    const workspaceRoot = await createWorkspace()
    await mkdir(join(workspaceRoot, '.graphite'))
    await writeFile(join(workspaceRoot, '.graphite', 'Internal.md'), '# Internal\n', 'utf8')
    await writeFile(join(workspaceRoot, 'Readme.txt'), 'Not a note\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)

    const workspace = await authority.openConfigured()

    expect(workspace.notes).toEqual([])
    expect(workspace.inventory).toEqual([])
  })

  it('GMD-002/S1/R3-S1 reads exact source, generic YAML properties, and a content revision', async () => {
    const workspaceRoot = await createWorkspace()
    const source = [
      '---\r\n',
      'created: 2026-07-18\n',
      'tags: [graphite, markdown]\r\n',
      'nested: { owner: Taylor, count: 2 }\n',
      '---\r\n',
      '# Exact\n',
    ].join('')
    await mkdir(join(workspaceRoot, 'Notes'))
    await writeFile(join(workspaceRoot, 'Notes', 'Exact.md'), source, 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()

    const note = await authority.readNote(opened.notes[0]!.resourceId)

    expect(note).toEqual({
      resourceId: opened.notes[0]!.resourceId,
      displayPath: 'Notes/Exact.md',
      source,
      revision: expect.stringMatching(/^rev_[a-f0-9]{64}$/),
      yamlProperties: [
        { name: 'created', value: '2026-07-18' },
        { name: 'tags', value: ['graphite', 'markdown'] },
        { name: 'nested', value: { owner: 'Taylor', count: 2 } },
      ],
      yamlParseError: null,
    })
    expect(JSON.stringify(note)).not.toContain(workspaceRoot)
  })

  it('GMD-002/S1/R3-S1 reports malformed YAML while preserving exact source', async () => {
    const workspaceRoot = await createWorkspace()
    const source = '---\ntags: [graphite\n---\n# Broken\n'
    await writeFile(join(workspaceRoot, 'Broken.md'), source, 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()

    await expect(authority.readNote(opened.notes[0]!.resourceId)).resolves.toMatchObject({
      source,
      yamlProperties: [],
      yamlParseError: expect.any(String),
    })
  })

  it('GMD-002/S1/R3-S1 changes the revision after an external edit', async () => {
    const workspaceRoot = await createWorkspace()
    const notePath = join(workspaceRoot, 'External.md')
    await writeFile(notePath, '# Before\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const resourceId = opened.notes[0]!.resourceId
    const before = await authority.readNote(resourceId)

    await writeFile(notePath, '# After\n', 'utf8')
    const after = await authority.readNote(resourceId)

    expect(after.source).toBe('# After\n')
    expect(after.revision).not.toBe(before.revision)
    expect(after.resourceId).toBe(resourceId)
  })

  it('GMD-002/S1/R3-S2 rejects unknown resource identities without guessing a path', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Known.md'), '# Known\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const first = await authority.openConfigured()
    const stableResourceId = first.notes[0]!.resourceId

    await expect(authority.readNote('res_unknown')).rejects.toMatchObject({
      name: 'WorkspaceResourceUnavailableError',
    })
    await authority.openConfigured()
    await expect(authority.readNote(stableResourceId)).resolves.toMatchObject({ displayPath: 'Known.md' })
  })

  it('GMD-002/S1/R3-S2 fails closed when the opened root is replaced', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Original.md'), '# Original\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const replacedRoot = `${workspaceRoot}-original`
    temporaryDirectories.push(replacedRoot)

    await rename(workspaceRoot, replacedRoot)
    await mkdir(workspaceRoot)
    await writeFile(join(workspaceRoot, 'Original.md'), '# Replacement\n', 'utf8')

    await expect(authority.readNote(opened.notes[0]!.resourceId)).rejects.toMatchObject({
      name: 'WorkspaceUnavailableError',
      reason: 'identity_changed',
    })
  })

  it('GMD-002/S1/R3-S2 rejects an issued note replaced by a symlink', async () => {
    const workspaceRoot = await createWorkspace()
    const outsideRoot = await createWorkspace()
    const notePath = join(workspaceRoot, 'Issued.md')
    await writeFile(notePath, '# Issued\n', 'utf8')
    await writeFile(join(outsideRoot, 'Outside.md'), '# Outside\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()

    await rm(notePath)
    await symlink(join(outsideRoot, 'Outside.md'), notePath)

    await expect(authority.readNote(opened.notes[0]!.resourceId)).rejects.toMatchObject({
      name: 'WorkspaceResourceUnavailableError',
    })
  })

  it('GMD-002/S2/R2-S1 saves exact mixed-line-ending source and preserves file mode', async () => {
    const workspaceRoot = await createWorkspace()
    const notePath = join(workspaceRoot, 'Exact.md')
    await writeFile(notePath, '# Before\r\nline\n', { encoding: 'utf8', mode: 0o640 })
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const note = await authority.readNote(opened.notes[0]!.resourceId)

    const saved = await authority.saveNote(note.resourceId, note.revision, '# After\r\nline\n')

    expect(saved.source).toBe('# After\r\nline\n')
    expect(saved.revision).not.toBe(note.revision)
    expect(await readFile(notePath, 'utf8')).toBe('# After\r\nline\n')
    expect((await stat(notePath)).mode & 0o777).toBe(0o640)
  })

  it('GMD-002/S2/R2-S3 rejects a stale save without changing canonical source', async () => {
    const workspaceRoot = await createWorkspace()
    const notePath = join(workspaceRoot, 'Conflict.md')
    await writeFile(notePath, '# Opened\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const note = await authority.readNote(opened.notes[0]!.resourceId)
    await writeFile(notePath, '# External\n', 'utf8')

    await expect(authority.saveNote(note.resourceId, note.revision, '# Draft\n')).rejects.toMatchObject({
      name: 'WorkspaceRevisionConflictError',
    })
    expect(await readFile(notePath, 'utf8')).toBe('# External\n')
  })

  it('GMD-002/S2/R3-S1 renames without overwrite and issues one reconciled identity', async () => {
    const workspaceRoot = await createWorkspace()
    await mkdir(join(workspaceRoot, 'Notes'))
    await writeFile(join(workspaceRoot, 'Notes', 'Before.md'), '# Exact\r\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const note = await authority.readNote(opened.notes[0]!.resourceId)

    const renamed = await authority.renameNote(note.resourceId, note.revision, 'After')

    expect(renamed.note).toMatchObject({ displayPath: 'Notes/After.md', source: '# Exact\r\n' })
    expect(renamed.note.resourceId).not.toBe(note.resourceId)
    expect(renamed.workspace.notes).toEqual([
      expect.objectContaining({ displayPath: 'Notes/After.md', resourceId: renamed.note.resourceId }),
    ])
    await expect(readFile(join(workspaceRoot, 'Notes', 'Before.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('GMD-002/S2/R3-S3 blocks writes after an indeterminate committed rename and reconciles on retry', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Before.md'), '# Exact\n', 'utf8')
    let interruptAfterCommit = true
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot, {
      afterRenameCommit: async () => {
        if (interruptAfterCommit) {
          interruptAfterCommit = false
          throw new Error('simulated response interruption')
        }
      },
    })
    const opened = await authority.openConfigured()
    const note = await authority.readNote(opened.notes[0]!.resourceId)

    await expect(authority.renameNote(note.resourceId, note.revision, 'After.md')).rejects.toMatchObject({
      name: 'WorkspaceInvalidMutationError',
      code: 'indeterminate',
    })
    await expect(authority.saveNote(note.resourceId, note.revision, '# Unsafe\n')).rejects.toMatchObject({
      name: 'WorkspaceResourceUnavailableError',
    })

    const reconciled = await authority.renameNote(note.resourceId, note.revision, 'After.md')

    expect(reconciled.note).toMatchObject({ displayPath: 'After.md', source: '# Exact\n' })
    expect(reconciled.note.resourceId).not.toBe(note.resourceId)
    await expect(authority.saveNote(note.resourceId, note.revision, '# Unsafe\n')).rejects.toMatchObject({
      name: 'WorkspaceResourceUnavailableError',
    })
    const saved = await authority.saveNote(
      reconciled.note.resourceId,
      reconciled.note.revision,
      '# Reconciled\n',
    )
    expect(saved.source).toBe('# Reconciled\n')
    await expect(readFile(join(workspaceRoot, 'Before.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(workspaceRoot, 'After.md'), 'utf8')).toBe('# Reconciled\n')
  })

  it('GMD-002/S2/R3-S3 reconciles a committed rename after service restart', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Before.md'), '# Exact\n', 'utf8')
    const first = new ConfiguredWorkspaceAuthority(workspaceRoot, {
      afterRenameCommit: async () => { throw new Error('simulated process exit') },
    })
    const opened = await first.openConfigured()
    const note = await first.readNote(opened.notes[0]!.resourceId)
    await expect(first.renameNote(note.resourceId, note.revision, 'After.md')).rejects.toMatchObject({
      name: 'WorkspaceInvalidMutationError', code: 'indeterminate',
    })

    const restarted = new ConfiguredWorkspaceAuthority(workspaceRoot)
    await restarted.openConfigured()
    const reconciled = await restarted.renameNote(note.resourceId, note.revision, 'After.md')

    expect(reconciled.note).toMatchObject({ displayPath: 'After.md', source: '# Exact\n' })
    expect(JSON.parse(await readFile(
      join(workspaceRoot, '.graphite', 'operations', 'renames', `${note.resourceId}.json`), 'utf8',
    ))).toMatchObject({ schemaVersion: 1, resourceId: note.resourceId, status: 'committed' })
  })

  it('GMD-002/S2/R3-S3 returns the authoritative edited target when the original rename is retried', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Before.md'), '# Before\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const original = await authority.readNote(opened.notes[0]!.resourceId)
    const renamed = await authority.renameNote(original.resourceId, original.revision, 'After.md')
    await authority.saveNote(renamed.note.resourceId, renamed.note.revision, '# Edited\n')

    const retried = await authority.renameNote(original.resourceId, original.revision, 'After.md')

    expect(retried.note).toMatchObject({ displayPath: 'After.md', source: '# Edited\n' })
    expect(retried.note.revision).not.toBe(renamed.note.revision)
  })

  it('GMD-002/S2/R3-S3 keeps a committed retry bound to its target when the source path is recreated', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Before.md'), '# Original\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const original = await authority.readNote(opened.notes[0]!.resourceId)
    const renamed = await authority.renameNote(original.resourceId, original.revision, 'After.md')
    await writeFile(join(workspaceRoot, 'Before.md'), '# Replacement\n', 'utf8')
    await authority.refresh()

    const retried = await authority.renameNote(original.resourceId, original.revision, 'After.md')

    expect(retried.note.resourceId).toBe(renamed.note.resourceId)
    expect(retried.note.source).toBe('# Original\n')
    expect(await readFile(join(workspaceRoot, 'Before.md'), 'utf8')).toBe('# Replacement\n')
  })

  it('GMD-002/S2/R3-S3 finishes a prepared native rename after restart', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Before.md'), '# Exact\n', 'utf8')
    const first = new ConfiguredWorkspaceAuthority(workspaceRoot, {
      afterRenameLink: async () => { throw new Error('simulated process exit') },
    })
    const opened = await first.openConfigured()
    const note = await first.readNote(opened.notes[0]!.resourceId)
    await expect(first.renameNote(note.resourceId, note.revision, 'After.md')).rejects.toThrow('simulated process exit')

    const restarted = new ConfiguredWorkspaceAuthority(workspaceRoot)
    await restarted.openConfigured()
    const reconciled = await restarted.renameNote(note.resourceId, note.revision, 'After.md')

    expect(reconciled.note.displayPath).toBe('After.md')
    await expect(readFile(join(workspaceRoot, 'Before.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('GMD-002/S2/R3-S3 never adopts an external move without a pending rename operation', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Before.md'), '# Exact\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const note = await authority.readNote(opened.notes[0]!.resourceId)
    await rename(join(workspaceRoot, 'Before.md'), join(workspaceRoot, 'After.md'))

    await expect(authority.renameNote(note.resourceId, note.revision, 'After.md')).rejects.toMatchObject({
      name: 'WorkspaceResourceUnavailableError',
    })
    expect(await readFile(join(workspaceRoot, 'After.md'), 'utf8')).toBe('# Exact\n')
  })

  it('GMD-002/S2/R3-S2 rejects invalid, colliding, and stale renames without mutation', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Before.md'), '# Before\n', 'utf8')
    await writeFile(join(workspaceRoot, 'Existing.md'), '# Existing\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const item = opened.notes.find(({ displayPath }) => displayPath === 'Before.md')!
    const note = await authority.readNote(item.resourceId)

    for (const name of ['', '../Escape.md', '.graphite.md', 'Existing.md']) {
      await expect(authority.renameNote(note.resourceId, note.revision, name)).rejects.toBeInstanceOf(Error)
    }
    await writeFile(join(workspaceRoot, 'Before.md'), '# External\n', 'utf8')
    await expect(authority.renameNote(note.resourceId, note.revision, 'After.md')).rejects.toMatchObject({
      name: 'WorkspaceRevisionConflictError',
    })
    expect(await readFile(join(workspaceRoot, 'Existing.md'), 'utf8')).toBe('# Existing\n')
    expect(await readFile(join(workspaceRoot, 'Before.md'), 'utf8')).toBe('# External\n')
  })

  it('GMD-002/S2/R3-S2 clears prepared intent after a known link collision so retry can succeed', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Before.md'), '# Before\n', 'utf8')
    await writeFile(join(workspaceRoot, 'After.md'), '# Collision\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const before = opened.notes.find((note) => note.displayPath === 'Before.md')!
    const note = await authority.readNote(before.resourceId)

    await expect(authority.renameNote(note.resourceId, note.revision, 'After.md')).rejects.toMatchObject({
      name: 'WorkspaceInvalidMutationError', code: 'collision',
    })
    await rm(join(workspaceRoot, 'After.md'))

    await expect(authority.renameNote(note.resourceId, note.revision, 'After.md')).resolves.toMatchObject({
      note: { displayPath: 'After.md', source: '# Before\n' },
    })
  })

  it('GMD-002/S2/R3-S3 clears prepared intent after a failed unlink is rolled back so retry can succeed', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Before.md'), '# Before\n', 'utf8')
    let interrupt = true
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot, {
      beforeSourceUnlink: async () => {
        if (!interrupt) return
        interrupt = false
        throw new Error('simulated unlink failure')
      },
    })
    const opened = await authority.openConfigured()
    const note = await authority.readNote(opened.notes[0]!.resourceId)

    await expect(authority.renameNote(note.resourceId, note.revision, 'After.md')).rejects.toMatchObject({
      name: 'WorkspaceInvalidMutationError', code: 'indeterminate',
    })
    expect(await readFile(join(workspaceRoot, 'Before.md'), 'utf8')).toBe('# Before\n')
    await expect(readFile(join(workspaceRoot, 'After.md'))).rejects.toMatchObject({ code: 'ENOENT' })

    await expect(authority.renameNote(note.resourceId, note.revision, 'After.md')).resolves.toMatchObject({
      note: { displayPath: 'After.md', source: '# Before\n' },
    })
  })

  it('GMD-002/S2/R4-S1 rejects writes after root or resource symlink replacement', async () => {
    const workspaceRoot = await createWorkspace()
    const outsideRoot = await createWorkspace()
    const notePath = join(workspaceRoot, 'Safe.md')
    const outsidePath = join(outsideRoot, 'Outside.md')
    await writeFile(notePath, '# Safe\n', 'utf8')
    await writeFile(outsidePath, '# Outside\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const note = await authority.readNote(opened.notes[0]!.resourceId)
    await rm(notePath)
    await symlink(outsidePath, notePath)

    await expect(authority.saveNote(note.resourceId, note.revision, '# Escaped\n')).rejects.toBeInstanceOf(Error)
    expect(await readFile(outsidePath, 'utf8')).toBe('# Outside\n')
  })

  it('GMD-002/S2/R4-S1 rejects a save when its parent is swapped immediately before commit', async () => {
    const workspaceRoot = await createWorkspace()
    const outsideRoot = await createWorkspace()
    const notes = join(workspaceRoot, 'Notes')
    const retained = join(workspaceRoot, 'Notes-retained')
    await mkdir(notes)
    await writeFile(join(notes, 'Safe.md'), '# Safe\n', 'utf8')
    await writeFile(join(outsideRoot, 'Safe.md'), '# Outside\n', 'utf8')
    let swap = true
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot, {
      beforeMutationCommit: async ({ operation }) => {
        if (swap && operation === 'save') {
          swap = false
          await rename(notes, retained)
          await symlink(outsideRoot, notes)
        }
      },
    })
    const opened = await authority.openConfigured()
    const note = await authority.readNote(opened.notes[0]!.resourceId)

    await expect(authority.saveNote(note.resourceId, note.revision, '# Escaped\n')).rejects.toBeInstanceOf(Error)
    expect(await readFile(join(outsideRoot, 'Safe.md'), 'utf8')).toBe('# Outside\n')
  })

  it('GMD-002/S2/R4-S1 rejects a save when its parent is swapped before temporary creation', async () => {
    const workspaceRoot = await createWorkspace()
    const outsideRoot = await createWorkspace()
    const notes = join(workspaceRoot, 'Notes')
    const retained = join(workspaceRoot, 'Notes-retained')
    await mkdir(notes)
    await writeFile(join(notes, 'Safe.md'), '# Safe\n', 'utf8')
    let swap = true
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot, {
      beforeMutationCreate: async () => {
        if (!swap) return
        swap = false
        await rename(notes, retained)
        await symlink(outsideRoot, notes)
      },
    })
    const opened = await authority.openConfigured()
    const note = await authority.readNote(opened.notes[0]!.resourceId)

    await expect(authority.saveNote(note.resourceId, note.revision, '# Escaped\n')).rejects.toBeInstanceOf(Error)
    expect(await readdir(outsideRoot)).toEqual([])
    expect(await readFile(join(retained, 'Safe.md'), 'utf8')).toBe('# Safe\n')
  })

  it('GMD-002/S2/R3-S3 refuses rename receipts through a symlinked operations ancestor', async () => {
    const workspaceRoot = await createWorkspace()
    const outsideRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Before.md'), '# Safe\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const opened = await authority.openConfigured()
    const note = await authority.readNote(opened.notes[0]!.resourceId)
    await symlink(outsideRoot, join(workspaceRoot, '.graphite', 'operations'))

    await expect(authority.renameNote(note.resourceId, note.revision, 'After.md')).rejects.toMatchObject({
      code: 'indeterminate',
    })
    await expect(stat(join(outsideRoot, 'renames'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(workspaceRoot, 'Before.md'), 'utf8')).toBe('# Safe\n')
  })

  it('GMD-002/S2/R3-S2 rejects rename after root replacement or resource symlink escape', async () => {
    const workspaceRoot = await createWorkspace()
    const outsideRoot = await createWorkspace()
    const notePath = join(workspaceRoot, 'Safe.md')
    const outsidePath = join(outsideRoot, 'Outside.md')
    await writeFile(notePath, '# Safe\n', 'utf8')
    await writeFile(outsidePath, '# Outside\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    let opened = await authority.openConfigured()
    let note = await authority.readNote(opened.notes[0]!.resourceId)
    await rm(notePath)
    await symlink(outsidePath, notePath)

    await expect(authority.renameNote(note.resourceId, note.revision, 'Escaped.md')).rejects.toBeInstanceOf(Error)
    expect(await readFile(outsidePath, 'utf8')).toBe('# Outside\n')

    await rm(notePath)
    await writeFile(notePath, '# Safe again\n', 'utf8')
    opened = await authority.openConfigured()
    note = await authority.readNote(opened.notes[0]!.resourceId)
    const replacedRoot = `${workspaceRoot}-before-rename`
    temporaryDirectories.push(replacedRoot)
    await rename(workspaceRoot, replacedRoot)
    await mkdir(workspaceRoot)
    await writeFile(join(workspaceRoot, 'Safe.md'), '# Replacement\n', 'utf8')

    await expect(authority.renameNote(note.resourceId, note.revision, 'Escaped.md')).rejects.toMatchObject({
      name: 'WorkspaceUnavailableError',
    })
    expect(await readFile(join(workspaceRoot, 'Safe.md'), 'utf8')).toBe('# Replacement\n')
  })
})
