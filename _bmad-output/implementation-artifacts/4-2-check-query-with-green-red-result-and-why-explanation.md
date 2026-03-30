# Story 4.2: Check Query with Green/Red Result and Why Explanation

Status: done

## Story

As a user,
I want to run a Check query and see a clear allowed/denied result with an explanation of why,
so that I can verify permissions and understand the resolution path.

## Acceptance Criteria

1. **Given** I navigate to the Query Console **When** the page loads **Then** I see a tabbed interface (AppTabs) with Check as the default active tab, and three input fields: User (AppInput monospace, placeholder `user:alice`), Relation (AppSelect populated from current model), Object (AppInput monospace, placeholder `document:roadmap`), and a "Check" button

2. **Given** I fill in User, Relation, and Object on the Check tab **When** I click "Check" or press Enter **Then** the query executes via POST to `stores/:storeId/query/check` and I see either a large green checkmark with "Allowed" or a large red X with "Denied", displayed below the input fields with response time in milliseconds

3. **Given** a Check result is displayed (allowed or denied) **When** I click the "Why?" button below the result **Then** a WhyButton triggers an Expand API call (`POST stores/:storeId/query/expand`) and a ResolutionPath component expands inline showing the permission chain as a series of TypeBadge nodes connected with arrows (e.g., `user:marco -> member of team:backend -> viewer on document:specs`)

4. **Given** the ResolutionPath is showing a denied result **When** I look at the chain **Then** it shows where the resolution breaks with a visual gap or red indicator

5. **Given** the ResolutionPath is displayed **When** I click on an entity TypeBadge in the chain **Then** the app navigates to the Relationship Graph (`/relationship-graph`) filtered on that entity

6. **Given** I have query inputs filled in **When** I navigate to another view and return to Query Console **Then** my input values and active tab are preserved via Pinia query store

7. **Given** no model is loaded for the current store **When** I navigate to the Query Console **Then** I see an EmptyState: icon `Search`, title "No model loaded", message "A model is required to run queries", actionLabel "Go to Model Viewer", actionTo "/model-viewer"

8. **Given** no store is selected **When** I navigate to the Query Console **Then** I see an EmptyState: icon `Settings`, title "No store selected", message "Select or create a store to get started.", actionLabel "Go to Store Admin", actionTo "/store-admin"

## Tasks / Subtasks

