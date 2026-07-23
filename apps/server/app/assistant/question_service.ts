import { randomUUID } from 'node:crypto'

import type { AssistantError, AssistantModelSessionRequest, AssistantTurn } from '@anthracitemd/contracts'
import { ConversationStore, type ConversationDocument } from './conversation_store.js'
import { AssistantWorkspaceContext, AssistantWorkspaceContextError } from './workspace_context.js'

export interface AssistantRunRuntime {
  status(): Promise<Readonly<{ connected: boolean; model: string | null }>>
  run(input: Readonly<{
    question: string
    policy: AssistantModelSessionRequest['policy']
    tools: Readonly<{
      search(query: string): ReturnType<AssistantWorkspaceContext['search']>
      read(resourceId: string): ReturnType<AssistantWorkspaceContext['read']>
    }>
  }>): Promise<string>
}

export class AssistantQuestionError extends Error {
  constructor(readonly code: Extract<AssistantError['code'], 'provider_unavailable' | 'invalid_input' | 'question_in_flight' | 'no_relevant_evidence' | 'workspace_unavailable' | 'context_limit'>) {
    super({
      provider_unavailable: 'Codex is not connected.', invalid_input: 'The Assistant question is invalid.',
      question_in_flight: 'An Assistant question is already in progress.', no_relevant_evidence: 'No relevant workspace evidence is available.',
      workspace_unavailable: 'The workspace is unavailable.', context_limit: 'The available workspace evidence exceeded the configured context limit.',
    }[code])
    this.name = 'AssistantQuestionError'
  }
}

export class AssistantQuestionService {
  #inFlight = false

  constructor(private readonly dependencies: Readonly<{
    runtime: AssistantRunRuntime
    context: () => AssistantWorkspaceContext
    conversationStore: ConversationStore
    nextConversationId?: () => string
    nextTurnId?: () => string
    now?: () => string
  }>) {}

  async ask(input: AssistantModelSessionRequest): Promise<Extract<AssistantTurn, { status: 'completed' }>> {
    const question = input.question.trim()
    if (!question || Buffer.byteLength(question, 'utf8') > 4_000) throw new AssistantQuestionError('invalid_input')
    if (this.#inFlight) throw new AssistantQuestionError('question_in_flight')
    this.#inFlight = true
    let started: Extract<AssistantTurn, { status: 'in_progress' }> | undefined
    try {
      const provider = await this.dependencies.runtime.status()
      if (!provider.connected || !provider.model) throw new AssistantQuestionError('provider_unavailable')
      const now = this.dependencies.now ?? (() => new Date().toISOString())
      const conversationId = input.conversationId ?? (this.dependencies.nextConversationId?.() ?? `conv_${randomUUID().replaceAll('-', '')}`)
      const turnId = this.dependencies.nextTurnId?.() ?? `turn_${randomUUID().replaceAll('-', '')}`
      const context = this.dependencies.context()
      started = {
        turnId: turnId as `turn_${string}`, conversationId, status: 'in_progress', question, provider: 'openai-codex', model: provider.model,
        createdAt: now(), completedAt: null, answer: null, error: null, sources: [],
      }
      await this.dependencies.conversationStore.start(started)
      const answer = (await this.dependencies.runtime.run({
        question,
        policy: input.policy,
        tools: { search: (query) => context.search(query), read: (resourceId) => context.read(resourceId) },
      })).trim()
      if (!answer || context.sources().length === 0) throw new AssistantQuestionError('no_relevant_evidence')
      const completed: Extract<AssistantTurn, { status: 'completed' }> = { ...started, status: 'completed', completedAt: now(), answer, sources: [...context.sources()] }
      await this.dependencies.conversationStore.replaceTurn(completed)
      return completed
    } catch (error) {
      const questionError = error instanceof AssistantQuestionError ? error : error instanceof AssistantWorkspaceContextError
        ? new AssistantQuestionError(error.code) : new AssistantQuestionError('workspace_unavailable')
      if (started) await this.#fail(started, questionError).catch(() => undefined)
      throw questionError
    } finally {
      this.#inFlight = false
    }
  }

  async #fail(started: Extract<AssistantTurn, { status: 'in_progress' }>, failure: AssistantQuestionError): Promise<ConversationDocument> {
    return this.dependencies.conversationStore.replaceTurn({
      ...started, status: 'failed', completedAt: (this.dependencies.now ?? (() => new Date().toISOString()))(), answer: null,
      error: { code: failure.code, message: failure.message, retryable: failure.code !== 'invalid_input' }, sources: [],
    })
  }
}
