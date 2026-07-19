import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { OwnerSetupService } from '../../app/security/owner_setup_service.js'
import { runOwnerReset } from '../../commands/reset_owner.js'

describe('GMD-001/S2 R2 host-local owner reset command', () => {
  it('R2-S1 requires explicit confirmation and matching secure password prompts', async () => {
    const service = new OwnerSetupService(await mkdtemp(join(tmpdir(), 'graphitemd-security-')))
    await service.createOwner('forgotten password')
    const password = 'recovered password'
    const confirm = vi.fn().mockResolvedValue(true)
    const secure = vi.fn().mockResolvedValueOnce(password).mockResolvedValueOnce(password)
    const info = vi.fn()
    const warning = vi.fn()

    const exitCode = await runOwnerReset({ confirm, secure, info, warning }, service)

    expect(exitCode).toBe(0)
    expect(confirm).toHaveBeenCalledOnce()
    expect(secure).toHaveBeenNthCalledWith(1, 'Enter replacement owner password')
    expect(secure).toHaveBeenNthCalledWith(2, 'Confirm replacement owner password')
    expect(await service.verifyPassword(password)).toBe(true)
    const output = [...info.mock.calls, ...warning.mock.calls].flat().join('\n')
    expect(output).not.toContain(password)
    expect(output).not.toContain('$scrypt$')
    expect(output).toContain('password was reset')
  })

  it.each([
    ['cancelled', false, 'matching password', 'matching password'],
    ['mismatched', true, 'first password', 'different password'],
  ])('R2-S2 preserves the old credential when the reset is %s', async (_case, confirmed, first, second) => {
    const service = new OwnerSetupService(await mkdtemp(join(tmpdir(), 'graphitemd-security-')))
    await service.createOwner('existing password')
    const secure = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second)

    const exitCode = await runOwnerReset(
      { confirm: vi.fn().mockResolvedValue(confirmed), secure, info: vi.fn(), warning: vi.fn() },
      service
    )

    expect(exitCode).toBe(1)
    expect(await service.verifyPassword('existing password')).toBe(true)
    expect(await service.verifyPassword(first)).toBe(false)
    if (!confirmed) expect(secure).not.toHaveBeenCalled()
  })
})
