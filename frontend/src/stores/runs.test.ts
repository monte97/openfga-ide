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
    expect(store.isPolling).toBe(false)
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

    it('starts polling after successful trigger', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock
        .mockResolvedValueOnce(makeOkResponse({ runId: 'run-1' }, 202))
        .mockResolvedValue(makeOkResponse(makeRun()))

      await store.triggerRun('suite-1')
      expect(store.isPolling).toBe(true)
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
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))
      store.startPolling('run-1')
      await vi.runAllTicks()
      expect(store.isPolling).toBe(true)

      fetchMock.mockResolvedValueOnce(makeOkResponse(makeRun({ status: 'completed', summary: { total: 5, passed: 5, failed: 0, errored: 0, durationMs: 100 } })))
      await store.fetchRun('run-1')
      expect(store.isPolling).toBe(false)
    })

    it('stops polling when status is failed', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))
      store.startPolling('run-1')
      await vi.runAllTicks()
      expect(store.isPolling).toBe(true)

      fetchMock.mockResolvedValueOnce(makeOkResponse(makeRun({ status: 'failed' })))
      await store.fetchRun('run-1')
      expect(store.isPolling).toBe(false)
    })

    it('does not stop polling when status is running', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))
      store.startPolling('run-1')
      await vi.runAllTicks()

      await store.fetchRun('run-1')
      expect(store.isPolling).toBe(true)
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
    it('sets isPolling and fetches immediately', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))

      store.startPolling('run-1')
      await vi.runAllTicks()

      expect(store.isPolling).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/runs/run-1'),
      )
    })

    it('clears existing polling before starting new one', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))

      store.startPolling('run-1')
      await vi.runAllTicks()
      const callsAfterFirst = fetchMock.mock.calls.length

      store.startPolling('run-2')
      await vi.runAllTicks()

      // run-2 was fetched, not just run-1
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/runs/run-2'),
      )
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst)
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
    it('clears polling when active', async () => {
      const { useRunStore } = await import('./runs')
      const s = useRunStore()
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))
      s.startPolling('run-1')
      await vi.runAllTicks()
      expect(s.isPolling).toBe(true)

      s.stopPolling()
      expect(s.isPolling).toBe(false)
    })

    it('is idempotent when no interval is active', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      expect(() => store.stopPolling()).not.toThrow()
      expect(store.isPolling).toBe(false)
    })
  })

  describe('clearRun()', () => {
    it('resets currentRun, error, and stops polling', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))
      store.currentRun = makeRun() as never
      store.error = 'some error'
      store.startPolling('run-1')
      await vi.runAllTicks()

      store.clearRun()

      expect(store.currentRun).toBeNull()
      expect(store.error).toBeNull()
      expect(store.isPolling).toBe(false)
    })

    it('resets consecutiveErrors and pollingError', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      store.consecutiveErrors = 3
      store.pollingError = 'some error'

      store.clearRun()

      expect(store.consecutiveErrors).toBe(0)
      expect(store.pollingError).toBeNull()
    })
  })

  describe('polling circuit breaker', () => {
    it('stops polling and sets pollingError after 5 consecutive errors', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockRejectedValue(new Error('network'))

      store.startPolling('run-1')
      // Immediate fetch + 4 more via interval = 5 total
      await vi.runAllTicks()
      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(2000)
        await vi.runAllTicks()
      }

      expect(store.pollingError).not.toBeNull()
      expect(store.isPolling).toBe(false)
    })

    it('stops polling on 5 consecutive non-ok responses', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      fetchMock.mockResolvedValue(makeErrorResponse('Server error', 500))

      store.startPolling('run-1')
      await vi.runAllTicks()
      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(2000)
        await vi.runAllTicks()
      }

      expect(store.pollingError).not.toBeNull()
      expect(store.isPolling).toBe(false)
    })

    it('resets consecutiveErrors on successful fetch', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      // 3 errors then 1 success
      fetchMock
        .mockRejectedValueOnce(new Error('network'))
        .mockRejectedValueOnce(new Error('network'))
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))

      store.startPolling('run-1')
      await vi.runAllTicks()
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(2000)
        await vi.runAllTicks()
      }

      expect(store.consecutiveErrors).toBe(0)
      expect(store.pollingError).toBeNull()
    })

    it('retryPolling resets state and resumes polling', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      // Set up a completed state after error
      store.consecutiveErrors = 5
      store.pollingError = 'Polling stopped after repeated failures. Check network and retry.'
      store.currentRun = makeRun({ id: 'run-1', status: 'running' }) as never
      fetchMock.mockResolvedValue(makeOkResponse(makeRun({ status: 'running' })))

      store.retryPolling()
      await vi.runAllTicks()

      expect(store.consecutiveErrors).toBe(0)
      expect(store.pollingError).toBeNull()
      expect(store.isPolling).toBe(true)
    })

    it('retryPolling does nothing when no currentRun', async () => {
      const { useRunStore } = await import('./runs')
      const store = useRunStore()
      store.consecutiveErrors = 5
      store.pollingError = 'error'

      store.retryPolling()

      expect(store.consecutiveErrors).toBe(0)
      expect(store.pollingError).toBeNull()
      expect(store.isPolling).toBe(false)
    })
  })
})
