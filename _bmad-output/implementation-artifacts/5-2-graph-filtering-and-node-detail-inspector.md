# Story 5.2: Graph Filtering and Node Detail Inspector

Status: review

## Story

As a user,
I want to filter the graph by type and inspect individual nodes,
so that I can focus on specific entity types and see all relationships for a given entity.

## Acceptance Criteria

1. **Given** the relationship graph is displayed **When** I look above the canvas **Then** I see a filter panel with TypeBadge checkboxes for each entity type present in the graph

2. **Given** the type filter panel is visible **When** I uncheck a type **Then** all nodes of that type and their connected edges are hidden from the graph

3. **Given** I have hidden some types via filters **When** I re-check a type **Then** those nodes and edges reappear in the graph

4. **Given** the relationship graph is displayed **When** I click on a node **Then** a GraphNodeDetail inspector panel (320px) slides in from the right as an overlay, showing: the node's type + ID, a list of all its relationships (relation name + connected entity as TypeBadge), and a "Query this entity" action button

5. **Given** the GraphNodeDetail panel is open **When** I click "Query this entity" **Then** the app navigates to the Query Console with the Check tab pre-filled with this entity in the appropriate field (User or Object based on the entity type)

6. **Given** the GraphNodeDetail panel is open **When** I click on another node in the graph **Then** the panel content updates to show the newly clicked node's details (only one panel open at a time)

7. **Given** the GraphNodeDetail panel is open **When** I press Esc or click outside the panel **Then** the panel closes

8. **Given** data has been refreshed (view re-mounted) **When** filters were previously active **Then** filter state resets (intentional — data may have changed)

## Tasks / Subtasks

