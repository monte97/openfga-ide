# Story 11.2: Connection Store Robustness and UX Polish

Status: done

## Story

As a user managing store connections,
I want concurrent store fetches to be safe, loading states to be accurate, and search to give feedback,
so that I always see correct, up-to-date store data with clear status indicators.

## Acceptance Criteria

1. **AC1: fetchStores deduplication** — When `fetchStores()` is already in-flight and a second call is triggered, the second call is deduplicated (returns the same promise). `stores.value` is set exactly once from the response.
2. **AC2: Separate loading flags** — `fetchConnection` and `updateConnection` each have their own loading flag (`loadingFetch` and `loadingUpdate`) so each spinner is independent.
3. **AC3: storeList reset on fetch error** — When `fetchStores()` in `stores.ts` fails and `storeList` already contains cached data, `storeList.value` is set to `[]` to prevent stale data display.
4. **AC4: "No stores found" feedback in StoreSelector** — When the user types in the StoreSelector and the filter matches zero stores, the dropdown shows a "No stores found" message instead of disappearing silently.
5. **AC5: Error toast cap** — A maximum of 3 error toasts are visible simultaneously. When a 4th error arrives, the oldest error toast is dismissed first.

## Tasks / Subtasks

- [x] Task 1: fetchStores deduplication in `connection.ts` (AC: 1)
  - [x]1.1: Add `let fetchStoresPromise: Promise<void> | null = null` inside the store setup function
  - [x]1.2: In `fetchStores()`, if `fetchStoresPromise` is non-null, return it immediately
  - [x]1.3: Otherwise, assign the IIFE promise to `fetchStoresPromise` and clear it in the `finally` block
  - [x]1.4: Add tests: two concurrent `fetchStores()` calls → fetch is called once, `stores.value` set once

- [x] Task 2: Separate loading flags in `connection.ts` (AC: 2)
  - [x]2.1: Replace the single `loading = ref(false)` with `loadingFetch = ref(false)` (for `fetchConnection`) and `loadingUpdate = ref(false)` (for `updateConnection`)
  - [x]2.2: Update both functions to use their respective flag
  - [x]2.3: Update store return object: replace `loading` with `loadingFetch` and `loadingUpdate`
  - [x]2.4: Update `connection.spec.ts`: replace `store.loading` with `store.loadingFetch` in initial state and `fetchConnection` tests
  - [x]2.5: Add test: simultaneous `fetchConnection` + `updateConnection` → each flag is independent

- [x] Task 3: storeList reset on error in `stores.ts` (AC: 3)
  - [x]3.1: In `fetchStores()` catch block in `stores.ts`, add `storeList.value = []` before setting `error.value`
  - [x]3.2: Add test: `fetchStores()` fails when `storeList` already has data → `storeList` is cleared to `[]`

- [x] Task 4: "No stores found" message in `StoreSelector.vue` (AC: 4)
  - [x]4.1: Change `v-if="filteredStores.length > 0"` on `ComboboxOptions` to `v-if="query || filteredStores.length > 0"`
  - [x]4.2: Add a `<li>` inside `ComboboxOptions` with `v-if="filteredStores.length === 0 && query"` showing "No stores found"
  - [x]4.3: Add test to `StoreSelector.spec.ts`: typing a non-matching query → input contains "no stores found" text (case-insensitive)

- [x] Task 5: Error toast cap in `useToast.ts` (AC: 5)
  - [x]5.1: In `show()`, before pushing a new error toast, count existing error toasts; if ≥ 3, dismiss the oldest one (index 0 among error toasts)
  - [x]5.2: Add `useToast.test.ts` with tests: 4th error toast replaces oldest; non-error toasts not affected by cap; cap works independently per type

### Review Findings

- [x] [Review][Defer] "No stores found" `<li>` lacks `role="option"` inside `role="listbox"` container [StoreSelector.vue:63] — deferred, intentional per spec (plain li prevents HeadlessUI treating it as selectable); minor ARIA non-conformance
- [x] [Review][Defer] `stores.ts` clears storeList on error while `connection.ts` keeps stale stores — inconsistent error policies for the same resource [stores.ts:37 / connection.ts:101] — deferred, pre-existing architectural split between two store systems
- [x] [Review][Defer] `storeList` reset on retry failure causes visible empty-state flash mid-session [stores.ts:37] — deferred, intentional behavior per AC3; aesthetic concern

## Dev Notes

### AC1: fetchStores Deduplication Pattern

`connection.ts`'s `fetchStores()` (line 90-97) currently has no guard against concurrent calls. It is called from `updateConnection()` (line 81) which itself is called from `ConnectionPopover.vue`. A page mount + simultaneous `updateConnection` could trigger two concurrent `fetchStores` calls, setting `stores.value` twice.

The correct pattern is a **promise coalescing guard**:

