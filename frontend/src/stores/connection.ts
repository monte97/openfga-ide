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

export const useConnectionStore = defineStore('connection', () => {
  const api = useApi()

  const url = ref<string>('')
  const storeId = ref<string>('')
  const status = ref<'connected' | 'error' | 'loading'>('loading')
  const stores = ref<StoreInfo[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const activeStoreName = computed(
    () => (stores.value ?? []).find((s) => s.id === storeId.value)?.name ?? null
  )

  const isConnected = computed(() => status.value === 'connected')

  async function fetchConnection() {
    loading.value = true
    error.value = null
    try {
      const data = await api.get<ConnectionStatus>('connection')
      url.value = data.url
      storeId.value = data.storeId
      status.value = 'connected'
    } catch (err) {
      status.value = 'error'
      error.value = (err as Error).message
    } finally {
      loading.value = false
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
    loading.value = true
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
      loading.value = false
    }
  }

  async function fetchStores() {
    try {
      const data = await api.get<ListStoresResponse>('stores')
      stores.value = data.stores
    } catch {
      // non-fatal: keep existing stores
    }
  }

  function selectStore(id: string) {
    storeId.value = id
  }

  return {
    url,
    storeId,
    status,
    stores,
    loading,
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
