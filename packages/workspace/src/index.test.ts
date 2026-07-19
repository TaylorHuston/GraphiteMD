import { chmod, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
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
      notes: [],
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
})
