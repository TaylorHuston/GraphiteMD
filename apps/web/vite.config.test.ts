import { describe, expect, it } from 'vitest'

import { configuredPort, rebrandedEnvironmentValue } from './vite.config.js'

describe('AMD-001/S1 R4 development configuration compatibility', () => {
  it('R4-S1 uses canonical web and API ports', () => {
    expect(configuredPort({ ANTHRACITEMD_WEB_PORT: '5100' }, 'WEB_PORT', 5173)).toBe(5100)
    expect(configuredPort({ ANTHRACITEMD_API_PORT: '3400' }, 'API_PORT', 3333)).toBe(3400)
  })

  it('R4-S1 accepts legacy web and API ports', () => {
    expect(configuredPort({ GRAPHITEMD_WEB_PORT: '5200' }, 'WEB_PORT', 5173)).toBe(5200)
    expect(configuredPort({ GRAPHITEMD_API_PORT: '3500' }, 'API_PORT', 3333)).toBe(3500)
  })

  it('R4-S1 prefers canonical values and rejects an invalid canonical port', () => {
    expect(rebrandedEnvironmentValue({
      ANTHRACITEMD_WEB_PORT: '5300',
      GRAPHITEMD_WEB_PORT: '5400',
    }, 'WEB_PORT')).toBe('5300')
    expect(() => configuredPort({
      ANTHRACITEMD_API_PORT: 'invalid',
      GRAPHITEMD_API_PORT: '3600',
    }, 'API_PORT', 3333)).toThrow('ANTHRACITEMD_API_PORT')
  })
})
