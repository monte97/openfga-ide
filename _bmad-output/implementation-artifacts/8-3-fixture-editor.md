# Story 8.3: Fixture Editor

## Status: done

## Story

As a developer,
I want to view and edit the fixture (authorization model + tuples) within the suite editor,
So that I can define the test data my suite runs against without switching tools.

## Acceptance Criteria

**AC1:** Given a suite is open in the editor, when the user navigates to the "Fixture" tab, then the fixture is displayed in the existing export format `{ model, tuples }` editable inline via the existing `SuiteJsonEditor` component

**AC2:** Given the user is connected to an OpenFGA store and the fixture section is displayed, when the user clicks "Import current store as fixture", then the button fetches `GET /api/stores/:storeId/export` and populates the fixture from the response `{ model, tuples }` fields

**AC3:** Given the user edits the fixture JSON, when the fixture contains a top-level JSON parse error, then lintGutter shows error markers (via the existing `SuiteJsonEditor` `jsonParseLinter`); when the JSON is structurally invalid (e.g. `tuples` is not an array, root is not an object), then a validation banner below the editor shows the Zod error message — note: Zod errors are NOT shown inline in the lintGutter (no CodeMirror position available for structural errors)

**AC4:** Given no fixture is defined for a suite, when the user views the Fixture tab, then a message "No fixture defined" and an "Add empty fixture" CTA are displayed; clicking CTA creates an empty fixture `{}` and enters editing mode

**AC5:** Given the fixture is edited and valid, when the user stops editing (JSON change event), then the fixture is saved via `saveDefinition` with the updated `definition.fixture`

**AC6:** Given fixture data is present in the backend, when `fetchSuite` loads the suite, then `definition.fixture` is preserved in the frontend `activeSuite` (current code drops it — this bug must be fixed in this story)

## Tasks / Subtasks

- [ ] Task 1: Update types and store in `suites.ts`
  - [ ] 1.1 Add `SuiteFixture` interface: `{ model?: unknown; tuples?: unknown[] }`
  - [ ] 1.2 Add `fixture?: SuiteFixture` to `SuiteDefinition`
  - [ ] 1.3 Fix `fetchSuite` to preserve `fixture` when rebuilding definition (see Bug Fix section in Dev Notes)
  - [ ] 1.4 Fix `addGroup`, `removeGroup`, `updateGroup`, `addTestCase`, `updateTestCase`, `removeTestCase` to preserve `fixture` when rebuilding definition
  - [ ] 1.5 Add `updateFixture(fixture: SuiteFixture | null)` action

- [ ] Task 2: Add tests for store changes in `suites.test.ts`
  - [ ] 2.1 Test `fetchSuite` preserves `fixture` from backend response
  - [ ] 2.2 Test `addGroup` preserves existing `fixture`
  - [ ] 2.3 Test `updateFixture` sets fixture and saves definition

- [ ] Task 3: Create `FixtureEditor.vue` component
  - [ ] 3.1 Empty state: "No fixture defined" + "Add empty fixture" button
  - [ ] 3.2 Editing state: `SuiteJsonEditor` bound to `JSON.stringify(fixture, null, 2)`
  - [ ] 3.3 "Import current store as fixture" button (shown in both states, disabled when `connectionStore.storeId` is empty)
  - [ ] 3.4 On JSON change: validate fixture structure via Zod, show `data-testid="fixture-validation-banner"` on error, call `suiteStore.updateFixture(parsed)` on valid
  - [ ] 3.5 Import button: fetch `/api/stores/:storeId/export`, extract `{ model, tuples }`, call `updateFixture`
  - [ ] 3.6 `data-testid="fixture-empty-state"` on empty state div

- [ ] Task 4: Create `FixtureEditor.test.ts`
  - [ ] 4.1 Test: empty state shown when no fixture
  - [ ] 4.2 Test: editor shown when fixture exists
  - [ ] 4.3 Test: "Add empty fixture" calls `updateFixture({})` then `saveDefinition`
  - [ ] 4.4 Test: import button disabled when no `storeId`
  - [ ] 4.5 Test: `updateFixture` called after SuiteJsonEditor emits valid JSON
  - [ ] 4.6 Test: validation banner shown for structural errors (e.g. `tuples` not array)
  - [ ] 4.7 Test: import fetches `/api/stores/:storeId/export` and calls `updateFixture`

