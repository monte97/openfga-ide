import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/useToast'
import { useQueryStore } from './queries'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('useQueryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  it('runCheck sets checkResult.allowed=true and responseTime>=0 on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: true }),
    })

    const store = useQueryStore()
    store.checkUser = 'user:alice'
    store.checkRelation = 'viewer'
    store.checkObject = 'document:roadmap'
    await store.runCheck('store-01')

    expect(store.checkResult?.allowed).toBe(true)
    expect(store.checkResult?.responseTime).toBeGreaterThanOrEqual(0)
    expect(store.loading).toBe(false)
  })

  it('runCheck sets checkResult.allowed=false for denied response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: false }),
    })

    const store = useQueryStore()
    store.checkUser = 'user:bob'
    store.checkRelation = 'owner'
    store.checkObject = 'document:secret'
    await store.runCheck('store-01')

    expect(store.checkResult?.allowed).toBe(false)
  })

  it('runCheck clears previous expandResult', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: true }),
    })

    const store = useQueryStore()
    store.expandResult = { root: { name: 'test' } }
    await store.runCheck('store-01')

    expect(store.expandResult).toBeNull()
  })

  it('runExpand sets expandResult from API response tree', async () => {
    const tree = { root: { name: 'document:roadmap#viewer', union: { nodes: [] } } }
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ tree }),
    })

    const store = useQueryStore()
    store.checkRelation = 'viewer'
    store.checkObject = 'document:roadmap'
    await store.runExpand('store-01')

    expect(store.expandResult).toEqual(tree)
    expect(store.expandLoading).toBe(false)
  })

  it('resetCheck clears results but preserves input fields', () => {
    const store = useQueryStore()
    store.checkUser = 'user:alice'
    store.checkRelation = 'viewer'
    store.checkObject = 'document:roadmap'
    store.checkResult = { allowed: true, responseTime: 42 }
    store.expandResult = { root: { name: 'test' } }

    store.resetCheck()

    expect(store.checkResult).toBeNull()
    expect(store.expandResult).toBeNull()
    expect(store.checkUser).toBe('user:alice')
    expect(store.checkRelation).toBe('viewer')
    expect(store.checkObject).toBe('document:roadmap')
  })

  it('sets loading=true during check and loading=false after', async () => {
    let resolveResponse!: (value: unknown) => void
    const pending = new Promise((res) => { resolveResponse = res })
    fetchMock.mockReturnValue(pending)

    const store = useQueryStore()
    const runPromise = store.runCheck('store-01')

    expect(store.loading).toBe(true)

    resolveResponse({ ok: true, json: async () => ({ allowed: true }) })
    await runPromise

    expect(store.loading).toBe(false)
  })

  it('sets error and clears checkResult on API error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Store not found' }),
    })

    const store = useQueryStore()
    await store.runCheck('bad-store')

    expect(store.error).toBe('Store not found')
    expect(store.checkResult).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('listObjects sets listObjectsResult from API response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ objects: ['document:roadmap', 'document:specs'] }),
    })

    const store = useQueryStore()
    store.listObjectsInputs.user = 'user:alice'
    store.listObjectsInputs.relation = 'viewer'
    store.listObjectsInputs.type = 'document'
    await store.listObjects('store-01')

    expect(store.listObjectsResult).toEqual(['document:roadmap', 'document:specs'])
    expect(store.listObjectsLoading).toBe(false)
  })

  it('listObjects clears previous result on new call', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ objects: [] }),
    })

    const store = useQueryStore()
    store.listObjectsResult = ['document:old']
    await store.listObjects('store-01')

    expect(store.listObjectsResult).toEqual([])
  })

  it('listUsers sets listUsersResult from API response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ users: ['user:alice', 'user:bob'] }),
    })

    const store = useQueryStore()
    store.listUsersInputs.objectType = 'document'
    store.listUsersInputs.objectId = 'roadmap'
    store.listUsersInputs.relation = 'viewer'
    await store.listUsers('store-01')

    expect(store.listUsersResult).toEqual(['user:alice', 'user:bob'])
    expect(store.listUsersLoading).toBe(false)
  })

  it('expand sets expandResult from API response tree', async () => {
    const tree = { root: { name: 'document:roadmap#viewer' } }
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ tree }),
    })

    const store = useQueryStore()
    store.expandInputs.relation = 'viewer'
    store.expandInputs.object = 'document:roadmap'
    await store.expand('store-01')

    expect(store.expandResult).toEqual(tree)
    expect(store.expandLoading).toBe(false)
  })

  it('reset clears all inputs and results', () => {
    const store = useQueryStore()
    store.checkResult = { allowed: true, responseTime: 10 }
    store.checkUser = 'user:alice'
    store.listObjectsResult = ['document:roadmap']
    store.listObjectsInputs.user = 'user:alice'
    store.listUsersResult = ['user:bob']
    store.expandResult = { root: { name: 'x' } }

    store.reset()

    expect(store.checkResult).toBeNull()
    expect(store.checkUser).toBe('')
    expect(store.listObjectsResult).toBeNull()
    expect(store.listObjectsInputs.user).toBe('')
    expect(store.listUsersResult).toBeNull()
    expect(store.expandResult).toBeNull()
  })

  it('listObjectsInputs persist across separate read accesses (store reactivity)', () => {
    const store = useQueryStore()
    store.listObjectsInputs.user = 'user:marco'
    store.listObjectsInputs.relation = 'viewer'

    const store2 = useQueryStore()
    expect(store2.listObjectsInputs.user).toBe('user:marco')
    expect(store2.listObjectsInputs.relation).toBe('viewer')
  })
})
