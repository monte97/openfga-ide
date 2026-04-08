import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'

interface StoreInfo {
  id: string
  name: string
  created_at: string
  updated_at: string
}

interface ConnectionStatus {
  url: string
  storeId: string
  status: string
}

interface ListStoresResponse {
  stores: StoreInfo[]
  continuation_token?: string
}

interface TestConnectionResponse {
  status: string
}

const STORE_ID_KEY = 'openfga-viewer:selectedStoreId'

export const useConnectionStore = defineStore('connection', () => {
  const api = useApi()

  const url = ref<string>('')
  const storeId = ref<string>(localStorage.getItem(STORE_ID_KEY) ?? '')
  const status = ref<'connected' | 'error' | 'loading'>('loading')
  const stores = ref<StoreInfo[]>([])
  const loadingFetch = ref<boolean>(false)
  const loadingUpdate = ref<boolean>(false)
  const error = ref<string | null>(null)

  const activeStoreName = computed(
    () => (stores.value ?? []).find((s) => s.id === storeId.value)?.name ?? null
  )

  const isConnected = computed(() => status.value === 'connected')

  async function fetchConnection() {
    loadingFetch.value = true
    error.value = null
    try {
      const data = await api.get<ConnectionStatus>('connection')
      url.value = data.url
      // Prefer localStorage selection; fall back to backend-configured storeId
      if (!storeId.value) {
        storeId.value = data.storeId
      }
      status.value = 'connected'
    } catch (err) {
      status.value = 'error'
      error.value = (err as Error).message
    } finally {
      loadingFetch.value = false
    }
  }

  async function testConnection(testUrl: string): Promise<boolean> {
    try {
      await api.post<TestConnectionResponse>('connection/test', { url: testUrl })
      return true
    } catch {
      return false
    }
  }

  async function updateConnection(newUrl: string) {
    loadingUpdate.value = true
    error.value = null
    try {
      const data = await api.put<ConnectionStatus>('connection', { url: newUrl })
      url.value = data.url
      storeId.value = data.storeId
      status.value = 'connected'
      await fetchStores()
    } catch (err) {
      status.value = 'error'
      error.value = (err as Error).message
    } finally {
      loadingUpdate.value = false
    }
  }

  // In-flight promise guard — prevents duplicate concurrent fetches
  let fetchStoresPromise: Promise<void> | null = null

  async function fetchStores(): Promise<void> {
    if (fetchStoresPromise) return fetchStoresPromise
    fetchStoresPromise = (async () => {
      try {
        const data = await api.get<ListStoresResponse>('stores')
        stores.value = data.stores
      } catch {
        // non-fatal: keep existing stores
      } finally {
        fetchStoresPromise = null
      }
    })()
    return fetchStoresPromise
  }

  function selectStore(id: string) {
    storeId.value = id
    if (id) {
      localStorage.setItem(STORE_ID_KEY, id)
    } else {
      localStorage.removeItem(STORE_ID_KEY)
    }
  }

  return {
    url,
    storeId,
    status,
    stores,
    loadingFetch,
    loadingUpdate,
    error,
    activeStoreName,
    isConnected,
    fetchConnection,
    testConnection,
    updateConnection,
    fetchStores,
    selectStore,
  }
})
