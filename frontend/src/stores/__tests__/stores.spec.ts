import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/useToast'

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function makeOkResponse(body: unknown, status = 200) {
  return { ok: true, status, json: async () => body }
}

function makeErrorResponse(error: string, status = 400) {
  return { ok: false, status, json: async () => ({ error }) }
}

describe('useStoresStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    pushMock.mockReset()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  it('initial state is empty', async () => {
    const { useStoresStore } = await import('../stores')
    const store = useStoresStore()
    expect(store.storeList).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.hasNavigatedThisSession).toBe(false)
  })

  describe('fetchStores()', () => {
    it('populates storeList on success', async () => {
      const { useStoresStore } = await import('../stores')
      const store = useStoresStore()
      const stores = [
        { id: 'a', name: 'Alpha', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: 'b', name: 'Beta', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      ]
      fetchMock.mockResolvedValue(makeOkResponse({ stores }))
      await store.fetchStores()
      expect(store.storeList).toHaveLength(2)
      expect(store.storeList[0].name).toBe('Alpha')
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('sets error on failure', async () => {
      const { useStoresStore } = await import('../stores')
      const store = useStoresStore()
      fetchMock.mockResolvedValue(makeErrorResponse('Fetch failed'))
      await store.fetchStores()
      expect(store.error).toBe('Fetch failed')
      expect(store.storeList).toEqual([])
    })

    it('sets error when network fails', async () => {
      const { useStoresStore } = await import('../stores')
      const store = useStoresStore()
      fetchMock.mockRejectedValue(new Error('Network error'))
      await store.fetchStores()
      expect(store.error).toBe('Network error')
    })

    it('clears stale storeList when fetch fails after prior success', async () => {
      const { useStoresStore } = await import('../stores')
      const store = useStoresStore()

      // First fetch succeeds — storeList has data
      fetchMock.mockResolvedValueOnce(makeOkResponse({
        stores: [{ id: 'a', name: 'Alpha', created_at: '', updated_at: '' }],
      }))
      await store.fetchStores()
      expect(store.storeList).toHaveLength(1)

      // Second fetch fails — storeList must be cleared
      fetchMock.mockResolvedValue(makeErrorResponse('Service unavailable', 503))
      await store.fetchStores()
      expect(store.storeList).toEqual([])
    })
  })

  describe('createStore()', () => {
    it('adds store to list and shows success toast', async () => {
      const { useStoresStore } = await import('../stores')
      const store = useStoresStore()
      const created = { id: 'new-1', name: 'New Store', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
      fetchMock.mockResolvedValue(makeOkResponse(created, 201))

      const result = await store.createStore('New Store')
      expect(result).toEqual(created)
      expect(store.storeList).toContainEqual(created)

      const { toasts } = useToast()
      expect(toasts.some((t) => t.type === 'success' && t.message === 'Store created')).toBe(true)
    })

    it('throws and does not add store on failure', async () => {
      const { useStoresStore } = await import('../stores')
      const store = useStoresStore()
      fetchMock.mockResolvedValue(makeErrorResponse('Bad request'))
      await expect(store.createStore('Bad')).rejects.toThrow('Bad request')
      expect(store.storeList).toEqual([])
    })
  })

  describe('deleteStore()', () => {
    it('removes store from list and shows success toast', async () => {
      const { useStoresStore } = await import('../stores')
      const store = useStoresStore()
      store.storeList = [
        { id: 'del-1', name: 'To Delete', created_at: '', updated_at: '' },
        { id: 'keep-1', name: 'Keep', created_at: '', updated_at: '' },
      ]
      fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('no body') } })

      await store.deleteStore('del-1')
      expect(store.storeList).toHaveLength(1)
      expect(store.storeList[0].id).toBe('keep-1')

      const { toasts } = useToast()
      expect(toasts.some((t) => t.type === 'success' && t.message === 'Store deleted')).toBe(true)
    })

    it('throws and keeps list on failure', async () => {
      const { useStoresStore } = await import('../stores')
      const store = useStoresStore()
      store.storeList = [{ id: 'del-1', name: 'Store', created_at: '', updated_at: '' }]
      fetchMock.mockResolvedValue(makeErrorResponse('Not Found', 404))
      await expect(store.deleteStore('del-1')).rejects.toThrow()
      expect(store.storeList).toHaveLength(1)
    })
  })

  describe('selectStore()', () => {
    it('navigates to /model-viewer on first selection', async () => {
      const { useStoresStore } = await import('../stores')
      const { useConnectionStore } = await import('../connection')
      const connectionStore = useConnectionStore()
      const store = useStoresStore()

      store.selectStore('store-1')
      expect(connectionStore.storeId).toBe('store-1')
      expect(pushMock).toHaveBeenCalledWith('/model-viewer')
      expect(store.hasNavigatedThisSession).toBe(true)
    })

    it('does NOT navigate on subsequent selections', async () => {
      const { useStoresStore } = await import('../stores')
      const store = useStoresStore()

      store.selectStore('store-1')
      pushMock.mockReset()

      store.selectStore('store-2')
      expect(pushMock).not.toHaveBeenCalled()
    })
  })
})
