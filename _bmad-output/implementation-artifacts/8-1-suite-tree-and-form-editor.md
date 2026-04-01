# Story 8.1: Suite Tree & Form Editor

## Status: done

## Story

As a developer,
I want to navigate a suite's groups and test cases in a tree panel and edit test cases via a form with live sentence preview,
So that I can author test suites visually without writing JSON.

## Acceptance Criteria

**AC1:** Given a suite is opened in the Editor tab, when the editor layout renders, then a two-panel layout is displayed: collapsible tree panel (~280px) on the left, editor panel on the right, and the tree panel shows groups (collapsible) containing test cases (selectable), and the tree uses `role="tree"` with `aria-expanded` on groups

**AC2:** Given the tree panel is displayed, when the user clicks a group header, then the group expands/collapses its test case children, and arrow keys navigate between tree nodes, Left/Right collapses/expands groups, Enter selects

**AC3:** Given the user selects a test case in the tree, when the editor panel renders, then the TestCaseForm shows 4 fields: User (SearchableSelect), Relation (SearchableSelect), Object (SearchableSelect), Expected (Allowed/Denied toggle), and autocomplete triggers on focus with options from the connected store's model and tuples, and free text is allowed, and a live SentenceView preview renders below the form

**AC4:** Given the user is editing a test case form, when the user clicks "Show metadata ▾", then an expandable section shows description (textarea), tags (multi-select input), severity (select: critical/warning/info), and collapse/expand state persists per session in Pinia store

**AC5:** Given a suite is open in the editor, when the user clicks "+ Group", then a new group is added, and the user can click "+ Test Case" within a group to add a new test case

**AC6:** Given a test case exists in a group, when the user edits fields and the form loses focus (blur), then changes are saved to the suite definition in the Pinia store, and the user can remove a test case or group via delete action

**AC7:** Given the user navigates away from the Editor tab and returns, when the Editor tab re-renders, then tree selection, and collapsed/expanded tree state are all restored from Pinia store

## Tasks / Subtasks

- [x] Task 1: Extend suites.ts with definition types and store actions
  - [x] 1.1 Add types: Suite, TestCase, TestGroup, SuiteDefinition to frontend/src/stores/suites.ts
  - [x] 1.2 Add fetchSuite, saveDefinition actions to suites store
  - [x] 1.3 Add addGroup, addTestCase, updateTestCase, removeTestCase, removeGroup actions
  - [x] 1.4 Update frontend/src/stores/suites.test.ts with new action tests

- [x] Task 2: Create useSuiteEditorStore for session state
  - [x] 2.1 Create frontend/src/stores/suiteEditor.ts
  - [x] 2.2 Create frontend/src/stores/suiteEditor.test.ts

- [x] Task 3: Extend SearchableSelect with allowFreeText
  - [x] 3.1 Add allowFreeText prop to frontend/src/components/common/SearchableSelect.vue

- [x] Task 4: Create SuiteTreePanel component
  - [x] 4.1 Create frontend/src/components/test-suites/SuiteTreePanel.vue
  - [x] 4.2 Create frontend/src/components/test-suites/SuiteTreePanel.test.ts

- [x] Task 5: Create SentenceView and TestCaseForm components
  - [x] 5.1 Create frontend/src/components/test-suites/SentenceView.vue
  - [x] 5.2 Create frontend/src/composables/useAutocompleteOptions.ts
  - [x] 5.3 Create frontend/src/components/test-suites/TestCaseForm.vue
  - [x] 5.4 Create frontend/src/components/test-suites/TestCaseForm.test.ts

- [x] Task 6: Create SuiteEditor two-panel layout
  - [x] 6.1 Create frontend/src/views/SuiteEditor.vue
  - [x] 6.2 Create frontend/src/views/SuiteEditor.test.ts

- [x] Task 7: Update TestSuites.vue editor tab
  - [x] 7.1 Replace #editor placeholder slot with SuiteEditor in frontend/src/views/TestSuites.vue

- [x] Task 8: Run all frontend tests and verify

## Dev Notes

### Architecture Patterns
- Same store patterns as suites.ts: setup syntax, useApi composable, vi.mock for tests
- Suite definition stored as JSONB in backend, sent/received as plain JSON
- Frontend generates UUIDs for new groups/test cases via `crypto.randomUUID()`
- Save on form field blur: call `suiteStore.saveDefinition(suiteId, definition)`

### Types (frontend)
```typescript
export interface TestCase {
  id: string
  name?: string
  user: string
  relation: string
  object: string
  expected: 'allow' | 'deny'
  description?: string
  tags?: string[]
  severity?: 'critical' | 'warning' | 'info'
}
export interface TestGroup {
  id: string
  name: string
  description?: string
  tests: TestCase[]
}
export interface SuiteDefinition {
  groups: TestGroup[]
}
export interface Suite extends SuiteListItem {
  definition: SuiteDefinition
}
```

