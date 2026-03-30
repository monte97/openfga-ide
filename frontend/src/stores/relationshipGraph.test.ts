import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRelationshipGraphStore } from './relationshipGraph'
import type { Node, Edge } from '@vue-flow/core'

// Mock the composable to control nodes/edges in tests
vi.mock('@/composables/useRelationshipGraph', () => ({
  useRelationshipGraph: vi.fn(),
}))

// Mock useTupleStore
vi.mock('@/stores/tuples', () => ({
  useTupleStore: vi.fn(),
}))

import { useRelationshipGraph } from '@/composables/useRelationshipGraph'
import { useTupleStore } from '@/stores/tuples'
import { ref } from 'vue'

function makeNodes(ids: string[]): Node[] {
  return ids.map((id) => ({
    id,
    type: 'entityNode',
    position: { x: 0, y: 0 },
    data: {},
  }))
}

function makeEdge(source: string, target: string, label: string): Edge {
  return { id: `edge-${source}-${label}-${target}`, source, target, label }
}

describe('useRelationshipGraphStore', () => {
  let nodesRef: ReturnType<typeof ref<Node[]>>
  let edgesRef: ReturnType<typeof ref<Edge[]>>

  beforeEach(() => {
    setActivePinia(createPinia())

    nodesRef = ref<Node[]>([])
    edgesRef = ref<Edge[]>([])

    vi.mocked(useRelationshipGraph).mockReturnValue({
      nodes: nodesRef,
      edges: edgesRef,
      layoutDone: ref(true),
    })

    vi.mocked(useTupleStore).mockReturnValue({
      loading: false,
      error: null,
      tuples: [],
      fetchTuples: vi.fn().mockResolvedValue(undefined),
      resetTuples: vi.fn(),
      clearFilters: vi.fn(),
    } as unknown as ReturnType<typeof useTupleStore>)
  })

  it('hiddenTypes is empty on initialization', () => {
    const store = useRelationshipGraphStore()
    expect(store.hiddenTypes.size).toBe(0)
  })

  it('toggleTypeVisibility adds a type to hiddenTypes', () => {
    const store = useRelationshipGraphStore()
    store.toggleTypeVisibility('user')
    expect(store.hiddenTypes.has('user')).toBe(true)
  })

  it('toggleTypeVisibility removes a type already in hiddenTypes', () => {
    const store = useRelationshipGraphStore()
    store.toggleTypeVisibility('user')
    store.toggleTypeVisibility('user')
    expect(store.hiddenTypes.has('user')).toBe(false)
  })

  it('visibleNodes excludes nodes whose type is in hiddenTypes', () => {
    const store = useRelationshipGraphStore()
    nodesRef.value = makeNodes(['user:alice', 'user:bob', 'document:roadmap'])
    store.toggleTypeVisibility('user')
    expect(store.visibleNodes.map((n) => n.id)).toEqual(['document:roadmap'])
  })

  it('visibleEdges excludes edges where source or target type is hidden', () => {
    const store = useRelationshipGraphStore()
    nodesRef.value = makeNodes(['user:alice', 'document:roadmap'])
    edgesRef.value = [makeEdge('user:alice', 'document:roadmap', 'viewer')]
    store.toggleTypeVisibility('user')
    expect(store.visibleEdges).toHaveLength(0)
  })

  it('resetFilters clears hiddenTypes and selectedNodeId', () => {
    const store = useRelationshipGraphStore()
    store.toggleTypeVisibility('user')
    store.setSelectedNode('user:alice')
    store.resetFilters()
    expect(store.hiddenTypes.size).toBe(0)
    expect(store.selectedNodeId).toBeNull()
  })

  it('allTypes returns sorted unique types from node ids', () => {
    const store = useRelationshipGraphStore()
    nodesRef.value = makeNodes(['user:alice', 'document:roadmap', 'user:bob'])
    expect(store.allTypes).toEqual(['document', 'user'])
  })

  it('loadGraph resets filters/tuples and fetches tuples for the given storeId', async () => {
    const store = useRelationshipGraphStore()
    const tupleStoreMock = vi.mocked(useTupleStore).mock.results.at(-1)!.value
    await store.loadGraph('store-42')
    expect(tupleStoreMock.clearFilters).toHaveBeenCalled()
    expect(tupleStoreMock.resetTuples).toHaveBeenCalled()
    expect(tupleStoreMock.fetchTuples).toHaveBeenCalledWith('store-42')
  })
})
