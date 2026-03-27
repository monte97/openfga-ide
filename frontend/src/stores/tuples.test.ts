import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/useToast'
import { useTupleStore } from './tuples'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('useTupleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  it('fetchTuples sets tuples and continuationToken on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        tuples: [{ key: { user: 'user:alice', relation: 'viewer', object: 'doc:1' }, timestamp: 'ts' }],
        continuationToken: 'token1',
      }),
    })

    const store = useTupleStore()
    await store.fetchTuples('store-1')

    expect(store.tuples).toHaveLength(1)
    expect(store.continuationToken).toBe('token1')
    expect(store.hasMore).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('fetchTuples includes filters in query params', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ tuples: [], continuationToken: null }),
    })

    const store = useTupleStore()
    store.filterType = 'document'
    store.filterRelation = 'viewer'
    await store.fetchTuples('store-1')

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('type=document')
    expect(url).toContain('relation=viewer')
  })

  it('fetchNextPage appends tuples to existing list', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        tuples: [{ key: { user: 'user:bob', relation: 'editor', object: 'doc:2' }, timestamp: 'ts' }],
        continuationToken: null,
      }),
    })

    const store = useTupleStore()
    store.tuples = [{ key: { user: 'user:alice', relation: 'viewer', object: 'doc:1' }, timestamp: 'ts' }]
    store.continuationToken = 'page2'

    await store.fetchNextPage('store-1')

    expect(store.tuples).toHaveLength(2)
    expect(store.tuples[0].key.user).toBe('user:alice')
    expect(store.tuples[1].key.user).toBe('user:bob')
  })

  it('fetchNextPage sends continuationToken in query', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ tuples: [], continuationToken: null }),
    })

    const store = useTupleStore()
    store.continuationToken = 'nexttoken'
    await store.fetchNextPage('store-1')

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('continuationToken=nexttoken')
  })

  it('resetTuples clears tuples/token/error but preserves filters', () => {
    const store = useTupleStore()
    store.tuples = [{ key: { user: 'u', relation: 'r', object: 'o' }, timestamp: 't' }]
    store.continuationToken = 'tok'
    store.error = 'err'
    store.filterType = 'doc'
    store.filterRelation = 'viewer'

    store.resetTuples()

    expect(store.tuples).toHaveLength(0)
    expect(store.continuationToken).toBeNull()
    expect(store.error).toBeNull()
    expect(store.filterType).toBe('doc')
    expect(store.filterRelation).toBe('viewer')
  })

  it('clearFilters resets all filter refs', () => {
    const store = useTupleStore()
    store.filterType = 'doc'
    store.filterRelation = 'viewer'
    store.filterUser = 'user:alice'

    store.clearFilters()

    expect(store.filterType).toBe('')
    expect(store.filterRelation).toBe('')
    expect(store.filterUser).toBe('')
  })

  it('loading is true during fetch, false after', async () => {
    let resolveJson!: (v: unknown) => void
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => new Promise((r) => { resolveJson = r }),
    })

    const store = useTupleStore()
    const p = store.fetchTuples('s')
    expect(store.loading).toBe(true)
    await Promise.resolve()
    await Promise.resolve()
    resolveJson({ tuples: [], continuationToken: null })
    await p
    expect(store.loading).toBe(false)
  })

  it('error handling sets error and clears tuples', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Store not found' }),
    })

    const store = useTupleStore()
    await store.fetchTuples('bad-store')

    expect(store.error).toBe('Store not found')
    expect(store.tuples).toHaveLength(0)
  })
})
