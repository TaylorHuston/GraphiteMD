import { defineConfig } from '@adonisjs/core/bodyparser'

export default defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  json: {
    convertEmptyStringsToNull: false,
    trimWhitespaces: false,
    // A valid 1 MiB UTF-8 note can expand substantially when JSON escapes control characters.
    limit: '7mb',
    types: ['application/json'],
  },
})
