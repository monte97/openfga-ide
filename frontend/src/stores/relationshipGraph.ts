import { ref, computed, toRef } from 'vue'
import { defineStore } from 'pinia'
import type { Node, Edge } from '@vue-flow/core'
import { useTupleStore } from '@/stores/tuples'
import { useRelationshipGraph } from '@/composables/useRelationshipGraph'

export const useRelationshipGraphStore = defineStore('relationshipGraph', () => {
  const tupleStore = useTupleStore()
  const { nodes, edges, layoutDone } = useRelationshipGraph(toRef(tupleStore, 'tuples'))

  // Filter state
  const hiddenTypes = ref<Set<string>>(new Set())
  const selectedNodeId = ref<string | null>(null)

  // Delegated loading state
  const loading = computed(() => tupleStore.loading)
  const error = computed(() => tupleStore.error)

  // All distinct entity types present in the full node set
  const allTypes = computed<string[]>(() => {
    const types = new Set<string>()
    for (const node of nodes.value) {
      const colonIdx = node.id.indexOf(':')
      if (colonIdx > 0) types.add(node.id.slice(0, colonIdx))
    }
    return Array.from(types).sort()
  })

  // Nodes excluding hidden types
  const visibleNodes = computed<Node[]>(() =>
    nodes.value.filter((node) => {
      const colonIdx = node.id.indexOf(':')
      const type = colonIdx > 0 ? node.id.slice(0, colonIdx) : node.id
      return !hiddenTypes.value.has(type)
    }),
  )

  // Edges whose both endpoints are visible
  const visibleEdges = computed<Edge[]>(() => {
    const visibleIds = new Set(visibleNodes.value.map((n) => n.id))
    return edges.value.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
  })

  function toggleTypeVisibility(typeName: string) {
    const updated = new Set(hiddenTypes.value)
    if (updated.has(typeName)) {
      updated.delete(typeName)
    } else {
      updated.add(typeName)
    }
    hiddenTypes.value = updated
  }

  function setSelectedNode(entityId: string | null) {
    selectedNodeId.value = entityId
  }

  function resetFilters() {
    hiddenTypes.value = new Set()
    selectedNodeId.value = null
  }

  async function loadGraph(storeId: string) {
    resetFilters()
    tupleStore.clearFilters()
    tupleStore.resetTuples()
    await tupleStore.fetchTuples(storeId)
  }

  return {
    nodes,
    edges,
    layoutDone,
    loading,
    error,
    hiddenTypes,
    selectedNodeId,
    allTypes,
    visibleNodes,
    visibleEdges,
    toggleTypeVisibility,
    setSelectedNode,
    resetFilters,
    loadGraph,
  }
})
