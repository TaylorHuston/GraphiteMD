import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  AssistantOAuthFlowManager,
  PiRuntimeBoundary,
  type PiOAuthCallbacks,
  type PiOAuthRuntime,
} from '../../app/assistant/index.js'

const roots: string[] = []

afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

class FakePiOAuthRuntime implements PiOAuthRuntime {
  configured = false
  callbacks: PiOAuthCallbacks | undefined
  #complete!: () => void
  #fail!: (error: Error) => void
  #login: Promise<void> | undefined

  async providerStatus() {
    return { oauthAvailable: true, configured: this.configured }
  }

  async login(callbacks: PiOAuthCallbacks): Promise<void> {
    this.callbacks = callbacks
    this.#login = new Promise<void>((resolve, reject) => {
      this.#complete = resolve
      this.#fail = reject
    })
    return this.#login
  }

  async logout(): Promise<void> {
    this.configured = false
  }

  succeed(): void {
    this.configured = true
    this.#complete()
  }

  fail(): void {
    this.#fail(new Error('provider callback=raw-value'))
  }
}

describe('GMD-004/S1 R1 GraphiteMD-owned Codex OAuth', () => {
  it('R1-S2 rejects concurrent and stale input, safely cancels, and retains bounded sanitized terminal summaries', async () => {
    const runtime = new FakePiOAuthRuntime()
    const manager = new AssistantOAuthFlowManager(runtime, {
      now: () => '2026-07-20T00:00:00.000Z',
      nextFlowId: (() => {
        let number = 0
        return () => `flow_${++number}`
      })(),
      terminalRetention: 2,
    })

    const first = await manager.start()
    await Promise.resolve()
    const pendingInput = runtime.callbacks!.onPrompt({ message: 'Paste authorization code' })
    await expect(manager.start()).rejects.toMatchObject({ code: 'flow_conflict' })
    await expect(manager.answer('flow_missing', 'ignored')).rejects.toMatchObject({ code: 'invalid_input' })

    await expect(manager.cancel(first.flowId)).resolves.toMatchObject({ status: 'cancelled', input: null })
    await expect(pendingInput).rejects.toMatchObject({ code: 'cancelled' })
    await expect(manager.flow(first.flowId)).resolves.toMatchObject({ status: 'cancelled', error: { code: 'cancelled' } })

    const retry = await manager.start()
    await Promise.resolve()
    runtime.succeed()
    await expect(manager.waitForTerminal(retry.flowId)).resolves.toMatchObject({ status: 'succeeded', input: null, error: null })

    const failure = await manager.start()
    await Promise.resolve()
    runtime.fail()
    const failed = await manager.waitForTerminal(failure.flowId)
    expect(failed).toMatchObject({ status: 'failed', error: { code: 'provider_failure', retryable: true } })
    expect(JSON.stringify(failed)).not.toContain('raw-value')

    expect((await manager.listTerminal()).map((flow) => flow.flowId)).toEqual([retry.flowId, failure.flowId])
    expect(JSON.stringify(await manager.listTerminal())).not.toMatch(/authorization code|callback|raw-value/i)
  })
})

describe('GMD-004/S1 R2 protected credential lifecycle', () => {
  it('R2-S1 confines Pi state to machine-local assistant storage and protects credentials after login', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'graphitemd-state-'))
    roots.push(stateDirectory)
    const boundary = await PiRuntimeBoundary.create(stateDirectory)

    expect(boundary.paths.root).toBe(join(stateDirectory, 'assistant', 'pi'))
    for (const path of Object.values(boundary.paths)) {
      expect(relative(stateDirectory, path).startsWith('..')).toBe(false)
    }
    expect((await stat(boundary.paths.root)).mode & 0o777).toBe(0o700)
    expect((await stat(boundary.paths.sessions)).mode & 0o777).toBe(0o700)

    await writeFile(boundary.paths.auth, '{"openai-codex":{"type":"oauth"}}', { mode: 0o644 })
    await boundary.assertProtectedState()
    expect((await stat(boundary.paths.auth)).mode & 0o777).toBe(0o600)
    expect(await readFile(boundary.paths.auth, 'utf8')).toContain('openai-codex')
  })

  it('R2-S1 exposes only sanitized provider status when the provider fails', async () => {
    const runtime = new FakePiOAuthRuntime()
    const manager = new AssistantOAuthFlowManager(runtime, {
      now: () => '2026-07-20T00:00:00.000Z',
      nextFlowId: () => 'flow_safe',
    })
    const flow = await manager.start()
    await Promise.resolve()
    runtime.fail()
    await manager.waitForTerminal(flow.flowId)

    expect(await manager.providerStatus()).toEqual({ provider: 'openai-codex', status: 'failed', model: null })
    expect(JSON.stringify(await manager.flow(flow.flowId))).not.toMatch(/callback|credential|raw-value/i)
  })

  it('R1-S1 exposes a transient device-code instruction without storing provider credentials', async () => {
    const runtime = new FakePiOAuthRuntime()
    const manager = new AssistantOAuthFlowManager(runtime, {
      now: () => '2026-07-20T00:00:00.000Z',
      nextFlowId: () => 'flow_device',
    })
    const flow = await manager.start()
    await Promise.resolve()
    runtime.callbacks!.onDeviceCode({ verificationUri: 'https://auth.openai.com/device', userCode: 'ABC-123' })

    await expect(manager.flow(flow.flowId)).resolves.toMatchObject({
      status: 'awaiting_provider',
      input: { kind: 'device_code', verificationUri: 'https://auth.openai.com/device', userCode: 'ABC-123' },
    })
    runtime.succeed()
    expect(JSON.stringify(await manager.waitForTerminal(flow.flowId))).not.toContain('ABC-123')
  })
})
