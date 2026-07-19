import { defineConfig } from '@adonisjs/core/bodyparser'

export default defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  json: {
    convertEmptyStringsToNull: false,
    trimWhitespaces: false,
    limit: '1mb',
    types: ['application/json'],
  },
})
