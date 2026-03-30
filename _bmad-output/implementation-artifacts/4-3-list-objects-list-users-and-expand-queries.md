# Story 4.3: List Objects, List Users, and Expand Queries

Status: done

## Story

As a user,
I want to run List Objects, List Users, and Expand queries,
so that I can discover which objects a user can access, which users have access to an object, and how relations expand.

## Acceptance Criteria

1. **Given** I am on the Query Console **When** I click the "List Objects" tab **Then** I see input fields for User (monospace), Relation (AppSelect), and Type (AppSelect), with a "List Objects" button

2. **Given** I fill in the List Objects form and submit **When** the query executes **Then** I see a list of matching objects rendered with TypeBadge, or an empty result message if none match

3. **Given** I am on the Query Console **When** I click the "List Users" tab **Then** I see input fields for Object Type (AppSelect), Object ID (monospace), and Relation (AppSelect), with a "List Users" button

4. **Given** I fill in the List Users form and submit **When** the query executes **Then** I see a list of matching users rendered with TypeBadge, or an empty result message if none match

5. **Given** I am on the Query Console **When** I click the "Expand" tab **Then** I see input fields for Relation (AppSelect) and Object (monospace), with an "Expand" button

6. **Given** I fill in the Expand form and submit **When** the query executes **Then** I see the relation expansion rendered as a collapsible tree view with TypeBadge nodes that I can expand/collapse to explore the hierarchy

7. **Given** any query tab **When** I switch between tabs **Then** each tab preserves its own input values independently

## Tasks / Subtasks

