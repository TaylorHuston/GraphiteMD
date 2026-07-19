import { chmod, mkdir, mkdtemp, readFile, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
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
    await expect(authority.current()).resolves.toEqual({ available: false, reason: 'unavailable' })
    expect(JSON.stringify(await authority.current())).not.toContain(opened.workspaceId)
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

  it('GMD-002/S1/R3-S2 rejects unknown and stale resource identities without guessing a path', async () => {
    const workspaceRoot = await createWorkspace()
    await writeFile(join(workspaceRoot, 'Known.md'), '# Known\n', 'utf8')
    const authority = new ConfiguredWorkspaceAuthority(workspaceRoot)
    const first = await authority.openConfigured()
    const staleResourceId = first.notes[0]!.resourceId

    await expect(authority.readNote('res_unknown')).rejects.toMatchObject({
      name: 'WorkspaceResourceUnavailableError',
    })
    await authority.openConfigured()
    await expect(authority.readNote(staleResourceId)).rejects.toMatchObject({
      name: 'WorkspaceResourceUnavailableError',
    })
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
})
