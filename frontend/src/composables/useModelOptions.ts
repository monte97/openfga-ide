import { computed } from 'vue'
import { useModelStore } from '@/stores/model'

export function useModelOptions() {
  const modelStore = useModelStore()

  const typeOptions = computed(() => {
    const json = modelStore.json as { type_definitions?: Array<{ type: string }> } | null
    if (!json?.type_definitions) return []
    return json.type_definitions
      .map((td) => td.type)
      .filter(Boolean)
      .sort()
      .map((t) => ({ value: t, label: t }))
  })

  const relationOptions = computed(() => {
    const json = modelStore.json as {
      type_definitions?: Array<{ relations?: Record<string, unknown> }>
    } | null
    if (!json?.type_definitions) return []
    const relations = new Set<string>()
    for (const td of json.type_definitions) {
      if (td.relations) {
        Object.keys(td.relations).forEach((r) => relations.add(r))
      }
    }
    return Array.from(relations)
      .sort()
      .map((r) => ({ value: r, label: r }))
  })

  return { typeOptions, relationOptions }
}
