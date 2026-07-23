import { expect, it } from 'vitest'

import { runPluginConformance } from '@anthracitemd/plugin-testkit'
import { systemStatusPlugin } from './index.js'

it('AMD-003/S1 R4-S3 passes shared bundled-plugin conformance', async () => {
  await expect(runPluginConformance(systemStatusPlugin)).resolves.toEqual({
    manifest: true,
    lifecycle: true,
    permissionDenial: true,
    stateIsolation: true,
    recovery: true,
    headless: true,
  })
})
