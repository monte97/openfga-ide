import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'

export interface CheckResponse {
  allowed: boolean
}

export interface UsersetTree {
  name: string
  leaf?: {
    users?: { users: string[] }
    computed?: { userset: string }
    tupleToUserset?: {
      tupleset: string
      computed: UsersetTree[]
    }
  }
  union?: { nodes: UsersetTree[] }
  intersection?: { nodes: UsersetTree[] }
  difference?: { base: UsersetTree; subtract: UsersetTree }
}

export interface ExpandTree {
  root: UsersetTree
}

interface ExpandApiResponse {
  tree: ExpandTree
}

export const useQueryStore = defineStore('query', () => {
  const api = useApi()

  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const activeTab = ref<string>('check')

  // Check inputs — persist across navigation
  const checkUser = ref<string>('')
  const checkRelation = ref<string | null>(null)
  const checkObject = ref<string>('')

  // Check result
  const checkResult = ref<{ allowed: boolean; responseTime: number } | null>(null)

  // Expand/Why result (shared by WhyButton inline expand and ExpandQuery tab)
  const expandResult = ref<ExpandTree | null>(null)
  const expandLoading = ref<boolean>(false)
  const checkWhyExpanded = ref<boolean>(false)

  // List Objects inputs + result
  const listObjectsInputs = ref<{ user: string; relation: string | null; type: string | null }>({
    user: '',
    relation: null,
    type: null,
  })
  const listObjectsResult = ref<string[] | null>(null)
  const listObjectsLoading = ref<boolean>(false)

  // List Users inputs + result
  const listUsersInputs = ref<{ objectType: string | null; objectId: string; relation: string | null }>({
    objectType: null,
    objectId: '',
    relation: null,
  })
  const listUsersResult = ref<string[] | null>(null)
  const listUsersLoading = ref<boolean>(false)

  // Expand tab inputs (relation + object persistence)
  const expandInputs = ref<{ relation: string | null; object: string }>({
    relation: null,
    object: '',
  })

  async function runCheck(storeId: string) {
    loading.value = true
    error.value = null
    checkResult.value = null
    expandResult.value = null
    const start = performance.now()
    try {
      const data = await api.post<CheckResponse>(`stores/${storeId}/query/check`, {
        user: checkUser.value,
        relation: checkRelation.value,
        object: checkObject.value,
      })
      const elapsed = Math.round(performance.now() - start)
      checkResult.value = { allowed: data.allowed, responseTime: elapsed }
    } catch (err) {
      error.value = (err as Error).message
      checkResult.value = null
    } finally {
      loading.value = false
    }
  }

  async function runExpand(storeId: string) {
    expandLoading.value = true
    error.value = null
    expandResult.value = null
    try {
      const data = await api.post<ExpandApiResponse>(`stores/${storeId}/query/expand`, {
        relation: checkRelation.value,
        object: checkObject.value,
      })
      expandResult.value = data.tree
    } catch (err) {
      error.value = (err as Error).message
    } finally {
      expandLoading.value = false
    }
  }

  async function listObjects(storeId: string) {
    listObjectsLoading.value = true
    listObjectsResult.value = null
    try {
      const data = await api.post<{ objects: string[] }>(`stores/${storeId}/query/list-objects`, {
        user: listObjectsInputs.value.user,
        relation: listObjectsInputs.value.relation,
        type: listObjectsInputs.value.type,
      })
      listObjectsResult.value = data.objects
    } catch (err) {
      error.value = (err as Error).message
      listObjectsResult.value = null
    } finally {
      listObjectsLoading.value = false
    }
  }

  async function listUsers(storeId: string) {
    listUsersLoading.value = true
    listUsersResult.value = null
    try {
      const data = await api.post<{ users: string[] }>(`stores/${storeId}/query/list-users`, {
        object: {
          type: listUsersInputs.value.objectType,
          id: listUsersInputs.value.objectId,
        },
        relation: listUsersInputs.value.relation,
      })
      listUsersResult.value = data.users
    } catch (err) {
      error.value = (err as Error).message
      listUsersResult.value = null
    } finally {
      listUsersLoading.value = false
    }
  }

  async function expand(storeId: string) {
    expandLoading.value = true
    error.value = null
    expandResult.value = null
    try {
      const data = await api.post<ExpandApiResponse>(`stores/${storeId}/query/expand`, {
        relation: expandInputs.value.relation,
        object: expandInputs.value.object,
      })
      expandResult.value = data.tree
    } catch (err) {
      error.value = (err as Error).message
    } finally {
      expandLoading.value = false
    }
  }

  function resetCheck() {
    checkResult.value = null
    expandResult.value = null
    checkWhyExpanded.value = false
    // inputs are NOT cleared — they persist
  }

  function reset() {
    checkResult.value = null
    checkUser.value = ''
    checkRelation.value = null
    checkObject.value = ''
    checkWhyExpanded.value = false
    expandResult.value = null
    expandInputs.value = { relation: null, object: '' }
    listObjectsResult.value = null
    listObjectsInputs.value = { user: '', relation: null, type: null }
    listUsersResult.value = null
    listUsersInputs.value = { objectType: null, objectId: '', relation: null }
  }

  return {
    loading,
    error,
    activeTab,
    checkUser,
    checkRelation,
    checkObject,
    checkResult,
    expandResult,
    expandLoading,
    checkWhyExpanded,
    listObjectsInputs,
    listObjectsResult,
    listObjectsLoading,
    listUsersInputs,
    listUsersResult,
    listUsersLoading,
    expandInputs,
    runCheck,
    runExpand,
    listObjects,
    listUsers,
    expand,
    resetCheck,
    reset,
  }
})
