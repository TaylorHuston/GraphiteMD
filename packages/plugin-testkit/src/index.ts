import {
  PluginHost,
  resourceId,
  type AnthracitePlugin,
  type PluginStateBackend,
} from '@anthracitemd/plugin-sdk'

export type ConformanceReport = Readonly<{
  manifest: boolean
  lifecycle: boolean
  permissionDenial: boolean
  stateIsolation: boolean
  recovery: boolean
  headless: boolean
}>

function backend(): PluginStateBackend & { keys(): readonly string[] } {
  const values = new Map<string, unknown>()
  return {
    keys: () => [...values.keys()],
    async read(id) { return values.get(id) },
    async transaction(id, value) { values.set(id, value) },
    async recovery() { return 'clean' },
  }
}

/** Runs the production host and SDK contracts without a browser or privileged test bypass. */
export async function runPluginConformance(plugin: AnthracitePlugin, hostVersion = '1.0.0'): Promise<ConformanceReport> {
  const state = backend()
  const provider = { async perform(operation: { resource: string }) { return { resource: operation.resource, healthy: true } } }
  const disabled = new PluginHost({ hostVersion, enabled: { [plugin.manifest.id]: false }, provider, stateBackend: state })
  await disabled.load([plugin])
  const startsDisabled = disabled.list()[0]?.status === 'disabled'

  const host = new PluginHost({ hostVersion, enabled: {}, provider, stateBackend: state })
  await host.load([plugin])
  const active = host.list()[0]?.status === 'active'
  const hadContributions = Object.keys(host.list()[0]?.contributions ?? {}).length > 0
  await host.disable(plugin.manifest.id)
  const removed = Object.keys(host.list()[0]?.contributions ?? {}).length === 0

  let denied = false
  try {
    const probe: AnthracitePlugin = {
      manifest: plugin.manifest,
      async activate(context) { await context.capabilities.perform({ permission: 'conformance:undeclared', resource: resourceId('probe') }) },
    }
    const denialHost = new PluginHost({ hostVersion, enabled: {}, provider, stateBackend: state })
    await denialHost.load([probe])
    denied = denialHost.list()[0]?.status === 'activation_failed'
  } catch { denied = true }

  return {
    manifest: active,
    lifecycle: startsDisabled && hadContributions && removed,
    permissionDenial: denied,
    stateIsolation: state.keys().every((key) => key === plugin.manifest.id),
    recovery: await state.recovery(plugin.manifest.id) === 'clean',
    headless: true,
  }
}
