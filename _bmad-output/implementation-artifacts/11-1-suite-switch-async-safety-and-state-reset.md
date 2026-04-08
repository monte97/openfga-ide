# Story 11.1: Suite Switch Async Safety and State Reset

Status: done

## Story

As a developer using the suite editor,
I want suite switching to cancel in-flight operations and reset transient UI state,
So that I never see stale data from a previous suite or trigger saves against the wrong suite.

## Acceptance Criteria

1. **AC1: fetchSuite cancellation on suite switch** — When user switches from suite A to suite B while fetchSuite(A) is in-flight, the request for A is aborted and activeSuite is set only from B's response.
2. **AC2: saveDefinition cancellation on suite switch** — When user switches suites, any pending debounce timer is cleared and any in-flight saveDefinition is aborted. No save completes for the previous suite after the switch.
3. **AC3: saveDefinition cancellation on rapid edits** — When a new debounced save fires while a previous save is in-flight, the previous is aborted. Only the most recent save completes.
4. **AC4: UI state reset on suite switch** — On suite switch: `editorMode` resets to `'form'`, `expandedGroupIds` is cleared, `fixtureValidationError` is cleared, pending timers are cleared.
5. **AC5: Polling circuit breaker** — After 5 consecutive fetch errors, polling stops automatically with a visible error and "Retry" action.

## Tasks / Subtasks

- [x] Task 1: Add `AbortSignal` support to `useApi` composable (AC: 1, 2, 3)
  - [x]1.1: Add optional `signal` parameter to `get()`, `put()`, `post()`, `del()` in `useApi.ts`
  - [x]1.2: Pass `signal` to the underlying `fetch()` calls
  - [x]1.3: Suppress toast on `AbortError` (aborted requests should not show error toasts)
  - [x]1.4: Add tests for signal support and AbortError suppression in `useApi.test.ts`

- [x] Task 2: Add AbortController to `fetchSuite` in `suites.ts` (AC: 1)
  - [x]2.1: Add a module-scoped `fetchAbort: AbortController | null` ref in the store
  - [x]2.2: At the start of `fetchSuite()`, abort the previous controller and create a new one
  - [x]2.3: Pass `signal` to `api.get()` call
  - [x]2.4: In catch, detect `AbortError` and return early (do not set activeSuite or error)
  - [x]2.5: Add tests: rapid fetchSuite calls → only last one sets activeSuite

- [x] Task 3: Add AbortController to `saveDefinition` in `suites.ts` (AC: 2, 3)
  - [x]3.1: Add a module-scoped `saveAbort: AbortController | null` ref
  - [x]3.2: At the start of `saveDefinition()`, abort the previous controller and create a new one
  - [x]3.3: Pass `signal` to `api.put()` call
  - [x]3.4: In catch, detect `AbortError` and return early (no toast, no error state)
  - [x]3.5: Add tests: rapid saveDefinition calls → only last one completes

- [x] Task 4: Suite switch cleanup in `SuiteEditor.vue` (AC: 2, 4)
  - [x]4.1: In the `watch(props.suite.id)` watcher, clear `jsonSaveTimer` before calling fetchSuite
  - [x]4.2: Call `editorStore.setEditorMode('form')` (verify this is already done — if so, skip)
  - [x]4.3: Call `editorStore.clearExpandedGroups()` (verify already done — if so, skip)
  - [x]4.4: Add tests for timer cancellation on suite switch

- [x] Task 5: FixtureEditor state cleanup on suite switch (AC: 4)
  - [x]5.1: Verify `fixtureValidationError` is cleared on `suite.id` change (agent analysis says it already is — confirm and skip if true)
  - [x]5.2: Verify `fixtureSaveTimer` is cleared on suite change (analysis says it is — confirm)
  - [x]5.3: If either is not cleared, add cleanup in the `watch(props.suite.id)` watcher