- [ ] Task 5: Integrate into `SuiteEditor.vue`
  - [ ] 5.1 Add "Fixture" as third tab in `EDITOR_TABS` array
  - [ ] 5.2 Add `v-show="editorStore.editorMode === 'fixture'"` panel with `<FixtureEditor>`
  - [ ] 5.3 Update `editorMode` type in `suiteEditorStore` to `'form' | 'json' | 'fixture'`

- [ ] Task 6: Add SuiteEditor test
  - [ ] 6.1 Test: "Fixture" tab button is rendered
  - [ ] 6.2 Test: `FixtureEditor` component is mounted in v-show panel

- [ ] Task 7: Run all frontend tests and verify

## Dev Notes

### Critical Bug Fix: `fetchSuite` drops `fixture`

Current `fetchSuite` rebuilds `definition` as `{ groups: [...] }` only — `fixture` is silently dropped. Fix:

```typescript
// Current (buggy):
definition: data.definition
  ? {
      groups: (data.definition.groups ?? []).map((g) => ({...})),
    }
  : { groups: [] }

// Fixed:
definition: data.definition
  ? {
      fixture: data.definition.fixture,  // ← preserve fixture
      groups: (data.definition.groups ?? []).map((g) => ({...})),
    }
  : { groups: [] }
```

Similarly, ALL store mutations that rebuild `definition` lose `fixture`. Fix pattern for every mutation:

```typescript
// Current (buggy):
activeSuite.value = {
  ...activeSuite.value,
  definition: { groups: [...activeSuite.value.definition.groups, group] },
}

// Fixed:
activeSuite.value = {
  ...activeSuite.value,
  definition: {
    fixture: activeSuite.value.definition.fixture,  // ← preserve
    groups: [...activeSuite.value.definition.groups, group],
  },
}
```

Affected mutations: `addGroup`, `removeGroup`, `updateGroup`, `addTestCase`, `updateTestCase`, `removeTestCase`.

### New SuiteFixture type and updateFixture action

```typescript
// Add to suites.ts:
export interface SuiteFixture {
  model?: unknown
  tuples?: unknown[]
}

// Update SuiteDefinition:
export interface SuiteDefinition {
  fixture?: SuiteFixture
  groups: TestGroup[]
}

// New action:
function updateFixture(fixture: SuiteFixture | null): void {
  if (!activeSuite.value) return
  const def = activeSuite.value.definition
  activeSuite.value = {
    ...activeSuite.value,
    definition: fixture
      ? { ...def, fixture }
      : { ...def, fixture: undefined },
  }
}
// Note: caller is responsible for calling saveDefinition after updateFixture
// (same pattern as updateTestCase — mutation is sync, save is async in the component)
```

### editorMode type extension

```typescript
// suiteEditor.ts — change type:
const editorMode = ref<'form' | 'json' | 'fixture'>('form')

function setEditorMode(mode: 'form' | 'json' | 'fixture') {
  editorMode.value = mode
}
```

Update the SuiteEditor.vue `EDITOR_TABS` array:
```typescript
const EDITOR_TABS = [
  { key: 'form', label: 'Form' },
  { key: 'json', label: 'JSON' },
  { key: 'fixture', label: 'Fixture' },
]
```

### FixtureEditor.vue structure

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSuiteStore, type SuiteFixture, type SuiteListItem } from '@/stores/suites'
import { useConnectionStore } from '@/stores/connection'
import { useToast } from '@/composables/useToast'
import SuiteJsonEditor from './SuiteJsonEditor.vue'

const props = defineProps<{ suite: SuiteListItem }>()

const suiteStore = useSuiteStore()
const connectionStore = useConnectionStore()
const toast = useToast()

const fixture = computed(() => suiteStore.activeSuite?.definition?.fixture ?? null)
const fixtureString = computed(() => JSON.stringify(fixture.value ?? {}, null, 2))

const fixtureValidationError = ref<string | null>(null)
const importing = ref(false)

