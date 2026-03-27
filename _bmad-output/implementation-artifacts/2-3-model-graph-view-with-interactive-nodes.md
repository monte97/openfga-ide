# Story 2.3: Model Graph View with Interactive Nodes

Status: done

## Story

As a user,
I want to view the authorization model as an interactive visual graph,
so that I can understand the type hierarchy and relation structure visually.

## Acceptance Criteria

1. **Given** I navigate to the Model Viewer with a store that has a model **When** I switch to the Graph tab **Then** I see a Vue Flow canvas with types rendered as nodes and relations rendered as labeled edges, laid out automatically with dagre

2. **Given** the model graph is displayed **When** I look at the nodes **Then** each type node is colored using the deterministic 8-color palette (hash of type name % 8), matching the TypeBadge colors used elsewhere in the app, and all colors pass 4.5:1 contrast on the dark canvas

3. **Given** the model graph is displayed **When** I click on a type node **Then** a GraphNodeDetail inspector panel (320px) slides in from the right showing the type's relations, metadata, and directly related user types

4. **Given** the GraphNodeDetail panel is open **When** I press Esc or click outside the panel **Then** the panel closes and the graph canvas returns to full width

5. **Given** the model graph is displayed **When** I use mouse wheel to zoom, click-drag the canvas to pan, or drag a node **Then** the graph responds smoothly with zoom, pan, and node repositioning

6. **Given** a model with up to 20 types **When** the graph renders **Then** it completes rendering in under 2 seconds (NFR2)

## Tasks / Subtasks

