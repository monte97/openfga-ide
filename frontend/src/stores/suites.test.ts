import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/useToast'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// Stub URL static methods needed by exportSuite (URL constructor itself must remain intact)
URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
URL.revokeObjectURL = vi.fn()

const originalCreateElement = document.createElement.bind(document)
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'a') return { href: '', download: '', click: vi.fn() } as unknown as HTMLElement
  return originalCreateElement(tag)
})

function makeOkResponse(body: unknown, status = 200) {
  return { ok: true, status, json: async () => body }
}

function makeErrorResponse(error: string, status = 400) {
  return { ok: false, status, json: async () => ({ error }) }
}

const sample = {
  id: 'suite-1',
  name: 'My Suite',
  description: null,
  tags: [],
  createdAt: '2026-03-31T10:00:00Z',
  updatedAt: '2026-03-31T10:00:00Z',
  lastRun: null,
  groupCount: 0,
  testCount: 0,
}

const sampleDefinition = {
  groups: [
    {
      id: 'group-1',
      name: 'Group A',
      testCases: [
        {
          id: 'test-1',
          user: 'user:alice',
          relation: 'viewer',
          object: 'document:budget',
          expected: true,
        },
      ],
    },
  ],
}

const fullSuite = { ...sample, definition: sampleDefinition }

