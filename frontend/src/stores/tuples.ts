import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

export interface TupleEntry {
  key: { user: string; relation: string; object: string }
  timestamp: string
}

export interface ReadTuplesResponse {
  tuples: TupleEntry[]
  continuationToken: string | null
}

const PAGE_SIZE = 50

export const useTupleStore = defineStore('tuples', () => {
  const api = useApi()
  const toast = useToast()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const tuples = ref<TupleEntry[]>([])
  const continuationToken = ref<string | null>(null)

  const filterType = ref('')
  const filterRelation = ref('')
  const filterUser = ref('')

  const hasMore = computed(() => continuationToken.value !== null)

  function buildQueryParams(token?: string | null): string {
    const params = new URLSearchParams()
    if (filterType.value) params.set('type', filterType.value)
    if (filterRelation.value) params.set('relation', filterRelation.value)
    if (filterUser.value) params.set('user', filterUser.value)
    params.set('pageSize', String(PAGE_SIZE))
    if (token) params.set('continuationToken', token)
    return params.toString()
  }

  async function fetchTuples(storeId: string) {
    loading.value = true
    error.value = null
    try {
      const qs = buildQueryParams()
      const data = await api.get<ReadTuplesResponse>(`stores/${storeId}/tuples?${qs}`)
      tuples.value = data.tuples
      continuationToken.value = data.continuationToken
    } catch (err) {
      error.value = (err as Error).message
      tuples.value = []
      continuationToken.value = null
    } finally {
      loading.value = false
    }
  }

  async function fetchNextPage(storeId: string) {
    if (!continuationToken.value) return
    loading.value = true
    error.value = null
    try {
      const qs = buildQueryParams(continuationToken.value)
      const data = await api.get<ReadTuplesResponse>(`stores/${storeId}/tuples?${qs}`)
      tuples.value = [...tuples.value, ...data.tuples]
      continuationToken.value = data.continuationToken
    } catch (err) {
      error.value = (err as Error).message
    } finally {
      loading.value = false
    }
  }

  function resetTuples() {
    tuples.value = []
    continuationToken.value = null
    error.value = null
    loading.value = false
  }

  function clearFilters() {
    filterType.value = ''
    filterRelation.value = ''
    filterUser.value = ''
  }

  async function addTuple(storeId: string, tuple: { user: string; relation: string; object: string }) {
    await api.post(`stores/${storeId}/tuples`, tuple)
    toast.show({ type: 'success', message: 'Tuple added' })
    await fetchTuples(storeId)
  }

  async function deleteTuple(storeId: string, tuple: { user: string; relation: string; object: string }) {
    await api.del(`stores/${storeId}/tuples`, tuple)
    toast.show({ type: 'success', message: 'Tuple deleted' })
    await fetchTuples(storeId)
  }

  async function deleteTuplesBatch(storeId: string, deletes: Array<{ user: string; relation: string; object: string }>) {
    await api.del(`stores/${storeId}/tuples/batch`, { deletes })
    toast.show({ type: 'success', message: `${deletes.length} tuples deleted` })
    await fetchTuples(storeId)
  }

  return {
    loading,
    error,
    tuples,
    continuationToken,
    hasMore,
    filterType,
    filterRelation,
    filterUser,
    fetchTuples,
    fetchNextPage,
    resetTuples,
    clearFilters,
    addTuple,
    deleteTuple,
    deleteTuplesBatch,
  }
})
