# Story 3.2: Tuple Table with Filtering and Pagination

Status: review

## Story

As a user,
I want to view all tuples in a filterable, paginated table,
so that I can inspect the concrete relationships in my authorization store.

## Acceptance Criteria

1. **Given** I navigate to the Tuple Manager with a store that has tuples **When** the page loads **Then** I see a TanStack Table with columns for user, relation, and object, displaying tuples with TypeBadge-colored identifiers in monospace font

2. **Given** the tuple table is displayed **When** I look above the table **Then** I see three always-visible filter inputs (type, relation, user) in monospace font with clear (X) buttons

3. **Given** I type a value in any filter input **When** the filter is applied **Then** the table updates to show only tuples matching all active filters (AND logic)

4. **Given** the store has more tuples than fit on one page **When** I scroll to the bottom of the table **Then** pagination controls allow me to navigate through pages, and scrolling/filtering is smooth with up to 10,000 tuples (NFR4)

5. **Given** I have active filters on the Tuple Manager **When** I navigate to another view and return **Then** my filter values are preserved via Pinia store (UX-DR14)

6. **Given** I navigate to the Tuple Manager **When** the view mounts **Then** tuples are re-fetched from the API (data freshness pattern — no caching)

7. **Given** a store with no tuples **When** I navigate to the Tuple Manager **Then** I see an EmptyState: "No tuples in this store" with "Add Tuple" and "Go to Import/Export" action buttons

## Tasks / Subtasks

