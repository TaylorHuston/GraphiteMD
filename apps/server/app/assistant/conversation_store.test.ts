import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'
import { ConfiguredWorkspaceAuthority } from '@graphitemd/workspace'
import { ConversationStore, ConversationStoreError } from './conversation_store.js'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

const startedTurn = {
  turnId: 'turn_alpha', conversationId: 'conv_alpha', status: 'in_progress' as const,
  question: 'Which note explains the launch?', provider: 'openai-codex' as const, model: 'gpt-5.4',
  createdAt: '2026-07-20T00:00:00.000Z', completedAt: null, answer: null, error: null, sources: [],
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'graphitemd-conversations-'))
  roots.push(root)
  await writeFile(join(root, 'Note.md'), '# Note\nlaunch fact')
  const workspace = new ConfiguredWorkspaceAuthority(root)
  await workspace.openConfigured()
  return { root, store: new ConversationStore(root, workspace) }
}

describe('GMD-004/S2 R3 inspectable conversation records', () => {
  it('R3-S1 atomically persists only normalized turns under .graphitemd/conversations', async () => {
    const { root, store } = await fixture()
    await store.create(startedTurn)
    const completed = { ...startedTurn, status: 'completed' as const, completedAt: '2026-07-20T00:00:01.000Z', answer: 'The launch is documented.', sources: [{
      resourceId: 'res_alpha', displayPath: 'Note.md', revision: 'rev_alpha', excerpt: '# Note\nlaunch fact', truncated: false,
    }] }
    await store.replaceTurn(completed)

    expect(await store.read('conv_alpha')).toEqual(expect.objectContaining({ schemaVersion: 1, turns: [completed] }))
    const source = await readFile(join(root, '.graphitemd', 'conversations', 'conv_alpha.json'), 'utf8')
    expect(source).not.toMatch(/token|refresh|auth\.json|graphitemd-conversations-/i)
    expect(source).toContain('launch fact')
  })

  it('R3-S2 converts an interrupted in-progress turn to an honest terminal record on recovery', async () => {
    const { store } = await fixture()
    await store.create(startedTurn)

    const recovered = await store.recover('conv_alpha')
    expect(recovered.turns).toEqual([expect.objectContaining({
      status: 'failed', completedAt: expect.any(String), answer: null,
      error: expect.objectContaining({ code: 'interrupted', retryable: true }),
    })])
  })

  it('R3-S2 recovers every retained in-progress conversation during startup enumeration', async () => {
    const { store } = await fixture()
    await store.create(startedTurn)
    await store.create({ ...startedTurn, conversationId: 'conv_beta', turnId: 'turn_beta' })

    const recovered = await store.recoverAll()
    expect(recovered).toHaveLength(2)
    expect(recovered.flatMap((document) => document.turns)).toEqual(expect.arrayContaining([
      expect.objectContaining({ conversationId: 'conv_alpha', status: 'failed', error: expect.objectContaining({ code: 'interrupted' }) }),
      expect.objectContaining({ conversationId: 'conv_beta', status: 'failed', error: expect.objectContaining({ code: 'interrupted' }) }),
    ]))
  })

  it('R3-S2 fails closed for malformed records and a redirected conversations directory', async () => {
    const { root, store } = await fixture()
    await store.create(startedTurn)
    await writeFile(join(root, '.graphitemd', 'conversations', 'conv_alpha.json'), '{ bad json')
    await expect(store.read('conv_alpha')).rejects.toBeInstanceOf(ConversationStoreError)

    const redirected = await mkdtemp(join(tmpdir(), 'graphitemd-conversation-redirect-'))
    roots.push(redirected)
    await rm(join(root, '.graphitemd', 'conversations'), { recursive: true })
    await symlink(redirected, join(root, '.graphitemd', 'conversations'))
    await expect(store.create({ ...startedTurn, conversationId: 'conv_beta', turnId: 'turn_beta' })).rejects.toBeInstanceOf(ConversationStoreError)
  })

  it('R3-S2 rejects a preexisting redirected .graphitemd ancestor before creating descendants', async () => {
    const { root, store } = await fixture()
    const redirected = await mkdtemp(join(tmpdir(), 'graphitemd-ancestor-redirect-'))
    roots.push(redirected)
    await rm(join(root, '.graphitemd'), { recursive: true })
    await symlink(redirected, join(root, '.graphitemd'))

    await expect(store.create(startedTurn)).rejects.toBeInstanceOf(ConversationStoreError)
    await expect(readFile(join(redirected, 'conversations', 'conv_alpha.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
