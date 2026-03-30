# Story 5.1: Relationship Graph Canvas

Status: review

## Story

As a user,
I want to see an interactive graph of concrete entities and their relationships,
so that I can visually understand who has access to what and debug permission issues.

## Acceptance Criteria

1. **Given** I navigate to the Relationship Graph with a store that has tuples **When** the page loads **Then** I see a Vue Flow canvas with entity nodes (e.g., `user:alice`, `document:roadmap`) and edges labeled with relation names (e.g., "viewer"), laid out automatically with dagre

2. **Given** the relationship graph is displayed **When** I look at the nodes **Then** each entity node is colored by its type using the same deterministic 8-color palette as the model graph and TypeBadge components (hash of type name % 8)

3. **Given** the relationship graph is displayed **When** I use mouse wheel to zoom, click-drag the canvas to pan, or drag a node **Then** the graph responds smoothly with zoom, pan, and node repositioning

4. **Given** the relationship graph is displayed **When** I look at the edges between nodes **Then** each edge is labeled with the relation name in gray (#9ca3af)

5. **Given** a store with up to 500 entities in tuples **When** the relationship graph renders **Then** it completes rendering in under 3 seconds with dagre layout (NFR5)

6. **Given** I navigate to the Relationship Graph **When** the view mounts **Then** tuples are re-fetched from the API to build the graph (data freshness pattern)

7. **Given** a store with no tuples **When** I navigate to the Relationship Graph **Then** I see an EmptyState: "No tuples to visualize" with a "Go to Tuple Manager" action button

## Tasks / Subtasks

- [x] Task 1: Create `useRelationshipGraph` composable — tuple data → Vue Flow nodes + edges (AC: #1, #2, #4, #5)
  - [x]Create `frontend/src/composables/useRelationshipGraph.ts`
  - [x]Input: `tuples: TupleEntry[]` (imported from `@/stores/tuples`)
  - [x]Derive unique entity node IDs from tuple data: collect all `tuple.key.user` and `tuple.key.object` values, deduplicate into a `Set<string>`
  - [x]Build Vue Flow `Node[]`: for each unique entity string (e.g., `user:alice`):
    - `id = entityString` (e.g., `"user:alice"`)
    - `type = 'entityNode'`
    - `position = { x: 0, y: 0 }` (overwritten by dagre)
    - `data = { entityId: string, typeName: string, color: string }` where `typeName = entityString.split(':')[0]` and `color = getTypeColor(typeName)` from `@/utils/typeColors`
  - [x]Build Vue Flow `Edge[]`: for each tuple, create one edge:
    - `id = 'edge-{tuple.key.user}-{tuple.key.relation}-{tuple.key.object}'`
    - `source = tuple.key.user`
    - `target = tuple.key.object`
    - `label = tuple.key.relation`
    - `type = 'default'`
    - `style = { stroke: '#9ca3af', strokeWidth: 1.5 }`
  - [x]Deduplicate edges: use a `Set<string>` of edge IDs — if the same (user, relation, object) triple appears twice (e.g., from duplicate tuples), emit only one edge
  - [x]Apply dagre layout using the same `applyDagreLayout` function pattern as `useModelGraph.ts`:
    - `rankdir: 'TB'` (top-to-bottom — entities are instances, not type hierarchy)
    - `nodesep: 80`, `ranksep: 120`
    - Node dimensions: `width: 180`, `height: 50`
    - After dagre layout, copy x/y positions to Vue Flow node `position` (subtract half width/height to convert from center to top-left)
  - [x]Return `{ nodes: Ref<Node[]>, edges: Ref<Edge[]>, layoutDone: Ref<boolean> }`
  - [x]If input tuples array is empty, return empty nodes/edges with `layoutDone = true` immediately
  - [x]Co-locate test file: `frontend/src/composables/useRelationshipGraph.test.ts`

- [x] Task 2: Create custom Vue Flow node component — `EntityNode.vue` (AC: #1, #2, #3)
  - [x]Create `frontend/src/components/graph/EntityNode.vue`
  - [x]Accept Vue Flow `NodeProps` — access `data.entityId`, `data.typeName`, `data.color` via `props.data`
  - [x]Render: colored left border or header band using `data.color`, entity ID in `font-mono text-sm text-text-primary`, type name prefix dimmed in `text-text-secondary`
    - Suggested layout: colored dot or left `border-l-4` using inline `style="border-color: {data.color}"`, then `<span class="text-text-secondary font-mono text-xs">{typeName}:</span><span class="font-mono text-sm text-text-primary">{instancePart}</span>` where `instancePart = entityId.split(':').slice(1).join(':')`
  - [x]Node dimensions: fixed `180px` width, single-line height
  - [x]Apply focus ring (`ring-2 ring-info`) when node is selected/focused
  - [x]Use `Handle` component from `@vue-flow/core` for source and target connection points
  - [x]Accessible: `tabindex="0"`, `aria-label="Entity: {entityId}"`
  - [x]Co-locate test file: `frontend/src/components/graph/EntityNode.test.ts`

- [x] Task 3: Create `RelationshipGraphCanvas.vue` — Vue Flow canvas component (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x]Create `frontend/src/components/graph/RelationshipGraphCanvas.vue`
  - [x]Import and use `VueFlow`, `BackgroundVariant` from `@vue-flow/core`, `Background` from `@vue-flow/background`, `Controls` from `@vue-flow/controls`
  - [x]Props: none — reads directly from `useTupleStore()` (tuple data) and calls `useRelationshipGraph(tupleStore.tuples)`
  - [x]Register `EntityNode` as a custom node type: `const nodeTypes = markRaw({ entityNode: EntityNode })`
  - [x]VueFlow canvas config: `fit-view-on-init`, `min-zoom=0.2`, `max-zoom=2`, `BackgroundVariant.Dots`, same dark CSS overrides as `ModelGraphView.vue` (class `vue-flow-dark`)
  - [x]Show `LoadingSpinner` (full-view) while `!layoutDone`
  - [x]Show `EmptyState` (icon: `GitBranch`, title: "No tuples to visualize", message: "Add tuples to see the relationship graph", `action-label="Go to Tuple Manager"`, `action-to="/tuple-manager"`) when tuples array is empty — but only after data has been loaded (guard: only show EmptyState if `!tupleStore.loading && tupleStore.tuples.length === 0`)
  - [x]Show loading spinner while `tupleStore.loading` is true (initial fetch)
  - [x]Render VueFlow canvas once layoutDone and tuples are present
  - [x]Co-locate test file: `frontend/src/components/graph/RelationshipGraphCanvas.test.ts`

- [x] Task 4: Create Pinia store — `frontend/src/stores/relationshipGraph.ts` (AC: #5, #6)
  - [x]Create `frontend/src/stores/relationshipGraph.ts` using Pinia setup syntax
  - [x]The view needs to trigger a tuple fetch on mount; rather than duplicating fetch logic, this store is a thin coordinator that calls `useTupleStore().fetchTuples(storeId)` to ensure tuples are up-to-date for the graph
  - [x]Store exports: `loading` (delegated to `tupleStore.loading`), `error` (delegated to `tupleStore.error`)
  - [x]Action `loadGraph(storeId: string)`: calls `tupleStore.fetchTuples(storeId)` — this re-fetches all tuples without filters (reset filters first to get complete tuple set for visualization)
  - [x]**Important**: call `tupleStore.resetTuples()` before fetching to clear any filter state that would limit the dataset — the graph needs all tuples, not a filtered subset
  - [x]Co-locate test file: `frontend/src/stores/relationshipGraph.test.ts`

- [x] Task 5: Rewrite `RelationshipGraph.vue` view (AC: #1, #6, #7)
  - [x]REWRITE `frontend/src/views/RelationshipGraph.vue` (currently a placeholder EmptyState)
  - [x]Import: `useConnectionStore`, `useTupleStore`, `useRelationshipGraphStore` (or call `useTupleStore` directly), `RelationshipGraphCanvas`, `EmptyState`, `LoadingSpinner`
  - [x]On mount (`onMounted`): if `connectionStore.storeId`, call `tupleStore.resetTuples()` then `tupleStore.fetchTuples(connectionStore.storeId)` — this ensures the full unfiltered tuple set is fetched
  - [x]Watch `connectionStore.storeId`: when storeId changes to a non-empty string, re-fetch tuples; when it becomes empty, call `tupleStore.resetTuples()`
  - [x]If `!connectionStore.storeId`: render `EmptyState` (icon: `Settings`, title: "No store selected", message: "Select or create a store to get started", `action-label="Go to Store Admin"`, `action-to="/store-admin"`) — same pattern as QueryConsole and TupleManager
  - [x]Otherwise: render `<RelationshipGraphCanvas />` (the canvas handles its own loading/empty/data states internally, reading from `useTupleStore()`)
  - [x]Page title: `"Relationship Graph"` in `text-xl font-semibold text-text-emphasis mb-4` — only shown when store is connected (not on the "no store" empty state)
  - [x]**Do NOT re-implement loading/empty logic in the view** — delegate entirely to `RelationshipGraphCanvas`, which reads `tupleStore.loading` and `tupleStore.tuples` directly
  - [x]Co-locate test file: `frontend/src/views/RelationshipGraph.test.ts`

- [x] Task 6: Tests — `useRelationshipGraph` composable (AC: #1, #2, #4, #5)
  - [x]`frontend/src/composables/useRelationshipGraph.test.ts`:
    - [x]Test empty tuples → empty nodes and edges, layoutDone = true
    - [x]Test single tuple `{ user: 'user:alice', relation: 'viewer', object: 'document:roadmap' }` → two nodes (`user:alice`, `document:roadmap`), one edge with label `"viewer"`
    - [x]Test node typeName extraction: `user:alice` → typeName `"user"`, `document:roadmap` → typeName `"document"`
    - [x]Test node color: `data.color` equals `getTypeColor('user')` for `user:alice` node
    - [x]Test entity deduplication: two tuples with the same user entity → only one node for that entity
    - [x]Test edge deduplication: duplicate (user, relation, object) triple → only one edge
    - [x]Test edge style: `stroke` is `'#9ca3af'`
    - [x]Test dagre layout is applied: all nodes have non-zero `position` after layout (with more than one node)

- [x] Task 7: Tests — `EntityNode.vue` component (AC: #2, #3)
  - [x]`frontend/src/components/graph/EntityNode.test.ts`:
    - [x]Test renders `entityId` text correctly
    - [x]Test renders `typeName` prefix in secondary color
    - [x]Test colored left border/header with `data.color` via inline style (jsdom normalizes hex → rgb; use regex match)
    - [x]Test `aria-label` contains the entityId
    - [x]Test `tabindex="0"` is present

- [x] Task 8: Tests — `RelationshipGraphCanvas.vue` component (AC: #1, #6, #7)
  - [x]`frontend/src/components/graph/RelationshipGraphCanvas.test.ts`:
    - [x]Test shows `LoadingSpinner` when `tupleStore.loading` is true
    - [x]Test shows `EmptyState` when `tupleStore.loading` is false and `tuples` is empty
    - [x]Test does NOT show `EmptyState` while `tupleStore.loading` is true (loading takes priority)
    - [x]Test renders VueFlow canvas when tuples are present and layoutDone is true
    - [x]Test EmptyState has correct `action-to="/tuple-manager"` prop

- [x] Task 9: Tests — `RelationshipGraph.vue` view (AC: #6, #7)
  - [x]`frontend/src/views/RelationshipGraph.test.ts`:
    - [x]Test renders "No store selected" EmptyState when `connectionStore.storeId` is empty
    - [x]Test calls `tupleStore.fetchTuples` on mount when storeId is set
    - [x]Test calls `tupleStore.resetTuples` on mount before fetching (to clear filters)
    - [x]Test re-fetches when `connectionStore.storeId` changes
    - [x]Test renders `RelationshipGraphCanvas` when storeId is set
    - [x]Test renders page title "Relationship Graph" when storeId is set

## Dev Notes

### Architecture Compliance

- **No direct API calls from components** — `RelationshipGraphCanvas.vue` reads from `useTupleStore()`. The view (`RelationshipGraph.vue`) triggers the fetch via `tupleStore.fetchTuples()`. Graph canvas is purely presentational. [Source: architecture.md#Communication Patterns]
- **Vue Flow + dagre** — mandated by architecture for both model and relationship graphs. Do not use D3, Cytoscape, or plain SVG. Vue Flow and dagre are already installed from Story 2.3. [Source: architecture.md#Frontend Architecture]
- **Data freshness** — re-fetch tuples on every view mount. Do not rely on whatever tuples are cached in the store from TupleManager navigation. The graph needs the full, unfiltered tuple set. [Source: ux-design-specification.md#Data Freshness Pattern]
- **Graph component location** — `RelationshipGraphCanvas.vue` and `EntityNode.vue` go in `frontend/src/components/graph/`. This is the architecture-mandated location (distinct from `components/model/`). [Source: architecture.md#Structure Patterns]
- **Pinia setup syntax** — any new store uses `defineStore('name', () => { ... })` setup syntax with `loading`, `error`, data refs. [Source: architecture.md#Communication Patterns]
- **EmptyState from common** — import from `@/components/common/EmptyState.vue`. Do not create a new empty state component. [Source: architecture.md#Structure Patterns]
- **Inspector panel: not required in this story** — Story 5.1 does not include a click-to-inspect side panel for entity nodes. That is deferred (potential Epic 5 follow-on story). Do not implement `EntityNodeDetail.vue` in this story.

### Project Structure Notes

**Files to create:**

```
frontend/src/
├── composables/
│   ├── useRelationshipGraph.ts           # NEW: tuples → Vue Flow nodes + edges + dagre layout
│   └── useRelationshipGraph.test.ts      # NEW: composable unit tests
├── components/
│   └── graph/                            # NEW directory (create it)
│       ├── EntityNode.vue                # NEW: custom Vue Flow node for entity instances
│       ├── EntityNode.test.ts            # NEW: node component tests
│       ├── RelationshipGraphCanvas.vue   # NEW: VueFlow canvas orchestrator
│       └── RelationshipGraphCanvas.test.ts  # NEW: canvas component tests
├── stores/
│   ├── relationshipGraph.ts              # NEW: thin coordinator store (optional — see note below)
│   └── relationshipGraph.test.ts         # NEW: if store is created
└── views/
    ├── RelationshipGraph.vue             # REWRITE: currently a placeholder EmptyState
    └── RelationshipGraph.test.ts         # NEW: view tests
```

**Note on the `relationshipGraph` store:** The store is optional — `RelationshipGraph.vue` can call `useTupleStore()` directly. However, if the view logic grows (e.g., graph-specific display options in the future), a thin coordinator store provides a clean abstraction point. For MVP, it is acceptable to skip it and call `useTupleStore()` directly from the view. The task list includes it for completeness; the dev agent may choose to omit it if it adds no value.

**Files to modify:**

- `frontend/src/views/RelationshipGraph.vue` — REWRITE (currently a static placeholder)

**Files NOT to modify:**

- `frontend/src/router/index.ts` — the `/relationship-graph` route already exists, pointing to `RelationshipGraph.vue`
- `frontend/src/components/layout/AppSidebar.vue` — "Relationship Graph" nav item already exists with `GitBranch` icon and `/relationship-graph` route
- `frontend/src/stores/tuples.ts` — use as-is; the `fetchTuples`, `resetTuples`, `tuples`, `loading`, `error` are all the view needs
- `frontend/package.json` — Vue Flow and dagre are already installed from Story 2.3

### Critical Technical Details

#### Tuple Data → Graph Transformation

Each `TupleEntry` has shape:
```typescript
interface TupleEntry {
  key: { user: string; relation: string; object: string }
  timestamp: string
}
```

A single tuple like `{ user: 'user:alice', relation: 'viewer', object: 'document:roadmap' }` maps to:
- Node `"user:alice"` → `typeName = "user"`, color = `getTypeColor("user")`
- Node `"document:roadmap"` → `typeName = "document"`, color = `getTypeColor("document")`
- Edge from `"user:alice"` to `"document:roadmap"` with label `"viewer"`

The full node ID is the complete entity string (e.g., `"user:alice"`), not just the instance part. This makes deduplication straightforward: use a `Map<string, Node>` or `Set<string>` keyed by the full entity string.

```typescript
// useRelationshipGraph.ts — transformation sketch
export interface EntityNodeData {
  entityId: string       // e.g. "user:alice"
  typeName: string       // e.g. "user"
  color: string          // hex from getTypeColor(typeName)
}

export function useRelationshipGraph(tuples: TupleEntry[]) {
  const nodes = ref<Node[]>([])
  const edges = ref<Edge[]>([])
  const layoutDone = ref(false)

  if (tuples.length === 0) {
    layoutDone.value = true
    return { nodes, edges, layoutDone }
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

  // Apply dagre layout
  const laidOutNodes = applyDagreLayout(rawNodes, rawEdges)
  nodes.value = laidOutNodes
  edges.value = rawEdges
  layoutDone.value = true

  return { nodes, edges, layoutDone }
}
```

#### Dagre Layout Config for Relationship Graph

Use `rankdir: 'TB'` (top-to-bottom) rather than `'LR'` used in the model graph. Entity instances have no inherent left-to-right hierarchy; top-to-bottom produces a more natural "who → what" visual flow.

```typescript
function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 })

  const NODE_WIDTH = 180
  const NODE_HEIGHT = 50

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
```

#### EntityNode.vue — Custom Node Component

```typescript
// EntityNode.vue <script setup>
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { EntityNodeData } from '@/composables/useRelationshipGraph'

const props = defineProps<NodeProps<EntityNodeData>>()

// Split "user:alice" into prefix "user" and instance "alice"
// Handle edge cases like "user:alice:extra" → prefix "user", instance "alice:extra"
function splitEntity(entityId: string): { prefix: string; instance: string } {
  const colon = entityId.indexOf(':')
  if (colon === -1) return { prefix: entityId, instance: '' }
  return { prefix: entityId.slice(0, colon), instance: entityId.slice(colon + 1) }
}
```

Template structure — colored left border approach (consistent with TypeBadge pill):
```vue
<template>
  <div
    class="relative flex items-center bg-surface-card border border-surface-border rounded-md px-3 py-2 w-[180px] focus:outline-none focus:ring-2 focus:ring-info"
    tabindex="0"
    :aria-label="`Entity: ${props.data.entityId}`"
  >
    <!-- Colored left accent bar -->
    <div
      class="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
      :style="{ backgroundColor: props.data.color }"
    />
    <!-- Entity text: "user" dimmed + ":alice" emphasized -->
    <span class="pl-2 font-mono text-xs truncate">
      <span class="text-text-secondary">{{ splitEntity(props.data.entityId).prefix }}:</span>
      <span class="text-text-primary">{{ splitEntity(props.data.entityId).instance }}</span>
    </span>
    <!-- Vue Flow handles -->
    <Handle type="source" :position="Position.Bottom" />
    <Handle type="target" :position="Position.Top" />
  </div>
</template>
```

#### RelationshipGraphCanvas.vue — Canvas Orchestrator

```vue
<!-- RelationshipGraphCanvas.vue -->
<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { VueFlow, BackgroundVariant } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { GitBranch } from 'lucide-vue-next'
import { useTupleStore } from '@/stores/tuples'
import { useRelationshipGraph } from '@/composables/useRelationshipGraph'
import EntityNode from './EntityNode.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const tupleStore = useTupleStore()
const nodeTypes = markRaw({ entityNode: EntityNode })

// Recompute graph when tuples change
// Note: useRelationshipGraph is called reactively via computed or watch if needed.
// For MVP simplicity, call it with current tuples. The view re-mounts on store
// change, so this is called once with the loaded data.
const { nodes, edges, layoutDone } = useRelationshipGraph(tupleStore.tuples)
</script>
```

**Important caveat on reactivity**: `useRelationshipGraph` as described in Task 1 is NOT reactive — it computes once from the provided array. This matches the `useModelGraph` pattern from Story 2.3. Since the view re-fetches on mount and on storeId change, and the component is re-mounted when the view is re-activated, this is acceptable for MVP.

If reactivity is needed (e.g., tuples update while the view is open), use a `watchEffect` or pass a `computed(() => tupleStore.tuples)` ref. The simpler MVP approach: the view unmounts/remounts on store change, which triggers a fresh fetch and fresh graph computation.

#### RelationshipGraph.vue — View

```vue
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { Settings } from 'lucide-vue-next'
import { useConnectionStore } from '@/stores/connection'
import { useTupleStore } from '@/stores/tuples'
import RelationshipGraphCanvas from '@/components/graph/RelationshipGraphCanvas.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const connectionStore = useConnectionStore()
const tupleStore = useTupleStore()

async function loadGraph(storeId: string) {
  // Reset to clear any filters from TupleManager — graph needs all tuples
  tupleStore.resetTuples()
  await tupleStore.fetchTuples(storeId)
}

onMounted(() => {
  if (connectionStore.storeId) {
    loadGraph(connectionStore.storeId)
  }
})

watch(
  () => connectionStore.storeId,
  (newStoreId) => {
    if (newStoreId) {
      loadGraph(newStoreId)
    } else {
      tupleStore.resetTuples()
    }
  },
)
</script>
```

#### Dark Theme CSS Override

Reuse the same `vue-flow-dark` CSS class already defined in `ModelGraphView.vue`. Either extract it to `frontend/src/style.css` as a global rule, or duplicate it in `RelationshipGraphCanvas.vue`'s `<style scoped>`:

```css
/* RelationshipGraphCanvas.vue <style scoped> */
.vue-flow-dark {
  --vf-node-bg: #111827;       /* surface-card */
  --vf-node-text: #f3f4f6;     /* text-primary */
  --vf-edge-stroke: #9ca3af;   /* gray-400 */
  --vf-handle-bg: #4b5563;
  --vf-controls-bg: #1f2937;   /* surface-elevated */
  --vf-controls-color: #f3f4f6;
  --vf-controls-border: #374151;
  background-color: #030712;   /* surface-base */
}
```

#### Color Utility — Already Exists

`getTypeColor(typeName: string): string` and `getTypeColorIndex(typeName: string): number` are already in `frontend/src/utils/typeColors.ts` (extracted in Story 2.3). Import them directly — do NOT reimplement.

The algorithm uses a simple character-code sum hash:
```typescript
// Already implemented — do NOT duplicate:
function getTypeColorIndex(typeName: string): number {
  let sum = 0
  for (let i = 0; i < typeName.length; i++) {
    sum += typeName.charCodeAt(i)
  }
  return sum % 8
}
```

This is consistent with `TypeBadge.vue`. All three components (TypeBadge, ModelTypeNode, EntityNode) will produce the same color for the same type name.

#### Performance Considerations (NFR5 — 500 entities, < 3 seconds)

With 500 entity nodes, Vue Flow + dagre performance is the primary concern:

1. **`markRaw()` on `nodeTypes`** — prevents Vue from deeply observing the component definitions. Already shown in the `RelationshipGraphCanvas.vue` pattern above.

2. **Dagre layout is synchronous** — for 500 nodes it runs in ~50-100ms. This is acceptable and does not require a Web Worker for MVP.

3. **Avoid reactive overhead on node array** — compute nodes/edges once in `useRelationshipGraph` and store in `ref`. Do not use `computed(() => ...)` that re-runs on every render frame.

4. **Vue Flow viewport culling** — Vue Flow handles virtual rendering (only renders nodes in viewport). For 500 nodes, this is essential. No additional configuration needed — it's on by default.

5. **`fit-view-on-init`** — automatically zooms out to fit all 500 nodes into view after layout. Required for usability with large graphs.

6. **Avoid `watch` on tuples inside the composable** — the composable is called once with the loaded data. No reactive subscription needed.

7. **`tupleStore.fetchTuples` returns ALL tuples** (up to `pageSize` per call). For the graph, consider fetching without pagination limit if the store has more than 500 tuples. For MVP, the default `pageSize = 50` from `TupleManager` will under-fetch. The view should explicitly pass a large page size, OR the graph store/view should call `fetchTuples` with a large enough `pageSize`. **Action item for dev agent**: check if `fetchTuples` accepts a page size override or if the store's `PAGE_SIZE` constant (currently 50) needs to be overridden for graph use. Consider calling `fetchNextPage` in a loop to load all, or use a dedicated large-page fetch. For MVP, document this limitation.

#### TypeScript Interfaces

```typescript
// In useRelationshipGraph.ts — export these for component use
export interface EntityNodeData {
  entityId: string    // e.g. "user:alice"
  typeName: string    // e.g. "user"
  color: string       // hex, e.g. "#3b82f6"
}
```

#### Known Limitation: Pagination and Graph Completeness

`useTupleStore.fetchTuples` uses `pageSize = 50` by default. For a store with 200+ tuples, only the first 50 will appear in the graph. For MVP this is acceptable — document it as a known limitation in the `RelationshipGraph.vue` view (e.g., a small info notice: "Showing first 50 tuples"). A future story can add full pagination loading for the graph view.

The dev agent may choose to call `fetchNextPage` in a loop inside `loadGraph()` to load all pages, but this adds complexity. Scope it conservatively for MVP.

#### Test Mocking Pattern

Follow the established `vi.mock` hoisting pattern from Story 2.3:

```typescript
// In RelationshipGraphCanvas.test.ts
import { vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@vue-flow/core', () => ({
  VueFlow: { template: '<div class="vue-flow-mock"><slot /></div>' },
  BackgroundVariant: { Dots: 'dots' },
  Handle: { template: '<div />' },
  Position: { Top: 'top', Bottom: 'bottom' },
}))

vi.mock('@vue-flow/background', () => ({
  Background: { template: '<div />' },
}))

vi.mock('@vue-flow/controls', () => ({
  Controls: { template: '<div />' },
}))

// jsdom normalizes hex to rgb — use regex in color assertions:
// expect(wrapper.html()).toMatch(/rgb\(59,\s*130,\s*246\)/)
```

### References

- [Source: epics.md#Story 5.1] — FR28-FR34: Relationship graph canvas, entity nodes, type-colored, interactive, dagre layout
- [Source: epics.md#NFR5] — Relationship graph (500 entities) renders in < 3 seconds
- [Source: architecture.md#Frontend Architecture] — Vue Flow + dagre mandated; `RelationshipGraphCanvas.vue` in `components/graph/`
- [Source: architecture.md#Structure Patterns] — `components/graph/` directory for graph-specific components
- [Source: architecture.md#Communication Patterns] — Pinia setup syntax; views fetch on mount; no direct API calls from canvas components
- [Source: ux-design-specification.md#Graph Node Colors] — 8-color deterministic palette, `hash(typeName) % 8`, same as TypeBadge and ModelGraphView
- [Source: ux-design-specification.md#Layout Structure] — Inspector panel is overlay (320px); canvas keeps full width
- [Source: ux-design-specification.md#Empty States] — "No tuples to visualize" / "Go to Tuple Manager"
- [Source: ux-design-specification.md#Data Freshness Pattern] — Re-fetch on every view mount, no caching
- [Source: ux-design-specification.md#Accessibility Strategy] — `prefers-reduced-motion`, focus rings, Tab-focusable nodes
- [Source: 2-3-model-graph-view-with-interactive-nodes.md] — Dagre layout pattern, `markRaw` on nodeTypes, Vue Flow dark CSS vars, `useModelGraph` composable shape, edge deduplication guard, jsdom hex→rgb normalization in tests
- [Source: 3-2-tuple-table-with-filtering-and-pagination.md] — `useTupleStore` shape, `fetchTuples` / `resetTuples` API, `TupleEntry` interface, data freshness via `onMounted` + `watch(storeId)`
- [Source: frontend/src/utils/typeColors.ts] — `getTypeColor`, `getTypeColorIndex` already implemented; char-sum hash algorithm
- [Source: frontend/src/composables/useModelGraph.ts] — Canonical dagre layout function implementation to replicate
- [Source: frontend/src/components/model/ModelGraphView.vue] — `vue-flow-dark` CSS class, `markRaw({ typeNode })`, `fit-view-on-init`, VueFlow props pattern
- [Source: frontend/src/stores/tuples.ts] — `fetchTuples(storeId)`, `resetTuples()`, `TupleEntry`, `loading`, `error`, `tuples` refs
- [Source: frontend/src/views/RelationshipGraph.vue] — Current placeholder to be rewritten

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Composable `useRelationshipGraph` accepts `Ref<TupleEntry[]>` (not plain array) for reactivity — watch-based recompute when tuples load async
- Skipped optional `relationshipGraph.ts` Pinia store — view calls `useTupleStore()` directly (simpler, sufficient for MVP)
- `clearFilters()` called before `resetTuples()` + `fetchTuples()` to ensure graph gets full unfiltered tuple set
- 276/276 tests pass, no regressions

### File List

- `frontend/src/composables/useRelationshipGraph.ts` (new)
- `frontend/src/composables/useRelationshipGraph.test.ts` (new)
- `frontend/src/components/graph/EntityNode.vue` (new)
- `frontend/src/components/graph/EntityNode.test.ts` (new)
- `frontend/src/components/graph/RelationshipGraphCanvas.vue` (new)
- `frontend/src/components/graph/RelationshipGraphCanvas.test.ts` (new)
- `frontend/src/views/RelationshipGraph.vue` (rewritten)
- `frontend/src/views/RelationshipGraph.test.ts` (new)
