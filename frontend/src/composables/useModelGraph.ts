import { ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { getTypeColor } from '@/utils/typeColors'
import { applyDagreLayout } from '@/utils/graphLayout'

export interface DirectlyRelatedUserType {
  type: string
  relation?: string
  wildcard?: Record<string, never>
}

interface RelationMetadata {
  directly_assignable_types?: DirectlyRelatedUserType[]
}

interface TypeDefinition {
  type: string
  relations?: Record<string, unknown>
  metadata?: {
    relations?: Record<string, RelationMetadata>
  }
}

interface AuthorizationModel {
  id?: string
  schema_version?: string
  type_definitions: TypeDefinition[]
}

export interface ModelNodeData {
  typeName: string
  color: string
  relations: string[]
  directlyAssignableTypes: DirectlyRelatedUserType[]
  referencedByTypes: Array<{ type: string; relation: string }>
}


export function useModelGraph(modelJson: object | null) {
  const nodes = ref<Node[]>([])
  const edges = ref<Edge[]>([])
  const layoutDone = ref(false)

  if (!modelJson) {
    layoutDone.value = true
    return { nodes, edges, layoutDone }
  }

  const model = modelJson as AuthorizationModel
  const typeDefs: TypeDefinition[] = model.type_definitions ?? []

  // Build referencedByTypes lookup: for each type, who references it?
  const referencedBy = new Map<string, Array<{ type: string; relation: string }>>()
  typeDefs.forEach((typeDef) => {
    const metaRelations = typeDef.metadata?.relations ?? {}
    Object.entries(metaRelations).forEach(([relationName, meta]) => {
      const assignableTypes = meta.directly_assignable_types ?? []
      assignableTypes.forEach((ref) => {
        if (!referencedBy.has(ref.type)) referencedBy.set(ref.type, [])
        referencedBy.get(ref.type)!.push({ type: typeDef.type, relation: relationName })
      })
    })
  })

  // Build nodes
  const rawNodes: Node[] = typeDefs.map((typeDef) => {
    const relations = Object.keys(typeDef.relations ?? {})
    const metaRelations = typeDef.metadata?.relations ?? {}
    const directlyAssignableTypes = Object.values(metaRelations).flatMap(
      (m) => m.directly_assignable_types ?? [],
    )

    const data: ModelNodeData = {
      typeName: typeDef.type,
      color: getTypeColor(typeDef.type),
      relations,
      directlyAssignableTypes,
      referencedByTypes: referencedBy.get(typeDef.type) ?? [],
    }

    return {
      id: typeDef.type,
      type: 'typeNode',
      position: { x: 0, y: 0 },
      data,
    }
  })

  // Build edges from metadata directly_assignable_types
  const rawEdges: Edge[] = []
  const edgeSet = new Set<string>()
  const typeNameSet = new Set(typeDefs.map((td) => td.type))
  typeDefs.forEach((typeDef) => {
    const metaRelations = typeDef.metadata?.relations ?? {}
    Object.entries(metaRelations).forEach(([relationName, meta]) => {
      const assignableTypes = meta.directly_assignable_types ?? []
      assignableTypes.forEach((ref) => {
        if (!typeNameSet.has(ref.type)) return // skip edges to non-existent nodes
        const edgeId = `edge-${ref.type}-${relationName}-${typeDef.type}`
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId)
          rawEdges.push({
            id: edgeId,
            source: ref.type,
            target: typeDef.type,
            label: relationName,
            type: 'default',
            style: { stroke: '#9ca3af', strokeWidth: 1.5 },
          })
        }
      })
    })
  })

  // Apply dagre layout
  const laidOutNodes = applyDagreLayout(rawNodes, rawEdges, {
    rankdir: 'LR',
    nodeWidth: 160,
    nodeHeight: 60,
    nodesep: 60,
    ranksep: 100,
  })
  nodes.value = laidOutNodes
  edges.value = rawEdges
  layoutDone.value = true

  return { nodes, edges, layoutDone }
}
