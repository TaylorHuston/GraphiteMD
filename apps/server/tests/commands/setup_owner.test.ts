import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { runOwnerSetup } from '../../commands/setup_owner.js'
import { OwnerSetupService } from '../../app/security/owner_setup_service.js'

describe('GMD-001/S1 R1 setup command adapter', () => {
  it('R1-S1 prompts securely for confirmation and prints no credential material', async () => {
    const service = new OwnerSetupService(await mkdtemp(join(tmpdir(), 'graphitemd-security-')))
    const password = 'command-only secret'
    const secure = vi.fn().mockResolvedValueOnce(password).mockResolvedValueOnce(password)
    const info = vi.fn()
    const warning = vi.fn()

    const exitCode = await runOwnerSetup({ secure, info, warning }, service)

    expect(exitCode).toBe(0)
    expect(secure).toHaveBeenNthCalledWith(1, 'Enter owner password')
    expect(secure).toHaveBeenNthCalledWith(2, 'Confirm owner password')
    const output = [...info.mock.calls, ...warning.mock.calls].flat().join('\n')
    expect(output).not.toContain(password)
    expect(output).not.toContain('$scrypt$')
    expect(output).toContain('Owner account is ready')
  })

  it('R1-S2 refuses before prompting and directs the operator to reset', async () => {
    const service = new OwnerSetupService(await mkdtemp(join(tmpdir(), 'graphitemd-security-')))
    await service.createOwner('existing password')
    const secure = vi.fn()
    const info = vi.fn()
    const warning = vi.fn()

    const exitCode = await runOwnerSetup({ secure, info, warning }, service)

    expect(exitCode).toBe(1)
    expect(secure).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith(
      'An owner account already exists. Use the explicit owner password reset command.'
    )
  })
})