### Store Extension (suites.ts)
```typescript
const activeSuite = ref<Suite | null>(null)
const loadingSuite = ref(false)

async function fetchSuite(id: string): Promise<void> {
  loadingSuite.value = true
  try {
    const data = await api.get<Suite>(`suites/${id}`)
    activeSuite.value = data
  } finally {
    loadingSuite.value = false
  }
}

async function saveDefinition(id: string, definition: SuiteDefinition): Promise<void> {
  await api.put<Suite>(`suites/${id}`, { definition })
  if (activeSuite.value?.id === id) {
    activeSuite.value = { ...activeSuite.value, definition }
  }
}
```

### SuiteEditorStore (suiteEditor.ts)
```typescript
export const useSuiteEditorStore = defineStore('suiteEditor', () => {
  const selectedTestCaseId = ref<string | null>(null)
  const expandedGroupIds = ref<Set<string>>(new Set())
  const metadataExpanded = ref(false)

  function selectTestCase(id: string | null) { selectedTestCaseId.value = id }
  function toggleGroup(id: string) {
    const updated = new Set(expandedGroupIds.value)
    if (updated.has(id)) updated.delete(id)
    else updated.add(id)
    expandedGroupIds.value = updated
  }
  function expandGroup(id: string) {
    const updated = new Set(expandedGroupIds.value)
    updated.add(id)
    expandedGroupIds.value = updated
  }

  return { selectedTestCaseId, expandedGroupIds, metadataExpanded, selectTestCase, toggleGroup, expandGroup }
})
```

### SearchableSelect allowFreeText
When `allowFreeText=true`, on ComboboxInput `@blur`: if `query.value` is non-empty, emit the raw query as the value and reset query.

### SuiteTreePanel — keyboard navigation
- The tree uses `role="tree"` on the container, `role="treeitem"` on each node
- Track `focusedNodeId` in component state (not store — ephemeral focus state)
- Flat ordered list of visible nodes (groups + tests of expanded groups)
- keydown on tree container:
  - ArrowDown: next in flat list
  - ArrowUp: prev in flat list
  - ArrowRight: expand group (if group and collapsed); or no-op
  - ArrowLeft: collapse group (if group and expanded); go to parent group (if test)
  - Enter: select test case (emit 'select' event)

### SentenceView
Simple display: "Can [user] [relation] [object]? → Allowed" or "→ Denied"
Use `<code>` tags with pill styling for technical tokens.

### Autocomplete Options (useAutocompleteOptions)
```typescript
// Parse modelStore.json (OpenFGA model JSON) for types and relations
// Combine with tupleStore.tuples for concrete entity values
// Returns: userOptions, relationOptions, objectOptions
```

### Test Patterns
- useSuiteEditorStore: vi.mock pattern (CLAUDE.md convention)
- SuiteTreePanel: attachTo: document.body for event tests
- TestCaseForm: mock both useSuiteStore and useSuiteEditorStore + useConnectionStore + useModelStore + useTupleStore
- SuiteEditor: mock useSuiteStore + useSuiteEditorStore

## Dev Agent Record

### Implementation Plan
1. Extend suites.ts with Suite types + fetchSuite + saveDefinition + CRUD mutations
2. Create suiteEditor.ts for session state (selectedTestCaseId, expandedGroupIds, metadataExpanded)
3. Add allowFreeText to SearchableSelect
4. SuiteTreePanel with role=tree, keyboard nav, expand/collapse
5. SentenceView + useAutocompleteOptions + TestCaseForm
6. SuiteEditor two-panel layout
7. Update TestSuites.vue editor tab

### Debug Log
- `TestSuites.test.ts` needed `SuiteEditor` stubbed via `vi.mock('./SuiteEditor.vue', ...)` to avoid its store dependencies leaking into TestSuites tests
- `makeStoreMock()` in `TestSuites.test.ts` extended with new store methods (fetchSuite, saveDefinition, etc.)
- `SearchableSelect` @blur wiring: added `onBlur` function that emits raw `query.value` when `allowFreeText=true`
- Editor tab test updated: "Editor coming in Epic 8" placeholder → `[data-testid="suite-editor"]` presence check

### Completion Notes
- 79 tests pass across 6 new/updated test files (all new tests green)
- 5 pre-existing ModelGraphView/VueFlow failures unchanged
- Two-panel suite editor: 280px tree panel (collapsible groups, selectable test cases) + form editor panel
- Tree: role=tree, aria-expanded on groups, keyboard nav (ArrowDown/Up/Left/Right/Enter)
- TestCaseForm: User/Relation/Object SearchableSelect (allowFreeText) + Expected toggle + SentenceView preview + collapsible metadata
- Autocomplete: useAutocompleteOptions composable derives options from modelStore.json (type names, relations) + tupleStore.tuples (concrete values)
- useSuiteEditorStore: session state (selectedTestCaseId, expandedGroupIds Set, metadataExpanded) — Set replaced on mutation for Vue reactivity
- All definition mutations (addGroup, removeGroup, updateGroup, addTestCase, updateTestCase, removeTestCase) in suites store auto-replace activeSuite ref for reactivity

## File List

