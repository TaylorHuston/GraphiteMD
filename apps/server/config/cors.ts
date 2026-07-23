import { defineConfig } from '@adonisjs/cors'
import { anthraciteEnvironmentValue, type RuntimeEnvironment } from './environment.js'

export function configuredOrigins(environment: RuntimeEnvironment = process.env): string[] {
  return (anthraciteEnvironmentValue(environment, 'ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export default defineConfig({
  enabled: true,
  origin: configuredOrigins(),
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  credentials: true,
  maxAge: 90,
})
