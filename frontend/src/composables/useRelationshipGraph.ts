import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import dagre from 'dagre'
import type { Node, Edge } from '@vue-flow/core'
import { getTypeColor } from '@/utils/typeColors'
import type { TupleEntry } from '@/stores/tuples'

export interface EntityNodeData {
  entityId: string // e.g. "user:alice"
  typeName: string // e.g. "user"
  color: string // hex, e.g. "#3b82f6"
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 50

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })
}

function buildGraph(tuples: TupleEntry[]): { nodes: Node[]; edges: Edge[] } {
  if (tuples.length === 0) {
    return { nodes: [], edges: [] }
  }

  // Collect unique entities
  const entityMap = new Map<string, EntityNodeData>()
  tuples.forEach((t) => {
    for (const entityId of [t.key.user, t.key.object]) {
      if (!entityMap.has(entityId)) {
        const typeName = entityId.split(':')[0]
        entityMap.set(entityId, { entityId, typeName, color: getTypeColor(typeName) })
      }
    }
  })

  // Build nodes
  const rawNodes: Node[] = [...entityMap.values()].map((data) => ({
    id: data.entityId,
    type: 'entityNode',
    position: { x: 0, y: 0 },
    data,
  }))

  // Build edges (deduplicated)
  const edgeSet = new Set<string>()
  const rawEdges: Edge[] = []
  tuples.forEach((t) => {
    const edgeId = `edge-${t.key.user}-${t.key.relation}-${t.key.object}`
    if (!edgeSet.has(edgeId)) {
      edgeSet.add(edgeId)
      rawEdges.push({
        id: edgeId,
        source: t.key.user,
        target: t.key.object,
        label: t.key.relation,
        type: 'default',
        style: { stroke: '#9ca3af', strokeWidth: 1.5 },
      })
    }
  })

  const laidOutNodes = applyDagreLayout(rawNodes, rawEdges)
  return { nodes: laidOutNodes, edges: rawEdges }
}

export function useRelationshipGraph(tuplesRef: Ref<TupleEntry[]>) {
  const nodes = ref<Node[]>([])
  const edges = ref<Edge[]>([])
  const layoutDone = ref(false)

  watch(
    tuplesRef,
    (tuples) => {
      layoutDone.value = false
      const result = buildGraph(tuples)
      nodes.value = result.nodes
      edges.value = result.edges
      layoutDone.value = true
    },
    { immediate: true },
  )

  return { nodes, edges, layoutDone }
}