- [x] Task 1: Create `ListObjectsQuery.vue` component (AC: #1, #2, #7)
  - [x] Create `frontend/src/components/query/ListObjectsQuery.vue`
  - [x] Three input fields in horizontal row:
    - User: `AppInput` monospace, placeholder `user:alice`
    - Relation: `AppSelect` populated from model store relations
    - Type: `AppSelect` populated from model store type names
  - [x] "List Objects" button (`AppButton` primary, loading state while query runs)
  - [x] Submit via button click or Enter key in the User input
  - [x] On submit: call `queryStore.listObjects(storeId)`
  - [x] Result area below inputs: list of `TypeBadge` components for each returned object string
  - [x] Empty result: show "No objects found" message
  - [x] Loading: button shows spinner + "Listing..."
  - [x] Inputs bound to `queryStore.listObjectsInputs` for persistence

- [x] Task 2: Create `ListUsersQuery.vue` component (AC: #3, #4, #7)
  - [x] Create `frontend/src/components/query/ListUsersQuery.vue`
  - [x] Three input fields in horizontal row
  - [x] "List Users" button with loading state
  - [x] Submit via button click or Enter key in the Object ID input
  - [x] On submit: call `queryStore.listUsers(storeId)`
  - [x] Result area: TypeBadge list, empty state, loading state
  - [x] Inputs bound to `queryStore.listUsersInputs`

- [x] Task 3: Create `ExpandQuery.vue` component (AC: #5, #6, #7)
  - [x] Create `frontend/src/components/query/ExpandQuery.vue`
  - [x] Two input fields, "Expand" button with loading state
  - [x] On submit: call `queryStore.expand(storeId)`
  - [x] Result area: ExpandTreeNode tree, loading state
  - [x] Inputs bound to `queryStore.expandInputs`

- [x] Task 4: Create `ExpandTreeNode.vue` recursive tree component (AC: #6)
  - [x] Create `frontend/src/components/query/ExpandTreeNode.vue`
  - [x] Props: `node: UsersetTree`, `defaultExpanded?: boolean`
  - [x] Render node name with `TypeBadge`
  - [x] Collapsible children for union/intersection/difference
  - [x] Leaf nodes show assigned users/computed usersets
  - [x] ChevronRight/ChevronDown toggle, `aria-expanded`, `role="treeitem"`

- [x] Task 5: Create `queries` Pinia store (AC: #1-7)
  - [x] Extended existing `frontend/src/stores/queries.ts` (created by Story 4.2)
  - [x] Added listObjectsInputs, listObjectsResult, listObjectsLoading
  - [x] Added listUsersInputs, listUsersResult, listUsersLoading
  - [x] Added expandInputs (expandResult/expandLoading reused from 4.2)
  - [x] Actions: listObjects, listUsers, expand
  - [x] reset() function clears all inputs and results

- [x] Task 6: Wire new tabs into QueryConsole view (AC: #1, #3, #5, #7)
  - [x] Modified `frontend/src/views/QueryConsole.vue`
  - [x] Replaced placeholder EmptyStates with ListObjectsQuery, ListUsersQuery, ExpandQuery
  - [x] Existing EmptyState guards (no store / no model) preserved

- [x] Task 7: Extract model types and relations helper (AC: #1, #3, #5)
  - [x] Created `frontend/src/composables/useModelOptions.ts`
  - [x] Provides `typeOptions` and `relationOptions` computed arrays
  - [x] Refactored CheckQuery.vue to use it (removed inline duplication)
  - [x] Used in all three new query components

- [x] Task 8: Tests (AC: #1-7)
  - [x] Created `frontend/src/components/query/ListObjectsQuery.test.ts`
  - [x] Created `frontend/src/components/query/ListUsersQuery.test.ts`
  - [x] Created `frontend/src/components/query/ExpandQuery.test.ts`
  - [x] Created `frontend/src/components/query/ExpandTreeNode.test.ts`
  - [x] Extended `frontend/src/stores/queries.test.ts` with listObjects, listUsers, expand, reset tests
  - [x] Modified `frontend/src/views/QueryConsole.test.ts` with stubs for new components
  - [x] Created `frontend/src/composables/useModelOptions.test.ts`

### Review Findings

- [x] [Review][Patch] `listObjects`/`listUsers` silently swallow errors — no `error.value` set, no user feedback on failure [stores/queries.ts:125,143]
- [x] [Review][Patch] `resetCheck()` called on `storeId` change instead of `reset()` — stale List Objects/List Users/Expand results visible after switching stores [views/QueryConsole.vue:33]
- [x] [Review][Patch] `flex-2` is not a valid Tailwind utility — Object input in ExpandQuery won't grow as intended [components/query/ExpandQuery.vue:31]
- [x] [Review][Patch] Unknown expand node type renders name only — spec requires JSON fallback for unrecognized node structures [components/query/ExpandTreeNode.vue]
- [x] [Review][Patch] `tupleToUserset.computed` array not rendered — spec requires showing computed references alongside tupleset [components/query/ExpandTreeNode.vue:74-78]
- [x] [Review][Patch] `ExpandTreeNode` difference children: `base`/`subtract` could be null at runtime — unguarded access causes crash [components/query/ExpandTreeNode.vue:29]
- [x] [Review][Defer] Duplicate `CheckResponse` type in frontend store vs backend types — expected in monorepo without shared contract layer [stores/queries.ts, types/openfga.ts] — deferred, pre-existing
- [x] [Review][Defer] `ExpandTreeNode` keys children by array index — stale `expanded` state possible on re-renders [components/query/ExpandTreeNode.vue:84] — deferred, pre-existing
- [x] [Review][Defer] `useModelOptions` uses inline `as` casts — bypasses model store type; risk of silent divergence [composables/useModelOptions.ts:8,18] — deferred, pre-existing
- [x] [Review][Defer] `CheckQuery.vue` `@keydown.enter` on outer div — double-submit risk from button Enter events [components/query/CheckQuery.vue:21] — deferred, pre-existing (story 4.2)
- [x] [Review][Defer] No `userFilters` in `listUsers` — backend hardcodes `[{ type: 'user' }]`, silently limits results [stores/queries.ts:136] — deferred, enhancement beyond spec scope
- [x] [Review][Defer] Backend `check`: `allowed` undefined if OpenFGA omits field [services/query-service.ts] — deferred, story 4.1
- [x] [Review][Defer] Backend `expand`: crash if tree has no `root` field [services/query-service.ts] — deferred, story 4.1
- [x] [Review][Defer] Backend routes: Express 4 async errors need explicit try/catch in route handlers [routes/queries.ts] — deferred, story 4.1
- [x] [Review][Defer] `isLeaf` false for `leaf: {}` — empty leaf object renders nothing [components/query/ExpandTreeNode.vue:38-40] — deferred, edge case
- [x] [Review][Defer] Shared `expandResult` between `runExpand` (WhyButton) and `expand` tab — WhyButton overwrites Expand tab result [stores/queries.ts:48] — deferred, intentional per dev notes
- [x] [Review][Defer] `QueryConsole.vue` shows tabs when model has no `type_definitions` — all selects empty, user cannot submit [views/QueryConsole.vue:51] — deferred, edge case

## Dev Notes

### Previous Story Intelligence

**From Story 4.2 (Check Query — dependency, may be in-progress):**
- Story 4.2 replaces the `QueryConsole.vue` placeholder with AppTabs and the Check tab
- It likely creates the `queries` Pinia store with check-related state
- It creates `CheckQuery.vue` in `frontend/src/components/query/`
- This story EXTENDS what 4.2 builds — adds 3 more tabs and 3 more query components
- If 4.2 is not yet implemented when you start: create the full `queries.ts` store with ALL query states and build `QueryConsole.vue` with all 4 tabs (Check tab can render a placeholder until 4.2 fills it)

**From Story 4.1 (Backend Query Endpoints — dependency):**
- `POST /api/stores/:storeId/query/list-objects` — body: `{ user, relation, type }` — response: `{ objects: ["document:roadmap", ...] }`
- `POST /api/stores/:storeId/query/list-users` — body: `{ object: { type, id }, relation }` — response: `{ users: ["user:alice", ...] }` (already flattened by backend)
- `POST /api/stores/:storeId/query/expand` — body: `{ relation, object }` — response: `{ tree: { root: { name, union?: { nodes: [...] }, leaf?: { users: [...] } } } }`
- All endpoints return error envelope `{ error: string }` on failure, handled by `useApi`

**From Story 3.3 (Add and Delete Tuples):**
- Relation extraction from model: `modelStore.json.type_definitions[].relations` keys → `Set<string>` → sorted `{ value, label }[]` array for AppSelect
- This exact pattern is already used in `AddTupleForm.vue` — extract to a shared utility to avoid duplication
- AppInput `blur` event forwarding was fixed in 3.3

**From Story 2.3 (Model Graph View):**
- `modelStore.json` shape: `{ type_definitions: [{ type: string, relations?: Record<string, Userset>, metadata?: {...} }] }`
- Type names come from `type_definitions[].type`

**From Stories 1.3, 1.4 (Design System, App Shell):**
- `AppTabs`: Headless UI TabGroup, `tabs` prop is `{ key: string, label: string }[]`, `v-model` for selected tab key, slot per tab key
- `AppInput`: has `monospace` prop (renders JetBrains Mono), `error` prop, `blur` emit
- `AppSelect`: accepts `options: { value: string, label: string }[]`, `v-model` for selected value, `placeholder` string
- `AppButton`: `variant="primary"`, `loading` prop shows spinner, disabled during loading
- `TypeBadge`: accepts `typeName: string` prop, renders colored pill with deterministic color from 8-color palette
- `useApi`: `api.post<T>(path, body)` returns typed data, auto-shows error toast on failure
- `useToast`: `toast.show({ type: 'success', message })` — not needed directly (useApi handles errors)

### Architecture Compliance

- **Query components** in `frontend/src/components/query/`: `ListObjectsQuery.vue`, `ListUsersQuery.vue`, `ExpandQuery.vue`, `ExpandTreeNode.vue`. [Source: architecture.md#Structure Patterns]
- **Pinia store** `frontend/src/stores/queries.ts`: single store for all query types. Setup syntax with loading/error/data refs. [Source: architecture.md#Communication Patterns]
- **All API calls through `useApi`**: query store actions use `api.post()`. Components never call fetch directly. [Source: architecture.md#Enforcement Guidelines]
- **Components read from store, never fetch directly**: query components bind to `queryStore` refs. [Source: architecture.md#Component Boundaries]
- **Data freshness**: query results are not cached — each submit triggers a fresh API call. Inputs persist in store. [Source: ux-design-specification.md#Data Freshness]
- **Tab interface (FR27)**: AppTabs with 4 tabs — Check, List Objects, List Users, Expand. [Source: epics.md#Story 4.2, 4.3]
- **TypeBadge for results**: all returned objects/users rendered with TypeBadge. [Source: ux-design-specification.md#Component Strategy]
- **Horizontal form layout**: 2-3 related fields in a row per UX spec. [Source: ux-design-specification.md#Form Patterns]
- **Button labels are verbs**: "List Objects", "List Users", "Expand". [Source: ux-design-specification.md#Button Hierarchy]

### Critical Technical Details

**TypeBadge usage for query results:**
The backend returns objects as `"document:roadmap"` and users as `"user:alice"`. To render with TypeBadge:
```typescript
// Parse "document:roadmap" → typeName = "document"
function extractTypeName(identifier: string): string {
  return identifier.split(':')[0] || identifier
}
// Usage: <TypeBadge :type-name="extractTypeName(obj)" /> <span class="font-mono">{{ obj }}</span>
```
Show the full identifier text alongside the TypeBadge, not just the type. The TypeBadge provides the color pill; the full `type:id` is displayed in monospace.

**Model type/relation extraction (shared utility):**
```typescript
// Reusable computed — extract from modelStore.json
import { useModelStore } from '@/stores/model'
import { computed } from 'vue'

export function useModelOptions() {
  const modelStore = useModelStore()

  const typeOptions = computed(() => {
    const json = modelStore.json as any
    if (!json?.type_definitions) return []
    return json.type_definitions
      .map((td: any) => td.type as string)
      .filter(Boolean)
      .sort()
      .map((t: string) => ({ value: t, label: t }))
  })

  const relationOptions = computed(() => {
    const json = modelStore.json as any
    if (!json?.type_definitions) return []
    const relations = new Set<string>()
    for (const td of json.type_definitions) {
      if (td.relations) {
        Object.keys(td.relations).forEach(r => relations.add(r))
      }
    }
    return Array.from(relations).sort().map(r => ({ value: r, label: r }))
  })

  return { typeOptions, relationOptions }
}
```
Place in `frontend/src/composables/useModelOptions.ts` unless Story 4.2 already created something equivalent.

**OpenFGA Expand tree structure:**
The expand response has a recursive structure:
```typescript
interface ExpandTreeNode {
  name: string  // e.g. "document:roadmap#viewer"
  // One of these will be present:
  union?: { nodes: ExpandTreeNode[] }
  intersection?: { nodes: ExpandTreeNode[] }
  difference?: { base: ExpandTreeNode, subtract: ExpandTreeNode }
  leaf?: {
    users?: { users: string[] }  // direct user assignments
    computed?: { userset: string }  // computed relations
    tupleToUserset?: { tupleset: string, computed: Array<{ userset: string }> }
  }
}
```
The `ExpandTreeNode.vue` component must handle all node types:
- `union` / `intersection`: render label ("union" / "intersection") + iterate `nodes` children recursively
- `difference`: render "base" and "subtract" branches
- `leaf.users`: render each user with TypeBadge (terminal node)
- `leaf.computed`: show the computed userset reference
- `leaf.tupleToUserset`: show the tupleset + computed references
- Unknown structures: render as JSON fallback (graceful degradation)

**Expand tree collapsible pattern:**
```vue
<!-- ExpandTreeNode.vue skeleton -->
<template>
  <div :class="['pl-4']" role="treeitem">
    <div class="flex items-center gap-2">
      <button
        v-if="hasChildren"
        @click="expanded = !expanded"
        :aria-expanded="expanded"
        class="p-0.5 hover:bg-surface-elevated rounded"
      >
        <ChevronRight v-if="!expanded" class="size-4" />
        <ChevronDown v-else class="size-4" />
      </button>
      <TypeBadge :type-name="extractTypeName(node.name)" />
      <span class="font-mono text-sm text-text-primary">{{ node.name }}</span>
      <span v-if="nodeType" class="text-xs text-text-secondary">({{ nodeType }})</span>
    </div>
    <div v-if="expanded && hasChildren" role="group">
      <ExpandTreeNode v-for="(child, i) in children" :key="i" :node="child" />
    </div>
  </div>
</template>
```

**Query store input persistence pattern:**
Each tab's inputs are stored in the Pinia store as reactive refs. Components bind with `v-model` to these refs. When switching tabs, the component unmounts but the store retains the values. When the user returns, the component re-mounts and reads from the store.

**List Users special handling:**
The frontend sends `{ object: { type, id }, relation }` to the backend. The Object Type and Object ID are separate fields in the UI, combined into the request body:
```typescript
const body = {
  object: { type: listUsersInputs.value.objectType, id: listUsersInputs.value.objectId },
  relation: listUsersInputs.value.relation,
}
```

### File Structure After This Story

```
frontend/src/
├── composables/
│   └── useModelOptions.ts              # NEW: shared type/relation extraction (if not created by 4.2)
├── stores/
│   └── queries.ts                      # NEW or MODIFIED: listObjects, listUsers, expand state + actions
├── components/
│   └── query/
│       ├── CheckQuery.vue              # EXISTS (from Story 4.2)
│       ├── ListObjectsQuery.vue        # NEW: List Objects form + results
│       ├── ListObjectsQuery.test.ts    # NEW
│       ├── ListUsersQuery.vue          # NEW: List Users form + results
│       ├── ListUsersQuery.test.ts      # NEW
│       ├── ExpandQuery.vue             # NEW: Expand form + tree result
│       ├── ExpandQuery.test.ts         # NEW
│       ├── ExpandTreeNode.vue          # NEW: recursive collapsible tree node
│       └── ExpandTreeNode.test.ts      # NEW
└── views/
    ├── QueryConsole.vue                # MODIFIED: add 3 tabs + 3 components
    └── QueryConsole.test.ts            # NEW or MODIFIED: tab switching tests
```

### What NOT to Do

- **Do NOT rewrite QueryConsole.vue from scratch** — Story 4.2 builds it with AppTabs + Check tab. This story EXTENDS it with 3 more tabs. If 4.2 is not done, create QueryConsole with all 4 tabs but only implement the 3 non-Check tabs.
- **Do NOT create backend endpoints** — Story 4.1 handles all backend query endpoints. This story is frontend-only.
- **Do NOT create CheckQuery.vue** — that is Story 4.2's responsibility. Only create ListObjectsQuery, ListUsersQuery, and ExpandQuery.
- **Do NOT install new npm packages** — all dependencies (Headless UI, lucide-vue-next, etc.) are already available.
- **Do NOT cache query results** — each submit triggers a fresh API call. Only inputs persist.
- **Do NOT use a modal or dialog for query forms** — all forms are inline within their tab panel.
- **Do NOT duplicate the relation extraction logic from AddTupleForm** — extract to a shared utility (`useModelOptions.ts`).
- **Do NOT use `ConfirmDialog` for queries** — queries are non-destructive read operations.
- **Do NOT implement the "Why?" button or ResolutionPath** — those belong to Story 4.2 (Check query).
- **Do NOT unit-test Headless UI TabGroup internals** — test your business logic: does submitting call the store? do results render TypeBadge?
- **Do NOT render raw JSON as primary output** — always use TypeBadge + formatted display. JSON fallback only for unknown expand tree node types.

### References

- [Source: epics.md#Story 4.3] — FR24 (List Objects), FR25 (List Users), FR26 (Expand tree), FR27 (tabbed interface)
- [Source: prd.md#FR24-FR27] — Permission Queries functional requirements
- [Source: prd.md#NFR3] — Query response < 1 second end-to-end
- [Source: architecture.md#Structure Patterns] — Query components in `frontend/src/components/query/`
- [Source: architecture.md#Communication Patterns] — Pinia store pattern with loading/error/data
- [Source: architecture.md#Enforcement Guidelines] — All API calls through useApi, Pinia as single source of truth
- [Source: ux-design-specification.md#Form Patterns] — Horizontal form rows, monospace for identifiers, AppSelect for relations/types
- [Source: ux-design-specification.md#Feedback Patterns] — Inline query results, loading spinner in button
- [Source: ux-design-specification.md#Button Hierarchy] — Primary button per section, verb labels
- [Source: ux-design-specification.md#Component Strategy] — ListObjectsQuery, ListUsersQuery, ExpandQuery in Phase 3
- [Source: implementation-artifacts/4-1-backend-query-endpoints.md] — Backend API contracts, response shapes
- [Source: implementation-artifacts/3-3-add-and-delete-tuples.md] — Relation extraction pattern, AppInput blur fix
- [Source: implementation-artifacts/2-3-model-graph-view-with-interactive-nodes.md] — Model JSON structure, type_definitions shape

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `useModelOptions.ts` composable and refactored CheckQuery to use it, eliminating inline duplication
- Extended `queries.ts` store with listObjectsInputs/listUsersInputs/expandInputs + listObjects/listUsers/expand/reset actions
- `expandInputs` and new `expand()` action share `expandResult`/`expandLoading` with WhyButton's `runExpand` — same tab area, no conflict
- `ExpandTreeNode.vue` handles union/intersection/difference recursion, leaf users, leaf computed, and tupleToUserset
- 250 tests passing, 0 regressions

### File List

- `frontend/src/composables/useModelOptions.ts` (NEW)
- `frontend/src/composables/useModelOptions.test.ts` (NEW)
- `frontend/src/stores/queries.ts` (MODIFIED — extended with list-objects, list-users, expand state + actions)
- `frontend/src/stores/queries.test.ts` (MODIFIED — added 6 new tests)
- `frontend/src/components/query/ListObjectsQuery.vue` (NEW)
- `frontend/src/components/query/ListObjectsQuery.test.ts` (NEW)
- `frontend/src/components/query/ListUsersQuery.vue` (NEW)
- `frontend/src/components/query/ListUsersQuery.test.ts` (NEW)
- `frontend/src/components/query/ExpandQuery.vue` (NEW)
- `frontend/src/components/query/ExpandQuery.test.ts` (NEW)
- `frontend/src/components/query/ExpandTreeNode.vue` (NEW)
- `frontend/src/components/query/ExpandTreeNode.test.ts` (NEW)
- `frontend/src/components/query/CheckQuery.vue` (MODIFIED — refactored to use useModelOptions)
- `frontend/src/views/QueryConsole.vue` (MODIFIED — wired 3 new tabs with real components)
- `frontend/src/views/QueryConsole.test.ts` (MODIFIED — added stubs for new components)

## Change Log

- 2026-03-27: Story file created — status: ready-for-dev
- 2026-03-27: Implementation complete — status: review
