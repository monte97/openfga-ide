import dagre from 'dagre'
import type { Node, Edge } from '@vue-flow/core'

export interface DagreLayoutOptions {
  rankdir: 'LR' | 'TB' | 'RL' | 'BT'
  nodeWidth: number
  nodeHeight: number
  nodesep: number
  ranksep: number
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: DagreLayoutOptions,
): Node[] {
  const { rankdir, nodeWidth, nodeHeight, nodesep, ranksep } = options
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir, nodesep, ranksep })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight })
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
        x: pos.x - nodeWidth / 2,
        y: pos.y - nodeHeight / 2,
      },
    }
  })
}
