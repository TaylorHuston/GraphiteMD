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
  logoutCount = 0

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
    this.logoutCount++
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

describe('AMD-004/S1 R1 AnthraciteMD-owned Codex OAuth', () => {
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
    await expect(manager.activeFlow()).resolves.toMatchObject({ flowId: first.flowId, status: 'awaiting_provider' })
    const pendingInput = runtime.callbacks!.onPrompt({ message: 'Paste authorization code' })
    await expect(manager.start()).rejects.toMatchObject({ code: 'flow_conflict' })
    await expect(manager.answer('flow_missing', 'ignored')).rejects.toMatchObject({ code: 'invalid_input' })

    await expect(manager.cancel(first.flowId)).resolves.toMatchObject({ status: 'cancelled', input: null })
    await expect(manager.activeFlow()).resolves.toBeNull()
    await expect(pendingInput).rejects.toMatchObject({ code: 'cancelled' })
    await expect(manager.flow(first.flowId)).resolves.toMatchObject({ status: 'cancelled', error: { code: 'cancelled' } })
    runtime.succeed()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(runtime.logoutCount).toBe(1)

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

  it('R1-S2 reserves startup before the asynchronous provider check completes', async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    const runtime = new FakePiOAuthRuntime()
    runtime.providerStatus = async () => { await pending; return { oauthAvailable: true, configured: false } }
    const manager = new AssistantOAuthFlowManager(runtime, { now: () => '2026-07-20T00:00:00.000Z', nextFlowId: () => 'flow_reserved' })

    const first = manager.start()
    await Promise.resolve()
    await expect(manager.start()).rejects.toMatchObject({ code: 'flow_conflict' })
    release()
    const flow = await first
    await manager.cancel(flow.flowId)
  })

  it('R1-S2 blocks a replacement flow until cancelled provider cleanup finishes', async () => {
    const runtime = new FakePiOAuthRuntime()
    const manager = new AssistantOAuthFlowManager(runtime, {
      now: () => '2026-07-20T00:00:00.000Z',
      nextFlowId: (() => { let number = 0; return () => `flow_cleanup${++number}` })(),
    })
    const first = await manager.start()
    await Promise.resolve()
    await manager.cancel(first.flowId)

    await expect(manager.start()).rejects.toMatchObject({ code: 'flow_conflict' })
    runtime.succeed()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const replacement = await manager.start()
    await manager.cancel(replacement.flowId)
  })

  it('R2-S2 disconnect invalidates a start still awaiting provider status', async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    const runtime = new FakePiOAuthRuntime()
    runtime.providerStatus = async () => { await pending; return { oauthAvailable: true, configured: runtime.configured } }
    const manager = new AssistantOAuthFlowManager(runtime, { now: () => '2026-07-20T00:00:00.000Z', nextFlowId: () => 'flow_stale' })

    const starting = manager.start()
    await Promise.resolve()
    const disconnecting = manager.disconnect()
    release()
    await expect(starting).rejects.toMatchObject({ code: 'cancelled' })
    await expect(disconnecting).resolves.toMatchObject({ status: 'disconnected' })
    await expect(manager.activeFlow()).resolves.toBeNull()
  })

  it('R1-S2 returns the provider option ID after the owner selects its opaque browser choice', async () => {
    const runtime = new FakePiOAuthRuntime()
    const manager = new AssistantOAuthFlowManager(runtime, {
      now: () => '2026-07-20T00:00:00.000Z',
      nextFlowId: () => 'flow_option',
    })
    const flow = await manager.start()
    await Promise.resolve()

    const selection = runtime.callbacks!.onSelect({
      message: 'Select OpenAI Codex login method:',
      options: [{ id: 'browser', label: 'Browser login (default)' }],
    })

    await expect(manager.answer(flow.flowId, 'option_1')).resolves.toMatchObject({ status: 'awaiting_provider' })
    await expect(selection).resolves.toBe('browser')
    runtime.succeed()
    await expect(manager.waitForTerminal(flow.flowId)).resolves.toMatchObject({ status: 'succeeded' })
  })

  it('R1-S1 exposes the transient browser authorization link alongside the manual fallback', async () => {
    const runtime = new FakePiOAuthRuntime()
    const manager = new AssistantOAuthFlowManager(runtime, {
      now: () => '2026-07-20T00:00:00.000Z',
      nextFlowId: () => 'flow_browser',
    })
    const flow = await manager.start()
    await Promise.resolve()

    runtime.callbacks!.onAuth({
      url: 'https://auth.example.test/authorize',
      instructions: 'Complete login in your browser.',
    })
    const manual = runtime.callbacks!.onManualCodeInput!()

    await expect(manager.flow(flow.flowId)).resolves.toMatchObject({
      status: 'awaiting_input',
      authorization: {
        url: 'https://auth.example.test/authorize',
        instructions: 'Complete login in your browser.',
      },
      input: { kind: 'text' },
    })

    await manager.cancel(flow.flowId)
    await expect(manual).rejects.toMatchObject({ code: 'cancelled' })
    await expect(manager.flow(flow.flowId)).resolves.toMatchObject({ status: 'cancelled', authorization: null })
  })
})

describe('AMD-004/S1 R2 protected credential lifecycle', () => {
  it('R2-S1 confines Pi state to machine-local assistant storage and protects credentials after login', async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-state-'))
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
