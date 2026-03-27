import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/useToast'
import { useModelStore } from './model'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('useModelStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  it('initial state has null values and loading false', () => {
    const store = useModelStore()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.dsl).toBeNull()
    expect(store.json).toBeNull()
    expect(store.authorizationModelId).toBeNull()
  })

  it('fetchModel populates dsl, json, authorizationModelId on success', async () => {
    const model = { id: 'model-1', schema_version: '1.1', type_definitions: [] }
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        dsl: 'model\n  schema 1.1',
        json: model,
        authorizationModelId: 'model-1',
      }),
    })

    const store = useModelStore()
    await store.fetchModel('store-1')

    expect(store.dsl).toBe('model\n  schema 1.1')
    expect(store.json).toEqual(model)
    expect(store.authorizationModelId).toBe('model-1')
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchModel with dsl:null keeps dsl as null', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ dsl: null, json: null, authorizationModelId: null }),
    })

    const store = useModelStore()
    await store.fetchModel('store-empty')

    expect(store.dsl).toBeNull()
    expect(store.json).toBeNull()
    expect(store.authorizationModelId).toBeNull()
  })

  it('fetchModel sets error and nulls data on failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Store not found' }),
    })

    const store = useModelStore()
    await store.fetchModel('bad-store')

    expect(store.error).toBe('Store not found')
    expect(store.dsl).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('loading is true during fetch, false after', async () => {
    let resolveJson!: (v: unknown) => void
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => new Promise((res) => { resolveJson = res }),
    })

    const store = useModelStore()
    const fetchPromise = store.fetchModel('store-1')
    expect(store.loading).toBe(true)
    // wait for fetch to resolve and json() to be called
    await Promise.resolve()
    await Promise.resolve()
    resolveJson({ dsl: null, json: null, authorizationModelId: null })
    await fetchPromise
    expect(store.loading).toBe(false)
  })

  it('reset() clears all state', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ dsl: 'some dsl', json: {}, authorizationModelId: 'mid' }),
    })
    const store = useModelStore()
    await store.fetchModel('store-1')

    store.reset()

    expect(store.dsl).toBeNull()
    expect(store.json).toBeNull()
    expect(store.authorizationModelId).toBeNull()
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })
})
