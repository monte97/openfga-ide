import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/useToast'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function makeOkResponse(body: unknown, status = 200) {
  return { ok: true, status, json: async () => body }
}

function makeErrorResponse(error: string, status = 400) {
  return { ok: false, status, json: async () => ({ error }) }
}

function makeRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run-1',
    suiteId: 'suite-1',
    status: 'running',
    startedAt: '2026-01-01T12:00:00Z',
    completedAt: null,
    error: null,
    summary: null,
    createdAt: '2026-01-01T12:00:00Z',
    results: [],
    ...overrides,
  }
}

describe('useRunStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    vi.useFakeTimers()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('has empty initial state', async () => {
    const { useRunStore } = await import('./runs')
    const store = useRunStore()
    expect(store.currentRun).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.pollInterval).toBeNull()
  })

  describe('triggerRun()', () => {
    it('calls POST and returns runId', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      // POST returns runId, GET (from startPolling) returns run
      fetchMock
        .mockResolvedValueOnce(makeOkResponse({ runId: 'run-1' }, 202))
        .mockResolvedValue(makeOkResponse(makeRun()))

      const runId = await store.triggerRun('suite-1')

      expect(runId).toBe('run-1')
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/suites/suite-1/run',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('sets loading to false after success', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock
        .mockResolvedValueOnce(makeOkResponse({ runId: 'run-1' }, 202))
        .mockResolvedValue(makeOkResponse(makeRun()))

      await store.triggerRun('suite-1')
      expect(store.loading).toBe(false)
    })

    it('clears currentRun before triggering', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      store.currentRun = makeRun({ status: 'completed' }) as never
      fetchMock
        .mockResolvedValueOnce(makeOkResponse({ runId: 'run-1' }, 202))
        .mockResolvedValue(makeOkResponse(makeRun()))

      void store.triggerRun('suite-1')
      // currentRun is cleared synchronously before the POST resolves
      expect(store.currentRun).toBeNull()
    })

    it('sets error and rethrows on POST failure', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeErrorResponse('Suite has no fixture', 400))

      await expect(store.triggerRun('suite-1')).rejects.toThrow('Suite has no fixture')
      expect(store.error).toBe('Suite has no fixture')
    })

    it('sets pollInterval after successful trigger', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock
        .mockResolvedValueOnce(makeOkResponse({ runId: 'run-1' }, 202))
        .mockResolvedValue(makeOkResponse(makeRun()))

      await store.triggerRun('suite-1')
      expect(store.pollInterval).not.toBeNull()
    })
  })

  describe('fetchRun()', () => {
    it('updates currentRun on success', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      const run = makeRun({ status: 'running' })
      fetchMock.mockResolvedValue(makeOkResponse(run))

      await store.fetchRun('run-1')

      expect(store.currentRun?.status).toBe('running')
    })

    it('stops polling when status is completed', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      const run = makeRun({ status: 'completed', summary: { total: 5, passed: 5, failed: 0, errored: 0, durationMs: 100 } })
      fetchMock.mockResolvedValue(makeOkResponse(run))

      // Set up polling first
      store.pollInterval = setInterval(() => {}, 9999) as ReturnType<typeof setInterval>
      await store.fetchRun('run-1')

      expect(store.pollInterval).toBeNull()
    })

    it('stops polling when status is failed', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      const run = makeRun({ status: 'failed' })
      fetchMock.mockResolvedValue(makeOkResponse(run))

      store.pollInterval = setInterval(() => {}, 9999) as ReturnType<typeof setInterval>
      await store.fetchRun('run-1')

      expect(store.pollInterval).toBeNull()
    })

    it('does not stop polling when status is running', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))

      const interval = setInterval(() => {}, 9999) as ReturnType<typeof setInterval>
      store.pollInterval = interval
      await store.fetchRun('run-1')

      expect(store.pollInterval).not.toBeNull()
      clearInterval(interval)
    })

    it('silently ignores network errors (no toast storm on polling failures)', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeErrorResponse('Run not found', 404))

      await expect(store.fetchRun('run-1')).resolves.toBeUndefined()
      // currentRun unchanged, no error thrown
      expect(store.currentRun).toBeNull()
    })
  })

  describe('startPolling()', () => {
    it('sets pollInterval and fetches immediately', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))

      store.startPolling('run-1')
      await vi.runAllTicks()

      expect(store.pollInterval).not.toBeNull()
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/runs/run-1'),
      )
    })

    it('clears existing interval before starting new one', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))

      const oldInterval = setInterval(() => {}, 9999) as ReturnType<typeof setInterval>
      store.pollInterval = oldInterval

      store.startPolling('run-1')

      // Old interval was replaced
      expect(store.pollInterval).not.toBe(oldInterval)
    })

    it('fires fetchRun again after 2 seconds', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))

      store.startPolling('run-1')
      await vi.runAllTicks() // flush immediate fetch

      const callsBefore = fetchMock.mock.calls.length
      await vi.advanceTimersByTimeAsync(2000)

      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore)
    })
  })

  describe('stopPolling()', () => {
    it('clears interval and sets pollInterval to null', async () => {
      const { useRunStore } = await import('./runs')
      const s = useRunStore()
      s.pollInterval = setInterval(() => {}, 9999) as ReturnType<typeof setInterval>
      s.stopPolling()
      expect(s.pollInterval).toBeNull()
    })

    it('is idempotent when no interval is active', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      expect(() => store.stopPolling()).not.toThrow()
      expect(store.pollInterval).toBeNull()
    })
  })

  describe('clearRun()', () => {
    it('resets currentRun, error, and stops polling', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      store.currentRun = makeRun() as never
      store.error = 'some error'
      store.pollInterval = setInterval(() => {}, 9999) as ReturnType<typeof setInterval>

      store.clearRun()

      expect(store.currentRun).toBeNull()
      expect(store.error).toBeNull()
      expect(store.pollInterval).toBeNull()
    })
  })
})
