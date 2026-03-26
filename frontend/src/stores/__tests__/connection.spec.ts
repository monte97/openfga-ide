import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/useToast'
import { useConnectionStore } from '../connection'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('useConnectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  it('initial state is loading with empty values', () => {
    const store = useConnectionStore()
    expect(store.status).toBe('loading')
    expect(store.url).toBe('')
    expect(store.storeId).toBe('')
    expect(store.stores).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchConnection() updates url/storeId/status on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'http://openfga:8080', storeId: 'store-1', status: 'connected' }),
    })
    const store = useConnectionStore()
    await store.fetchConnection()
    expect(store.url).toBe('http://openfga:8080')
    expect(store.storeId).toBe('store-1')
    expect(store.status).toBe('connected')
    expect(store.loading).toBe(false)
  })

  it('fetchConnection() sets status to error on failure', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'))
    const store = useConnectionStore()
    await store.fetchConnection()
    expect(store.status).toBe('error')
    expect(store.error).toBe('Network error')
  })

  it('testConnection() returns true on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'connected' }),
    })
    const store = useConnectionStore()
    const result = await store.testConnection('http://new-host:8080')
    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('/api/connection/test', expect.any(Object))
  })

  it('testConnection() returns false on failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Connection failed' }),
    })
    const store = useConnectionStore()
    const result = await store.testConnection('http://unreachable:9999')
    expect(result).toBe(false)
  })

  it('updateConnection() updates url and fetches stores on success', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'http://new:8080', storeId: '', status: 'connected' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stores: [{ id: 's1', name: 'Shop', created_at: '', updated_at: '' }] }),
      })

    const store = useConnectionStore()
    await store.updateConnection('http://new:8080')
    expect(store.url).toBe('http://new:8080')
    expect(store.status).toBe('connected')
    expect(store.stores).toHaveLength(1)
  })

  it('fetchStores() populates stores array', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        stores: [
          { id: 'a', name: 'Alpha', created_at: '', updated_at: '' },
          { id: 'b', name: 'Beta', created_at: '', updated_at: '' },
        ],
      }),
    })
    const store = useConnectionStore()
    await store.fetchStores()
    expect(store.stores).toHaveLength(2)
  })

  it('selectStore() updates storeId', () => {
    const store = useConnectionStore()
    store.selectStore('store-xyz')
    expect(store.storeId).toBe('store-xyz')
  })

  it('isConnected computed returns true when status is connected', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'http://h:8080', storeId: '', status: 'connected' }),
    })
    const store = useConnectionStore()
    await store.fetchConnection()
    expect(store.isConnected).toBe(true)
  })

  it('activeStoreName returns store name when storeId matches', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        stores: [{ id: 'store-1', name: 'My Store', created_at: '', updated_at: '' }],
      }),
    })
    const store = useConnectionStore()
    await store.fetchStores()
    store.selectStore('store-1')
    expect(store.activeStoreName).toBe('My Store')
  })

  it('activeStoreName returns null when no store selected', () => {
    const store = useConnectionStore()
    expect(store.activeStoreName).toBeNull()
  })
})
