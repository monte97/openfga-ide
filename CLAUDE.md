# Project Conventions — openfga-viewer

Guidelines derived from retrospectives. These override default behavior and apply to all dev agents, SM agents, and code review agents working on this project.

---

## Testing Conventions

### No `@pinia/testing`

`@pinia/testing` is NOT installed. Do not reference `createTestingPinia` in dev notes or test code.

**Correct pattern — mock stores with `vi.mock`:**

```typescript
vi.mock('@/stores/myStore', () => ({
  useMyStore: vi.fn(),
}))

import { useMyStore } from '@/stores/myStore'

// In beforeEach or per test:
vi.mocked(useMyStore).mockReturnValue({
  someState: 'value',
  someAction: vi.fn(),
} as unknown as ReturnType<typeof useMyStore>)
```

### Reactive mock pattern for `watch` tests

When testing Vue components that use `watch(() => store.someRef, ...)`, the mock must return a reactive object — otherwise the watcher never fires:

```typescript
import { ref, reactive } from 'vue'

const storeIdRef = ref('')
vi.mocked(useConnectionStore).mockReturnValue(
  reactive({ storeId: storeIdRef }) as unknown as ReturnType<typeof useConnectionStore>
)
// Now changing storeIdRef.value triggers the watcher
storeIdRef.value = 'new-store'
await nextTick()
```

### Pinia mock result isolation

When a Pinia store calls another Pinia store internally (e.g. `useTupleStore()` inside `useRelationshipGraphStore`), use `.mock.results.at(-1)!.value` to get the instance created during the current test — NOT `.mock.results[0].value` which may belong to a prior test:

```typescript
const store = useRelationshipGraphStore()
const tupleStoreMock = vi.mocked(useTupleStore).mock.results.at(-1)!.value
await store.loadGraph('store-42')
expect(tupleStoreMock.fetchTuples).toHaveBeenCalledWith('store-42')
```

### Testing components that use `document.createElement` internally

When a Vue component triggers a file download via Blob URL (i.e., it calls `document.createElement('a')` internally), do NOT mock `document.createElement` in tests — this causes infinite recursion because Vue's component system itself uses `createElement`.

**Correct pattern — mock the Pinia store action instead:**

```typescript
vi.mock('@/stores/importExport', () => ({
  useImportExportStore: vi.fn(),
}))
// The store action (e.g. exportStore) never executes the Blob/createElement logic in tests
```

This keeps the download logic untested at the DOM level (acceptable) while testing the component's UI behavior correctly.

### Story task checklists must enumerate reactive/event test cases

When specifying tests in story tasks, do NOT leave it as "co-locate test file." Explicitly list:

- `watch` callback behavior (state change → expected side effect)
- `onMounted` + `onUnmounted` side effects (listener registration/cleanup)
- Event handlers: click, keydown, mousedown
- Store action call sequences (what actions are called, in what order)
- Empty state / zero-item edge cases in rendered UI

---

## Architecture Conventions

### Don't defer stores that the next story will need

If a story's dev notes say "a store provides a clean abstraction point" or "optional but useful for future stories," and the next story in the same epic clearly needs it — create it. The cost of adding it later is higher than the cost of adding it now.

### Pinia reactive Set pattern

JavaScript `Set` mutations (`.add()`, `.delete()`) do NOT trigger Vue 3 reactivity. Always replace the Set with a new reference:

```typescript
// CORRECT
const updated = new Set(mySet.value)
updated.add(item)
mySet.value = updated  // reference change triggers reactivity

// WRONG — Vue does not detect this
mySet.value.add(item)
```

### Vue Flow inspector panels: v-show + nextTick, not v-if

Using `v-if` + `:class="{ 'is-open': condition }"` simultaneously causes CSS transitions to never fire (element is added to DOM already with the open class). Use `v-show` + a separate `isOpen` ref driven by a `watch` + `nextTick`:

```typescript
const isOpen = ref(false)
watch(() => store.selectedNodeId, (val) => {
  if (val) nextTick(() => { isOpen.value = true })
  else isOpen.value = false
})
```

---

## SM / Story Authoring Conventions

When writing story dev notes test pattern sections, always use the `vi.mock` pattern (see above). Do not reference `createTestingPinia` or `@pinia/testing`.

When writing test task checklists, include at minimum:
- One test per `watch` callback in the component
- One test per event listener (`onMounted` addEventListener)
- One test per store action sequence
- One empty-state / null-state test per rendered list