function validateFixtureStructure(parsed: unknown): string | null {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return 'Fixture must be a JSON object'
  }
  const f = parsed as Record<string, unknown>
  if ('tuples' in f && !Array.isArray(f.tuples)) return '"tuples" must be an array'
  if ('model' in f && (typeof f.model !== 'object' || f.model === null || Array.isArray(f.model))) {
    return '"model" must be an object'
  }
  return null
}

async function onJsonChange(val: string) {
  try {
    const parsed = JSON.parse(val)
    const validationError = validateFixtureStructure(parsed)
    if (validationError) {
      fixtureValidationError.value = validationError
      return
    }
    fixtureValidationError.value = null
    suiteStore.updateFixture(parsed as SuiteFixture)
    await suiteStore.saveDefinition(props.suite.id, suiteStore.activeSuite!.definition)
  } catch {
    // JSON parse errors shown by SuiteJsonEditor's lintGutter — no action needed here
  }
}

async function onImportCurrentStore() {
  if (!connectionStore.storeId) return
  importing.value = true
  try {
    const res = await fetch(`/api/stores/${connectionStore.storeId}/export`)
    if (!res.ok) throw new Error(await res.text())
    const payload = await res.json() as { model: unknown; tuples: unknown[] }
    const newFixture: SuiteFixture = { model: payload.model, tuples: payload.tuples }
    suiteStore.updateFixture(newFixture)
    await suiteStore.saveDefinition(props.suite.id, suiteStore.activeSuite!.definition)
    toast.show({ type: 'success', message: 'Fixture imported from current store' })
  } catch (err) {
    toast.show({ type: 'error', message: (err as Error).message || 'Import failed' })
  } finally {
    importing.value = false
  }
}

async function onAddEmptyFixture() {
  suiteStore.updateFixture({})
  await suiteStore.saveDefinition(props.suite.id, suiteStore.activeSuite!.definition)
}
</script>

<template>
  <div class="flex flex-col h-full p-4 gap-3">
    <!-- Import button (shown always) -->
    <button
      :disabled="!connectionStore.storeId || importing"
      @click="onImportCurrentStore"
      class="..."
      data-testid="import-fixture-button"
    >
      {{ importing ? 'Importing...' : 'Import current store as fixture' }}
    </button>

    <!-- Empty state -->
    <div v-if="!fixture" data-testid="fixture-empty-state" class="...">
      <p>No fixture defined</p>
      <button @click="onAddEmptyFixture" data-testid="add-empty-fixture-button">Add empty fixture</button>
    </div>

    <!-- Fixture editor -->
    <div v-else class="flex-1 overflow-hidden flex flex-col">
      <div v-if="fixtureValidationError" role="alert" data-testid="fixture-validation-banner" class="...">
        {{ fixtureValidationError }}
      </div>
      <SuiteJsonEditor
        :model-value="fixtureString"
        @update:model-value="onJsonChange"
      />
    </div>
  </div>
</template>
```

### Zod is NOT available in the frontend

`zod` is a backend-only dependency. Do NOT import it in frontend code. Use a simple inline structural validator instead:

```typescript
// In FixtureEditor.vue — no import needed
function validateFixtureStructure(parsed: unknown): string | null {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return 'Fixture must be a JSON object'
  }
  const f = parsed as Record<string, unknown>
  if ('tuples' in f && !Array.isArray(f.tuples)) {
    return '"tuples" must be an array'
  }
  if ('model' in f && (typeof f.model !== 'object' || f.model === null || Array.isArray(f.model))) {
    return '"model" must be an object'
  }
  return null
}
```

Call this after `JSON.parse(val)` succeeds; set `fixtureValidationError.value` to the returned message (or `null` on valid).

### SuiteJsonEditor reuse — no CodeMirror reinstall needed

CodeMirror 6 packages are already installed in `frontend/package.json` from Story 8-2. `SuiteJsonEditor` is already built at `frontend/src/components/test-suites/SuiteJsonEditor.vue`. Do NOT create a new JsonEditor component — reuse the existing one.

### Test pattern for FixtureEditor

```typescript
vi.mock('@/stores/suites', () => ({ useSuiteStore: vi.fn() }))
vi.mock('@/stores/connection', () => ({ useConnectionStore: vi.fn() }))
vi.mock('@/components/test-suites/SuiteJsonEditor.vue', () => ({
  default: {
    name: 'SuiteJsonEditor',
    props: ['modelValue'],
    emits: ['update:modelValue', 'has-errors'],
    template: '<div data-testid="json-editor-stub" />',
  },
}))

