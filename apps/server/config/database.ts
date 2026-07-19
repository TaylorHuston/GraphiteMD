import { join } from 'node:path'

import { defineConfig } from '@adonisjs/lucid'

import { resolveSecurityStateDirectory } from '../app/security/owner_setup_service.js'

export default defineConfig({
  connection: 'security',
  connections: {
    security: {
      client: 'better-sqlite3',
      connection: { filename: join(resolveSecurityStateDirectory(), 'security.sqlite') },
      useNullAsDefault: true,
    },
  },
})