describe('useSuiteStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  it('has empty initial state', async () => {
    const { useSuiteStore } = await import('./suites')
    const store = useSuiteStore()
    expect(store.suites).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.activeSuite).toBeNull()
    expect(store.loadingSuite).toBe(false)
  })

  describe('fetchSuites()', () => {
    it('populates suites on success', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockResolvedValue(makeOkResponse({ suites: [sample] }))
      await store.fetchSuites()
      expect(store.suites).toHaveLength(1)
      expect(store.suites[0].name).toBe('My Suite')
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('sets error on failure', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockResolvedValue(makeErrorResponse('Fetch failed'))
      await store.fetchSuites()
      expect(store.error).toBe('Fetch failed')
      expect(store.suites).toEqual([])
    })

    it('sets error on network failure', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockRejectedValue(new Error('Network error'))
      await store.fetchSuites()
      expect(store.error).toBe('Network error')
    })
  })

  describe('createSuite()', () => {
    it('prepends new suite to list and shows toast', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.suites = [{ ...sample, id: 'suite-old' }]
      fetchMock.mockResolvedValue(makeOkResponse(sample, 201))
      const result = await store.createSuite({ name: 'My Suite' })
      expect(result.id).toBe('suite-1')
      expect(store.suites[0].id).toBe('suite-1')
      expect(store.suites).toHaveLength(2)
      const { toasts } = useToast()
      expect(toasts.some((t) => t.message === 'Suite created')).toBe(true)
    })

    it('throws and does not update list on error', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockResolvedValue(makeErrorResponse('Validation error'))
      await expect(store.createSuite({ name: '' })).rejects.toThrow('Validation error')
      expect(store.suites).toHaveLength(0)
    })
  })

  describe('deleteSuite()', () => {
    it('removes suite from list and shows toast', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.suites = [sample]
      fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) })
      await store.deleteSuite('suite-1')
      expect(store.suites).toHaveLength(0)
      const { toasts } = useToast()
      expect(toasts.some((t) => t.message === 'Suite deleted')).toBe(true)
    })

    it('throws on error', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.suites = [sample]
      fetchMock.mockResolvedValue(makeErrorResponse('Not found', 404))
      await expect(store.deleteSuite('suite-1')).rejects.toThrow('Not found')
      expect(store.suites).toHaveLength(1)
    })
  })

  describe('fetchSuite()', () => {
    it('sets activeSuite on success', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockResolvedValue(makeOkResponse(fullSuite))
      await store.fetchSuite('suite-1')
      expect(store.activeSuite).not.toBeNull()
      expect(store.activeSuite!.id).toBe('suite-1')
      expect(store.activeSuite!.definition.groups).toHaveLength(1)
    })

    it('sets loadingSuite false after fetch', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockResolvedValue(makeOkResponse(fullSuite))
      await store.fetchSuite('suite-1')
      expect(store.loadingSuite).toBe(false)
    })

    it('aborts prior in-flight fetch when called again', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
      // First call never resolves (simulates slow network)
      let resolveFirst!: (v: unknown) => void
      fetchMock
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
        .mockResolvedValue(makeOkResponse(fullSuite))
      const first = store.fetchSuite('suite-1')
      const second = store.fetchSuite('suite-2')
      await second
      // The first call should have been aborted
      expect(abortSpy).toHaveBeenCalledTimes(1)
      // Resolve first to avoid dangling promises
      resolveFirst({ ok: true, json: async () => fullSuite })
      await first
    })

    it('does not set activeSuite or errorSuite on AbortError', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      const abortError = new DOMException('Aborted', 'AbortError')
      fetchMock.mockRejectedValue(abortError)
      await store.fetchSuite('suite-1')
      expect(store.activeSuite).toBeNull()
      expect(store.errorSuite).toBeNull()
    })

    it('keeps loadingSuite true while second fetch is in flight after aborting first', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      let resolveSecond!: (v: unknown) => void
      fetchMock
        .mockImplementationOnce(() => new Promise((resolve) => {
          // First fetch resolves immediately (but will be aborted)
          resolve({ ok: true, json: async () => fullSuite })
        }))
        .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))

      const first = store.fetchSuite('suite-1')
      // Second fetch starts before first settles — aborts first
      store.fetchSuite('suite-2')
      await first
      // First is done (aborted), second is still in flight — loadingSuite must stay true
      expect(store.loadingSuite).toBe(true)
      // Now let second finish
      resolveSecond({ ok: true, json: async () => ({ ...fullSuite, id: 'suite-2' }) })
    })
  })

  describe('saveDefinition()', () => {
    it('calls PUT and updates activeSuite', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = fullSuite
      const newDef = { groups: [] }
      fetchMock.mockResolvedValue(makeOkResponse({ ...fullSuite, definition: newDef }))
      await store.saveDefinition('suite-1', newDef)
      expect(store.activeSuite!.definition.groups).toHaveLength(0)
    })

    it('aborts prior in-flight save when called again', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = fullSuite
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
      let resolveFirst!: (v: unknown) => void
      fetchMock
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
        .mockResolvedValue(makeOkResponse(fullSuite))
      const first = store.saveDefinition('suite-1', { groups: [] })
      const second = store.saveDefinition('suite-1', { groups: [] })
      await second
      // At least one abort must have been issued for the previous in-flight save
      expect(abortSpy).toHaveBeenCalled()
      resolveFirst({ ok: true, json: async () => fullSuite })
      await first
    })

    it('does not throw on AbortError', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = fullSuite
      const abortError = new DOMException('Aborted', 'AbortError')
      fetchMock.mockRejectedValue(abortError)
      await expect(store.saveDefinition('suite-1', { groups: [] })).resolves.toBeUndefined()
    })
  })

  describe('addGroup()', () => {
    it('adds a group to activeSuite definition', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = { ...fullSuite, definition: { groups: [] } }
      store.addGroup()
      expect(store.activeSuite!.definition.groups).toHaveLength(1)
      expect(store.activeSuite!.definition.groups[0].name).toBe('New Group')
    })

    it('does nothing when no activeSuite', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      expect(() => store.addGroup()).not.toThrow()
    })
  })

  describe('removeGroup()', () => {
    it('removes group by id', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = fullSuite
      store.removeGroup('group-1')
      expect(store.activeSuite!.definition.groups).toHaveLength(0)
    })
  })

  describe('updateGroup()', () => {
    it('patches group name', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = fullSuite
      store.updateGroup('group-1', { name: 'Renamed' })
      expect(store.activeSuite!.definition.groups[0].name).toBe('Renamed')
    })
  })

  describe('addTestCase()', () => {
    it('adds a test case to the specified group', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = { ...fullSuite, definition: { groups: [{ id: 'group-1', name: 'G', testCases: [] }] } }
      const tc = store.addTestCase('group-1')
      expect(store.activeSuite!.definition.groups[0].testCases).toHaveLength(1)
      expect(tc.expected).toBe(true)
    })
  })

  describe('updateTestCase()', () => {
    it('patches test case fields', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = fullSuite
      store.updateTestCase('group-1', 'test-1', { user: 'user:bob', expected: false })
      const tc = store.activeSuite!.definition.groups[0].testCases[0]
      expect(tc.user).toBe('user:bob')
      expect(tc.expected).toBe(false)
    })
  })

  describe('removeTestCase()', () => {
    it('removes test case from group', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = fullSuite
      store.removeTestCase('group-1', 'test-1')
      expect(store.activeSuite!.definition.groups[0].testCases).toHaveLength(0)
    })
  })

  describe('fetchSuite() fixture preservation', () => {
    it('preserves fixture when loading suite with fixture', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      const suiteWithFixture = {
        ...fullSuite,
        definition: {
          fixture: { model: { type_definitions: [] }, tuples: [] },
          groups: [],
        },
      }
      fetchMock.mockResolvedValue(makeOkResponse(suiteWithFixture))
      await store.fetchSuite('suite-1')
      expect(store.activeSuite!.definition.fixture).toEqual({
        model: { type_definitions: [] },
        tuples: [],
      })
    })

    it('sets fixture to undefined when suite has no fixture', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockResolvedValue(makeOkResponse(fullSuite))
      await store.fetchSuite('suite-1')
      expect(store.activeSuite!.definition.fixture).toBeUndefined()
    })
  })

  describe('addGroup() fixture preservation', () => {
    it('preserves fixture when adding a group', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      const fixture = { model: { type_definitions: [] }, tuples: [] }
      store.activeSuite = { ...fullSuite, definition: { fixture, groups: [] } }
      store.addGroup()
      expect(store.activeSuite!.definition.fixture).toEqual(fixture)
    })
  })

  describe('importSuite()', () => {
    it('prepends imported suite and shows correct toast', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockResolvedValue(makeOkResponse({ ...sample, id: 'suite-imported' }, 201))
      const payload = {
        name: 'Imported Suite',
        definition: {
          groups: [
            { name: 'G1', testCases: [{ user: 'user:alice', relation: 'reader', object: 'doc:1', expected: true }] },
          ],
        },
      }
      const result = await store.importSuite(payload)
      expect(result.id).toBe('suite-imported')
      expect(store.suites[0].id).toBe('suite-imported')
      expect(fetchMock).toHaveBeenCalledWith('/api/suites', expect.objectContaining({ method: 'POST' }))
      const { toasts } = useToast()
      expect(toasts.some((t) => t.message === "Imported 'My Suite' (1 groups, 1 tests)")).toBe(true)
    })

    it('throws on server error without updating list', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockResolvedValue(makeErrorResponse('Validation error'))
      await expect(store.importSuite({ name: 'Bad' })).rejects.toThrow('Validation error')
      expect(store.suites).toHaveLength(0)
    })
  })

  describe('exportSuite()', () => {
    it('calls GET suites/:suiteId/export and shows success toast', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockResolvedValue(makeOkResponse({ name: 'Auth Suite', description: null, tags: [], definition: { groups: [] } }))
      await store.exportSuite('suite-1', 'Auth Suite')
      expect(fetchMock).toHaveBeenCalledWith('/api/suites/suite-1/export', expect.any(Object))
      const { toasts } = useToast()
      expect(toasts.some((t) => t.message === "Suite 'Auth Suite' exported")).toBe(true)
    })

    it('shows error toast on failure', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      fetchMock.mockResolvedValue(makeErrorResponse('Export failed'))
      await store.exportSuite('suite-1', 'Auth Suite')
      const { toasts } = useToast()
      expect(toasts.some((t) => t.type === 'error')).toBe(true)
    })
  })

  describe('updateFixture()', () => {
    it('sets fixture on activeSuite', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = { ...fullSuite, definition: { groups: [] } }
      store.updateFixture({ model: { type_definitions: [] }, tuples: [] })
      expect(store.activeSuite!.definition.fixture).toEqual({
        model: { type_definitions: [] },
        tuples: [],
      })
    })

    it('clears fixture when passed null', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      store.activeSuite = {
        ...fullSuite,
        definition: { fixture: { tuples: [] }, groups: [] },
      }
      store.updateFixture(null)
      expect(store.activeSuite!.definition.fixture).toBeUndefined()
    })

    it('does nothing when no activeSuite', async () => {
      const { useSuiteStore } = await import('./suites')
      const store = useSuiteStore()
      expect(() => store.updateFixture({ tuples: [] })).not.toThrow()
    })
  })
})