function makeSuiteStoreMock(overrides = {}) {
  return {
    activeSuite: null,
    updateFixture: vi.fn(),
    saveDefinition: vi.fn(),
    ...overrides,
  }
}

function makeConnectionStoreMock(overrides = {}) {
  return {
    storeId: 'store-1',
    ...overrides,
  }
}
```

Test for structural validation banner (tuples not array):
```typescript
it('shows validation banner when tuples is not an array', async () => {
  // mount with fixture that has tuples as string (invalid)
  vi.mocked(useSuiteStore).mockReturnValue(
    makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [], fixture: { tuples: 'not-array' } } },
    }) as unknown as ReturnType<typeof useSuiteStore>
  )
  const wrapper = mountFixtureEditor()
  const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })
  await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ tuples: 'not-an-array' }))
  await nextTick()
  expect(wrapper.find('[data-testid="fixture-validation-banner"]').exists()).toBe(true)
  expect(wrapper.find('[data-testid="fixture-validation-banner"]').text()).toContain('Expected array')
})
```

Test for import fetch:
```typescript
it('fetches export and calls updateFixture on import', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ model: { type_definitions: [] }, tuples: [], storeName: 'x', exportedAt: '' }),
  })
  // ...
  await wrapper.find('[data-testid="import-fixture-button"]').trigger('click')
  await nextTick()
  expect(mockSuiteStore.updateFixture).toHaveBeenCalledWith({
    model: { type_definitions: [] },
    tuples: [],
  })
})
```

### SuiteEditor.test.ts mock update

Update `makeEditorStoreMock` to support the new 'fixture' mode:
```typescript
function makeEditorStoreMock(overrides = {}) {
  return {
    ...
    editorMode: 'form' as 'form' | 'json' | 'fixture',
    setEditorMode: vi.fn(),
    ...overrides,
  }
}
```

### CLAUDE.md conventions (DO NOT BREAK)

- No `@pinia/testing`. Use `vi.mock` for stores.
- Pinia reactive Set pattern: always replace Set reference.
- `editorMode` is now a 3-value union — update ALL mock occurrences.

## File List

- `frontend/src/stores/suites.ts` — add `SuiteFixture`, update `SuiteDefinition`, fix fixture-loss bug in all mutations, add `updateFixture`
- `frontend/src/stores/suites.test.ts` — new tests for fixture preservation and `updateFixture`
- `frontend/src/components/test-suites/FixtureEditor.vue` — new component
- `frontend/src/components/test-suites/FixtureEditor.test.ts` — new tests
- `frontend/src/stores/suiteEditor.ts` — extend `editorMode` type to `'form' | 'json' | 'fixture'`
- `frontend/src/stores/suiteEditor.test.ts` — update type + test 'fixture' mode value
- `frontend/src/views/SuiteEditor.vue` — add Fixture tab + integrate FixtureEditor
- `frontend/src/views/SuiteEditor.test.ts` — add Fixture tab test + update mock type

## Change Log

| Date | Change |
|------|--------|
| 2026-03-31 | Created Story 8.3 — Fixture Editor |
| 2026-03-31 | Implemented and code-reviewed; 5 patches applied |

### Review Findings

**Deferred (5 items):** concurrent-save debounce, editorMode not reset on suite change, validation error persists across tabs, import doesn't validate fetched payload, success/error toast coverage in import test.

**Patched (5 items):**
- [x] P1: Move success toast inside `if (activeSuite)` guard in `onImportCurrentStore`
- [x] P2: Clear `fixtureValidationError` in `onJsonChange` catch block
- [x] P3: Assert fetch URL in import test (`/api/stores/store-1/export`)
- [x] P4: Add test: validation banner clears after valid JSON follows invalid
- [x] P5: Add `FixtureEditor` `isVisible()` tests in `SuiteEditor.test.ts`