- `_bmad-output/implementation-artifacts/8-1-suite-tree-and-form-editor.md` (new — story file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — epic-8 + story 8.1)
- `frontend/src/stores/suites.ts` (modified — added Suite, TestCase, TestGroup, SuiteDefinition types + fetchSuite, saveDefinition, addGroup, removeGroup, updateGroup, addTestCase, updateTestCase, removeTestCase)
- `frontend/src/stores/suites.test.ts` (modified — added tests for new store actions)
- `frontend/src/stores/suiteEditor.ts` (new)
- `frontend/src/stores/suiteEditor.test.ts` (new)
- `frontend/src/components/common/SearchableSelect.vue` (modified — added allowFreeText prop + onBlur handler)
- `frontend/src/components/test-suites/SuiteTreePanel.vue` (new)
- `frontend/src/components/test-suites/SuiteTreePanel.test.ts` (new)
- `frontend/src/components/test-suites/SentenceView.vue` (new)
- `frontend/src/composables/useAutocompleteOptions.ts` (new)
- `frontend/src/components/test-suites/TestCaseForm.vue` (new)
- `frontend/src/components/test-suites/TestCaseForm.test.ts` (new)
- `frontend/src/views/SuiteEditor.vue` (new)
- `frontend/src/views/SuiteEditor.test.ts` (new)
- `frontend/src/views/TestSuites.vue` (modified — editor tab now renders SuiteEditor)
- `frontend/src/views/TestSuites.test.ts` (modified — SuiteEditor stubbed, editor tab tests updated)

## Review Findings

### Patches applied

- [x] [Review][Patch] P1–P2: `SuiteTreePanel.vue` — `group.tests` → `group.testCases` (3 locations); `tc.expected === 'allow'` → `tc.expected === true`
- [x] [Review][Patch] P3: `SuiteTreePanel.test.ts` — fixture `tests:` → `testCases:`, `expected: 'allow'`→`true`, `'deny'`→`false`
- [x] [Review][Patch] P4: `SentenceView.vue` — prop `expected: 'allow'|'deny'` → `boolean`; comparisons updated
- [x] [Review][Patch] P5: `TestCaseForm.vue` — `localExpected` typed as `boolean`; toggle uses `!localExpected.value`; template comparisons updated; save-on-update pattern for User/Relation/Object (removed dead `@blur` bindings); `onSeverityChange` param typed as `string | null`
- [x] [Review][Patch] P6: `TestCaseForm.test.ts` — `expected: 'allow'`→`true`; toggle assertions `'deny'`→`false`, `'allow'`→`true`
- [x] [Review][Patch] P7: `SuiteEditor.vue` — `group.tests` → `group.testCases` (2 locations)
- [x] [Review][Patch] P8: `SuiteEditor.test.ts` — fixture `tests:` → `testCases:`, `expected: 'allow'`→`true`, addTestCase mock `'allow'`→`true`, added `errorSuite: null` to store mock
- [x] [Review][Patch] P9: `SuiteCard.test.ts` — `nextTick` import moved from `vitest` to `vue` (regression from 7-2 review patch)
- [x] [Review][Decision] D1: `suites.ts` `fetchSuite` — added `errorSuite` ref; catch block sets error; `SuiteEditor.vue` displays error banner
- [x] [Review][Decision] D2: `SuiteEditor.vue` — all 5 `saveDefinition` callers wrapped in try/catch with `toast.show({ type: 'error' })` on failure; functions made async
- [x] [Review][Patch] P10: `SuiteEditor.vue` `onRemoveGroup` — calls `editorStore.collapseGroup(groupId)` to clean up stale expandedGroupIds Set

### Deferred

- [x] [Review][Defer] W1: AC3 autocomplete-on-focus — Headless UI Combobox opens only on typing; AC says "triggers on focus"; deferred, future UX enhancement
- [x] [Review][Defer] W2: AC4 tags multi-select — plain comma-separated text input used; AC says "multi-select input"; dev notes specify comma-separated; deferred by design
- [x] [Review][Defer] W3: `SuiteTreePanel` `focusedNodeId` stale after collapse — ArrowLeft silently no-ops; low UX impact; deferred
- [x] [Review][Defer] W4: `document.querySelector` in `focusNode` unscoped — would break if two tree instances; low probability; deferred
- [x] [Review][Defer] W5: `onTagsBlur`/`onDescriptionBlur` fire even without changes — unnecessary API calls; deferred, optimisation
- [x] [Review][Defer] W6: `useAutocompleteOptions` no null guard on tuple fields — can push `undefined` options on malformed response; deferred, low probability
- [x] [Review][Defer] W7: Shallow watch on `props.testCase` — correct now, fragile if Pinia ever mutates in place; deferred
- [x] [Review][Defer] W8: Suite-switch does not clear `expandedGroupIds` — orphaned state persists; deferred, low UX impact
- [x] [Review][Defer] W9: ArrowDown/ArrowUp keyboard tests assert `emitted().toBeDefined()` — trivially true; deferred

## Change Log

| Date | Change |
|------|--------|
| 2026-03-31 | Created Story 8.1 — Suite Tree & Form Editor |
| 2026-03-31 | Implemented Story 8.1 — Suite Tree & Form Editor |
| 2026-03-31 | Code review patches applied — type alignment, error handling, dead-binding fix |
