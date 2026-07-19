import { defineConfig } from '@adonisjs/cors'

function configuredOrigins(): string[] {
  return (process.env.GRAPHITEMD_ALLOWED_ORIGINS ?? '')
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
