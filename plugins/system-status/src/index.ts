import { resourceId, type AnthracitePlugin } from '@anthracitemd/plugin-sdk'

export const systemStatusPlugin: AnthracitePlugin = {
  manifest: {
    schemaVersion: 1,
    id: 'system-status',
    name: 'System Status',
    version: '1.0.0',
    compatibility: { host: '^1.0.0' },
    permissions: ['status:read'],
    dependencies: [],
    state: { schemaVersion: 1 },
    contributions: {
      commands: [{ id: 'show-system-status', title: 'Show system status' }],
      views: [{ id: 'system-status', title: 'System Status', surface: 'context', renderer: 'system-status' }],
    },
  },
  async activate(context) {
    const snapshot = await context.capabilities.perform({ permission: 'status:read', resource: resourceId('system') })
    await context.state.write({ lastKnownStatus: snapshot })
  },
}
