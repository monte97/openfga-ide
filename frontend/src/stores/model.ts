import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'

export interface ModelResponse {
  dsl: string | null
  json: object | null
  authorizationModelId: string | null
}

export const useModelStore = defineStore('model', () => {
  const api = useApi()

  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const dsl = ref<string | null>(null)
  const json = ref<object | null>(null)
  const authorizationModelId = ref<string | null>(null)

  async function fetchModel(storeId: string) {
    loading.value = true
    error.value = null
    try {
      const data = await api.get<ModelResponse>(`stores/${storeId}/model`)
      dsl.value = data.dsl
      json.value = data.json
      authorizationModelId.value = data.authorizationModelId
    } catch (err) {
      error.value = (err as Error).message
      dsl.value = null
      json.value = null
      authorizationModelId.value = null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    loading.value = false
    error.value = null
    dsl.value = null
    json.value = null
    authorizationModelId.value = null
  }

  return {
    loading,
    error,
    dsl,
    json,
    authorizationModelId,
    fetchModel,
    reset,
  }
})