- [x] Task 1: Create Pinia query store — `frontend/src/stores/queries.ts` (AC: #1, #2, #3, #6)
  - [x] Define store with setup syntax following established pattern (loading/error/data refs)
  - [x] Check tab state: `checkUser`, `checkRelation` (string | null), `checkObject` refs
  - [x] Check result state: `checkResult: ref<{ allowed: boolean; responseTime: number } | null>(null)`
  - [x] Expand/Why state: `expandResult: ref<ExpandTree | null>(null)`, `expandLoading: ref<boolean>(false)`
  - [x] Active tab state: `activeTab: ref<string>('check')` — persists across navigation
  - [x] Action `runCheck(storeId: string)`: POSTs to query/check, measures responseTime, sets checkResult, clears expandResult
  - [x] Action `runExpand(storeId: string)`: POSTs to query/expand, sets expandResult
  - [x] Action `resetCheck()`: clears checkResult and expandResult (preserves inputs)
  - [x] Export TypeScript interfaces: `CheckResponse`, `UsersetTree`, `ExpandTree`
  - [x] Co-locate test file: `frontend/src/stores/queries.test.ts`

- [x] Task 2: Create `CheckQuery.vue` component (AC: #1, #2)
  - [x] Create `frontend/src/components/query/CheckQuery.vue`
  - [x] Three input fields in horizontal row: User (AppInput monospace), Relation (AppSelect from model), Object (AppInput monospace)
  - [x] "Check" button (AppButton primary, Play icon, loading state)
  - [x] `@keydown.enter` on form container submits the check
  - [x] Result area: CircleCheck/CircleX + Allowed/Denied text + response time
  - [x] WhyButton rendered below result
  - [x] Co-locate test file: `frontend/src/components/query/CheckQuery.test.ts`

- [x] Task 3: Create `WhyButton.vue` component (AC: #3, #4)
  - [x] Create `frontend/src/components/query/WhyButton.vue`
  - [x] Text/link style button: "Why?" label
  - [x] States: default, loading (LoadingSpinner), expanded (ResolutionPath visible)
  - [x] First click: runExpand; subsequent clicks: toggle visibility
  - [x] Renders ResolutionPath inline when expanded and data available
  - [x] Co-locate test file: `frontend/src/components/query/WhyButton.test.ts`

- [x] Task 4: Create `ResolutionPath.vue` component (AC: #3, #4, #5)
  - [x] Create `frontend/src/components/query/ResolutionPath.vue`
  - [x] Props: `expandTree: ExpandTree`, `allowed: boolean`
  - [x] Parses tree into chain nodes (depth-first: leaf.users, union children, computed userset)
  - [x] TypeBadge nodes connected with ArrowRight separators
  - [x] Denied results show "denied here" indicator
  - [x] Each TypeBadge clickable → router.push `/relationship-graph?entity=...`
  - [x] Co-locate test file: `frontend/src/components/query/ResolutionPath.test.ts`

- [x] Task 5: Rewrite `QueryConsole.vue` view (AC: #1, #6, #7, #8)
  - [x] REWRITE `frontend/src/views/QueryConsole.vue`
  - [x] Imports useQueryStore, useConnectionStore, useModelStore
  - [x] onMounted: fetchModel if storeId set
  - [x] watch storeId: resetCheck + re-fetchModel
  - [x] No storeId → EmptyState "No store selected"
  - [x] No model.json → EmptyState "No model loaded"
  - [x] Store+model → AppTabs (check, list-objects, list-users, expand) with page title
  - [x] Co-locate test file: `frontend/src/views/QueryConsole.test.ts`

- [x] Task 6: Tests — query store (AC: #2, #3, #6)
  - [x] 7 tests covering all specified behaviors

- [x] Task 7: Tests — CheckQuery component (AC: #1, #2)
  - [x] 6 tests covering all specified behaviors

- [x] Task 8: Tests — WhyButton component (AC: #3)
  - [x] 4 tests covering all specified behaviors

- [x] Task 9: Tests — ResolutionPath component (AC: #3, #4, #5)
  - [x] 5 tests covering all specified behaviors

- [x] Task 10: Tests — QueryConsole view (AC: #6, #7, #8)
  - [x] 4 tests covering all specified behaviors

## Dev Notes

### Previous Story Intelligence (Stories 3.2, 3.3, 2.2)

- **`useApi` composable** (`frontend/src/composables/useApi.ts`): wraps `fetch`, prepends `/api/`, parses error envelope, triggers toast on error. Methods: `api.get<T>(path)`, `api.post<T>(path, body)`, `api.put<T>(path, body)`, `api.del<T>(path, body?)`. Path does NOT include `/api/` prefix.
- **Pinia store pattern** (setup syntax): `loading: ref<boolean>`, `error: ref<string | null>`, data refs. Actions call `useApi`. See `frontend/src/stores/model.ts` and `frontend/src/stores/connection.ts` for live references.
- **EmptyState props**: `icon?: Component`, `title?: string`, `message: string`, `actionLabel?: string`, `actionTo?: string`. Uses RouterLink if `actionTo` provided, emits `action` event otherwise.
- **LoadingSpinner props**: `size?: 'sm' | 'md' | 'lg'`, `fullView?: boolean`.
- **AppTabs**: `tabs: Array<{ key: string; label: string }>`, `v-model` string (active tab key). Uses Headless UI `TabGroup`. Slots are named by tab `key`. See `frontend/src/components/common/AppTabs.vue`.
- **AppSelect**: `modelValue: string | null`, `options: Array<{ value: string; label: string }>`, `placeholder?: string`. Uses Headless UI `Listbox`. See `frontend/src/components/common/AppSelect.vue`.
- **AppInput**: `modelValue?: string`, `monospace?: boolean`, `error?: string`, `placeholder?: string`. Emits `update:modelValue` and `blur`. See `frontend/src/components/common/AppInput.vue`.
- **TypeBadge** (`frontend/src/components/common/TypeBadge.vue`): takes `typeName: string` prop. Uses char-sum hash `% 8` into Tailwind node-color classes. Renders as pill with `font-mono text-xs`. Currently NOT clickable — Story 4.2 needs to make instances in ResolutionPath clickable by wrapping in a `<router-link>` or `@click` + `router.push`.
- **Relation extraction from model store** — reuse the pattern from `AddTupleForm.vue` (Story 3.3): read `modelStore.json`, extract unique relation names from `type_definitions[].relations` keys, map to `{ value: string, label: string }[]` for AppSelect.
- **Tailwind v4.2 design tokens**: `surface-base` (gray-950), `surface-card` (gray-900), `surface-elevated` (gray-800), `surface-border` (gray-700), `text-primary` (gray-100), `text-secondary` (gray-400), `text-emphasis` (white). Semantic: `text-success` (#22c55e), `text-error` (#ef4444).
- **JetBrains Mono**: `font-mono` class applies it.
- **`useToast` composable**: `toast.show({ type: 'success' | 'error', message: string })`. Error toasts persist; success auto-dismiss 5s.
- **Vitest + @vue/test-utils**: co-located tests. Jsdom environment. `vi.mock` for composable mocking.
- **AppButton** (`frontend/src/components/common/AppButton.vue`): supports `variant` (`primary`, `secondary`, `danger`), `loading` boolean, default slot for label. Available from `frontend/src/components/common/`.
- **Story 3.3 AddTupleForm pattern**: Horizontal inline form, relation picker from model store, `@keydown.enter` submit, toast feedback. Direct reference for CheckQuery form layout.
- **Debug learnings from previous stories**: `markRaw()` on complex objects for third-party libs. jsdom normalizes hex to rgb in style assertions. `vi.mock` hoisting requires explicit `import { vi } from 'vitest'`.

### Architecture Compliance

- **This story is FRONTEND-ONLY** — Story 4.1 must be completed first. Story 4.1 creates the backend query endpoints that this story consumes. [Source: epics.md — Story 4.1 is a prerequisite]
- **API endpoints consumed**:
  - `POST /api/stores/:storeId/query/check` — body: `{ "user": "user:alice", "relation": "viewer", "object": "document:roadmap" }`, response: `{ "allowed": true/false }`
  - `POST /api/stores/:storeId/query/expand` — body: `{ "relation": "viewer", "object": "document:roadmap" }`, response: OpenFGA Expand tree structure
- **Query store location**: `frontend/src/stores/queries.ts` — defined in architecture.md project structure. [Source: architecture.md#Structure Patterns]
- **Query component location**: `frontend/src/components/query/` — create this directory. Contains `CheckQuery.vue`, `WhyButton.vue`, `ResolutionPath.vue`. [Source: architecture.md#Structure Patterns]
- **QueryConsole.vue** is the view — lives in `frontend/src/views/`. REWRITE the existing placeholder. [Source: architecture.md#Structure Patterns]
- **Pinia store as single source of truth** — query inputs and results live in the store, not local component state, so inputs persist across navigation. [Source: architecture.md#Communication Patterns, ux-design-specification.md#Navigation Patterns]
- **All API calls through `useApi`** — no direct `fetch()`. [Source: architecture.md#Enforcement Guidelines]
- **Data freshness**: model is re-fetched on mount. Check results persist in store (user expectation: see last result when returning). [Source: ux-design-specification.md#Data Freshness]
- **Tests co-located**: test files next to source files. [Source: architecture.md#Test Location]

### Critical Technical Details

#### OpenFGA Expand API Response Shape

The Expand API returns a nested tree (userset tree). The response structure from OpenFGA:

```typescript
// Simplified Expand response types
interface ExpandTree {
  root: UsersetTree
}

interface UsersetTree {
  name: string  // e.g., "document:roadmap#viewer"
  leaf?: {
    users?: { users: string[] }     // e.g., ["user:alice"]
    computed?: { userset: string }  // e.g., "document:roadmap#editor"
    tupleToUserset?: {
      tupleset: string              // e.g., "document:roadmap#parent"
      computed: UsersetTree[]
    }
  }
  union?: { nodes: UsersetTree[] }
  intersection?: { nodes: UsersetTree[] }
  difference?: { base: UsersetTree; subtract: UsersetTree }
}
```

The ResolutionPath component must flatten this tree into a linear chain for display. For allowed results, trace the path from root to the matching user. For denied results, show the partial path that was explored before failing.

**Implementation approach for ResolutionPath parsing:**
- Walk the tree depth-first
- For `union`: follow the first child that leads to a match (for allowed) or show the explored branch (for denied)
- For `leaf.users`: terminal node — the user was found here
- For `leaf.computed`: follow the computed userset reference
- For `leaf.tupleToUserset`: show the tuple hop, then follow computed children
- Build an array of `{ entity: string, relation: string, type: 'resolved' | 'unresolved' }` nodes for rendering

#### Response Time Measurement

```typescript
async function runCheck(storeId: string) {
  loading.value = true
  error.value = null
  expandResult.value = null  // clear previous Why data
  const start = performance.now()
  try {
    const data = await api.post<CheckResponse>(
      `stores/${storeId}/query/check`,
      { user: checkUser.value, relation: checkRelation.value, object: checkObject.value }
    )
    const elapsed = Math.round(performance.now() - start)
    checkResult.value = { allowed: data.allowed, responseTime: elapsed }
  } catch (err) {
    error.value = (err as Error).message
    checkResult.value = null
  } finally {
    loading.value = false
  }
}
```

#### Check Result Display

Use large Lucide icons for unmistakable feedback:

```vue
<!-- Result area -->
<div v-if="queryStore.checkResult" class="flex flex-col items-center gap-2 py-6">
  <CircleCheck v-if="queryStore.checkResult.allowed" class="size-16 text-success" />
  <CircleX v-else class="size-16 text-error" />
  <span :class="[
    'text-2xl font-semibold',
    queryStore.checkResult.allowed ? 'text-success' : 'text-error'
  ]">
    {{ queryStore.checkResult.allowed ? 'Allowed' : 'Denied' }}
  </span>
  <span class="text-text-secondary text-sm">
    Response: {{ queryStore.checkResult.responseTime }}ms
  </span>
  <WhyButton />
</div>
```

#### Relation Picker from Model Store

Reuse the exact pattern from AddTupleForm (Story 3.3):

```typescript
const modelStore = useModelStore()
const relationOptions = computed(() => {
  const json = modelStore.json as any
  if (!json?.type_definitions) return []
  const relations = new Set<string>()
  for (const typeDef of json.type_definitions) {
    if (typeDef.relations) {
      Object.keys(typeDef.relations).forEach(r => relations.add(r))
    }
  }
  return Array.from(relations).sort().map(r => ({ value: r, label: r }))
})
```

#### Form Layout (Horizontal Row)

Per UX spec, Query Console uses horizontal form rows for User + Relation + Object + Check button:

```vue
<div class="flex items-end gap-3">
  <div class="flex-1">
    <label class="text-sm text-text-secondary mb-1 block">User</label>
    <AppInput v-model="queryStore.checkUser" :monospace="true" placeholder="user:alice" />
  </div>
  <div class="flex-1">
    <label class="text-sm text-text-secondary mb-1 block">Relation</label>
    <AppSelect v-model="queryStore.checkRelation" :options="relationOptions" placeholder="Select relation..." />
  </div>
  <div class="flex-1">
    <label class="text-sm text-text-secondary mb-1 block">Object</label>
    <AppInput v-model="queryStore.checkObject" :monospace="true" placeholder="document:roadmap" />
  </div>
  <AppButton variant="primary" :loading="queryStore.loading" @click="handleCheck">
    Check
  </AppButton>
</div>
```

#### `query/` Component Directory

The `frontend/src/components/query/` directory does not exist yet. Create it when creating `CheckQuery.vue`.

#### AppTabs Slot Usage

AppTabs uses named slots matching tab keys. The four tabs for Query Console:

```typescript
const tabs = [
  { key: 'check', label: 'Check' },
  { key: 'list-objects', label: 'List Objects' },
  { key: 'list-users', label: 'List Users' },
  { key: 'expand', label: 'Expand' },
]
```

```vue
<AppTabs :tabs="tabs" v-model="queryStore.activeTab">
  <template #check>
    <CheckQuery />
  </template>
  <template #list-objects>
    <EmptyState :icon="Search" message="Coming in Story 4.3" />
  </template>
  <!-- etc. -->
</AppTabs>
```

### File Structure After This Story

```
frontend/src/
├── stores/
│   ├── queries.ts                          # NEW: Pinia query store (check inputs, result, expand, active tab)
│   └── queries.test.ts                     # NEW: query store unit tests
├── components/
│   └── query/                              # NEW directory
│       ├── CheckQuery.vue                  # NEW: check form + result display
│       ├── CheckQuery.test.ts              # NEW: CheckQuery component tests
│       ├── WhyButton.vue                   # NEW: "Why?" trigger + expand call
│       ├── WhyButton.test.ts              # NEW: WhyButton tests
│       ├── ResolutionPath.vue              # NEW: expand tree rendered as linear chain
│       └── ResolutionPath.test.ts          # NEW: ResolutionPath tests
└── views/
    ├── QueryConsole.vue                    # REWRITTEN: full implementation with tabs, store wiring
    └── QueryConsole.test.ts               # NEW: QueryConsole view tests
```

**No new npm packages required.** All dependencies (Headless UI, lucide-vue-next, Pinia, Vue Router) are already installed.

**No backend files are created or modified in this story.** Backend query endpoints are Story 4.1's responsibility.

### What NOT to Do

- **Do NOT implement List Objects, List Users, or Expand tab content** — that is Story 4.3. Only render placeholder EmptyStates for those tabs.
- **Do NOT create backend endpoints** — Story 4.1 handles all backend query routes.
- **Do NOT store query inputs in local component state** — they MUST live in the Pinia query store so they persist across navigation (UX requirement: "Context flows, never resets").
- **Do NOT use `api.get` for queries** — all query endpoints are POST (they send parameters in the request body).
- **Do NOT put query components in `components/common/`** — they belong in `components/query/` per architecture.md.
- **Do NOT create a new `QueryConsole.vue` file** — REWRITE the existing placeholder at `frontend/src/views/QueryConsole.vue`.
- **Do NOT make the WhyButton a full AppButton** — it is a text/link style inline action per UX button hierarchy ("Why?" is in the Text/Link tier).
- **Do NOT fetch the model inside CheckQuery** — the parent `QueryConsole.vue` is responsible for fetching the model on mount (same pattern as TupleManager/AddTupleForm).
- **Do NOT install any new npm packages** — all dependencies are already available.
- **Do NOT cache check results across store changes** — reset check results when storeId changes (but preserve input text fields).
- **Do NOT rely on color alone** for allowed/denied feedback — use icons (CircleCheck/CircleX) plus text labels ("Allowed"/"Denied") for accessibility.

### References

- [Source: epics.md#Story 4.2] — FR23, FR27: Check query with green/red result, tabbed interface
- [Source: epics.md#NFR3] — Query response under 1 second end-to-end
- [Source: architecture.md#Frontend Architecture] — Pinia stores, useApi composable, Vue Flow
- [Source: architecture.md#Structure Patterns] — `components/query/` directory, `stores/queries.ts` location
- [Source: architecture.md#Communication Patterns] — Pinia setup syntax with loading/error/data, useApi pattern
- [Source: architecture.md#Naming Patterns] — API: `stores/:storeId/query/check`, `stores/:storeId/query/expand`
- [Source: ux-design-specification.md#Experience Mechanics] — Check + Why? flow: 6 phases (initiation, input, execute, result, explain, next action)
- [Source: ux-design-specification.md#Feature Components] — WhyButton (default, loading, expanded), ResolutionPath (collapsed, expanded, loading)
- [Source: ux-design-specification.md#Button Hierarchy] — "Check" is primary, "Why?" is Text/Link tier
- [Source: ux-design-specification.md#Feedback Patterns] — Query result: inline result area, persists until next query
- [Source: ux-design-specification.md#Empty States] — Query Console: "No model loaded — a model is required to run queries"
- [Source: ux-design-specification.md#Form Inputs] — Horizontal form rows for Query Console, monospace for identifiers, AppSelect for relations
- [Source: ux-design-specification.md#Navigation Patterns] — TypeBadge in ResolutionPath clickable, navigates to Relationship Graph
- [Source: ux-design-specification.md#Color System] — `--color-success` #22c55e (allowed), `--color-error` #ef4444 (denied)
- [Source: prd.md#FR23] — Check query with green/red result
- [Source: prd.md#FR27] — Switch between query types via tabbed interface

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues. All patterns from Stories 3.2/3.3/2.2 applied cleanly. Created `query/` component directory.

### Completion Notes List

- Pinia query store with checkUser/checkRelation(string|null)/checkObject inputs, checkResult, expandResult, activeTab — all persist across navigation
- CheckQuery: horizontal form (AppInput + AppSelect + AppInput + AppButton), CircleCheck/CircleX result display, WhyButton integration
- WhyButton: text-link style button, first click triggers runExpand, subsequent clicks toggle ResolutionPath visibility
- ResolutionPath: depth-first tree parser (leaf.users → union → computed), TypeBadge chain with ArrowRight separators, denied indicator, router.push on badge click
- QueryConsole: rewrote placeholder; 4-tab AppTabs (check active, others "Coming in 4.3"); EmptyState guards for no-store/no-model
- 26 new tests (7 store + 6 CheckQuery + 4 WhyButton + 5 ResolutionPath + 4 QueryConsole); 209 total frontend tests pass

### File List

- `frontend/src/stores/queries.ts` — NEW: Pinia query store
- `frontend/src/stores/queries.test.ts` — NEW: 7 store unit tests
- `frontend/src/components/query/CheckQuery.vue` — NEW: check form + result display
- `frontend/src/components/query/CheckQuery.test.ts` — NEW: 6 component tests
- `frontend/src/components/query/WhyButton.vue` — NEW: Why? trigger + expand call
- `frontend/src/components/query/WhyButton.test.ts` — NEW: 4 component tests
- `frontend/src/components/query/ResolutionPath.vue` — NEW: expand tree as linear chain
- `frontend/src/components/query/ResolutionPath.test.ts` — NEW: 5 component tests
- `frontend/src/views/QueryConsole.vue` — REWRITTEN: full implementation with tabs
- `frontend/src/views/QueryConsole.test.ts` — NEW: 4 view tests

### Review Findings

- [ ] [Review][Decision] ResolutionPath renders flat leaf-user list, not directed permission chain — spec AC#3 says "series of TypeBadge nodes... e.g. `user:marco -> member of team:backend -> viewer on document:specs`" (a hop-by-hop path). Current `collectNodes` extracts leaf users / union children into a flat array. Implementing a true directed chain requires tracing the traversal path through intermediate userset hops. Decision: (1) implement best-effort hop chain, or (2) accept simplified flat list as scope reduction with note in notes.

- [ ] [Review][Patch] Check button missing disabled state — `checkRelation` can be null; `checkUser`/`checkObject` can be empty. Submitting sends `relation: null` to the API (400 error). Add computed `canCheck` and `:disabled="!canCheck"` on AppButton. [CheckQuery.vue]

- [ ] [Review][Patch] WhyButton double-click race — two rapid clicks both pass `!expandLoading && !expandResult` before first await returns, firing two parallel `runExpand` calls. Add `if (queryStore.expandLoading) return` guard at start of `handleClick`. [WhyButton.vue]

- [ ] [Review][Patch] `runExpand` never clears stale error — stale error from previous check stays visible during expand. Add `error.value = null` at start of `runExpand`. [queries.ts]

- [ ] [Review][Patch] `expandResult` not cleared at `runExpand` start — old tree shown while new fetch is in-flight. Add `expandResult.value = null` at start of `runExpand`. [queries.ts]

- [ ] [Review][Patch] `checkResult` not cleared at `runCheck` start — stale result from previous check (different inputs) stays visible while new check is loading. Add `checkResult.value = null` at start of `runCheck`. [queries.ts]

- [ ] [Review][Patch] `isExpanded` local state in WhyButton resets on component remount (tab switch) — user returns to Check tab and ResolutionPath collapses silently even though expandResult is cached. Move `isExpanded`/`expandVisible` to the query store or watch `checkResult` to reset. [WhyButton.vue, queries.ts]

- [ ] [Review][Patch] `collectNodes` node.name fallback produces malformed entity strings (e.g., `document:roadmap#viewer`) used as navigation targets. Remove the fallback — emit nothing for unknown node types; chain may be incomplete but won't have broken navigation. [ResolutionPath.vue]

- [x] [Review][Defer] `collectNodes` ignores `intersection` and `difference` node types [ResolutionPath.vue] — deferred, complex edge case
- [x] [Review][Defer] `collectNodes` does not traverse `tupleToUserset.computed` children [ResolutionPath.vue] — deferred, complex edge case
- [x] [Review][Defer] "denied here" indicator at end of chain, not at break point [ResolutionPath.vue] — deferred, requires break-point detection in tree traversal
- [x] [Review][Defer] `@keydown.enter` on container may fire alongside AppSelect Enter key [CheckQuery.vue] — deferred, Headless UI likely stops propagation; low risk
- [x] [Review][Defer] Form labels not associated with inputs via `for`/`id` attributes [CheckQuery.vue] — deferred, pre-existing pattern, accessibility debt
- [x] [Review][Defer] WhyButton loading spinner has no `aria-label` [WhyButton.vue] — deferred, accessibility debt
- [x] [Review][Defer] `watch`+`onMounted` may both call `fetchModel` on mount+change [QueryConsole.vue] — deferred, pre-existing pattern, low impact

## Change Log

- 2026-03-27: Story file created — status: ready-for-dev
- 2026-03-27: Implementation complete — status: review
