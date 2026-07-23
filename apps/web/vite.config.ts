import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

type RuntimeEnvironment = Record<string, string | undefined>

export function rebrandedEnvironmentValue(environment: RuntimeEnvironment, name: string): string | undefined {
  const canonical = `ANTHRACITEMD_${name}`
  if (Object.prototype.hasOwnProperty.call(environment, canonical)) return environment[canonical]
  return environment[`GRAPHITEMD_${name}`]
}

export function configuredPort(environment: RuntimeEnvironment, name: 'WEB_PORT' | 'API_PORT', fallback: number): number {
  const configured = rebrandedEnvironmentValue(environment, name)
  if (configured === undefined) return fallback
  const port = Number(configured)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`ANTHRACITEMD_${name} must be an integer between 1 and 65535`)
  }
  return port
}

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
  server: {
    host: '127.0.0.1',
    port: configuredPort(process.env, 'WEB_PORT', 5173),
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${configuredPort(process.env, 'API_PORT', 3333)}` },
  },
})
