import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('GMD-003/S1 R3 bundled plugin import boundary', () => {
  it('allows production bundled plugin code to import only the capability SDK', async () => {
    const source = await readFile(
      resolve(import.meta.dirname, '../../../../plugins/system-status/src/index.ts'),
      'utf8',
    )
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
    expect(imports).toEqual(['@graphitemd/plugin-sdk'])
  })
})
