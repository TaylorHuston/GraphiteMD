import { describe, expect, it } from 'vitest'
import { LoginAttemptLimiter } from '../../app/security/login_attempt_limiter.js'

describe('GMD-001/S1 R2 login throttling', () => {
  it('bounds repeated failures per source and permits retry after the quiet period', () => {
    let now = 1_000
    const limiter = new LoginAttemptLimiter(3, 5_000, () => now)
    limiter.failed('source-a')
    limiter.failed('source-a')
    expect(limiter.allows('source-a')).toBe(true)
    limiter.failed('source-a')
    expect(limiter.allows('source-a')).toBe(false)
    expect(limiter.allows('source-b')).toBe(true)
    now += 5_001
    expect(limiter.allows('source-a')).toBe(true)
  })

  it('clears failures after successful authentication', () => {
    const limiter = new LoginAttemptLimiter(2)
    limiter.failed('source')
    limiter.succeeded('source')
    limiter.failed('source')
    expect(limiter.allows('source')).toBe(true)
  })
})