```typescript
let fetchStoresPromise: Promise<void> | null = null

async function fetchStores(): Promise<void> {
  if (fetchStoresPromise) return fetchStoresPromise
  fetchStoresPromise = (async () => {
    try {
      const data = await api.get<ListStoresResponse>('stores')
      stores.value = data.stores
    } catch {
      // non-fatal: keep existing stores (connection store is display-only cache)
    } finally {
      fetchStoresPromise = null
    }
  })()
  return fetchStoresPromise
}
```

Note: `fetchStoresPromise` is a **module-scoped let** inside `defineStore()`'s setup function (same pattern as `fetchAbort`/`saveAbort` in `suites.ts` from Story 11.1). Do NOT use a `ref()` — this is imperative state, not reactive.

### AC2: Separate Loading Flags

`connection.ts` currently has one `loading = ref(false)` used by both `fetchConnection()` (lines 46-62) and `updateConnection()` (lines 73-88). They share it, so if both run concurrently, the flag reflects the last-one-to-finish.

After the change:
- `loadingFetch = ref(false)` — set in `fetchConnection`
- `loadingUpdate = ref(false)` — set in `updateConnection`

**Connection to existing tests:** `connection.spec.ts` has two assertions on `store.loading`:
- Line 23: initial state → change to check both `store.loadingFetch` and `store.loadingUpdate`
- Line 37: after `fetchConnection` → change to `store.loadingFetch`

**UI impact:** `ConnectionPopover.vue` does NOT destructure `loading` from the store — it uses local `saving` and `testing` refs. No component changes needed for AC2.

**Store return object:** Replace `loading` with `loadingFetch` and `loadingUpdate` in the returned object.

### AC3: storeList Reset on Error

`stores.ts`'s `fetchStores()` (lines 30-41) does not clear `storeList.value` on error. The existing test at line 61 of `stores.spec.ts` only passes because initial state is empty. The AC requires clearing stale cached data:

```typescript
} catch (err) {
  storeList.value = []    // ← add this
  error.value = (err as Error).message
}
```

Add a new test that pre-populates `storeList` before the failure to prove the clearing behavior.

### AC4: StoreSelector "No Stores Found"

`StoreSelector.vue` currently has:
```html
<ComboboxOptions
  v-if="filteredStores.length > 0"
  ...
>
```

When `query` is non-empty but nothing matches, the dropdown disappears. The fix:

```html
<ComboboxOptions
  v-if="query || filteredStores.length > 0"
  class="..."
>
  <ComboboxOption
    v-for="store in filteredStores"
    :key="store.id"
    ...
  >
    ...
  </ComboboxOption>
  <!-- Fallback row when search yields no results -->
  <li
    v-if="filteredStores.length === 0 && query"
    class="px-3 py-2 text-sm text-text-secondary"
  >
    No stores found
  </li>
</ComboboxOptions>
```

**Important:** The "No stores found" `<li>` is NOT a `ComboboxOption` — it is not selectable. It must be a plain `<li>` to avoid HeadlessUI treating it as an option.

**StoreSelector.spec.ts:** The existing tests use `setActivePinia(createPinia())` and mount with `{ global: { plugins: [pinia] } }` — follow the same pattern. To test the no-results message, mount with stores populated, set a query that doesn't match, and check the DOM for the "No stores found" text.

However, Headless UI's `ComboboxOptions` may not render unless the input is focused/active in a test environment. A simpler approach: test via the component's computed (expose `filteredStores` indirectly) or verify the `<li>` condition logic directly. If the HeadlessUI dropdown isn't rendered in tests, verify via `wrapper.text()` contains "No stores found" after a fake query, or set `stores` to empty and `query` to a non-empty value via `wrapper.find('input').setValue(...)`.

### AC5: Error Toast Cap

`useToast.ts`'s `show()` function (line 13-23) pushes error toasts indefinitely since `type !== 'error'` triggers auto-dismiss but errors persist forever. The fix:

```typescript
const MAX_ERROR_TOASTS = 3

function show({ type, message }: { type: Toast['type']; message: string }): string {
  if (type === 'error') {
    const errorToasts = toasts.filter((t) => t.type === 'error')
    if (errorToasts.length >= MAX_ERROR_TOASTS) {
      dismiss(errorToasts[0].id)  // dismiss the oldest
    }
  }

  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const toast: Toast = { id, type, message }
  if (type !== 'error') {
    toast.timeoutId = setTimeout(() => dismiss(id), 5000)
  }
  toasts.push(toast)
  return id
}
```

**New test file:** `frontend/src/composables/useToast.test.ts` (co-located with the source).

Tests to include:
- Basic: show adds a toast, returns an id
- Dismiss: removes the toast
- Non-error toasts auto-dismiss after 5s (use fake timers)
- Error toasts do NOT auto-dismiss
- **AC5 cap**: adding 4 error toasts → only 3 remain, oldest is gone
- **Non-error not affected**: adding 4 success toasts → all 4 remain (cap is error-only)
- Mixed toasts: 3 errors + 1 success → 4th error replaces oldest error, success remains

