import { mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ConfiguredWorkspaceAuthority } from '@graphitemd/workspace'
import { afterEach, describe, expect, it } from 'vitest'

import {
  BUNDLED_PLUGINS,
  FilesystemPluginStateBackend,
  PluginEnablementStore,
  PluginRuntimeService,
} from '../../app/plugins/plugin_runtime_service.js'

const roots: string[] = []
const bundledPluginIds = BUNDLED_PLUGINS.map((plugin) => plugin.manifest.id)
async function workspaceRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'graphitemd-plugins-'))
  roots.push(root)
  await mkdir(join(root, 'Notes'))
  await writeFile(join(root, 'Notes', 'Welcome.md'), '# Welcome\n')
  return root
}

afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

describe('GMD-003/S1 R2 inspectable enablement', () => {
  it('GMD-004/S2 R1-S1 dispatches questions only through the active Assistant contribution', async () => {
    const root = await workspaceRoot()
    const authority = new ConfiguredWorkspaceAuthority(root)
    const runModelSession = async (request: { question: string; policy: { prompt: string; tools: readonly string[] } }) => ({
      turnId: 'turn_alpha' as const,
      conversationId: 'conv_alpha' as const,
      status: 'completed' as const,
      question: request.question,
      provider: 'openai-codex' as const,
      model: 'gpt-5.4',
      createdAt: '2026-07-20T00:00:00.000Z',
      completedAt: '2026-07-20T00:00:01.000Z',
      answer: request.policy.prompt.includes('workspace evidence') ? 'Grounded answer.' : '',
      error: null,
      sources: [],
    })
    const service = new PluginRuntimeService(root, authority, runModelSession)
    await service.start()

    await expect(service.askAssistant({ question: 'What changed?' })).resolves.toEqual(expect.objectContaining({
      kind: 'handled',
      turn: expect.objectContaining({ answer: 'Grounded answer.' }),
    }))
    await service.setEnabled('assistant', false)
    await expect(service.askAssistant({ question: 'What changed?' })).resolves.toEqual({ kind: 'unavailable' })
  })

  it('cold-starts against a valid configured workspace without a prior workspace request', async () => {
    const root = await workspaceRoot()
    const service = new PluginRuntimeService(root, new ConfiguredWorkspaceAuthority(root))

    await expect(service.start()).resolves.toBeUndefined()
    expect(service.list()[0]?.status).toBe('active')
  })

  it('retries startup after the configured workspace becomes available', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'graphitemd-plugin-parent-'))
    roots.push(parent)
    const root = join(parent, 'workspace')
    const service = new PluginRuntimeService(root, new ConfiguredWorkspaceAuthority(root))

    await expect(service.start()).rejects.toMatchObject({ name: 'WorkspaceUnavailableError' })
    await mkdir(join(root, 'Notes'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Welcome.md'), '# Welcome\n')

    await expect(service.start()).resolves.toBeUndefined()
    expect(service.list()[0]?.status).toBe('active')
  })

  it('rejects first plugin startup after an accepted workspace root is replaced', async () => {
    const root = await workspaceRoot()
    const retained = `${root}-retained-before-start`
    roots.push(retained)
    const authority = new ConfiguredWorkspaceAuthority(root)
    await authority.openConfigured()
    await rename(root, retained)
    await mkdir(root)
    const service = new PluginRuntimeService(root, authority)

    await expect(service.start()).rejects.toMatchObject({
      name: 'WorkspaceUnavailableError',
      reason: 'identity_changed',
    })
    await expect(readFile(join(root, '.graphitemd', 'plugins.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('persists disablement before a restarted production host loads bundled code', async () => {
    const root = await workspaceRoot()
    const authority = new ConfiguredWorkspaceAuthority(root)
    await authority.openConfigured()
    const first = new PluginRuntimeService(root, authority)
    await first.start()
    expect(first.list()[0]?.status).toBe('active')
    await first.setEnabled('system-status', false)

    expect(JSON.parse(await readFile(join(root, '.graphitemd', 'plugins.json'), 'utf8')))
      .toEqual({ schemaVersion: 1, enabled: { 'system-status': false } })
    const restarted = new PluginRuntimeService(root, authority)
    await restarted.start()
    expect(restarted.list()[0]).toEqual(expect.objectContaining({ id: 'system-status', status: 'disabled', contributions: {} }))
  })

  it('GMD-003/S1 R4-S3 applies persisted enablement before every bundled plugin activates after restart', async () => {
    const root = await workspaceRoot()
    const authority = new ConfiguredWorkspaceAuthority(root)
    const first = new PluginRuntimeService(root, authority)
    await first.start()

    await Promise.all(bundledPluginIds.map((id) => first.setEnabled(id, false)))
    expect(JSON.parse(await readFile(join(root, '.graphitemd', 'plugins.json'), 'utf8'))).toEqual({
      schemaVersion: 1,
      enabled: { 'system-status': false, assistant: false },
    })

    const restarted = new PluginRuntimeService(root, authority)
    await restarted.start()
    expect(restarted.list()).toEqual(expect.arrayContaining(bundledPluginIds.map((id) =>
      expect.objectContaining({ id, status: 'disabled', contributions: {} }),
    )))

    await Promise.all(bundledPluginIds.map((id) => restarted.setEnabled(id, true)))
    const reenabled = new PluginRuntimeService(root, authority)
    await reenabled.start()
    expect(reenabled.list()).toEqual(expect.arrayContaining(bundledPluginIds.map((id) =>
      expect.objectContaining({ id, status: 'active', contributions: expect.any(Object) }),
    )))
    expect(reenabled.list().every((item) => Object.keys(item.contributions).length > 0)).toBe(true)
  })

  it('GMD-003/S1 R4-S3 recovers complete interrupted state for every bundled plugin before restart activation', async () => {
    const root = await workspaceRoot()
    for (const id of bundledPluginIds) {
      const directory = join(root, '.graphitemd', 'plugins', id)
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'state.json.tmp'), JSON.stringify({ schemaVersion: 1, value: { recovered: id } }))
    }

    const service = new PluginRuntimeService(root, new ConfiguredWorkspaceAuthority(root))
    await expect(service.start()).resolves.toBeUndefined()
    expect(service.list()).toEqual(expect.arrayContaining(bundledPluginIds.map((id) =>
      expect.objectContaining({ id, status: 'active', contributions: expect.any(Object) }),
    )))
    for (const id of bundledPluginIds) {
      await expect(readFile(join(root, '.graphitemd', 'plugins', id, 'state.json.tmp'), 'utf8'))
        .rejects.toMatchObject({ code: 'ENOENT' })
    }
    expect(JSON.parse(await readFile(join(root, '.graphitemd', 'plugins', 'assistant', 'state.json'), 'utf8')))
      .toEqual({ schemaVersion: 1, value: { recovered: 'assistant' } })
    expect(JSON.parse(await readFile(join(root, '.graphitemd', 'plugins', 'system-status', 'state.json'), 'utf8')))
      .toEqual(expect.objectContaining({ schemaVersion: 1, value: expect.objectContaining({ lastKnownStatus: expect.any(Object) }) }))
  })

  it('GMD-003/S1 R4-S3 reports malformed interrupted state for each bundled plugin without activating it', async () => {
    for (const id of bundledPluginIds) {
      const root = await workspaceRoot()
      const directory = join(root, '.graphitemd', 'plugins', id)
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'state.json.tmp'), '{broken')

      const service = new PluginRuntimeService(root, new ConfiguredWorkspaceAuthority(root))
      await expect(service.start()).resolves.toBeUndefined()
      expect(service.list().find((item) => item.id === id))
        .toEqual(expect.objectContaining({ status: 'activation_failed', message: 'Plugin state recovery failed.', contributions: {} }))
      expect(service.list().find((item) => item.id !== id))
        .toEqual(expect.objectContaining({ status: 'active' }))
    }
  })

  it('GMD-003/S1 R4-S3 rejects semantically invalid recovered state for each bundled plugin', async () => {
    for (const id of bundledPluginIds) {
      for (const state of [{ schemaVersion: 2, value: {} }, { schemaVersion: 1 }]) {
        const root = await workspaceRoot()
        const directory = join(root, '.graphitemd', 'plugins', id)
        await mkdir(directory, { recursive: true })
        await writeFile(join(directory, 'state.json.tmp'), JSON.stringify(state))

        const service = new PluginRuntimeService(root, new ConfiguredWorkspaceAuthority(root))
        await expect(service.start()).resolves.toBeUndefined()
        expect(service.list().find((item) => item.id === id))
          .toEqual(expect.objectContaining({ status: 'activation_failed', message: 'Plugin state schema mismatch.', contributions: {} }))
        expect(service.list().find((item) => item.id !== id))
          .toEqual(expect.objectContaining({ status: 'active' }))
      }
    }
  })

  it('rejects malformed enablement rather than activating plugins with ambiguous settings', async () => {
    const root = await workspaceRoot()
    await mkdir(join(root, '.graphitemd'))
    await writeFile(join(root, '.graphitemd', 'plugins.json'), '{"enabled":{"system-status":"no"}}')
    await expect(new PluginEnablementStore(root).read()).rejects.toThrow('invalid')
  })

  it('serializes concurrent enablement updates without losing either setting', async () => {
    const root = await workspaceRoot()
    const store = new PluginEnablementStore(root)
    await Promise.all([store.set('system-status', false), store.set('future-plugin', true)])
    await expect(store.read()).resolves.toEqual({
      schemaVersion: 1,
      enabled: { 'system-status': false, 'future-plugin': true },
    })
  })

  it('fails closed instead of persisting enablement into a replacement workspace identity', async () => {
    const root = await workspaceRoot()
    const retained = `${root}-retained`
    roots.push(retained)
    const authority = new ConfiguredWorkspaceAuthority(root)
    await authority.openConfigured()
    const service = new PluginRuntimeService(root, authority)
    await service.start()
    await rename(root, retained)
    await mkdir(root)

    await expect(service.setEnabled('system-status', false)).rejects.toMatchObject({
      name: 'WorkspaceUnavailableError',
      reason: 'identity_changed',
    })
    await expect(readFile(join(root, '.graphitemd', 'plugins.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})

describe('GMD-003/S1 R4 atomic namespaced state', () => {
  it('commits inspectable versioned state only inside the plugin namespace', async () => {
    const root = await workspaceRoot()
    const backend = new FilesystemPluginStateBackend(root)
    await backend.transaction('system-status', { schemaVersion: 1, value: { healthy: true } })
    expect(JSON.parse(await readFile(join(root, '.graphitemd', 'plugins', 'system-status', 'state.json'), 'utf8')))
      .toEqual({ schemaVersion: 1, value: { healthy: true } })
    await expect(backend.transaction('../escape', {})).rejects.toThrow('Invalid plugin identity')
  })

  it('recovers a complete interrupted write without treating invalid partial JSON as complete', async () => {
    const root = await workspaceRoot()
    const backend = new FilesystemPluginStateBackend(root)
    const directory = join(root, '.graphitemd', 'plugins', 'system-status')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'state.json.tmp'), '{"schemaVersion":1,"value":{"ok":true}}')
    await expect(backend.recovery('system-status')).resolves.toBe('recovered')
    await expect(backend.read('system-status')).resolves.toEqual({ schemaVersion: 1, value: { ok: true } })

    await writeFile(join(directory, 'state.json.tmp'), '{broken')
    await expect(backend.recovery('system-status')).resolves.toBe('failed')
  })

  it('rejects a malformed state namespace parent instead of reporting clean recovery', async () => {
    const root = await workspaceRoot()
    await mkdir(join(root, '.graphitemd', 'plugins'), { recursive: true })
    await writeFile(join(root, '.graphitemd', 'plugins', 'system-status'), 'not a directory')
    const backend = new FilesystemPluginStateBackend(root)

    await expect(backend.recovery('system-status')).rejects.toThrow('unavailable')
  })

  it('denies a namespace redirected through a symbolic link', async () => {
    const root = await workspaceRoot()
    const outside = await mkdtemp(join(tmpdir(), 'graphitemd-plugin-escape-'))
    roots.push(outside)
    await mkdir(join(root, '.graphitemd'))
    await symlink(outside, join(root, '.graphitemd', 'plugins'))
    const backend = new FilesystemPluginStateBackend(root)
    await expect(backend.transaction('system-status', { secret: true })).rejects.toThrow('symbolic links')
    await expect(readFile(join(outside, 'system-status', 'state.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('denies a namespace parent swapped immediately before atomic commit', async () => {
    const root = await workspaceRoot()
    const outside = await mkdtemp(join(tmpdir(), 'graphitemd-plugin-escape-'))
    roots.push(outside)
    const pluginDirectory = join(root, '.graphitemd', 'plugins', 'system-status')
    const retained = join(root, '.graphitemd', 'plugins', 'system-status-retained')
    let swap = true
    const backend = new FilesystemPluginStateBackend(root, {
      beforeCommit: async () => {
        if (!swap) return
        swap = false
        await rename(pluginDirectory, retained)
        await symlink(outside, pluginDirectory)
      },
    })

    await expect(backend.transaction('system-status', { secret: true })).rejects.toThrow()
    await expect(readFile(join(outside, 'state.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('denies a namespace parent swapped before temporary-file creation', async () => {
    const root = await workspaceRoot()
    const outside = await mkdtemp(join(tmpdir(), 'graphitemd-plugin-escape-'))
    roots.push(outside)
    const pluginDirectory = join(root, '.graphitemd', 'plugins', 'system-status')
    const retained = join(root, '.graphitemd', 'plugins', 'system-status-retained')
    const backend = new FilesystemPluginStateBackend(root, {
      beforeCreate: async () => {
        await rename(pluginDirectory, retained)
        await symlink(outside, pluginDirectory)
      },
    })

    await expect(backend.transaction('system-status', { secret: true })).rejects.toThrow()
    await expect(readFile(join(outside, 'state.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('denies recovery when the namespace parent is swapped immediately before commit', async () => {
    const root = await workspaceRoot()
    const outside = await mkdtemp(join(tmpdir(), 'graphitemd-plugin-recovery-escape-'))
    roots.push(outside)
    const pluginDirectory = join(root, '.graphitemd', 'plugins', 'system-status')
    const retained = join(root, '.graphitemd', 'plugins', 'system-status-retained')
    await mkdir(pluginDirectory, { recursive: true })
    await writeFile(join(pluginDirectory, 'state.json.tmp'), '{"schemaVersion":1,"value":{"safe":true}}')
    let swap = true
    const backend = new FilesystemPluginStateBackend(root, {
      beforeCommit: async () => {
        if (!swap) return
        swap = false
        await rename(pluginDirectory, retained)
        await symlink(outside, pluginDirectory)
      },
    })

    await expect(backend.recovery('system-status')).resolves.toBe('failed')
    await expect(readFile(join(outside, 'state.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(retained, 'state.json.tmp'), 'utf8')).toContain('"safe":true')
  })
})