- [x] Task 1: Extend the relationship graph Pinia store with filter + selection state (AC: #1, #2, #3, #6, #8)
  - [x]In `frontend/src/stores/relationshipGraph.ts` (created in Story 5.1), add:
    - `hiddenTypes: Ref<Set<string>>` — set of type names whose nodes are hidden
    - `selectedNodeId: Ref<string | null>` — the currently selected node's entity string (e.g. `"user:alice"`)
  - [x]Add action `toggleTypeVisibility(typeName: string)`: adds/removes the type from `hiddenTypes`
  - [x]Add action `setSelectedNode(entityId: string | null)`: sets `selectedNodeId`
  - [x]Add action `resetFilters()`: clears `hiddenTypes` to an empty Set
  - [x]Call `resetFilters()` from the existing `fetchTuples()` action so filter state resets on every data refresh (AC: #8)
  - [x]Add computed `visibleNodes`: filters store nodes removing any whose extracted type is in `hiddenTypes`
  - [x]Add computed `visibleEdges`: filters store edges removing any whose source or target node type is in `hiddenTypes`
  - [x]Add computed `allTypes`: `Array<string>` of all distinct entity types present in the full (unfiltered) nodes list

- [x] Task 2: Create `GraphTypeFilter.vue` filter panel component (AC: #1, #2, #3)
  - [x]Create `frontend/src/components/graph/GraphTypeFilter.vue`
  - [x]Props: none — reads directly from `useRelationshipGraphStore()`
  - [x]For each type in `store.allTypes`, render a row with:
    - A native `<input type="checkbox">` (checked when type is NOT in `hiddenTypes`)
    - A `<TypeBadge :typeName="type" />` label showing the type name
  - [x]On checkbox change: call `store.toggleTypeVisibility(type)`
  - [x]Layout: horizontal flex wrap, `gap-3`, `p-3`, `surface-card` background, `surface-border` bottom border
  - [x]Accessible: each checkbox has `id` and matching `<label for="...">`, `aria-label="Show/hide {type} nodes"`
  - [x]If `allTypes` is empty (no data loaded): render nothing (v-if guard)

- [x] Task 3: Create `GraphNodeDetail.vue` inspector panel component (AC: #4, #5, #6, #7)
  - [x]Create `frontend/src/components/graph/GraphNodeDetail.vue`
  - [x]Props: none — reads selected node from `useRelationshipGraphStore()` via `store.selectedNodeId`
  - [x]Derive `selectedNode` data: compute from `store.selectedNodeId` by finding the node in the store's full nodes list and building an `EntityNodeDetail` shape (see Dev Notes)
  - [x]Panel structure (320px / `w-80`):
    - Header: `<TypeBadge :typeName="entityType" />` + entity ID in JetBrains Mono, close (X) button
    - Section "Relationships": list of `{ relation: string, connectedEntity: string }` — one item per edge where this node is source OR target. Render as `<span class="text-secondary">relation</span>` + `<TypeBadge :typeName="connectedEntity" />`
    - Footer: "Query this entity" `<AppButton>` (primary variant, full-width)
  - [x]Show the panel when `store.selectedNodeId !== null` (use `v-show` + CSS transition, NOT `v-if`, so animation fires correctly — same pattern as Story 2.3's GraphNodeDetail)
  - [x]Slide-in CSS transition: `translateX(100%)` → `translateX(0)` on `.is-open` class (see CSS snippet in Dev Notes)
  - [x]Esc handler: `onMounted` → `window.addEventListener('keydown', handler)`, `onUnmounted` → remove listener. Guard: only close if `store.selectedNodeId !== null`
  - [x]Click-outside handler: `onMounted` → `window.addEventListener('mousedown', handler)`. Use `panelRef` to check if click target is inside; if outside, call `store.setSelectedNode(null)`
  - [x]"Query this entity" button click: determine entity side (user vs object), pre-fill query store, navigate to Query Console (see Dev Notes for logic)
  - [x]Accessible: `<aside role="complementary" aria-label="Entity details">`

- [x] Task 4: Wire filter panel and inspector into `RelationshipGraphCanvas.vue` (AC: #1, #2, #3, #4, #6)
  - [x]In `frontend/src/components/graph/RelationshipGraphCanvas.vue` (created in Story 5.1):
    - Import and render `<GraphTypeFilter />` above the VueFlow canvas
    - Import and render `<GraphNodeDetail />` as a sibling overlay (same relative container as the canvas)
    - Change VueFlow `:nodes` binding from `store.nodes` to `store.visibleNodes`
    - Change VueFlow `:edges` binding from `store.edges` to `store.visibleEdges`
    - Add `@node-click="onNodeClick"` handler: calls `store.setSelectedNode(event.node.id)` (node `id` is the entity string `"user:alice"`)
  - [x]The outer wrapper of `RelationshipGraphCanvas.vue` must be `position: relative` to anchor the `GraphNodeDetail` overlay

- [x] Task 5: Update `RelationshipGraph.vue` view (AC: #8)
  - [x]In `frontend/src/views/RelationshipGraph.vue`:
    - The view already calls `store.fetchTuples()` on mount (Story 5.1)
    - Verify that `fetchTuples()` calls `resetFilters()` — if the store extension from Task 1 handles this, no additional view changes needed
    - No other view-level changes required for this story

- [x] Task 6: Tests (AC: #1–8)
  - [x]Create `frontend/src/components/graph/GraphTypeFilter.test.ts` — min 5 tests:
    - Renders one checkbox+badge per type from store
    - Checked state reflects absence from `hiddenTypes`
    - Unchecking a type calls `toggleTypeVisibility`
    - Re-checking a type calls `toggleTypeVisibility` again (toggle back)
    - Renders nothing when `allTypes` is empty
  - [x]Create `frontend/src/components/graph/GraphNodeDetail.test.ts` — min 7 tests:
    - Panel is not visible when `selectedNodeId` is null
    - Panel is visible when `selectedNodeId` is set
    - Header shows correct TypeBadge type and entity ID
    - Relationships list renders all edges involving the selected node
    - Pressing Esc calls `store.setSelectedNode(null)`
    - Clicking outside the panel calls `store.setSelectedNode(null)`
    - "Query this entity" navigates to Query Console with correct pre-fill (user-side entity → User field; object-side entity → Object field)
  - [x]Extend `frontend/src/stores/relationshipGraph.test.ts` (created in Story 5.1) — add min 6 tests:
    - `hiddenTypes` is empty on store initialization
    - `toggleTypeVisibility` adds a type to `hiddenTypes`
    - `toggleTypeVisibility` removes a type already in `hiddenTypes`
    - `visibleNodes` excludes nodes whose type is in `hiddenTypes`
    - `visibleEdges` excludes edges where source or target type is in `hiddenTypes`
    - `resetFilters()` clears `hiddenTypes` (called by `fetchTuples` — AC#8)

## Dev Notes

### Dependency: Story 5.1 Must Be Complete

This story extends the work from Story 5.1 (Relationship Graph Canvas). The following files from Story 5.1 are modified or extended here:

- `frontend/src/stores/relationshipGraph.ts` — **EXTENDED**: add `hiddenTypes`, `selectedNodeId`, `visibleNodes`, `visibleEdges`, `allTypes`, `toggleTypeVisibility`, `setSelectedNode`, `resetFilters`
- `frontend/src/components/graph/RelationshipGraphCanvas.vue` — **MODIFIED**: wire filter panel, inspector panel, `visibleNodes`/`visibleEdges` bindings, `@node-click` handler
- `frontend/src/views/RelationshipGraph.vue` — **VERIFIED** (no changes needed if fetchTuples calls resetFilters)

Do NOT implement this story until Story 5.1 is done and its files are committed. Reference Story 5.1's file list in its Dev Agent Record for the exact paths.

### New Files to Create

```
frontend/src/
└── components/
    └── graph/
        ├── GraphTypeFilter.vue          # NEW: type filter panel above canvas
        ├── GraphTypeFilter.test.ts      # NEW: filter panel tests
        ├── GraphNodeDetail.vue          # NEW: 320px inspector panel overlay
        └── GraphNodeDetail.test.ts      # NEW: inspector panel tests
```

Note: The `components/graph/` directory was established by Story 5.1. A `GraphNodeDetail.vue` already exists in `components/model/` (for the model type graph from Story 2.3) — the component for this story lives in `components/graph/` and is a **different component** serving relationship graph entities (not model type nodes). Do not confuse the two.

### Store Extension: `relationshipGraph.ts`

The Story 5.1 store exposed `nodes: Ref<Node[]>`, `edges: Ref<Edge[]>`, `loading`, `error`, and `fetchTuples()`. Extend it as follows:

```typescript
// New state
const hiddenTypes = ref<Set<string>>(new Set())
const selectedNodeId = ref<string | null>(null)

// New computed
const allTypes = computed<string[]>(() => {
  const types = new Set<string>()
  for (const node of nodes.value) {
    // node.id is "user:alice" — extract type as everything before the first ':'
    const colonIdx = node.id.indexOf(':')
    if (colonIdx > 0) types.add(node.id.slice(0, colonIdx))
  }
  return Array.from(types).sort()
})

const visibleNodes = computed<Node[]>(() =>
  nodes.value.filter((node) => {
    const colonIdx = node.id.indexOf(':')
    const type = colonIdx > 0 ? node.id.slice(0, colonIdx) : node.id
    return !hiddenTypes.value.has(type)
  })
)

const visibleEdges = computed<Edge[]>(() => {
  const visibleIds = new Set(visibleNodes.value.map((n) => n.id))
  return edges.value.filter(
    (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)
  )
})

// New actions
function toggleTypeVisibility(typeName: string) {
  const updated = new Set(hiddenTypes.value)
  if (updated.has(typeName)) {
    updated.delete(typeName)
  } else {
    updated.add(typeName)
  }
  hiddenTypes.value = updated  // replace to trigger reactivity with Set
}

function setSelectedNode(entityId: string | null) {
  selectedNodeId.value = entityId
}

function resetFilters() {
  hiddenTypes.value = new Set()
  selectedNodeId.value = null
}
```

Call `resetFilters()` at the top of `fetchTuples()` action before the API call. This ensures AC#8: filter state resets on data refresh.

**Expose in return:** `hiddenTypes`, `selectedNodeId`, `allTypes`, `visibleNodes`, `visibleEdges`, `toggleTypeVisibility`, `setSelectedNode`, `resetFilters`.

### Entity Node Data Shape for GraphNodeDetail

The inspector panel needs to derive display data from `store.selectedNodeId` + the store's raw `nodes` and `edges`. Define a local computed inside `GraphNodeDetail.vue`:

```typescript
interface EntityNodeDetail {
  entityId: string        // e.g. "user:alice"
  typeName: string        // e.g. "user"
  entityLocalId: string   // e.g. "alice"
  relationships: Array<{
    relation: string
    direction: 'outgoing' | 'incoming'
    connectedEntity: string  // e.g. "document:roadmap"
  }>
}
```

Derive it in `GraphNodeDetail.vue`:

```typescript
const store = useRelationshipGraphStore()

const nodeDetail = computed<EntityNodeDetail | null>(() => {
  const id = store.selectedNodeId
  if (!id) return null

  const colonIdx = id.indexOf(':')
  const typeName = colonIdx > 0 ? id.slice(0, colonIdx) : id
  const entityLocalId = colonIdx > 0 ? id.slice(colonIdx + 1) : id

  // Collect all edges involving this node from the full (unfiltered) edges list
  const relationships = store.edges
    .filter((e) => e.source === id || e.target === id)
    .map((e) => ({
      relation: String(e.label ?? e.data?.relation ?? ''),
      direction: e.source === id ? 'outgoing' as const : 'incoming' as const,
      connectedEntity: e.source === id ? e.target : e.source,
    }))

  return { entityId: id, typeName, entityLocalId, relationships }
})
```

Use `store.edges` (full list), NOT `store.visibleEdges`, so that hidden-type relationships are still shown in the inspector.

### "Query this entity" Pre-fill Logic

When the user clicks "Query this entity", navigate to the Query Console with the Check tab pre-filled. The entity should go into the **User** field if it appears predominantly on the user side of tuples, and the **Object** field otherwise.

**Determination algorithm** (in `GraphNodeDetail.vue`):

```typescript
import { useRouter } from 'vue-router'
import { useQueryStore } from '@/stores/queries'

const router = useRouter()
const queryStore = useQueryStore()

function queryThisEntity() {
  const id = store.selectedNodeId
  if (!id) return

  // Count how many times this entity appears as source vs target in the full edges
  const asSource = store.edges.filter((e) => e.source === id).length
  const asTarget = store.edges.filter((e) => e.target === id).length

  // In tuple tuples: source = user side, target = object side (established in Story 5.1 graph build)
  // Tie-break: if equal or more source appearances → user field
  const isUserSide = asSource >= asTarget

  queryStore.activeTab = 'check'
  if (isUserSide) {
    queryStore.checkUser = id
  } else {
    queryStore.checkObject = id
  }

  store.setSelectedNode(null)  // close panel before navigation
  router.push('/query-console')
}
```

**Fallback heuristic for wildcard/userset entities:** If the entity ID contains `#` (e.g. `group:eng#member`) — it's a userset reference, treat as user-side. If the entity ID ends with `:*` — it's a wildcard, treat as user-side. These cases are uncommon but should not crash.

### Panel Slide-in CSS Transition

Apply the same pattern established in Story 2.3's `GraphNodeDetail.vue` (in `components/model/`):

```css
/* In frontend/src/components/graph/GraphNodeDetail.vue <style> */
.inspector-panel {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 320px;  /* w-80 */
  transform: translateX(100%);
  transition: transform 0.2s ease;
  z-index: 20;
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

Use `v-show` (not `v-if`) on the panel element and bind `:class="{ 'is-open': store.selectedNodeId !== null }"` so the transition fires on both open and close. This avoids the known bug from Story 2.3 (animation never fires when `v-if` and class are applied simultaneously).

### Keyboard and Click-Outside Handlers

Mirror the pattern from Story 2.3's `GraphNodeDetail.vue`. Both listeners are registered on `window` in `onMounted`/`onUnmounted`:

```typescript
import { onMounted, onUnmounted, ref } from 'vue'

const panelRef = ref<HTMLElement | null>(null)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && store.selectedNodeId !== null) {
    store.setSelectedNode(null)
  }
}

function onMousedown(e: MouseEvent) {
  if (
    store.selectedNodeId !== null &&
    panelRef.value &&
    !panelRef.value.contains(e.target as Node)
  ) {
    store.setSelectedNode(null)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('mousedown', onMousedown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mousedown', onMousedown)
})
```

Bind `ref="panelRef"` to the root element of the inspector panel.

**Known issue from Story 2.3:** The Esc listener must guard with a check that the panel is actually open (i.e. `store.selectedNodeId !== null`) to prevent it from firing when the panel is already closed. This guard is included above.

### Vue Flow Node Click Event

In `RelationshipGraphCanvas.vue`, the `@node-click` event from Vue Flow passes a `NodeMouseEvent` object:

```typescript
import type { NodeMouseEvent } from '@vue-flow/core'

function onNodeClick(event: NodeMouseEvent) {
  store.setSelectedNode(event.node.id)
}
```

The `event.node.id` is the entity string (e.g. `"user:alice"`) as established in Story 5.1 (nodes are created with `id = entityString`).

### VueFlow Reactive Nodes/Edges

When switching from `store.nodes` to `store.visibleNodes` in the VueFlow `:nodes` binding, Vue Flow must re-render the graph when the computed changes. Vue Flow v1+ handles this reactively — no additional `useVueFlow().setNodes()` calls are needed when passing nodes as a prop. Verify this is the pattern used in Story 5.1's `RelationshipGraphCanvas.vue` before wiring.

If Story 5.1 used `useVueFlow().setNodes()/setEdges()` imperatively (not prop binding), the filter computed approach needs adjustment: call `setNodes(store.visibleNodes)` / `setEdges(store.visibleEdges)` reactively via `watch`.

### TypeBadge Usage in GraphTypeFilter

The filter panel uses `<TypeBadge>` for each type label. `TypeBadge` exists at `frontend/src/components/common/TypeBadge.vue` and accepts a single prop `typeName: string`. It renders the type name styled with its deterministic color from the 8-color palette — consistent with all other TypeBadge usage in the app.

### Design Tokens Reference

Use these Tailwind tokens (defined in `frontend/src/style.css`):

| Token | Usage |
|---|---|
| `surface-card` (gray-900) | Filter panel background, inspector panel background |
| `surface-elevated` (gray-800) | Checkbox hover state |
| `surface-border` (gray-700) | Filter panel bottom border, inspector panel left border |
| `text-primary` (gray-100) | Entity ID, relationship labels |
| `text-secondary` (gray-400) | Relation names in the relationships list |
| `text-emphasis` (white) | Section headings in inspector panel |
| `info` (#3b82f6) | Focus rings (`ring-2 ring-info`) on all interactive elements |

### Filter Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Show: [✓ user] [✓ document] [✓ group] [✓ organization] ... │  ← GraphTypeFilter
├─────────────────────────────────────────────────────────────┤
│                                                  ┌─────────┐ │
│   Vue Flow Canvas (full width)                   │Inspector│ │
│   (visibleNodes, visibleEdges)                   │ Panel   │ │
│                                                  │ (320px) │ │
│                                                  │ overlay │ │
└─────────────────────────────────────────────────────────────┘
```

The outer container of `RelationshipGraphCanvas.vue` should use `class="flex flex-col h-full"`: filter panel on top (fixed height), canvas below (`flex-1`). The canvas wrapper uses `position: relative` to anchor the overlay inspector.

### Relationship Display in Inspector

Show ALL edges (from the unfiltered `store.edges`) involving the selected node. Group or sort by direction (outgoing first, then incoming) for readability. Render each as:

```
[outgoing] viewer → document:roadmap
[incoming] member ← group:engineering
```

Or a flatter format without direction labels (acceptable for MVP):

```
viewer      [document:roadmap badge]
member      [group:engineering badge]
```

The flatter format matches the Story 2.3 `GraphNodeDetail` pattern and is preferred for visual consistency.

### "Query this entity" — queryStore Fields

From `frontend/src/stores/queries.ts` (Story 4.x), the relevant fields to pre-fill:
- `queryStore.activeTab` — set to `'check'`
- `queryStore.checkUser` — set if entity is user-side
- `queryStore.checkObject` — set if entity is object-side

`QueryConsole.vue` reads `queryStore.activeTab` to select the active tab on mount — this is already wired from Story 4.2. Setting `checkUser`/`checkObject` before navigation means the Check tab's input fields are populated when the view renders.

### Pinia Reactive Set Pattern

JavaScript `Set` mutations (`.add()`, `.delete()`) do NOT trigger Vue 3 reactivity because the reference doesn't change. Always replace the Set with a new one when mutating:

```typescript
// CORRECT — triggers reactivity
const updated = new Set(hiddenTypes.value)
updated.add(typeName)
hiddenTypes.value = updated  // reference change triggers reactivity

// WRONG — Vue does not detect this
hiddenTypes.value.add(typeName)  // no reactivity!
```

This is shown in the `toggleTypeVisibility` snippet above.

### Test Patterns

**Mocking the relationship graph store in component tests:**

`@pinia/testing` is NOT installed in this project. Use `vi.mock` to mock stores:

```typescript
// At top of file (hoisted by Vitest)
vi.mock('@/stores/relationshipGraph', () => ({
  useRelationshipGraphStore: vi.fn(),
}))

import { useRelationshipGraphStore } from '@/stores/relationshipGraph'

// In beforeEach or per-test:
vi.mocked(useRelationshipGraphStore).mockReturnValue({
  selectedNodeId: 'user:alice',
  edges: [
    { id: 'edge-1', source: 'user:alice', target: 'document:roadmap', label: 'viewer' },
  ],
  setSelectedNode: vi.fn(),
} as unknown as ReturnType<typeof useRelationshipGraphStore>)
```

Note: computed properties (`allTypes`, `visibleNodes`, `visibleEdges`) are part of the mocked return value — set them explicitly. Real Pinia store logic does NOT run when using `vi.mock`.

**Testing Esc handler:**

```typescript
it('closes panel on Esc key', async () => {
  store.selectedNodeId = 'user:alice'
  await wrapper.vm.$nextTick()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  await wrapper.vm.$nextTick()
  expect(store.setSelectedNode).toHaveBeenCalledWith(null)
})
```

**Testing click-outside:**

```typescript
it('closes panel on click outside', async () => {
  store.selectedNodeId = 'user:alice'
  await wrapper.vm.$nextTick()
  // Simulate mousedown outside the panel element
  document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  await wrapper.vm.$nextTick()
  expect(store.setSelectedNode).toHaveBeenCalledWith(null)
})
```

### What NOT to Do

- **Do NOT create a separate Pinia store for this story** — extend the existing `relationshipGraph.ts` store from Story 5.1. Filter state and selected node belong in the same store as the graph data.
- **Do NOT persist filter state** across view mounts — AC#8 explicitly states filter resets are intentional. Do not use `localStorage` or any persistence for `hiddenTypes`.
- **Do NOT add a backend endpoint** for this story — all filtering is purely client-side, computed from the already-fetched tuples.
- **Do NOT implement path highlighting on the graph** when "Query this entity" is clicked — that is a Phase 2 feature deferred in Story 2.3's review. Navigate and pre-fill only.
- **Do NOT reuse `components/model/GraphNodeDetail.vue`** from Story 2.3 — that component is specific to model type nodes (`ModelNodeData` shape) and has no "Query this entity" action. Create a new component in `components/graph/`.
- **Do NOT use `v-if` for the inspector panel's open/closed state** — use `v-show` + CSS class transition, mirroring the Story 2.3 patch that fixed the animation-never-fires bug.
- **Do NOT filter `store.edges` for the inspector panel's relationship list** — use the full `store.edges`, not `store.visibleEdges`. The user should see all relationships even when some types are hidden in the graph.

### Project Structure Notes

```
frontend/src/
├── components/
│   └── graph/
│       ├── RelationshipGraphCanvas.vue      # MODIFIED (Story 5.1) — add filter, inspector, visibleNodes/Edges, node-click
│       ├── RelationshipGraphCanvas.test.ts  # MODIFIED (Story 5.1) — add tests for filter/inspector integration
│       ├── GraphTypeFilter.vue              # NEW: type filter checkboxes panel
│       ├── GraphTypeFilter.test.ts          # NEW: filter panel unit tests
│       ├── GraphNodeDetail.vue              # NEW: 320px inspector panel for entity nodes
│       ├── GraphNodeDetail.test.ts          # NEW: inspector panel unit tests
│       └── [entity node component from 5.1] # UNCHANGED
├── stores/
│   ├── relationshipGraph.ts                 # MODIFIED: hiddenTypes, selectedNodeId, visibleNodes, visibleEdges, allTypes, actions
│   └── relationshipGraph.test.ts            # MODIFIED: new filter/selection tests
└── views/
    └── RelationshipGraph.vue               # VERIFIED (likely unchanged if 5.1 wired fetchTuples correctly)
```

Possible new file if `components/common/TypeBadge.vue` needs an `onClick` prop for future use (navigation from inspector to graph) — defer this, the current `TypeBadge` is display-only and sufficient for this story.

### References

- [Source: epics.md#Story 5.2] — FR32: filter graph by type; FR33: click node to see all relationships; UX-DR10: GraphNodeDetail 320px overlay
- [Source: epics.md#FR32] — "User can filter the graph to show/hide specific types"
- [Source: epics.md#FR33] — "User can click on a node to see all its relationships"
- [Source: architecture.md#Structure Patterns] — `RelationshipGraphCanvas.vue`, `GraphNodeDetail.vue` in `frontend/src/components/graph/`
- [Source: architecture.md#Frontend Architecture] — Pinia setup syntax, computed for derived state, no caching
- [Source: ux-design-specification.md#Layout Structure] — Inspector panel: 320px overlay, slides from right, overlay mode (no canvas resize)
- [Source: ux-design-specification.md#Overlay & Dialog Patterns] — Dismiss on Esc or click-outside
- [Source: ux-design-specification.md#Accessibility Strategy] — `prefers-reduced-motion`, focus rings, keyboard navigation
- [Source: ux-design-specification.md#Graph Node Colors] — 8-color deterministic palette, shared with TypeBadge
- [Source: story 2.3 Dev Agent Record — Debug Log #3] — v-if + class applied simultaneously causes animation to never fire; fix: use v-show + nextTick
- [Source: story 2.3 Dev Agent Record — Debug Log #4] — jsdom normalizes hex → rgb in style assertions; use regex or `.toContain()` in tests
- [Source: story 2.3 Dev Agent Record — Review Findings] — Esc listener must guard with `props.node` (here: `store.selectedNodeId`) check to avoid firing when panel is closed; click-outside uses `mousedown` on `window`
- [Source: frontend/src/utils/typeColors.ts] — `getTypeColor(typeName)` and `getTypeColorIndex(typeName)` are the shared color utilities; `TypeBadge.vue` uses the same char-sum hash algorithm
- [Source: frontend/src/stores/queries.ts] — `activeTab`, `checkUser`, `checkObject` are the fields to pre-fill for "Query this entity" navigation

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `relationshipGraph.ts` store (skipped in 5.1) as central coordinator for graph state + filter/selection
- Used `vi.mock` pattern (no `@pinia/testing` — not installed) consistent with other project tests
- `GraphNodeDetail` in `components/graph/` is a distinct component from `components/model/GraphNodeDetail.vue`
- 295/295 tests pass, no regressions

### File List

- `frontend/src/stores/relationshipGraph.ts` (new)
- `frontend/src/stores/relationshipGraph.test.ts` (new)
- `frontend/src/components/graph/GraphTypeFilter.vue` (new)
- `frontend/src/components/graph/GraphTypeFilter.test.ts` (new)
- `frontend/src/components/graph/GraphNodeDetail.vue` (new)
- `frontend/src/components/graph/GraphNodeDetail.test.ts` (new)
- `frontend/src/components/graph/RelationshipGraphCanvas.vue` (modified)
- `frontend/src/components/graph/RelationshipGraphCanvas.test.ts` (modified)
- `frontend/src/views/RelationshipGraph.vue` (modified)
- `frontend/src/views/RelationshipGraph.test.ts` (modified)