- [x] Task 1: Install TanStack Table for Vue 3 (AC: #1, #4)
  - [x] Run `npm install @tanstack/vue-table` in the `frontend/` package
  - [x] Verify `@tanstack/vue-table` v8.x is installed (headless, no UI — we provide Tailwind styling)

- [x] Task 2: Create Pinia tuple store — `frontend/src/stores/tuples.ts` (AC: #1, #3, #4, #5, #6)
  - [x] Define store with setup syntax: `loading: ref<boolean>(false)`, `error: ref<string | null>(null)`, `tuples: ref<TupleEntry[]>([])`, `continuationToken: ref<string | null>(null)`, `hasMore: computed(() => continuationToken.value !== null)`
  - [x] Filter state (persisted across navigation): `filterType: ref<string>('')`, `filterRelation: ref<string>('')`, `filterUser: ref<string>('')`
  - [x] `pageSize` constant: `50` (default page size for tuple reads)
  - [x] Action `fetchTuples(storeId: string)` — calls `api.post<ReadTuplesResponse>(\`stores/${storeId}/tuples/read\`, buildTupleKey())`. On success: sets `tuples.value` and `continuationToken.value`. On error: sets `error.value`, clears tuples
  - [x] Action `fetchNextPage(storeId: string)` — same as `fetchTuples` but includes `continuation_token` in the request body. **Appends** new tuples to existing `tuples.value` (does not replace)
  - [x] Action `resetTuples()` — clears tuples, continuationToken, error. Does NOT clear filters (filters persist per UX-DR14)
  - [x] Action `clearFilters()` — resets all three filter refs to empty string, then calls `fetchTuples`
  - [x] Helper `buildTupleKey()` — constructs the request body: `{ tuple_key: { type, relation, user }, page_size, continuation_token? }`. Only include non-empty filter fields in `tuple_key`
  - [x] Export TypeScript interfaces: `TupleEntry { key: { user: string; relation: string; object: string }; timestamp: string }`, `ReadTuplesResponse { tuples: TupleEntry[]; continuation_token: string | null }`
  - [x] Co-locate test file: `frontend/src/stores/tuples.test.ts`

- [x] Task 3: Create `TupleTable.vue` component (AC: #1, #2, #3, #4)
  - [x] Create `frontend/src/components/tuples/TupleTable.vue`
  - [x] Set up TanStack Table with `useVueTable` from `@tanstack/vue-table`:
    - Column definitions: `user` (with TypeBadge), `relation` (plain text), `object` (with TypeBadge)
    - Data source: `tupleStore.tuples`
    - Manual pagination (server-side — we control it via continuation tokens, not TanStack's built-in client-side pagination)
  - [x] Render table with Tailwind classes: `border-surface-border`, `bg-surface-card`, `text-text-primary`, `font-mono text-sm` for cell content
  - [x] Table header: `bg-surface-elevated`, `text-text-secondary`, `text-xs uppercase`
  - [x] Row hover: `hover:bg-surface-elevated/50`
  - [x] TypeBadge integration: extract type name from `user:alice` → type is `user`, from `document:roadmap` → type is `document`. Use `identifier.split(':')[0]` to get type name, render full identifier in monospace after the badge
  - [x] Pagination controls at bottom: "Load More" button (visible only when `tupleStore.hasMore`), showing current count: "Showing {n} tuples"
  - [x] Co-locate test file: `frontend/src/components/tuples/TupleTable.test.ts`

- [x] Task 4: Create `TupleFilterBar.vue` component (AC: #2, #3)
  - [x] Create `frontend/src/components/tuples/TupleFilterBar.vue`
  - [x] Three `AppInput` fields in a horizontal row: Type, Relation, User — each with monospace font (`font-mono`)
  - [x] Each input has placeholder: `"Filter by type..."`, `"Filter by relation..."`, `"Filter by user..."`
  - [x] Each input has a clear (X) button that appears when the field has content (use Lucide `X` icon inside the input)
  - [x] Bind inputs to `tupleStore.filterType`, `tupleStore.filterRelation`, `tupleStore.filterUser` via `v-model`
  - [x] On filter change: debounce 300ms, then call `tupleStore.fetchTuples(storeId)` to re-fetch with new filters (resets pagination)
  - [x] "Clear All" button visible when any filter is active — calls `tupleStore.clearFilters()`
  - [x] Co-locate test file: `frontend/src/components/tuples/TupleFilterBar.test.ts`

- [x] Task 5: Rewrite `TupleManager.vue` view (AC: #1, #2, #5, #6, #7)
  - [x] REWRITE `frontend/src/views/TupleManager.vue` (currently a placeholder with two EmptyStates)
  - [x] Import and use `useTupleStore` and `useConnectionStore`
  - [x] On mount (`onMounted`): if `connectionStore.storeId` is set, call `tupleStore.fetchTuples(connectionStore.storeId)`
  - [x] Watch `connectionStore.storeId`: when storeId changes to non-empty string, call `tupleStore.fetchTuples(newStoreId)`; when storeId becomes empty, call `tupleStore.resetTuples()`
  - [x] If `!connectionStore.storeId`: render EmptyState (icon: `Settings`, "No store selected", actionTo: `/store-admin`) — same pattern as ModelViewer
  - [x] If `connectionStore.storeId` is set and `tupleStore.loading` (first load): show `<LoadingSpinner :full-view="true" />`
  - [x] If store is set, not loading, and `tupleStore.tuples.length === 0` and no filters active: render EmptyState (icon: `Database`, title: "No tuples in this store", message: "Add tuples to get started", with two actions — "Add Tuple" emits event (placeholder for Story 3.3), "Go to Import/Export" actionTo: `/import-export`)
  - [x] If store is set and tuples exist (or filters are active): render `<TupleFilterBar />` + `<TupleTable />`
  - [x] Page title: "Tuple Manager" in `text-xl font-semibold text-text-emphasis`
  - [x] Co-locate test file: `frontend/src/views/TupleManager.test.ts`

- [x] Task 6: Tests — tuple store (AC: #1, #3, #4, #5, #6)
  - [x] `frontend/src/stores/tuples.test.ts`:
    - [x] Test `fetchTuples` with successful response: verifies tuples and continuationToken are set
    - [x] Test `fetchTuples` with filters: verifies request body includes correct `tuple_key` fields
    - [x] Test `fetchNextPage` appends tuples to existing list (does not replace)
    - [x] Test `fetchNextPage` sends continuation_token in request body
    - [x] Test `resetTuples` clears tuples/token/error but preserves filters
    - [x] Test `clearFilters` resets all filter refs to empty string
    - [x] Test `loading` flag: true during fetch, false after
    - [x] Test error handling: sets error.value, clears tuples

- [x] Task 7: Tests — TupleTable component (AC: #1, #4)
  - [x] `frontend/src/components/tuples/TupleTable.test.ts`:
    - [x] Test renders table headers (User, Relation, Object)
    - [x] Test renders tuple rows with correct data
    - [x] Test renders TypeBadge for user and object columns
    - [x] Test "Load More" button visible when hasMore is true
    - [x] Test "Load More" button hidden when hasMore is false
    - [x] Test shows tuple count text

- [x] Task 8: Tests — TupleFilterBar component (AC: #2, #3)
  - [x] `frontend/src/components/tuples/TupleFilterBar.test.ts`:
    - [x] Test renders three filter inputs with correct placeholders
    - [x] Test clear button appears when input has content
    - [x] Test "Clear All" button visible when any filter is active
    - [x] Test "Clear All" button hidden when no filters are active

- [x] Task 9: Tests — TupleManager view (AC: #5, #6, #7)
  - [x] `frontend/src/views/TupleManager.test.ts`:
    - [x] Test renders "No store selected" EmptyState when storeId is empty
    - [x] Test calls `tupleStore.fetchTuples` on mount when store is selected
    - [x] Test shows LoadingSpinner when `tupleStore.loading` is true
    - [x] Test shows EmptyState when tuples are empty and no filters active
    - [x] Test shows TupleFilterBar + TupleTable when tuples exist
    - [x] Test shows TupleFilterBar + TupleTable when filters are active (even if tuples empty — so user can clear filters)

## Dev Notes

### Previous Story Intelligence (Stories 1.6, 2.2, 2.3)

- **`useApi` composable** (`frontend/src/composables/useApi.ts`): wraps `fetch`, prepends `/api/`, parses error envelope, triggers toast on error. Methods: `api.get<T>(path)`, `api.post<T>(path, body)`, `api.put<T>(path, body)`, `api.del<T>(path)`. Path does NOT include `/api/` prefix. The `del` method handles 204 No Content.
- **Pinia store pattern** (setup syntax): `loading: ref<boolean>`, `error: ref<string | null>`, data refs. Actions call `useApi`. See `frontend/src/stores/model.ts` and `frontend/src/stores/connection.ts` for live references.
- **EmptyState props**: `icon?: Component`, `title?: string`, `message: string`, `actionLabel?: string`, `actionTo?: string`. Uses RouterLink if `actionTo` provided, emits `action` event otherwise.
- **LoadingSpinner props**: `size?: 'sm' | 'md' | 'lg'`, `fullView?: boolean` — use `fullView` for content-area-filling spinner.
- **TypeBadge** (`frontend/src/components/common/TypeBadge.vue`): takes `typeName: string` prop. Uses char-sum hash `% 8` into Tailwind node-color classes. Renders as pill with `font-mono text-xs`.
- **`getTypeColor` / `getTypeColorIndex`** extracted to `frontend/src/utils/typeColors.ts` (from Story 2.3). Use this for consistent coloring.
- **Tailwind v4.2** design tokens: `surface-base` (gray-950), `surface-card` (gray-900), `surface-elevated` (gray-800), `surface-border` (gray-700), `text-primary` (gray-100), `text-secondary` (gray-400), `text-emphasis` (white).
- **JetBrains Mono**: `font-mono` class applies it (via `@fontsource/jetbrains-mono`).
- **`useToast` composable**: `toast.show({ type: 'success' | 'error', message: string })`. Error toasts persist; success auto-dismiss 5s.
- **Frontend ESM** (`"type": "module"`), `@/` path alias to `frontend/src/`.
- **Vitest + @vue/test-utils**: co-located tests. Jsdom environment. `vi.mock` for composable mocking. Stryker for mutation testing.
- **ConfirmDialog, AppButton, AppInput, AppTabs** available from `frontend/src/components/common/`.
- **AppInput** — used in StoreAdmin; standard `v-model` text input with Tailwind styling. Does not have a built-in clear (X) button — TupleFilterBar will need to add one as a positioned icon.
- **StoreAdmin.vue** — reference for table-like view patterns: `onMounted` fetch, loading/error/empty states, inline create form. See `frontend/src/views/StoreAdmin.vue`.
- **ModelViewer.vue** — reference for store-watcher pattern: `onMounted` + `watch(connectionStore.storeId)` to re-fetch on store change.
- **Story 2.3 debug learnings**: `markRaw()` on complex objects passed to third-party libs to prevent Vue from deeply observing them. `vi.mock` hoisting requires explicit `import { vi } from 'vitest'`. jsdom normalizes hex to rgb in style assertions.

### Architecture Compliance

- **This story is FRONTEND-ONLY** — Story 3.1 must be completed first. Story 3.1 creates the backend tuple endpoints that this story consumes. [Source: epics.md — Story 3.1 is a prerequisite for Story 3.2]
- **API endpoint consumed**: `POST /api/stores/:storeId/tuples/read` — OpenFGA's Read endpoint is POST (not GET) because filter parameters go in the request body. The backend from Story 3.1 proxies this. Request body: `{ tuple_key?: { type?, relation?, user? }, page_size?: number, continuation_token?: string }`. Response: `{ tuples: TupleEntry[], continuation_token: string | null }`.
- **Tuple store location**: `frontend/src/stores/tuples.ts` — defined in architecture.md project structure [Source: architecture.md#Structure Patterns]
- **TupleTable and TupleFilterBar component location**: `frontend/src/components/tuples/` — the `tuples/` subdirectory under components per architecture.md. Create the directory.
- **TupleManager.vue** is the view that orchestrates the table — lives in `frontend/src/views/`. REWRITE the existing placeholder. [Source: architecture.md#Structure Patterns]
- **TanStack Table v8** — headless, Tailwind-styled. Architecture mandates it for data tables. [Source: architecture.md#Frontend Architecture]
- **Pinia store as single source of truth** — TupleTable reads from `useTupleStore()`. Filters live in the store (not local component state) so they persist across navigation. [Source: architecture.md#Communication Patterns]
- **All API calls through `useApi`** — no direct `fetch()`. [Source: architecture.md#Enforcement Guidelines]
- **Data freshness**: re-fetch on every mount. No caching. [Source: ux-design-specification.md#Data Freshness Pattern]
- **Tests co-located**: test files next to source files. [Source: architecture.md#Test Location]
- **Cursor pagination, not offset**: OpenFGA uses continuation tokens. There is no page number / offset concept. "Load More" pattern fits naturally. [Source: epics.md#Story 3.1 ACs]

### Critical Technical Details

#### TanStack Table Setup for Vue 3

```bash
cd frontend && npm install @tanstack/vue-table
```

TanStack Table v8 is headless — it provides logic (sorting, filtering, pagination state) but zero UI. We render everything with Tailwind.

```typescript
// TupleTable.vue — setup
import { useVueTable, createColumnHelper, getCoreRowModel, FlexRender } from '@tanstack/vue-table'
import type { TupleEntry } from '@/stores/tuples'

const columnHelper = createColumnHelper<TupleEntry>()

const columns = [
  columnHelper.accessor((row) => row.key.user, {
    id: 'user',
    header: 'User',
    cell: (info) => info.getValue(),  // rendered via template with TypeBadge
  }),
  columnHelper.accessor((row) => row.key.relation, {
    id: 'relation',
    header: 'Relation',
  }),
  columnHelper.accessor((row) => row.key.object, {
    id: 'object',
    header: 'Object',
    cell: (info) => info.getValue(),  // rendered via template with TypeBadge
  }),
]

const table = useVueTable({
  get data() { return tupleStore.tuples },
  columns,
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true,  // we handle pagination via continuation tokens
})
```

**Template rendering** — use `FlexRender` for header and cell rendering. For user/object columns, use a custom cell template that extracts the type from the identifier and renders `<TypeBadge>` + full identifier text.

#### TypeBadge in Table Cells

Extract type name from an OpenFGA identifier like `user:alice` or `document:roadmap`:

```typescript
function extractType(identifier: string): string {
  return identifier.split(':')[0]
}
```

Render in table cell:
```vue
<TypeBadge :type-name="extractType(row.key.user)" />
<span class="ml-1 font-mono text-sm text-text-primary">{{ row.key.user }}</span>
```

#### Cursor Pagination (NOT Offset-Based)

OpenFGA uses continuation tokens for pagination. There are no page numbers.

- First request: `{ tuple_key: {...}, page_size: 50 }` — no continuation_token
- Response includes `continuation_token` (string or null/empty)
- Next page request: same body + `continuation_token: "<token from previous response>"`
- When `continuation_token` is null or empty string: no more pages

**UI pattern**: "Load More" button at the bottom of the table (not prev/next page buttons). Each click appends more tuples to the existing list. The store's `hasMore` computed flag controls button visibility.

#### Pinia Tuple Store — API Call Shape

```typescript
// The backend (Story 3.1) proxies OpenFGA's POST /read endpoint
// Frontend calls it as:
const response = await api.post<ReadTuplesResponse>(
  `stores/${storeId}/tuples/read`,
  {
    tuple_key: {
      ...(filterType.value ? { type: filterType.value } : {}),
      ...(filterRelation.value ? { relation: filterRelation.value } : {}),
      ...(filterUser.value ? { user: filterUser.value } : {}),
    },
    page_size: PAGE_SIZE,
    ...(continuationToken.value ? { continuation_token: continuationToken.value } : {}),
  }
)
```

**Important**: Only include `tuple_key` fields that have non-empty values. An empty `tuple_key: {}` means "read all tuples". If all three filters are empty, either send `tuple_key: {}` or omit the field entirely — both work.

#### Filter Debounce

Use a 300ms debounce on filter input changes before calling `fetchTuples`. This prevents hammering the API on every keystroke. Implement with a simple `setTimeout` / `clearTimeout` pattern in TupleFilterBar — no external debounce library needed.

```typescript
let debounceTimer: ReturnType<typeof setTimeout> | undefined

function onFilterChange() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    tupleStore.resetPagination()  // clear continuation token
    tupleStore.fetchTuples(connectionStore.storeId)
  }, 300)
}
```

When filters change, always reset pagination (clear continuation token, replace tuples instead of appending).

#### EmptyState for No Tuples

The empty state needs two action buttons: "Add Tuple" and "Go to Import/Export". EmptyState currently supports a single action (either `actionTo` for navigation or `@action` event). For Story 3.2, use the simpler pattern: show EmptyState with `actionLabel="Go to Import/Export"` and `actionTo="/import-export"`. The "Add Tuple" button will be added in Story 3.3 when the AddTupleForm is built. For now, one action button is sufficient.

#### `tuples/` Component Directory

The `frontend/src/components/tuples/` directory does not exist yet. Create it when creating `TupleTable.vue`.

### File Structure After This Story

```
frontend/src/
├── stores/
│   ├── tuples.ts                          # NEW: Pinia tuple store (tuples, filters, pagination, loading, error)
│   └── tuples.test.ts                     # NEW: tuple store unit tests
├── components/
│   └── tuples/                            # NEW directory
│       ├── TupleTable.vue                 # NEW: TanStack Table with TypeBadge cells, Load More pagination
│       ├── TupleTable.test.ts             # NEW: TupleTable component tests
│       ├── TupleFilterBar.vue             # NEW: Three filter inputs with clear buttons + debounce
│       └── TupleFilterBar.test.ts         # NEW: TupleFilterBar component tests
└── views/
    ├── TupleManager.vue                   # REWRITTEN: full implementation with store wiring, filter bar, table
    └── TupleManager.test.ts               # NEW: TupleManager view tests
```

**Dependencies added:**

```
frontend/package.json: +@tanstack/vue-table (production dependency)
```

**No backend files are created or modified in this story.** Backend tuple endpoints are Story 3.1's responsibility.

### What NOT to Do

- **Do NOT implement AddTupleForm or delete functionality** — that is Story 3.3. This story is read-only: view, filter, paginate. No row selection checkboxes, no delete buttons, no add form.
- **Do NOT implement client-side filtering** — all filtering happens server-side via the `tuple_key` parameter in the POST body. TanStack Table's built-in filtering is NOT used. We use manual/server-side mode.
- **Do NOT implement client-side pagination** — OpenFGA uses cursor-based continuation tokens. There are no page numbers. Use "Load More" pattern that appends results.
- **Do NOT cache tuples** — re-fetch on every view mount (data freshness pattern). The store persists filters but NOT tuple data across navigation.
- **Do NOT use `api.get` for reading tuples** — the endpoint is POST (OpenFGA Read is POST because filters go in the request body). Use `api.post`.
- **Do NOT install a debounce library** — use a simple `setTimeout`/`clearTimeout` pattern for the 300ms filter debounce.
- **Do NOT put TupleTable in `components/common/`** — it belongs in `components/tuples/` per architecture.md.
- **Do NOT create a new `TupleManager.vue` file** — rewrite the existing placeholder at `frontend/src/views/TupleManager.vue`.
- **Do NOT implement row selection** — that is Story 3.3 (batch delete requires selection). No checkboxes in this story.
- **Do NOT make the "Add Tuple" action functional** in the empty state — that is wired in Story 3.3.
- **Do NOT fetch tuples if no storeId** — guard with `if (connectionStore.storeId)` before calling `fetchTuples`.
- **Do NOT use offset-based pagination** (`skip`, `page`, `offset`) — OpenFGA does not support it. Only continuation tokens.

### References

- [Source: epics.md#Story 3.2] — FR18, FR19: Tuple table with filtering and pagination, Story 3.1 dependency
- [Source: epics.md#NFR4] — Smooth scrolling and filtering with up to 10,000 tuples
- [Source: architecture.md#Frontend Architecture] — TanStack Table v8 headless for data tables, Pinia stores, useApi composable
- [Source: architecture.md#Structure Patterns] — `components/tuples/` directory, `stores/tuples.ts` location
- [Source: architecture.md#Communication Patterns] — Pinia setup syntax with loading/error/data, useApi pattern
- [Source: architecture.md#Naming Patterns] — API: `stores/:storeId/tuples/read`; TypeScript interfaces: PascalCase
- [Source: ux-design-specification.md#Search & Filtering Patterns] — Tuple Manager filters always visible, monospace, AND logic, X clear buttons, persist on navigation
- [Source: ux-design-specification.md#Empty States] — Tuple Manager: "No tuples in this store" / "Add Tuple" / "Go to Import/Export"
- [Source: ux-design-specification.md#Data Freshness Pattern] — Re-fetch on every view mount, no caching
- [Source: ux-design-specification.md#Component Library] — TupleTable: TanStack Table v8, Tailwind-styled cells, row selection (Story 3.3), filter bar
- [Source: ux-design-specification.md#TypeBadge usage] — Used in TupleTable cells for user/object columns
- [Source: prd.md#FR18-FR19] — View tuples in paginated data table, filter by type/relation/user

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

1. **Backend API mismatch**: Story spec assumed `POST /tuples/read` but backend (Story 3.1) exposes `GET /tuples` with query params. Adapted store to use `api.get` with URLSearchParams.
2. **TupleFilterBar hasFilters**: Used local `ref` initially, watcher timing caused test failure. Fixed by using `computed` derived from store filter values.

### Completion Notes List

- `@tanstack/vue-table` installed; TupleTable uses `useVueTable` with manual pagination
- Pinia tuple store: `fetchTuples` (GET with query params), `fetchNextPage` (appends), `resetTuples` (preserves filters), `clearFilters`
- TupleTable: TanStack Table with TypeBadge in user/object columns, "Load More" button, tuple count
- TupleFilterBar: 3 monospace inputs with clear X buttons, computed `hasFilters`, 300ms debounce, "Clear All"
- TupleManager: rewritten with store watcher, loading/empty/data states
- 177 frontend tests pass; 24 new tests added

### File List

- `frontend/package.json` — MODIFIED: added `@tanstack/vue-table`
- `frontend/src/stores/tuples.ts` — NEW: Pinia tuple store
- `frontend/src/stores/tuples.test.ts` — NEW: 8 unit tests
- `frontend/src/components/tuples/TupleTable.vue` — NEW: TanStack Table with TypeBadge
- `frontend/src/components/tuples/TupleTable.test.ts` — NEW: 6 component tests
- `frontend/src/components/tuples/TupleFilterBar.vue` — NEW: 3 filter inputs with debounce
- `frontend/src/components/tuples/TupleFilterBar.test.ts` — NEW: 4 component tests
- `frontend/src/views/TupleManager.vue` — REWRITTEN: full implementation
- `frontend/src/views/TupleManager.test.ts` — NEW: 6 view tests

### Change Log

- 2026-03-27: Story file created — status: ready-for-dev
- 2026-03-27: Implementation complete — status: review
