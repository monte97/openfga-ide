import { describe, it, expect } from 'vitest'
import { applyDagreLayout } from '../graphLayout'
import type { Node, Edge } from '@vue-flow/core'

describe('applyDagreLayout', () => {
  it('assigns non-zero positions to all nodes', () => {
    const nodes: Node[] = [
      { id: 'a', type: 'default', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'default', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const result = applyDagreLayout(nodes, edges, {
      rankdir: 'LR', nodeWidth: 160, nodeHeight: 60, nodesep: 60, ranksep: 100,
    })
    expect(result).toHaveLength(2)
    // In LR layout, the first node lands at x=0 after centering; the second node gets a non-zero x
    expect(result[1].position.x).not.toBe(0)
  })

  it('nodes in LR layout have different x positions', () => {
    const nodes: Node[] = [
      { id: 'a', type: 'default', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'default', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const result = applyDagreLayout(nodes, edges, {
      rankdir: 'LR', nodeWidth: 160, nodeHeight: 60, nodesep: 60, ranksep: 100,
    })
    expect(result[0].position.x).not.toBe(result[1].position.x)
  })

  it('preserves all node data properties', () => {
    const nodes: Node[] = [
      { id: 'x', type: 'typeNode', position: { x: 0, y: 0 }, data: { typeName: 'user', color: '#blue' } },
    ]
    const result = applyDagreLayout(nodes, [], {
      rankdir: 'TB', nodeWidth: 180, nodeHeight: 50, nodesep: 80, ranksep: 120,
    })
    expect(result[0].data).toEqual({ typeName: 'user', color: '#blue' })
    expect(result[0].type).toBe('typeNode')
    expect(result[0].id).toBe('x')
  })

  it('returns empty array when no nodes', () => {
    const result = applyDagreLayout([], [], {
      rankdir: 'LR', nodeWidth: 160, nodeHeight: 60, nodesep: 60, ranksep: 100,
    })
    expect(result).toHaveLength(0)
  })
})