- [x] Task 6: Polling circuit breaker in `runs.ts` (AC: 5)
  - [x]6.1: Add `consecutiveErrors` counter ref (reset to 0 on successful fetch)
  - [x]6.2: Increment counter on fetch error in `fetchRun()`
  - [x]6.3: When counter exceeds threshold (5), call `stopPolling()` and set `pollingError` ref
  - [x]6.4: Add `retryPolling()` action that resets counter, clears error, and calls `startPolling()`
  - [x]6.5: Expose `pollingError` and `retryPolling` in the store return
  - [x]6.6: Add "Polling stopped" banner + "Retry" button in `RunProgress.vue` (or wherever run status is shown)
  - [x]6.7: Add tests: 5 consecutive errors → polling stops; retryPolling → resumes

## Dev Notes

### Core Pattern: AbortController in useApi

The `useApi` composable (`frontend/src/composables/useApi.ts`) wraps `fetch()` for all HTTP methods. It currently does NOT accept an `AbortSignal`. The minimal change:

```typescript
// useApi.ts — add signal to all methods
async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/${path}`, { signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    toast.show({ type: 'error', message: 'Network error' })
    throw new Error('Network error')
  }
  // ... rest unchanged
}
```

Same pattern for `put()`, `post()`, `del()`. The key detail: **AbortError must be re-thrown without a toast**. Callers handle AbortError by returning early.

### Store Pattern: AbortController lifecycle

```typescript
// In suites.ts store
let fetchAbort: AbortController | null = null