**Reset pattern:** `useToast` uses a module-level `reactive` array. In `beforeEach`, dismiss all existing toasts to reset state (same pattern as other tests: `[...toasts].forEach((t) => dismiss(t.id))`).

### Files to Touch

| File | Task | Change |
|------|------|--------|
| `frontend/src/stores/connection.ts` | 1, 2 | fetchStores deduplication; split loading flags |
| `frontend/src/stores/__tests__/connection.spec.ts` | 1, 2 | Update `store.loading` → `store.loadingFetch`; add new tests |
| `frontend/src/stores/stores.ts` | 3 | Clear `storeList.value` in catch |
| `frontend/src/stores/__tests__/stores.spec.ts` | 3 | Add stale-data-cleared test |
| `frontend/src/components/layout/StoreSelector.vue` | 4 | "No stores found" fallback |
| `frontend/src/components/layout/__tests__/StoreSelector.spec.ts` | 4 | Add no-results test |
| `frontend/src/composables/useToast.ts` | 5 | Error toast cap |
| `frontend/src/composables/useToast.test.ts` (new) | 5 | Full toast test suite |

### What NOT to Change

- Do NOT change `stores.ts`'s `fetchStores()` deduplication — only `connection.ts`'s version needs it (AC1 is specifically about the one called from `updateConnection`)
- Do NOT add a loading flag to `connection.ts`'s `fetchStores()` — it is a non-fatal background operation with no spinner
- Do NOT change the `testConnection()` function — it has no loading state by design (caller manages its own)
- Do NOT rename `stores.ts`'s `storeList` — it's intentionally different from `connection.ts`'s `stores`
- Do NOT add abort controllers here — that was Story 11.1's scope

### Testing Standards

- Co-located tests next to source files (`.test.ts`) or in `__tests__/` for components (`.spec.ts`)
- Use `vi.mock` pattern — NO `@pinia/testing` or `createTestingPinia`
- Use `vi.useFakeTimers()` for toast auto-dismiss timing tests
- `useToast` is module-level state: always clear toasts in `beforeEach` via `[...toasts].forEach((t) => dismiss(t.id))`
- For `StoreSelector` tests, follow the existing pattern: `setActivePinia(createPinia())`, mount with `{ global: { plugins: [pinia] } }`

### Project Context

- `connection.ts` pattern: module-level imperative guards (not refs) for in-flight promises — same as `fetchAbort`/`saveAbort` pattern in `suites.ts`
- Tests in `stores/__tests__/` use dynamic imports: `const { useConnectionStore } = await import('../connection')` — follow this pattern for new tests in those files
- `useToast.test.ts` should be co-located with `useToast.ts` in `frontend/src/composables/`

### References

- [Source: epics.md — Epic 11, Story 11.2, AC1-AC5]
- [Source: `frontend/src/stores/connection.ts` — current fetchStores, loading, fetchConnection, updateConnection]
- [Source: `frontend/src/stores/stores.ts` — fetchStores catch block]
- [Source: `frontend/src/components/layout/StoreSelector.vue` — filteredStores, ComboboxOptions v-if]
- [Source: `frontend/src/composables/useToast.ts` — show(), toasts array]
- [Source: `frontend/src/stores/__tests__/connection.spec.ts` — store.loading usage at lines 23, 37]
- [Source: `_bmad-output/implementation-artifacts/11-1-*` — module-scoped AbortController pattern]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- AC1: fetchStores deduplication via promise coalescing guard in `connection.ts`. Concurrent calls return the same in-flight promise; `stores.value` is set exactly once.
- AC2: Split `loading` into `loadingFetch` (fetchConnection) and `loadingUpdate` (updateConnection). Existing `connection.spec.ts` tests updated. New test verifies flags are independent while both operations run concurrently.
- AC3: Added `storeList.value = []` to `stores.ts`'s `fetchStores` catch block. New test verifies stale data is cleared after a fetch failure.
- AC4: `StoreSelector.vue` updated — `ComboboxOptions` now renders when `query` is non-empty (even with no matches), and shows a non-selectable "No stores found" `<li>` as fallback. Test added and passes.
- AC5: `useToast.ts` now caps error toasts at 3. When a 4th error toast arrives, the oldest is dismissed first. Non-error toasts unaffected. Full test file (`useToast.test.ts`) added with 7 tests.
- All 70 test files pass (645 tests), no regressions.

### File List

- `frontend/src/stores/connection.ts`
- `frontend/src/stores/__tests__/connection.spec.ts`
- `frontend/src/stores/stores.ts`
- `frontend/src/stores/__tests__/stores.spec.ts`
- `frontend/src/components/layout/StoreSelector.vue`
- `frontend/src/components/layout/__tests__/StoreSelector.spec.ts`
- `frontend/src/composables/useToast.ts`
- `frontend/src/composables/useToast.test.ts` (new)
