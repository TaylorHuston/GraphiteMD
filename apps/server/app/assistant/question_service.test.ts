import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'
import { ConfiguredWorkspaceAuthority } from '@graphitemd/workspace'
import { LocalSearchService } from '../search/local_search_service.js'
import { ConversationStore } from './conversation_store.js'
import { AssistantQuestionService, type AssistantRunRuntime } from './question_service.js'
import { AssistantWorkspaceContext } from './workspace_context.js'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

async function fixture(runtime: AssistantRunRuntime) {
  const root = await mkdtemp(join(tmpdir(), 'graphitemd-question-'))
  roots.push(root)
  await writeFile(join(root, 'Launch.md'), '# Launch\nThe launch date is 2030-04-05.')
  const workspace = new ConfiguredWorkspaceAuthority(root)
  await workspace.openConfigured()
  const search = new LocalSearchService(root, workspace)
  return { root, service: new AssistantQuestionService({
    runtime, context: () => new AssistantWorkspaceContext(workspace, search), conversationStore: new ConversationStore(root, workspace),
    nextConversationId: () => 'conv_alpha', nextTurnId: () => 'turn_alpha', now: () => '2026-07-20T00:00:00.000Z',
  }) }
}

describe('GMD-004/S2 R1 read-only workspace-grounded answers', () => {
  it('R1-S1 runs only brokered tools and persists the resulting service-derived sources', async () => {
    const runtime: AssistantRunRuntime = {
      status: async () => ({ connected: true, model: 'gpt-5.4' }),
      answer: async ({ question, tools }) => {
        expect(question).toContain('launch')
        const [result] = await tools.search('launch')
        const note = await tools.read(result!.resourceId)
        expect(note.text).toContain('2030-04-05')
        return 'The launch date is 2030-04-05.'
      },
    }
    const { service } = await fixture(runtime)
    const turn = await service.ask({ question: 'What is the launch date?' })

    expect(turn).toMatchObject({ status: 'completed', answer: 'The launch date is 2030-04-05.', sources: [
      { displayPath: 'Launch.md', truncated: false },
    ] })
  })

  it('R1-S2 produces an honest no-evidence terminal result when the runtime performs no successful read', async () => {
    const { service } = await fixture({ status: async () => ({ connected: true, model: 'gpt-5.4' }), answer: async () => 'Speculative answer' })
    await expect(service.ask({ question: 'What is unknown?' })).rejects.toMatchObject({ code: 'no_relevant_evidence' })
  })

  it('R1-S3 rejects disconnected, empty, and concurrent questions without starting ambiguous work', async () => {
    const disconnected = await fixture({ status: async () => ({ connected: false, model: null }), answer: async () => 'unused' })
    await expect(disconnected.service.ask({ question: 'Anything?' })).rejects.toMatchObject({ code: 'provider_unavailable' })

    let release!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    const active = await fixture({ status: async () => ({ connected: true, model: 'gpt-5.4' }), answer: async ({ tools }) => { await tools.search('launch'); await pending; return 'done' } })
    await expect(active.service.ask({ question: '   ' })).rejects.toMatchObject({ code: 'invalid_input' })
    const first = active.service.ask({ question: 'launch?' })
    await expect(active.service.ask({ question: 'launch again?' })).rejects.toMatchObject({ code: 'question_in_flight' })
    release()
    await expect(first).rejects.toMatchObject({ code: 'no_relevant_evidence' })
  })
})
