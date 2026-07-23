export interface AutosaveRequest {
  resourceId: string
  source: string
  expectedRevision: string
  generation: number
}

export type AutosaveResult =
  | { status: 'saved'; revision: string }
  | { status: 'conflict'; currentRevision?: string }

export type AutosavePhase = 'idle' | 'scheduled' | 'saving' | 'saved' | 'error' | 'conflict'

export interface AutosaveSource {
  resourceId: string
  source: string
  revision: string
  eligible: boolean
  save(request: AutosaveRequest): Promise<AutosaveResult>
}

export interface AutosaveSnapshot {
  resourceId: string | null
  draft: string
  revision: string | null
  generation: number
  dirty: boolean
  pending: boolean
  phase: AutosavePhase
  error: string | null
}

/**
 * Coordinator's proven single-flight coordinator, renamed around AnthraciteMD's
 * opaque resource/revision contract. An epoch prevents late responses from
 * attaching to a subsequently opened note.
 */
export class AutosaveCoordinator {
  readonly #delayMs: number
  #source: AutosaveSource | null = null
  #canonical = ''
  #draft = ''
  #generation = 0
  #phase: AutosavePhase = 'idle'
  #timer: ReturnType<typeof setTimeout> | null = null
  #epoch = 0
  #inFlight: Promise<void> | null = null
  #queued = false
  #error: string | null = null
  #listeners = new Set<(snapshot: AutosaveSnapshot) => void>()

  constructor(delayMs = 750) { this.#delayMs = delayMs }

  open(source: AutosaveSource) {
    this.#clearTimer(); this.#epoch += 1; this.#source = source
    this.#canonical = source.source; this.#draft = source.source; this.#generation = 0
    this.#phase = 'idle'; this.#inFlight = null; this.#queued = false; this.#error = null
    this.#notify()
  }

  discard() {
    this.#clearTimer(); this.#epoch += 1; this.#source = null
    this.#canonical = ''; this.#draft = ''; this.#generation = 0
    this.#phase = 'idle'; this.#inFlight = null; this.#queued = false; this.#error = null
    this.#notify()
  }

  edit(source: string) {
    if (!this.#source) return
    this.#draft = source; this.#generation += 1
    if (this.#phase !== 'error') this.#error = null
    if (!this.#source.eligible || this.#paused()) { this.#notify(); return }
    if (this.#inFlight) { this.#queued = true; this.#notify(); return }
    this.#schedule()
  }

  setEligible(eligible: boolean) {
    if (!this.#source) return
    this.#source.eligible = eligible
    if (!eligible) {
      this.#clearTimer()
      if (!this.#inFlight && !this.#paused()) this.#phase = 'idle'
    } else if (!this.#inFlight && this.#draft !== this.#canonical && !this.#paused()) this.#schedule()
    this.#notify()
  }

  async flush() {
    this.#clearTimer()
    if (!this.#source?.eligible || this.#paused()) { this.#notify(); return }
    if (this.#inFlight) this.#queued = this.#draft !== this.#canonical
    else await this.#save()
    while (this.#inFlight) await this.#inFlight
    if (this.#source?.eligible && this.#draft !== this.#canonical && !this.#paused()) {
      await this.#save()
      while (this.#inFlight) await this.#inFlight
    }
  }

  async retry() {
    if (this.#phase !== 'error') return
    this.#phase = 'idle'; this.#error = null; this.#notify(); await this.flush()
  }

  async prepareTransition(): Promise<{ ready: true } | { ready: false; reason: 'error' | 'conflict' | 'ineligible' | 'source-changed' }> {
    const epoch = this.#epoch; const resourceId = this.#source?.resourceId
    await this.flush()
    if (epoch !== this.#epoch || resourceId !== this.#source?.resourceId) return { ready: false, reason: 'source-changed' }
    if (this.#phase === 'error') return { ready: false, reason: 'error' }
    if (this.#phase === 'conflict') return { ready: false, reason: 'conflict' }
    if (this.#draft !== this.#canonical) return { ready: false, reason: 'ineligible' }
    return { ready: true }
  }

  snapshot(): AutosaveSnapshot {
    return { resourceId: this.#source?.resourceId ?? null, draft: this.#draft,
      revision: this.#source?.revision ?? null, generation: this.#generation,
      dirty: this.#source !== null && this.#draft !== this.#canonical,
      pending: this.#timer !== null || this.#inFlight !== null || this.#queued,
      phase: this.#phase, error: this.#error }
  }

  subscribe(listener: (snapshot: AutosaveSnapshot) => void) {
    this.#listeners.add(listener); return () => { this.#listeners.delete(listener) }
  }

  #schedule() {
    this.#clearTimer()
    if (this.#draft === this.#canonical) { this.#phase = 'idle'; this.#notify(); return }
    this.#phase = 'scheduled'
    this.#timer = setTimeout(() => { this.#timer = null; void this.#save() }, this.#delayMs)
    this.#notify()
  }

  async #save() {
    const source = this.#source
    if (!source || !source.eligible || this.#draft === this.#canonical || this.#inFlight) return
    const epoch = this.#epoch; const generation = this.#generation; const draft = this.#draft
    this.#phase = 'saving'
    const operation = source.save({ resourceId: source.resourceId, source: draft,
      expectedRevision: source.revision, generation })
      .then((result) => {
        if (epoch !== this.#epoch || this.#source?.resourceId !== source.resourceId) return
        if (result.status === 'conflict') { this.#phase = 'conflict'; this.#queued = false; this.#notify(); return }
        source.revision = result.revision; this.#canonical = draft; this.#phase = 'saved'; this.#notify()
      })
      .catch((error: unknown) => {
        if (epoch !== this.#epoch || this.#source?.resourceId !== source.resourceId) return
        this.#phase = 'error'; this.#error = error instanceof Error ? error.message : 'Unable to save Markdown.'
        this.#queued = false; this.#notify()
      })
      .finally(() => {
        if (epoch !== this.#epoch || this.#source?.resourceId !== source.resourceId) return
        this.#inFlight = null; this.#notify()
        if (this.#queued && !this.#paused()) { this.#queued = false; void this.#save() }
      })
    this.#inFlight = operation; this.#notify(); await operation
  }

  #clearTimer() { const had = this.#timer !== null; if (this.#timer) clearTimeout(this.#timer); this.#timer = null; return had }
  #paused() { return this.#phase === 'error' || this.#phase === 'conflict' }
  #notify() { const snapshot = this.snapshot(); for (const listener of this.#listeners) listener(snapshot) }
}

export async function prepareAutosaveTransition(
  autosave: AutosaveCoordinator,
  confirmDiscard: () => boolean,
  onDiscard?: (reason: 'error' | 'conflict' | 'ineligible') => void,
): Promise<boolean> {
  const result = await autosave.prepareTransition()
  if (result.ready) return true
  if (result.reason === 'source-changed' || !confirmDiscard()) return false
  onDiscard?.(result.reason)
  autosave.discard()
  return true
}
