import { computed } from 'vue'
import { useModelStore } from '@/stores/model'
import { useTupleStore } from '@/stores/tuples'

interface Option {
  value: string
  label: string
}

interface OpenFgaTypeDefinition {
  type: string
  relations?: Record<string, unknown>
}

interface OpenFgaModel {
  type_definitions?: OpenFgaTypeDefinition[]
}

export function useAutocompleteOptions() {
  const modelStore = useModelStore()
  const tupleStore = useTupleStore()

  const typeNames = computed((): string[] => {
    const json = modelStore.json as OpenFgaModel | null
    if (!json?.type_definitions) return []
    return json.type_definitions.map((td) => td.type)
  })

  const relationNames = computed((): string[] => {
    const json = modelStore.json as OpenFgaModel | null
    if (!json?.type_definitions) return []
    const rels = new Set<string>()
    json.type_definitions.forEach((td) => {
      Object.keys(td.relations ?? {}).forEach((r) => rels.add(r))
    })
    return [...rels]
  })

  const userOptions = computed((): Option[] => {
    const options: Option[] = []
    // Type hints from model (e.g. "user:")
    typeNames.value.forEach((t) => options.push({ value: `${t}:`, label: `${t}:` }))
    // Concrete values from tuples
    const seen = new Set<string>(typeNames.value.map((t) => `${t}:`))
    tupleStore.tuples.forEach((tuple) => {
      const v = tuple.key.user
      if (!v) return
      if (!seen.has(v)) {
        seen.add(v)
        options.push({ value: v, label: v })
      }
    })
    return options
  })

  const relationOptions = computed((): Option[] => {
    const seen = new Set<string>()
    const options: Option[] = []
    // From model
    relationNames.value.forEach((r) => {
      if (!seen.has(r)) {
        seen.add(r)
        options.push({ value: r, label: r })
      }
    })
    // From tuples
    tupleStore.tuples.forEach((tuple) => {
      const v = tuple.key.relation
      if (!v) return
      if (!seen.has(v)) {
        seen.add(v)
        options.push({ value: v, label: v })
      }
    })
    return options
  })

  const objectOptions = computed((): Option[] => {
    const options: Option[] = []
    typeNames.value.forEach((t) => options.push({ value: `${t}:`, label: `${t}:` }))
    const seen = new Set<string>(typeNames.value.map((t) => `${t}:`))
    tupleStore.tuples.forEach((tuple) => {
      const v = tuple.key.object
      if (!v) return
      if (!seen.has(v)) {
        seen.add(v)
        options.push({ value: v, label: v })
      }
    })
    return options
  })

  return { userOptions, relationOptions, objectOptions }
}
