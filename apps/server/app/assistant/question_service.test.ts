import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'
import { ConfiguredWorkspaceAuthority } from '@anthracitemd/workspace'
import { LocalSearchService } from '../search/local_search_service.js'
import { ConversationStore } from './conversation_store.js'
import { AssistantQuestionService, type AssistantRunRuntime } from './question_service.js'
import { AssistantWorkspaceContext } from './workspace_context.js'

const roots: string[] = []
const policy = { prompt: 'Answer only from evidence in read workspace notes.', tools: ['workspace_search', 'workspace_read'] as const }
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

async function fixture(runtime: AssistantRunRuntime) {
  const root = await mkdtemp(join(tmpdir(), 'anthracitemd-question-'))
  roots.push(root)
  await writeFile(join(root, 'Launch.md'), '# Launch\nThe launch date is 2030-04-05.')
  const workspace = new ConfiguredWorkspaceAuthority(root)
  await workspace.openConfigured()
  const search = new LocalSearchService(root, workspace)
  let turn = 0
  return { root, service: new AssistantQuestionService({
    runtime, context: () => new AssistantWorkspaceContext(workspace, search), conversationStore: new ConversationStore(root, workspace),
    nextConversationId: () => 'conv_alpha', nextTurnId: () => turn++ === 0 ? 'turn_alpha' : 'turn_beta', now: () => '2026-07-20T00:00:00.000Z',
  }) }
}

describe('AMD-004/S2 R1 read-only workspace-grounded answers', () => {
  it('R1-S1 runs only brokered tools and persists the resulting service-derived sources', async () => {
    const runtime: AssistantRunRuntime = {
      status: async () => ({ connected: true, model: 'gpt-5.4' }),
      run: async ({ question, tools, policy: receivedPolicy }) => {
        expect(question).toContain('launch')
        expect(receivedPolicy).toEqual(policy)
        const [result] = await tools.search('launch')
        const note = await tools.read(result!.resourceId)
        expect(note.text).toContain('2030-04-05')
        return 'The launch date is 2030-04-05.'
      },
    }
    const { service } = await fixture(runtime)
    const turn = await service.ask({ question: 'What is the launch date?', policy })

    expect(turn).toMatchObject({ status: 'completed', answer: 'The launch date is 2030-04-05.', sources: [
      { displayPath: 'Launch.md', truncated: false },
    ] })
  })

  it('R1-S2 produces an honest no-evidence terminal result when the runtime performs no successful read', async () => {
    const { service } = await fixture({ status: async () => ({ connected: true, model: 'gpt-5.4' }), run: async () => 'Speculative answer' })
    await expect(service.ask({ question: 'What is unknown?', policy })).rejects.toMatchObject({ code: 'no_relevant_evidence' })
  })

  it('R1-S3 rejects disconnected, empty, and concurrent questions without starting ambiguous work', async () => {
    const disconnected = await fixture({ status: async () => ({ connected: false, model: null }), run: async () => 'unused' })
    await expect(disconnected.service.ask({ question: 'Anything?', policy })).rejects.toMatchObject({ code: 'provider_unavailable' })

    let release!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    const active = await fixture({ status: async () => ({ connected: true, model: 'gpt-5.4' }), run: async ({ tools }) => { await tools.search('launch'); await pending; return 'done' } })
    await expect(active.service.ask({ question: '   ', policy })).rejects.toMatchObject({ code: 'invalid_input' })
    const first = active.service.ask({ question: 'launch?', policy })
    await expect(active.service.ask({ question: 'launch again?', policy })).rejects.toMatchObject({ code: 'question_in_flight' })
    release()
    await expect(first).rejects.toMatchObject({ code: 'no_relevant_evidence' })
  })

  it('R1-S1 appends a follow-up question to its canonical conversation record', async () => {
    const { root, service } = await fixture({
      status: async () => ({ connected: true, model: 'gpt-5.4' }),
      run: async ({ tools }) => {
        const [result] = await tools.search('launch')
        await tools.read(result!.resourceId)
        return 'The launch date is documented.'
      },
    })

    const first = await service.ask({ question: 'When is the launch?', policy })
    const second = await service.ask({ question: 'Which note says that?', conversationId: first.conversationId, policy })

    expect(second).toMatchObject({ conversationId: first.conversationId, turnId: 'turn_beta', status: 'completed' })
    const record = JSON.parse(await readFile(join(root, '.anthracitemd', 'conversations', 'conv_alpha.json'), 'utf8'))
    expect(record.turns).toHaveLength(2)
    expect(record.turns.map((entry: { status: string }) => entry.status)).toEqual(['completed', 'completed'])
  })
})
