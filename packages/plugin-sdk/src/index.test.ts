import { describe, expect, it } from 'vitest'

import {
  PluginCapabilityDenied,
  PluginHost,
  createCapabilityBroker,
  createPluginStateAdapter,
  resourceId,
  validatePluginManifest,
  type GraphitePlugin,
  type PluginManifest,
  type PluginStateBackend,
} from './index.js'

const manifest: PluginManifest = {
  schemaVersion: 1, id: 'system-status', name: 'System Status', version: '1.0.0',
  compatibility: { host: '^1.0.0' }, permissions: ['status:read'], dependencies: [],
  state: { schemaVersion: 1 }, contributions: { commands: [{ id: 'show-status', title: 'Show system status' }] },
}

function memoryState(): PluginStateBackend & { values: Map<string, unknown> } {
  const values = new Map<string, unknown>()
  return {
    values,
    async read(id) { return values.get(id) },
    async transaction(id, value) { values.set(id, value) },
    async recovery() { return 'clean' },
  }
}

describe('GMD-003/S1 R1 manifest validation', () => {
  it('accepts a complete compatible versioned manifest', () => {
    const result = validatePluginManifest({
      schemaVersion: 1,
      id: 'system-status',
      name: 'System Status',
      version: '1.0.0',
      compatibility: { host: '^1.0.0' },
      permissions: ['status:read'],
      dependencies: [],
      state: { schemaVersion: 1 },
      contributions: { commands: [{ id: 'show-status', title: 'Show system status' }] },
    }, '1.2.0')

    expect(result).toEqual(expect.objectContaining({ ok: true }))
  })

  it('rejects incompatible and malformed manifests with recoverable codes', () => {
    expect(validatePluginManifest({ ...manifest, compatibility: { host: '^2.0.0' } }, '1.0.0')).toEqual(expect.objectContaining({ ok: false, code: 'incompatible_host' }))
    expect(validatePluginManifest({ id: 'missing-fields' }, '1.0.0')).toEqual(expect.objectContaining({ ok: false, code: 'invalid_manifest' }))
    expect(validatePluginManifest({ ...manifest, contributions: { commands: [{ id: '../escape', title: '' }] } }, '1.0.0')).toEqual(expect.objectContaining({ ok: false, code: 'invalid_manifest' }))
  })
})

describe('GMD-003/S1 R2 plugin lifecycle', () => {
  it('applies persisted disablement before activation and removes contributions on disable', async () => {
    let activations = 0
    let disposed = false
    const plugin: GraphitePlugin = { manifest, async activate() { activations++; return () => { disposed = true } } }
    const backend = memoryState()
    const disabledHost = new PluginHost({ hostVersion: '1.0.0', enabled: { 'system-status': false }, provider: { async perform() {} }, stateBackend: backend })
    await disabledHost.load([plugin])
    expect(activations).toBe(0)
    expect(disabledHost.list()[0]).toEqual(expect.objectContaining({ status: 'disabled', contributions: {} }))

    const host = new PluginHost({ hostVersion: '1.0.0', enabled: {}, provider: { async perform() {} }, stateBackend: backend })
    await host.load([plugin])
    expect(host.list()[0]?.contributions.commands).toHaveLength(1)
    await host.disable('system-status')
    expect(disposed).toBe(true)
    expect(host.list()[0]).toEqual(expect.objectContaining({ status: 'disabled', contributions: {} }))
  })

  it('fails duplicate and unresolved dependency plugins closed', async () => {
    const plugin: GraphitePlugin = { manifest, async activate() {} }
    const missing: GraphitePlugin = { manifest: { ...manifest, id: 'dependent', dependencies: [{ id: 'absent', version: '^1.0.0' }] }, async activate() {} }
    const host = new PluginHost({ hostVersion: '1.0.0', enabled: {}, provider: { async perform() {} }, stateBackend: memoryState() })
    await host.load([plugin, plugin, missing])
    expect(host.list().find((item) => item.id === 'system-status')).toEqual(expect.objectContaining({ status: 'duplicate', contributions: {} }))
    expect(host.list().find((item) => item.id === 'dependent')).toEqual(expect.objectContaining({ status: 'dependency_missing', contributions: {} }))
  })

  it('does not resolve a dependency from an invalid or version-mismatched candidate', async () => {
    const dependency: GraphitePlugin = { manifest: { ...manifest, id: 'dependency', version: '1.0.0' }, async activate() {} }
    const dependent: GraphitePlugin = { manifest: { ...manifest, id: 'dependent', dependencies: [{ id: 'dependency', version: '^2.0.0' }] }, async activate() {} }
    const host = new PluginHost({ hostVersion: '1.0.0', enabled: {}, provider: { async perform() {} }, stateBackend: memoryState() })
    await host.load([dependency, dependent])
    expect(host.list().find((item) => item.id === 'dependent')?.status).toBe('dependency_missing')
  })
})

describe('GMD-003/S1 R3 capability mediation', () => {
  it('permits declared opaque operations and normalizes undeclared or raw-path denial', async () => {
    const broker = createCapabilityBroker(manifest, { async perform(operation) { return { resource: operation.resource, healthy: true } } })
    await expect(broker.perform({ permission: 'status:read', resource: resourceId('workspace-root') })).resolves.toEqual({ resource: 'workspace-root', healthy: true })
    await expect(broker.perform({ permission: 'workspace:write', resource: resourceId('workspace-root') })).rejects.toMatchObject({ code: 'plugin_capability_denied', reason: 'undeclared' })
    expect(() => resourceId('/Users/private')).toThrow(PluginCapabilityDenied)
    await expect(broker.perform({ permission: 'status:read', resource: '/Users/private' as never })).rejects.toMatchObject({ reason: 'invalid_resource' })
  })
})

describe('GMD-003/S1 R4 namespaced state', () => {
  it('binds state access to one namespace and commits versioned values transactionally', async () => {
    const backend = memoryState()
    const system = createPluginStateAdapter('system-status', 1, backend)
    const other = createPluginStateAdapter('other-plugin', 1, backend)
    await system.write({ lastCheck: 'ok' })
    expect(system.namespace).toBe('.graphite/plugins/system-status/')
    await expect(system.read()).resolves.toEqual({ lastCheck: 'ok' })
    await expect(other.read()).resolves.toBeUndefined()
    expect(backend.values.get('system-status')).toEqual({ schemaVersion: 1, value: { lastCheck: 'ok' } })
    await expect(system.recoveryStatus()).resolves.toBe('clean')
  })
})
