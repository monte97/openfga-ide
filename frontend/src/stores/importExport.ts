import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useToast } from '@/composables/useToast'

interface ExportPayload {
  storeName: string
  exportedAt: string
  model: unknown
  tuples: unknown[]
}

export const useImportExportStore = defineStore('importExport', () => {
  const toast = useToast()

  const loading = ref(false)
  const error = ref<string | null>(null)

  async function exportStore(storeId: string, storeName: string, label = 'Export'): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/stores/${storeId}/export`)
      if (!res.ok) throw new Error(await res.text())
      const payload = await res.json() as ExportPayload
      const tupleCount = payload.tuples.length
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${storeName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.show({ type: 'success', message: `${label} complete — ${tupleCount} tuples exported` })
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
      toast.show({ type: 'error', message: msg })
    } finally {
      loading.value = false
    }
  }

  return { loading, error, exportStore }
})
