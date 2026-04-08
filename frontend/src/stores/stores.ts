import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import { useConnectionStore } from './connection'

interface StoreInfo {
  id: string
  name: string
  created_at: string
  updated_at: string
}

interface ListStoresResponse {
  stores: StoreInfo[]
  continuation_token?: string
}

export const useStoresStore = defineStore('stores', () => {
  const api = useApi()
  const toast = useToast()
  const router = useRouter()

  const storeList = ref<StoreInfo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStores() {
    loading.value = true
    error.value = null
    try {
      const data = await api.get<ListStoresResponse>('stores')
      storeList.value = data.stores ?? []
    } catch (err) {
      storeList.value = []
      error.value = (err as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createStore(name: string): Promise<StoreInfo> {
    const store = await api.post<StoreInfo>('stores', { name })
    storeList.value.push(store)
    const connectionStore = useConnectionStore()
    connectionStore.stores.push(store)
    toast.show({ type: 'success', message: 'Store created' })
    return store
  }

  async function deleteStore(storeId: string): Promise<void> {
    await api.del<void>(`stores/${storeId}`)
    storeList.value = storeList.value.filter((s) => s.id !== storeId)
    const connectionStore = useConnectionStore()
    connectionStore.stores = connectionStore.stores.filter((s) => s.id !== storeId)
    toast.show({ type: 'success', message: 'Store deleted' })
  }

  // Routes where selecting a store should redirect to model-viewer.
  // On content pages the user is already working — don't interrupt.
  const REDIRECT_PATHS = new Set(['/', '/store-admin'])

  function selectStore(storeId: string) {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore(storeId)
    if (REDIRECT_PATHS.has(router.currentRoute.value.path)) {
      router.push('/model-viewer')
    }
  }

  return {
    storeList,
    loading,
    error,
    fetchStores,
    createStore,
    deleteStore,
    selectStore,
  }
})
