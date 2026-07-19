import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ConfiguredWorkspaceAuthority } from '@graphitemd/workspace'
import { afterEach, describe, expect, it } from 'vitest'

import {
  FilesystemPluginStateBackend,
  PluginEnablementStore,
  PluginRuntimeService,
} from '../../app/plugins/plugin_runtime_service.js'

const roots: string[] = []
async function workspaceRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'graphitemd-plugins-'))
  roots.push(root)
  await mkdir(join(root, 'Notes'))
  await writeFile(join(root, 'Notes', 'Welcome.md'), '# Welcome\n')
  return root
}

afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

describe('GMD-003/S1 R2 inspectable enablement', () => {
  it('persists disablement before a restarted production host loads bundled code', async () => {
    const root = await workspaceRoot()
    const authority = new ConfiguredWorkspaceAuthority(root)
    await authority.openConfigured()
    const first = new PluginRuntimeService(root, authority)
    await first.start()
    expect(first.list()[0]?.status).toBe('active')
    await first.setEnabled('system-status', false)

    expect(JSON.parse(await readFile(join(root, '.graphite', 'plugins.json'), 'utf8')))
      .toEqual({ schemaVersion: 1, enabled: { 'system-status': false } })
    const restarted = new PluginRuntimeService(root, authority)
    await restarted.start()
    expect(restarted.list()[0]).toEqual(expect.objectContaining({ id: 'system-status', status: 'disabled', contributions: {} }))
  })

  it('rejects malformed enablement rather than activating plugins with ambiguous settings', async () => {
    const root = await workspaceRoot()
    await mkdir(join(root, '.graphite'))
    await writeFile(join(root, '.graphite', 'plugins.json'), '{"enabled":{"system-status":"no"}}')
    await expect(new PluginEnablementStore(root).read()).rejects.toThrow('invalid')
  })
})

describe('GMD-003/S1 R4 atomic namespaced state', () => {
  it('commits inspectable versioned state only inside the plugin namespace', async () => {
    const root = await workspaceRoot()
    const backend = new FilesystemPluginStateBackend(root)
    await backend.transaction('system-status', { schemaVersion: 1, value: { healthy: true } })
    expect(JSON.parse(await readFile(join(root, '.graphite', 'plugins', 'system-status', 'state.json'), 'utf8')))
      .toEqual({ schemaVersion: 1, value: { healthy: true } })
    await expect(backend.transaction('../escape', {})).rejects.toThrow('Invalid plugin identity')
  })

  it('recovers a complete interrupted write without treating invalid partial JSON as complete', async () => {
    const root = await workspaceRoot()
    const backend = new FilesystemPluginStateBackend(root)
    const directory = join(root, '.graphite', 'plugins', 'system-status')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'state.json.tmp'), '{"schemaVersion":1,"value":{"ok":true}}')
    await expect(backend.recovery('system-status')).resolves.toBe('recovered')
    await expect(backend.read('system-status')).resolves.toEqual({ schemaVersion: 1, value: { ok: true } })

    await writeFile(join(directory, 'state.json.tmp'), '{broken')
    await expect(backend.recovery('system-status')).resolves.toBe('failed')
  })

  it('denies a namespace redirected through a symbolic link', async () => {
    const root = await workspaceRoot()
    const outside = await mkdtemp(join(tmpdir(), 'graphitemd-plugin-escape-'))
    roots.push(outside)
    await mkdir(join(root, '.graphite'))
    await symlink(outside, join(root, '.graphite', 'plugins'))
    const backend = new FilesystemPluginStateBackend(root)
    await expect(backend.transaction('system-status', { secret: true })).rejects.toThrow('symbolic links')
    await expect(readFile(join(outside, 'system-status', 'state.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
