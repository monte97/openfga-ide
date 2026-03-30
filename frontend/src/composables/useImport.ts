import { ref } from 'vue'
import { useApi } from './useApi'
import { useToast } from './useToast'
import { useConnectionStore } from '@/stores/connection'

interface ImportPayload {
  storeName?: string
  model: Record<string, unknown> | null
  tuples: Array<{ user: string; relation: string; object: string }>
}

interface ImportResult {
  storeId: string
  storeName: string
  modelWritten: boolean
  tuplesImported: number
}

export function useImport() {
  const api = useApi()
  const toast = useToast()
  const connectionStore = useConnectionStore()

  const importing = ref(false)
  const importError = ref<string | null>(null)

  async function importToNewStore(storeName: string, payload: ImportPayload): Promise<ImportResult> {
    importing.value = true
    importError.value = null
    try {
      const result = await api.post<ImportResult>('import', {
        storeName,
        model: payload.model,
        tuples: payload.tuples,
      })
      connectionStore.selectStore(result.storeId)
      await connectionStore.fetchStores()
      toast.show({ type: 'success', message: `Import complete — ${result.tuplesImported} tuples imported` })
      return result
    } catch (e) {
      importError.value = (e as Error).message
      throw e
    } finally {
      importing.value = false
    }
  }

  async function importToCurrentStore(payload: ImportPayload): Promise<ImportResult> {
    importing.value = true
    importError.value = null
    try {
      const storeId = connectionStore.storeId
      const result = await api.post<ImportResult>(`stores/${storeId}/import`, {
        model: payload.model,
        tuples: payload.tuples,
      })
      toast.show({ type: 'success', message: `Import complete — ${result.tuplesImported} tuples imported` })
      return result
    } catch (e) {
      importError.value = (e as Error).message
      throw e
    } finally {
      importing.value = false
    }
  }

  async function importToStore(targetStoreId: string, payload: ImportPayload): Promise<ImportResult> {
    importing.value = true
    importError.value = null
    try {
      const result = await api.post<ImportResult>(`stores/${targetStoreId}/import`, {
        model: payload.model,
        tuples: payload.tuples,
      })
      toast.show({ type: 'success', message: `Import complete — ${result.tuplesImported} tuples imported` })
      return result
    } catch (e) {
      importError.value = (e as Error).message
      throw e
    } finally {
      importing.value = false
    }
  }

  return { importing, importError, importToNewStore, importToCurrentStore, importToStore }
}