- [x] Task 1: Install and configure Vue Flow + dagre (AC: #1, #5, #6)
  - [x] Install `@vue-flow/core`, `@vue-flow/background`, `@vue-flow/controls`, `@vue-flow/minimap` in `frontend/package.json`
  - [x] Install `dagre` and `@types/dagre` in `frontend/package.json`
  - [x] Import Vue Flow CSS in `frontend/src/main.ts` or the component: `import '@vue-flow/core/dist/style.css'`
  - [x] Verify Vue Flow renders a basic canvas in a test component before wiring to model data

- [x] Task 2: Model data transformation utility — `useModelGraph` composable (AC: #1, #2)
  - [x] Create `frontend/src/composables/useModelGraph.ts`
  - [x] Input: the `json` field from the model store (`AuthorizationModel` JSON shape)
  - [x] Parse `type_definitions` array from the model JSON into Vue Flow `Node[]`
    - [x] Each `TypeDefinition` → one node: `id = typeName`, `type = 'typeNode'`, `data = { typeName, relations: Object.keys(typeDef.relations ?? {}), metadata: typeDef.metadata }`
    - [x] Assign color via `getTypeColor(typeName)` (deterministic hash from the shared utility — see TypeBadge in Story 1.3)
  - [x] Parse relations into Vue Flow `Edge[]`
    - [x] Use metadata-based approach (directly_assignable_types) for reliable edge extraction
    - [x] Create edge: `id = 'edge-{source}-{relation}-{target}'`, `source = sourceType`, `target = referencedType`, `label = relationName`, `type = 'default'`, edge color gray (#9ca3af)
  - [x] Apply dagre layout to computed nodes/edges
    - [x] Use `dagre.graphlib.Graph()`, set `rankdir: 'LR'` (left-to-right), `nodesep: 60`, `ranksep: 100`
    - [x] Assign default node dimensions: `width: 160`, `height: 60` before running layout
    - [x] After dagre layout, copy `x` / `y` positions to Vue Flow node `position` field
  - [x] Return `{ nodes: Ref<Node[]>, edges: Ref<Edge[]>, layoutDone: Ref<boolean> }`

- [x] Task 3: Custom Vue Flow node component — `ModelTypeNode.vue` (AC: #1, #2, #5)
  - [x] Create `frontend/src/components/model/ModelTypeNode.vue`
  - [x] Accept Vue Flow `NodeProps` — access `data.typeName`, `data.relations`, `data.color` via `props.data`
  - [x] Render: colored header band (using `data.color` as background), type name in `text-emphasis` (white), list of relation names below in `text-secondary` (gray-400), JetBrains Mono font for all text
  - [x] Node dimensions: fixed `160px` width, show top 3 with "+N more"
  - [x] Apply focus ring (`ring-2 ring-info`) when node is focused/selected
  - [x] Use `Handle` component from `@vue-flow/core` for source and target connection points (both sides)
  - [x] Accessible: node element is focusable (`tabindex="0"`), `aria-label="Type: {typeName}"`

- [x] Task 4: `ModelGraphView.vue` — main graph component (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `frontend/src/components/model/ModelGraphView.vue`
  - [x] Import and use `VueFlow` from `@vue-flow/core`, `Background` from `@vue-flow/background`, `Controls` from `@vue-flow/controls`
  - [x] Props: none — reads directly from `useModelStore()` (`modelStore.json`)
  - [x] Register `ModelTypeNode` as a custom node type: `nodeTypes = { typeNode: ModelTypeNode }`
  - [x] VueFlow canvas config: `fit-view-on-init`, `min-zoom=0.2`, `max-zoom=2`, `BackgroundVariant.Dots`, dark CSS overrides
  - [x] On node click: set `selectedNode = node.data` to open GraphNodeDetail panel
  - [x] Show `GraphNodeDetail` panel as right overlay when `selectedNode` is not null
  - [x] Show `LoadingSpinner` (full-view) while `!layoutDone`
  - [x] Show `EmptyState` with icon=`Share2` when `modelStore.json` is null
  - [x] Edge styling: `stroke: '#9ca3af'`, `stroke-width: 1.5` (applied in composable)

- [x] Task 5: `GraphNodeDetail.vue` — inspector panel for model type nodes (AC: #3, #4)
  - [x] Create `frontend/src/components/model/GraphNodeDetail.vue`
  - [x] Props: `node: ModelNodeData | null`, emit: `close`
  - [x] Render as 320px (`w-80`) right overlay panel with `surface-card` background and `surface-border` left border
  - [x] Panel slides in from right with CSS transition; `prefers-reduced-motion: reduce` → no transition
  - [x] Header: type name with color dot, close button (X icon)
  - [x] Sections: Relations (AppBadge info), Directly assigned user types, Used in relations of other types
  - [x] Close triggers: Esc keydown, X button click
  - [x] `<aside aria-label="Type details" role="complementary">`

- [x] Task 6: Wire `ModelViewer.vue` — integrate Graph tab (AC: #1, #3)
  - [x] Modify `frontend/src/views/ModelViewer.vue` to import and render `ModelGraphView`
  - [x] AppTabs has DSL and Graph tabs; Graph tab renders `<ModelGraphView />`
  - [x] No re-fetch — ModelGraphView reads from modelStore directly

- [x] Task 7: Tests (AC: #1–6)
  - [x] Create `frontend/src/composables/useModelGraph.test.ts` — 8 tests
  - [x] Create `frontend/src/components/model/ModelTypeNode.test.ts` — 5 tests
  - [x] Create `frontend/src/components/model/ModelGraphView.test.ts` — 5 tests
  - [x] Create `frontend/src/components/model/GraphNodeDetail.test.ts` — 5 tests

### Review Findings

- [x] [Review][Patch] Click-outside-to-close missing on GraphNodeDetail — fixed: mousedown listener on window
- [x] [Review][Patch] Slide animation never fired (v-if + class applied simultaneously) — fixed: v-show + isOpen ref with nextTick
- [x] [Review][Patch] Esc test was no-op (expect(true).toBe(true)) — fixed: now asserts wrapper.emitted('close')
- [x] [Review][Patch] Esc listener fired even when panel closed — fixed: guard with props.node check
- [x] [Review][Patch] Edges created to non-existent nodes — fixed: guard with typeNameSet.has()
- [x] [Review][Defer] useModelGraph not reactive to model changes — acceptable for MVP
- [x] [Review][Defer] TypeBadge duplicates hash logic — deferred, refactor candidate

## Dev Notes

### Previous Story Intelligence (Epic 1 + Stories 2.1, 2.2)

From the now-complete Epic 1 implementation:

- **Express 5.1.0 with ESM** — backend uses `"type": "module"`, TypeScript 5.9 strict mode. All backend imports use `.js` extension.
- **`useApi` composable** — wraps all frontend HTTP calls. Handles `/api/` prefix, error envelope parsing, toast triggering. Has been patched to handle 204 No Content responses (returns `undefined as T`).
- **Pinia store pattern** — setup syntax with `loading: Ref<boolean>`, `error: Ref<string | null>`, data refs. Actions call `useApi` and set refs. Cross-store access: call `useOtherStore()` inside the action function (safe in Pinia setup stores).
- **Toast system** — `useToast().show({ type: 'success' | 'error', message: string })`. Error toasts persist; success toasts auto-dismiss after 5s.
- **ConfirmDialog, EmptyState, LoadingSpinner** — available from Story 1.3. Import from `frontend/src/components/common/`.
- **AppTabs** — Headless UI `TabGroup` wrapper, available from Story 1.3. Arrow key navigation, `aria-selected`. Already used in `ModelViewer.vue` for DSL / Graph tab switching (Story 2.2 set it up).
- **TypeBadge + `getTypeColor(typeName)`** — color utility function exists from Story 1.3. The exact function signature and location should be confirmed in the existing codebase; it uses `hash(typeName) % 8` from the 8-color palette. `ModelGraphView` MUST use this same utility to ensure color consistency between graph nodes and TypeBadge instances elsewhere.
- **Design tokens** — Tailwind v4.2 `@theme` tokens in `frontend/src/style.css`. Use `surface-base` (gray-950), `surface-card` (gray-900), `surface-elevated` (gray-800), `surface-border` (gray-700), `text-primary` (gray-100), `text-secondary` (gray-400), `text-emphasis` (white), `info` (#3b82f6).
- **Co-located tests** — test files live next to source files (e.g., `ModelGraphView.test.ts` next to `ModelGraphView.vue`). Story 1.6 used `__tests__/` subdirectories for some — follow the pattern already established in the project for consistency.
- **`ModelViewer.vue`** — already exists and has the DSL tab wired from Story 2.2. This story adds the Graph tab. Do NOT rewrite `ModelViewer.vue` from scratch — extend it.
- **`modelStore` (`frontend/src/stores/model.ts`)** — already exists from Story 2.2. Has `model` ref with `{ json, dsl, authorizationModelId }` shape (or null), `loading`, `error`, and `fetchModel(storeId)` action. `ModelGraphView` reads from this store directly — no new fetching.
- **`useRouter()` in stores** — works because router is installed before stores are accessed. Safe pattern confirmed in Story 1.6.
- **AppTabs `modelValue`** — if `modelValue` doesn't match any tab index, findIndex returns -1 (known deferred issue from Story 1.4). Start with index 0 as default.

### Architecture Compliance

- **No direct API calls from components** — `ModelGraphView.vue` reads from `useModelStore()`, which was already populated by `ModelViewer.vue` via `modelStore.fetchModel()`. Graph component is purely presentational relative to data fetching. [Source: architecture.md#Component Boundaries]
- **Vue Flow for graph rendering** — mandated by architecture for both model and relationship graphs. Vue Flow + dagre is the only approved graph solution. Do not use D3, Cytoscape, or plain SVG. [Source: architecture.md#Frontend Architecture]
- **Custom node components** — Vue Flow supports custom node types via `nodeTypes` prop. Use `ModelTypeNode.vue` registered as `typeNode`. This is the Vue Flow documented pattern. [Source: architecture.md#Frontend Architecture]
- **Component file location** — `ModelGraphView.vue`, `ModelTypeNode.vue`, `GraphNodeDetail.vue` all go in `frontend/src/components/model/`. [Source: architecture.md#Structure Patterns]
- **Pinia store as single source of truth** — `ModelGraphView` reads `modelStore.model` for its data. Never fetches independently. [Source: architecture.md#Communication Patterns]
- **Inspector panel as overlay** — 320px overlay that floats over the canvas, does NOT push/resize the canvas. Slides in from right. This is the Figma-inspector-panel pattern from UX spec. [Source: ux-design-specification.md#Layout Structure]
- **`prefers-reduced-motion`** — all CSS transitions must be wrapped in `@media (prefers-reduced-motion: no-preference)`. Panel should open/close instantly when user has set reduced motion. [Source: ux-design-specification.md#Accessibility Strategy]
- **Deterministic color palette** — the 8-color palette (`#3b82f6`, `#8b5cf6`, `#f59e0b`, `#10b981`, `#ec4899`, `#06b6d4`, `#f97316`, `#84cc16`) with `hash(typeName) % 8` is the single source of truth for type colors throughout the app. `ModelGraphView` node colors MUST match `TypeBadge` colors for the same type name. [Source: ux-design-specification.md#Graph Node Colors]

### Critical Technical Details

#### Vue Flow Setup

```bash
# Install in frontend package
npm install @vue-flow/core @vue-flow/background @vue-flow/controls dagre
npm install --save-dev @types/dagre
```

```typescript
// main.ts — import Vue Flow styles globally
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
```

Vue Flow `VueFlow` component props relevant to this story:
```typescript
// In ModelGraphView.vue template
<VueFlow
  :nodes="nodes"
  :edges="edges"
  :node-types="nodeTypes"
  fit-view-on-init
  :min-zoom="0.2"
  :max-zoom="2"
  @node-click="onNodeClick"
>
  <Background :variant="BackgroundVariant.Dots" :color="'#374151'" />
  <Controls />
</VueFlow>
```

#### Dagre Layout Pattern

```typescript
// useModelGraph.ts — dagre layout
import dagre from 'dagre'
import type { Node, Edge } from '@vue-flow/core'

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100 })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 160, height: 60 })
  })
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 80, // center: dagre gives center x, Vue Flow uses top-left
        y: nodeWithPosition.y - 30,
      },
    }
  })
}
```

#### OpenFGA Model JSON Structure

The `model.json` from the backend has this shape (OpenFGA authorization model v1.1):
```typescript
interface AuthorizationModel {
  id: string
  schema_version: string
  type_definitions: TypeDefinition[]
}

interface TypeDefinition {
  type: string  // the type name, e.g. "user", "document", "group"
  relations?: Record<string, Userset>
  metadata?: {
    relations?: Record<string, RelationMetadata>
  }
}

interface RelationMetadata {
  directly_assignable_types?: DirectlyRelatedUserType[]
}

interface DirectlyRelatedUserType {
  type: string
  relation?: string  // for e.g. "group#member"
  wildcard?: {}      // for "user:*" wildcard
}
```

**How to extract edges from the model:**

The simplest approach for MVP — use the `metadata.relations` field (not the userset rewrites):
```typescript
// For each TypeDefinition:
//   For each relation name in typeDef.metadata?.relations:
//     For each entry in directly_assignable_types:
//       Create edge: source = entry.type, target = typeDef.type, label = relationName
// This gives: "user --[viewer]--> document" style edges
```

This metadata-based approach is reliable and avoids parsing complex userset rewrites. The raw `Userset` / rewrite parsing is complex and error-prone for edge cases (recursive types, conditions, etc.). Use metadata for edge extraction.

#### Deterministic Color Function

The `getTypeColor(typeName: string): string` function already exists from Story 1.3 (TypeBadge). Locate it in the codebase and import it — do NOT reimplement it. If it lives in `TypeBadge.vue` as a local function, consider extracting it to `frontend/src/utils/typeColors.ts` for reuse in `useModelGraph.ts`. If it's already in a utility file, import directly.

```typescript
// The algorithm (reference only — use the existing implementation):
const TYPE_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ec4899','#06b6d4','#f97316','#84cc16']

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getTypeColor(typeName: string): string {
  return TYPE_COLORS[hashString(typeName) % TYPE_COLORS.length]
}
```

#### GraphNodeDetail Data Shape

```typescript
// Data passed to GraphNodeDetail when a node is clicked
interface ModelNodeData {
  typeName: string
  color: string
  relations: string[]                    // e.g. ['viewer', 'editor', 'owner']
  directlyAssignableTypes: DirectlyRelatedUserType[]  // from metadata
  referencedByTypes: Array<{ type: string; relation: string }>  // computed
}
```

#### Vue Flow Custom Node Registration

```typescript
// In ModelGraphView.vue <script setup>
import ModelTypeNode from '@/components/model/ModelTypeNode.vue'
import type { NodeTypes } from '@vue-flow/core'

const nodeTypes: NodeTypes = {
  typeNode: markRaw(ModelTypeNode),  // markRaw prevents Vue from deeply observing the component
}
```

#### Inspector Panel Slide Transition

```css
/* In GraphNodeDetail.vue <style> */
.inspector-panel {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 320px;
  transform: translateX(100%);
  transition: transform 0.2s ease;
  z-index: 10;
}

.inspector-panel.is-open {
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .inspector-panel {
    transition: none;
  }
}
```

#### VueFlow CSS Override for Dark Theme

Vue Flow's default theme is light. Override the CSS variables in the component or globally:
```css
/* In ModelGraphView.vue <style scoped> or in style.css */
.vue-flow {
  --vf-node-bg: theme(colors.gray.900);    /* surface-card */
  --vf-node-text: theme(colors.gray.100);  /* text-primary */
  --vf-edge-stroke: #9ca3af;               /* gray-400 */
  --vf-handle-bg: theme(colors.gray.600);
  --vf-controls-bg: theme(colors.gray.800);  /* surface-elevated */
  --vf-controls-color: theme(colors.gray.100);
  --vf-controls-border: theme(colors.gray.700);  /* surface-border */
}
```

#### Performance Note (NFR2)

The model graph must render in < 2 seconds for up to 20 types. Vue Flow + dagre on a 20-node graph is negligible performance-wise. The risk is in reactive overhead. Use:
- `markRaw()` on the `nodeTypes` object to prevent Vue from observing the component definitions
- Compute `nodes` and `edges` once (in `useModelGraph`) and only re-run on model change
- Do not use `computed(() => useModelGraph(...))` that re-runs on every render — compute once in `onMounted`

### File Structure After This Story

```
frontend/src/
├── composables/
│   ├── useModelGraph.ts          # NEW: model JSON → Vue Flow nodes + edges + dagre layout
│   └── useModelGraph.test.ts     # NEW: composable unit tests
├── components/
│   └── model/
│       ├── ModelDslView.vue      # UNCHANGED (Story 2.2)
│       ├── ModelGraphView.vue    # NEW: Vue Flow canvas + GraphNodeDetail orchestration
│       ├── ModelGraphView.test.ts  # NEW: component tests (show/hide logic)
│       ├── ModelTypeNode.vue     # NEW: custom Vue Flow node component for type definitions
│       ├── ModelTypeNode.test.ts # NEW: node component tests
│       ├── GraphNodeDetail.vue   # NEW: 320px inspector panel overlay
│       └── GraphNodeDetail.test.ts  # NEW: panel tests (open/close, content)
└── views/
    └── ModelViewer.vue           # MODIFIED: add Graph tab wired to ModelGraphView
```

Possible additional file if `getTypeColor` needs extraction:
```
frontend/src/
└── utils/
    └── typeColors.ts             # NEW or MODIFIED: extract color utility if not already shared
```

### What NOT to Do

- **Do NOT parse userset rewrites for edge extraction** — use the `metadata.relations[*].directly_assignable_types` field instead. Userset parsing is complex (union/intersection/difference/computed/tupleToUserset) and prone to edge cases. The metadata approach is clean, reliable, and sufficient for visualizing direct type relationships.
- **Do NOT install D3, Cytoscape, or any graph library other than Vue Flow** — architecture mandates Vue Flow. No exceptions.
- **Do NOT re-fetch the model from `ModelGraphView`** — the model was already fetched by `ModelViewer.vue` for the DSL tab. Read from `useModelStore()` directly. Avoid duplicate API calls.
- **Do NOT push the inspector panel (resize the canvas)** — it must be an overlay. The Vue Flow canvas keeps full width regardless of whether the panel is open. The panel floats on top with `position: absolute` or similar.
- **Do NOT implement the relationship graph (Epic 5)** in this story. `ModelGraphView` is the authorization model schema graph (types as nodes). The relationship graph (`RelationshipGraphCanvas.vue`) showing concrete entity instances from tuples is a different component in a different view — Epic 5.
- **Do NOT unit-test Vue Flow's internal rendering** — you can't and shouldn't. Test YOUR logic: does the composable produce correct nodes/edges from a given model JSON? Does the component show/hide the inspector panel correctly?
- **Do NOT use inline style for node colors** — inject color via CSS custom property or directly as `backgroundColor` in the node element's style binding. Either approach is acceptable; be consistent.
- **Do NOT implement the "Query this entity" action** in `GraphNodeDetail` for this story — that links to the Query Console and belongs in a later integration story. Render the button but keep it disabled or omit it for now.
- **Do NOT add a graph-specific filter UI** (type visibility toggle) in this story — the model graph has at most 20 types and does not need filtering. Type filtering is only needed for the relationship graph (Epic 5, FR32).
- **Do NOT implement highlighted resolution paths on the graph** — the "Why?" path highlighting is Phase 2. The UX spec mentions it as "future", not MVP.

### References

- [Source: epics.md#Story 2.3] — FR15, FR16: Model graph view, type nodes, interactive click for details
- [Source: epics.md#NFR2] — Model graph (20 types) renders in < 2 seconds
- [Source: architecture.md#Frontend Architecture] — Vue Flow + dagre mandated for both model and relationship graphs
- [Source: architecture.md#Structure Patterns] — `ModelGraphView.vue`, `GraphNodeDetail.vue` in `frontend/src/components/model/`
- [Source: architecture.md#Communication Patterns] — Pinia store as single source of truth; components read from stores
- [Source: ux-design-specification.md#Graph Node Colors] — 8-color deterministic palette, `hash(typeName) % 8`
- [Source: ux-design-specification.md#Layout Structure] — Inspector panel: 320px overlay, slides from right, overlay mode (no canvas resize)
- [Source: ux-design-specification.md#Overlay & Dialog Patterns] — Dismiss on Esc or click-outside
- [Source: ux-design-specification.md#Accessibility Strategy] — `prefers-reduced-motion`, focus rings, Tab-focusable graph nodes
- [Source: ux-design-specification.md#Component Strategy (ModelGraphView)] — Vue Flow + dagre, custom node components using TypeBadge colors, dark canvas
- [Source: ux-design-specification.md#Visual Design Foundation] — Dark canvas: gray-950 background; edge color: gray (#9ca3af); node label: JetBrains Mono

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

1. **TypeBadge uses char-sum hash, not bitwise**: `TypeBadge.vue` uses `sum += charCodeAt(i); sum % 8` (simple sum). Dev notes referenced a complex bitwise hash. Created `frontend/src/utils/typeColors.ts` with the same simple algorithm to ensure color consistency. Also exported `getTypeColorIndex` for Tailwind class-based usage.

2. **Edge extraction: metadata over userset rewrites**: Used `metadata.relations[*].directly_assignable_types` as advised in story notes. Avoids complex recursive userset parsing. Produces clean `user → document (relation)` edges.

3. **ModelGraphView test: `mockReturnValueOnce` + shared module-scope reactive ref**: To test `layoutDone = false` case without re-importing the mock, used a module-scope `ref(true)` for `mockLayoutDone` that can be toggled per test in `beforeEach`. This pattern is cleaner than `mockReturnValueOnce` with dynamic imports.

4. **jsdom normalizes hex → rgb**: Test `header.attributes('style')` returns `background-color: rgb(59, 130, 246)` not `#3b82f6`. Fixed assertion to use regex matching `rgb(59, 130, 246)`.

5. **`vi is not defined` in ModelTypeNode.test.ts**: `vi.mock` hoisting requires explicit `import { vi } from 'vitest'`. Added the import.

### Completion Notes List

- `frontend/src/utils/typeColors.ts` extracted from TypeBadge logic — `getTypeColor(name)` returns hex, `getTypeColorIndex(name)` returns 0–7 index, both consistent with TypeBadge colors
- `useModelGraph.ts`: null-safe, metadata-based edge extraction, dagre LR layout, `layoutDone` flag
- `ModelTypeNode.vue`: colored header, relation list with "+N more" clipping, `Handle` for source/target, `aria-label`, `tabindex="0"`
- `ModelGraphView.vue`: reads `modelStore.json` directly, `markRaw` on nodeTypes, dark CSS vars, `selectedNode` for inspector
- `GraphNodeDetail.vue`: slide-in panel, Esc listener via `onMounted`/`onUnmounted`, `prefers-reduced-motion` CSS
- `ModelViewer.vue`: Graph tab now renders `<ModelGraphView />` (was placeholder EmptyState)
- 150 frontend tests pass; 23 new tests added; zero regressions

### File List

- `frontend/package.json` — MODIFIED: added `@vue-flow/core`, `@vue-flow/background`, `@vue-flow/controls`, `@vue-flow/minimap`, `dagre` (prod); `@types/dagre` (dev)
- `frontend/src/main.ts` — MODIFIED: added Vue Flow CSS imports
- `frontend/src/utils/typeColors.ts` — NEW: `getTypeColor`, `getTypeColorIndex`, `NODE_TAILWIND_CLASSES`
- `frontend/src/composables/useModelGraph.ts` — NEW: model JSON → nodes/edges/dagre layout
- `frontend/src/composables/useModelGraph.test.ts` — NEW: 8 unit tests
- `frontend/src/components/model/ModelTypeNode.vue` — NEW: custom Vue Flow node component
- `frontend/src/components/model/ModelTypeNode.test.ts` — NEW: 5 component tests
- `frontend/src/components/model/ModelGraphView.vue` — NEW: VueFlow canvas orchestrator
- `frontend/src/components/model/ModelGraphView.test.ts` — NEW: 5 component tests
- `frontend/src/components/model/GraphNodeDetail.vue` — NEW: 320px inspector panel overlay
- `frontend/src/components/model/GraphNodeDetail.test.ts` — NEW: 5 component tests
- `frontend/src/views/ModelViewer.vue` — MODIFIED: Graph tab now renders ModelGraphView

### Change Log

- 2026-03-27: Story file created — status: ready-for-dev
- 2026-03-27: Implementation complete — status: review
- 2026-03-27: Code review complete — status: done
