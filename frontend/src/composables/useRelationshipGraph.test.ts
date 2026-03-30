import { describe, it, expect } from 'vitest'
import { ref, nextTick } from 'vue'
import { useRelationshipGraph } from './useRelationshipGraph'
import { getTypeColor } from '@/utils/typeColors'
import type { TupleEntry } from '@/stores/tuples'

function makeTuple(user: string, relation: string, object: string): TupleEntry {
  return { key: { user, relation, object }, timestamp: '2024-01-01T00:00:00Z' }
}

describe('useRelationshipGraph', () => {
  it('returns empty nodes and edges for empty tuples, layoutDone = true', () => {
    const tuplesRef = ref<TupleEntry[]>([])
    const { nodes, edges, layoutDone } = useRelationshipGraph(tuplesRef)
    expect(nodes.value).toHaveLength(0)
    expect(edges.value).toHaveLength(0)
    expect(layoutDone.value).toBe(true)
  })

  it('creates two nodes and one edge from a single tuple', () => {
    const tuplesRef = ref<TupleEntry[]>([makeTuple('user:alice', 'viewer', 'document:roadmap')])
    const { nodes, edges } = useRelationshipGraph(tuplesRef)
    const nodeIds = nodes.value.map((n) => n.id)
    expect(nodeIds).toContain('user:alice')
    expect(nodeIds).toContain('document:roadmap')
    expect(edges.value).toHaveLength(1)
    expect(edges.value[0].label).toBe('viewer')
  })

  it('extracts typeName correctly from node id', () => {
    const tuplesRef = ref<TupleEntry[]>([makeTuple('user:alice', 'viewer', 'document:roadmap')])
    const { nodes } = useRelationshipGraph(tuplesRef)
    const userNode = nodes.value.find((n) => n.id === 'user:alice')
    const docNode = nodes.value.find((n) => n.id === 'document:roadmap')
    expect(userNode?.data.typeName).toBe('user')
    expect(docNode?.data.typeName).toBe('document')
  })

  it('assigns correct color from getTypeColor', () => {
    const tuplesRef = ref<TupleEntry[]>([makeTuple('user:alice', 'viewer', 'document:roadmap')])
    const { nodes } = useRelationshipGraph(tuplesRef)
    const userNode = nodes.value.find((n) => n.id === 'user:alice')
    expect(userNode?.data.color).toBe(getTypeColor('user'))
  })

  it('deduplicates entity nodes — same entity appearing in multiple tuples yields one node', () => {
    const tuplesRef = ref<TupleEntry[]>([
      makeTuple('user:alice', 'viewer', 'document:roadmap'),
      makeTuple('user:alice', 'editor', 'document:spec'),
    ])
    const { nodes } = useRelationshipGraph(tuplesRef)
    const aliceNodes = nodes.value.filter((n) => n.id === 'user:alice')
    expect(aliceNodes).toHaveLength(1)
  })

  it('deduplicates edges — duplicate (user, relation, object) triple yields one edge', () => {
    const tuplesRef = ref<TupleEntry[]>([
      makeTuple('user:alice', 'viewer', 'document:roadmap'),
      makeTuple('user:alice', 'viewer', 'document:roadmap'),
    ])
    const { edges } = useRelationshipGraph(tuplesRef)
    expect(edges.value).toHaveLength(1)
  })

  it('edge style has stroke #9ca3af', () => {
    const tuplesRef = ref<TupleEntry[]>([makeTuple('user:alice', 'viewer', 'document:roadmap')])
    const { edges } = useRelationshipGraph(tuplesRef)
    expect(edges.value[0].style?.stroke).toBe('#9ca3af')
  })

  it('applies dagre layout — nodes have non-zero positions when multiple nodes exist', () => {
    const tuplesRef = ref<TupleEntry[]>([
      makeTuple('user:alice', 'viewer', 'document:roadmap'),
      makeTuple('user:bob', 'editor', 'document:roadmap'),
    ])
    const { nodes } = useRelationshipGraph(tuplesRef)
    const allZero = nodes.value.every(
      (n) => n.position.x === 0 && n.position.y === 0,
    )
    expect(allZero).toBe(false)
  })

  it('reacts to tuple changes — updates nodes when tuplesRef is updated', async () => {
    const tuplesRef = ref<TupleEntry[]>([])
    const { nodes } = useRelationshipGraph(tuplesRef)
    expect(nodes.value).toHaveLength(0)

    tuplesRef.value = [makeTuple('user:alice', 'viewer', 'document:roadmap')]
    await nextTick()
    expect(nodes.value).toHaveLength(2)
  })
})
