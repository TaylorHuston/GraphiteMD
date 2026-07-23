import { describe, expect, it } from 'vitest'
import { LoginAttemptLimiter } from '../../app/security/login_attempt_limiter.js'

describe('AMD-001/S1 R2 login throttling', () => {
  it('atomically bounds parallel authentication attempts per source', () => {
    const limiter = new LoginAttemptLimiter(2)

    const first = limiter.acquire('source-a')
    const second = limiter.acquire('source-a')

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    expect(limiter.acquire('source-a')).toBeNull()
    expect(limiter.acquire('source-b')).not.toBeNull()

    first?.failed()
    second?.failed()
    expect(limiter.acquire('source-a')).toBeNull()
  })

  it('permits retry after the quiet period and clears failures after success', () => {
    let now = 1_000
    const limiter = new LoginAttemptLimiter(2, 5_000, () => now)
    limiter.acquire('source')?.failed()
    limiter.acquire('source')?.failed()
    expect(limiter.acquire('source')).toBeNull()

    now += 5_001
    const retry = limiter.acquire('source')
    expect(retry).not.toBeNull()
    retry?.succeeded()

    expect(limiter.acquire('source')).not.toBeNull()
  })

  it('expires idle sources and keeps storage bounded with least-recently-used eviction', () => {
    let now = 1_000
    const limiter = new LoginAttemptLimiter(3, 5_000, () => now, 2, 10_000)
    limiter.acquire('oldest')?.failed()
    now += 1
    limiter.acquire('newer')?.failed()
    now += 1
    limiter.acquire('newest')?.failed()

    expect(limiter.trackedSourceCount).toBe(2)
    const reintroduced = limiter.acquire('oldest')
    expect(reintroduced).not.toBeNull()
    reintroduced?.failed()

    now += 10_001
    expect(limiter.acquire('after-expiry')).not.toBeNull()
    expect(limiter.trackedSourceCount).toBe(1)
  })
})
