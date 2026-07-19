import { defineConfig, drivers } from '@adonisjs/core/encryption'

const appKey = process.env.APP_KEY ?? (process.env.NODE_ENV === 'test'
  ? 'graphitemd-explicit-test-environment-key'
  : undefined)

if (!appKey) {
  throw new Error('APP_KEY is required outside the explicit test environment')
}

const encryptionConfig = defineConfig({
  default: 'gcm',
  list: {
    gcm: drivers.aes256gcm({
      keys: [appKey],
      id: 'gcm',
    }),
  },
})

export default encryptionConfig

declare module '@adonisjs/core/types' {
  export interface EncryptorsList extends InferEncryptors<typeof encryptionConfig> {}
}