async function fetchSuite(id: string) {
  fetchAbort?.abort()
  fetchAbort = new AbortController()
  loading.value = true
  try {
    const data = await api.get<Suite>(`suites/${id}`, fetchAbort.signal)
    activeSuite.value = data
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
```

Same pattern for `saveDefinition()` with its own `saveAbort` controller. **Do not share a single AbortController between fetch and save** — they are independent operations.

### SuiteEditor.vue Suite Switch Watcher

Current watcher (lines ~82-88) already calls `fetchSuite()`, `deselectTestCase()`, `setEditorMode('form')`, `clearExpandedGroups()`. **Verify this** — if all 4 are present, Task 4 is mostly about adding `jsonSaveTimer` cleanup:

```typescript
watch(() => props.suite?.id, (newId) => {
  if (jsonSaveTimer) { clearTimeout(jsonSaveTimer); jsonSaveTimer = null }
  // ... existing cleanup
  if (newId) suiteStore.fetchSuite(newId)
})
```

The AbortController in `fetchSuite` handles the in-flight request cancellation automatically.

### FixtureEditor.vue — Likely Already Correct

Agent analysis shows `FixtureEditor.vue` lines 28-31 already clear `fixtureValidationError` and `fixtureSaveTimer` on `suite.id` change. **Verify and skip if confirmed.** If the watch doesn't exist or is incomplete, add it.

### Polling Circuit Breaker

In `runs.ts`, the `fetchRun()` function (lines ~66-79) catches errors silently and polling continues. Add:

```typescript
const consecutiveErrors = ref(0)
const pollingError = ref<string | null>(null)
const MAX_POLL_ERRORS = 5

async function fetchRun(runId: string) {
  try {
    // ... existing fetch logic
    consecutiveErrors.value = 0 // reset on success
  } catch {
    consecutiveErrors.value++
    if (consecutiveErrors.value >= MAX_POLL_ERRORS) {
      stopPolling()
      pollingError.value = 'Polling stopped after multiple failures'
    }
  }
}

function retryPolling() {
  consecutiveErrors.value = 0
  pollingError.value = null
  if (activeRunId.value) startPolling(activeRunId.value)
}
```

### Files to Modify

| File | Change |
|------|--------|
| `frontend/src/composables/useApi.ts` | Add `signal?: AbortSignal` to all methods, suppress toast on AbortError |
| `frontend/src/composables/useApi.test.ts` | Tests for signal support, AbortError handling |
| `frontend/src/stores/suites.ts` | AbortController on fetchSuite + saveDefinition |
| `frontend/src/stores/suites.test.ts` | Tests for abort behavior on rapid calls |
| `frontend/src/views/SuiteEditor.vue` | Clear jsonSaveTimer in suite switch watcher |
| `frontend/src/views/SuiteEditor.test.ts` | Test timer cleanup on suite switch |
| `frontend/src/components/test-suites/FixtureEditor.vue` | Verify cleanup (likely no change) |
| `frontend/src/stores/runs.ts` | Add consecutiveErrors, pollingError, retryPolling |
| `frontend/src/stores/runs.test.ts` | Tests for circuit breaker |
| `frontend/src/components/test-suites/RunProgress.vue` (or equivalent) | Polling error banner + Retry button |

### Testing Standards

- Co-located tests next to source files
- Use `vi.mock` pattern for store mocking (NO `@pinia/testing`)
- Use `vi.useFakeTimers()` for debounce/polling tests
- Use reactive mocks for `watch` tests (see CLAUDE.md)
- Test AbortError handling by creating an AbortController, aborting it, and verifying no side effects

```typescript
// Example: test fetchSuite abort
it('aborts previous fetchSuite on rapid suite switch', async () => {
  const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
  fetchMock.mockImplementation(() => new Promise((r) => setTimeout(r, 1000)))

  store.fetchSuite('suite-1') // starts first fetch
  store.fetchSuite('suite-2') // should abort first

  expect(abortSpy).toHaveBeenCalledTimes(1)
})
```

### What NOT to Change

- Do not modify the debounce timing (600ms) — it's correct
- Do not add AbortController to `fetchSuites()` (list endpoint) — not a race concern
- Do not change polling interval (2000ms) — it's correct
- Do not add rollback on saveDefinition failure — that's a separate concern (deferred-work.md line 46)
- Do not touch `SuiteJsonEditor.vue` or its CodeMirror integration — it only emits events, parent handles saves

### Deferred Work Items Resolved by This Story

From `_bmad-output/implementation-artifacts/deferred-work.md`:

| Item | Source | Resolution |
|------|--------|------------|
| fetchSuite last-write-wins race | 9-3 | AC1: AbortController |
| Suite switch race: concurrent fetchSuite calls | 8-2 | AC1: AbortController |
| No debounce on onJsonChange (concurrent saves) | 8-2, 8-3 | AC3: AbortController on saveDefinition |
| editorMode not reset on suite.id change | 8-3 | AC4: verify/add in watcher |
| expandedGroupIds not cleared on suite switch | 8-2 | AC4: verify/add in watcher |
| Validation error banner persists across tab switches | 8-3 | AC4: verify in FixtureEditor |
| Polling leaks on permanent network loss | 9-3 | AC5: circuit breaker |

### Previous Story Intelligence

Epics 7-10 established these patterns:
- `suiteEditor.ts` store manages UI state (expandedGroupIds as reactive Set, editorMode as string ref)
- `suites.ts` store manages data (activeSuite, suites list, CRUD operations)
- `runs.ts` store manages polling via setInterval with 2000ms interval
- Debounce is implemented in view components (SuiteEditor.vue, FixtureEditor.vue) via setTimeout, not in stores
- `useApi` composable is the single HTTP abstraction — all stores use it

### References

- [Source: deferred-work.md — lines 14-15, 38-40, 46-52]
- [Source: architecture.md — Communication Patterns, Polling Pattern]
- [Source: CLAUDE.md — Testing Conventions, Pinia reactive Set pattern]

### Review Findings

- [x] [Review][Patch] saveAbort not aborted on suite switch — watcher clears `jsonSaveTimer` but does not abort in-flight `saveDefinition`. Expose `cancelSave()` from `suites.ts` and call it in the `watch(props.suite.id)` watcher in `SuiteEditor.vue` before `fetchSuite`. [SuiteEditor.vue:83 / suites.ts:134]
- [x] [Review][Patch] triggerRun does not reset consecutiveErrors — if circuit breaker previously tripped, starting a new run via `triggerRun()` leaves `consecutiveErrors` at 5; the first polling error on the new run immediately re-trips the breaker. Add `consecutiveErrors.value = 0; pollingError.value = null` at the start of `triggerRun()`. [runs.ts:53]
- [x] [Review][Defer] isAbortError helper not exported from useApi.ts — suites.ts uses inline `err instanceof DOMException && err.name === 'AbortError'` checks instead of the shared helper. Low impact, cosmetic duplication. [useApi.ts:3 / suites.ts:127,143] — deferred, low-impact refactor; inline checks are correct and readable

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
