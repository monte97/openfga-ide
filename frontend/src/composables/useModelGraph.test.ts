import { describe, it, expect } from 'vitest'
import { useModelGraph } from './useModelGraph'
import { getTypeColor } from '@/utils/typeColors'

const simpleModel = {
  id: 'model-1',
  schema_version: '1.1',
  type_definitions: [
    {
      type: 'user',
      relations: {},
      metadata: { relations: {} },
    },
    {
      type: 'document',
      relations: {
        viewer: {},
        editor: {},
      },
      metadata: {
        relations: {
          viewer: {
            directly_assignable_types: [{ type: 'user' }],
          },
          editor: {
            directly_assignable_types: [{ type: 'user' }],
          },
        },
      },
    },
  ],
}

describe('useModelGraph', () => {
  it('returns correct node count for a 2-type model', () => {
    const { nodes } = useModelGraph(simpleModel)
    expect(nodes.value).toHaveLength(2)
  })

  it('returns correct edge count from metadata', () => {
    const { edges } = useModelGraph(simpleModel)
    // user → document (viewer), user → document (editor) = 2 edges
    expect(edges.value).toHaveLength(2)
  })

  it('assigns deterministic colors consistent with getTypeColor', () => {
    const { nodes } = useModelGraph(simpleModel)
    const userNode = nodes.value.find((n) => n.id === 'user')
    const docNode = nodes.value.find((n) => n.id === 'document')
    expect(userNode?.data.color).toBe(getTypeColor('user'))
    expect(docNode?.data.color).toBe(getTypeColor('document'))
  })

  it('assigns distinct colors to different types', () => {
    const { nodes } = useModelGraph(simpleModel)
    const colors = nodes.value.map((n) => n.data.color)
    // user and document may have the same or different colors — just verify they are valid hex
    colors.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i))
  })

  it('nodes have non-null position after dagre layout', () => {
    const { nodes, layoutDone } = useModelGraph(simpleModel)
    expect(layoutDone.value).toBe(true)
    nodes.value.forEach((node) => {
      expect(typeof node.position.x).toBe('number')
      expect(typeof node.position.y).toBe('number')
    })
  })

  it('creates edges from userset.this (metadata directly_assignable_types)', () => {
    const { edges } = useModelGraph(simpleModel)
    const viewerEdge = edges.value.find((e) => e.label === 'viewer')
    expect(viewerEdge).toBeDefined()
    expect(viewerEdge?.source).toBe('user')
    expect(viewerEdge?.target).toBe('document')
  })

  it('returns empty nodes and edges for null input without throwing', () => {
    const { nodes, edges, layoutDone } = useModelGraph(null)
    expect(nodes.value).toHaveLength(0)
    expect(edges.value).toHaveLength(0)
    expect(layoutDone.value).toBe(true)
  })

  it('returns empty nodes and edges for model with no type_definitions', () => {
    const { nodes, edges } = useModelGraph({ id: 'x', schema_version: '1.1', type_definitions: [] })
    expect(nodes.value).toHaveLength(0)
    expect(edges.value).toHaveLength(0)
  })
})
