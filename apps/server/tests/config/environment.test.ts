import { describe, expect, it } from 'vitest'

import { configuredOrigins } from '../../config/cors.js'
import { anthraciteEnvironmentValue, assistantTestRuntimeEnabled } from '../../config/environment.js'
import { resolveSecurityStateDirectory } from '../../app/security/owner_setup_service.js'

describe('AMD-001/S1 R4 configuration compatibility', () => {
  it('R4-S1 uses a canonical environment value', () => {
    expect(anthraciteEnvironmentValue({ ANTHRACITEMD_WORKSPACE_ROOT: '/canonical' }, 'WORKSPACE_ROOT'))
      .toBe('/canonical')
    expect(configuredOrigins({ ANTHRACITEMD_ALLOWED_ORIGINS: 'https://one.test, https://two.test' }))
      .toEqual(['https://one.test', 'https://two.test'])
  })

  it('R4-S1 accepts the legacy counterpart as fallback', () => {
    expect(anthraciteEnvironmentValue({ GRAPHITEMD_WORKSPACE_ROOT: '/legacy' }, 'WORKSPACE_ROOT'))
      .toBe('/legacy')
    expect(configuredOrigins({ GRAPHITEMD_ALLOWED_ORIGINS: 'https://legacy.test' }))
      .toEqual(['https://legacy.test'])
  })

  it('R4-S1 gives canonical configuration precedence', () => {
    expect(anthraciteEnvironmentValue({
      ANTHRACITEMD_WORKSPACE_ROOT: '/canonical',
      GRAPHITEMD_WORKSPACE_ROOT: '/legacy',
    }, 'WORKSPACE_ROOT')).toBe('/canonical')
    expect(configuredOrigins({
      ANTHRACITEMD_ALLOWED_ORIGINS: 'https://canonical.test',
      GRAPHITEMD_ALLOWED_ORIGINS: 'https://legacy.test',
    })).toEqual(['https://canonical.test'])
  })

  it('R4-S1 reports an invalid canonical state directory instead of using valid legacy configuration', () => {
    expect(() => resolveSecurityStateDirectory({
      ANTHRACITEMD_STATE_DIR: 'relative/canonical',
      GRAPHITEMD_STATE_DIR: '/valid/legacy',
    })).toThrow('ANTHRACITEMD_STATE_DIR must be an absolute path')
  })

  it('R4-S1 reports an invalid canonical assistant test runtime instead of using its legacy fallback', () => {
    expect(() => assistantTestRuntimeEnabled({
      ANTHRACITEMD_ASSISTANT_TEST_RUNTIME: 'synthetic',
      GRAPHITEMD_ASSISTANT_TEST_RUNTIME: 'grounded',
    })).toThrow('ANTHRACITEMD_ASSISTANT_TEST_RUNTIME')
  })
})
