import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AssistantProviderStatus,
  AssistantTurn,
  type AssistantTurn as AssistantTurnValue,
} from '@anthracitemd/contracts'
import { readApiError, requestJson } from './api.js'
import './AssistantContext.css'

function xsrfToken(): string {
  const value = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
  return value ? decodeURIComponent(value) : ''
}

type AssistantContextProps = Readonly<{
  title: string
  onSessionExpired: () => void
  onOpenSettings: () => void
  onOpenNote: (resourceId: string) => void
  providerRevision?: number
}>

export function AssistantContext({ title, onSessionExpired, onOpenSettings, onOpenNote, providerRevision = 0 }: AssistantContextProps) {
  const questionId = useId()
  const [provider, setProvider] = useState<'loading' | 'connected' | 'unavailable'>('loading')
  const [question, setQuestion] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [turns, setTurns] = useState<AssistantTurnValue[]>([])
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void requestJson('/api/v1/assistant/provider', AssistantProviderStatus).then((response) => {
      if (!active) return
      if (response.status === 401) { onSessionExpired(); return }
      setProvider(response.ok && response.data.status === 'connected' ? 'connected' : 'unavailable')
    }).catch(() => { if (active) setProvider('unavailable') })
    return () => { active = false }
  }, [onSessionExpired, providerRevision])

  async function ask(event: FormEvent) {
    event.preventDefault()
    const submitted = question.trim()
    if (!submitted || asking) return
    setAsking(true); setError(null)
    try {
      const response = await requestJson('/api/v1/assistant/questions', AssistantTurn, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-xsrf-token': xsrfToken() },
        body: JSON.stringify({ question: submitted, ...(conversationId ? { conversationId } : {}) }),
      })
      if (response.status === 401) { onSessionExpired(); return }
      if (!response.ok) {
        const apiError = await readApiError(response.response)
        setError(apiError?.error.message ?? 'AnthraciteMD could not complete that question.')
        return
      }
      setConversationId(response.data.conversationId)
      setTurns((current) => [...current, response.data])
      setQuestion('')
    } catch {
      setError('AnthraciteMD could not reach the Assistant.')
    } finally {
      setAsking(false)
    }
  }

  return <section className="assistant-context" aria-label={title}>
    <p className="panel-label">Assistant</p>
    <h2>{title}</h2>
    {provider === 'loading' && <p aria-live="polite">Checking Codex connection…</p>}
    {provider === 'unavailable' && <div className="assistant-empty"><p>Connect Codex in Settings to ask grounded questions about this workspace.</p><button type="button" onClick={onOpenSettings}>Open Assistant settings</button></div>}
    {provider === 'connected' && <>
      <p className="assistant-hint">Answers are grounded in workspace notes that Codex reads.</p>
      <div className="assistant-turns" aria-live="polite">{turns.map((turn) => <article key={turn.turnId} className="assistant-turn">
        <p className="assistant-question">{turn.question}</p>
        <p>{turn.answer}</p>
        {turn.sources.length > 0 && <section className="assistant-evidence" aria-label="Sources used"><h3>Sources used</h3><ul className="assistant-sources">{turn.sources.map((source) => <li key={source.resourceId}><button type="button" onClick={() => onOpenNote(source.resourceId)}>{source.displayPath}</button></li>)}</ul></section>}
      </article>)}</div>
      <form className="assistant-composer" onSubmit={(event) => void ask(event)} aria-busy={asking}>
        <label htmlFor={questionId}>Ask Codex</label>
        <textarea id={questionId} value={question} onChange={(event) => setQuestion(event.target.value)} disabled={asking} placeholder="Ask about your workspace" rows={3} />
        {asking && <p role="status" aria-live="polite">Asking Codex. Your question will remain here until the answer is ready.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={asking || !question.trim()}>{asking ? 'Asking Codex…' : error ? 'Retry Codex' : 'Ask Codex'}</button>
      </form>
    </>}
  </section>
}
