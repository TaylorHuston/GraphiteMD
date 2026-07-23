import { afterEach, describe, expect, it, vi } from 'vitest'
import { AutosaveCoordinator, prepareAutosaveTransition, type AutosaveRequest } from './autosave.js'

afterEach(() => vi.useRealTimers())

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done }); return { promise, resolve } }

describe('AMD-002/S2 conflict-safe autosave', () => {
  it('R2-S1 debounces the latest eligible exact draft with its expected revision', async () => {
    vi.useFakeTimers(); const requests: AutosaveRequest[] = []
    const autosave = new AutosaveCoordinator(50)
    autosave.open({ resourceId: 'res_one', source: '# A\r\n', revision: 'rev_1', eligible: true,
      save: async (request) => { requests.push(request); return { status: 'saved', revision: 'rev_2' } } })
    autosave.edit('# B\r\n'); autosave.edit('# C\r\n')
    await vi.advanceTimersByTimeAsync(50)
    expect(requests).toEqual([{ resourceId: 'res_one', source: '# C\r\n', expectedRevision: 'rev_1', generation: 2 }])
    expect(autosave.snapshot()).toMatchObject({ dirty: false, revision: 'rev_2', phase: 'saved' })
  })

  it('R2-S2 permits one active save and queues only the newest draft', async () => {
    const first = deferred<{ status: 'saved'; revision: string }>(); const requests: AutosaveRequest[] = []
    const autosave = new AutosaveCoordinator(0)
    autosave.open({ resourceId: 'res_one', source: 'a', revision: 'rev_1', eligible: true,
      save: (request) => { requests.push(request); return requests.length === 1 ? first.promise : Promise.resolve({ status: 'saved', revision: 'rev_3' }) } })
    autosave.edit('b'); const flushing = autosave.flush(); autosave.edit('c'); autosave.edit('d')
    expect(requests).toHaveLength(1); first.resolve({ status: 'saved', revision: 'rev_2' }); await flushing
    expect(requests.map(({ source, expectedRevision }) => [source, expectedRevision])).toEqual([['b', 'rev_1'], ['d', 'rev_2']])
  })

  it('R2-S3 pauses on conflict and retains the local draft', async () => {
    const autosave = new AutosaveCoordinator(0)
    autosave.open({ resourceId: 'res_one', source: 'canonical', revision: 'rev_1', eligible: true,
      save: async () => ({ status: 'conflict', currentRevision: 'rev_external' }) })
    autosave.edit('local draft'); await autosave.flush()
    expect(autosave.snapshot()).toMatchObject({ draft: 'local draft', dirty: true, phase: 'conflict', pending: false })
  })

  it('R2-S3 reports a conflict discovered while flushing a scheduled transition', async () => {
    const autosave = new AutosaveCoordinator(10_000)
    autosave.open({ resourceId: 'res_one', source: 'canonical', revision: 'rev_1', eligible: true,
      save: async () => ({ status: 'conflict', currentRevision: 'rev_external' }) })
    autosave.edit('local draft')
    const discarded: string[] = []

    expect(await prepareAutosaveTransition(autosave, () => true, (reason) => discarded.push(reason))).toBe(true)
    expect(discarded).toEqual(['conflict'])
    expect(autosave.snapshot()).toMatchObject({ resourceId: null, phase: 'idle' })
  })

  it('R2-S4 ignores a late response from a prior resource and guards transitions', async () => {
    const late = deferred<{ status: 'saved'; revision: string }>(); const autosave = new AutosaveCoordinator(0)
    autosave.open({ resourceId: 'res_old', source: 'old', revision: 'rev_old', eligible: true, save: () => late.promise })
    autosave.edit('old draft'); const flushing = autosave.flush()
    autosave.open({ resourceId: 'res_new', source: 'new', revision: 'rev_new', eligible: true, save: async () => ({ status: 'saved', revision: 'rev_newer' }) })
    late.resolve({ status: 'saved', revision: 'rev_late' }); await flushing
    expect(autosave.snapshot()).toMatchObject({ resourceId: 'res_new', draft: 'new', revision: 'rev_new' })
    autosave.setEligible(false); autosave.edit('protected')
    expect(await prepareAutosaveTransition(autosave, () => false)).toBe(false)
    expect(autosave.snapshot().draft).toBe('protected')
  })
})
