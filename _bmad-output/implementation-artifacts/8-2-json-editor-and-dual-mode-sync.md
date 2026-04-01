# Story 8.2: JSON Editor & Dual-Mode Sync

## Status: done

## Story

As a developer,
I want to view and edit my suite definition as raw JSON alongside the form editor, switching between modes without data loss,
So that I can use whichever editing mode fits the task — form for quick edits, JSON for bulk changes.

## Acceptance Criteria

**AC1:** Given the editor panel is displayed, when the user clicks the "JSON" tab (via AppTabs), then a CodeMirror 6 editor renders the full suite definition as formatted JSON with syntax highlighting and bracket matching, and the CodeMirror theme uses `EditorView.theme()` API with hex values mapped from existing CSS custom properties (`--color-success`, `--color-error`, etc.)

**AC2:** Given the user is in Form mode, when a "JSON synced ✓" indicator is displayed (green text, bottom of form), then it confirms the form and JSON representations are in sync, and the indicator disappears while actively editing in JSON mode

**AC3:** Given the user edits JSON directly in CodeMirror, when the user switches to Form mode, then the form reflects the JSON changes with no data loss (JSON is the source of truth), and if the JSON has syntax errors the form shows "JSON has errors — fix in JSON tab" banner instead of form fields

**AC4:** Given the user edits fields in Form mode, when the form values change, then the underlying JSON model updates immediately (form writes to JSON model), and switching to JSON mode shows the updated JSON

**AC5:** Given JSON has validation errors, when the CodeMirror editor is displayed, then lintGutter shows red markers at error lines with actionable error messages, and error count is shown in the editor status bar

**AC6:** Given the user switches between Form and JSON tabs, when navigating away and returning to the Editor, then the previously selected tab (Form or JSON) is preserved in Pinia store — no "mode amnesia"

## Tasks / Subtasks

- [ ] Task 1: Install CodeMirror 6 dependencies
  - [ ] 1.1 Add `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-json`, `@codemirror/lint` to `frontend/package.json`

- [ ] Task 2: Extend suiteEditorStore with editorMode
  - [ ] 2.1 Add `editorMode: ref<'form' | 'json'>('form')` to `frontend/src/stores/suiteEditor.ts`
  - [ ] 2.2 Add `setEditorMode(mode: 'form' | 'json')` action
  - [ ] 2.3 Update `frontend/src/stores/suiteEditor.test.ts` with mode toggle test
  - [ ] 2.4 Update `SuiteEditor.test.ts` `makeEditorStoreMock` to include `editorMode` and `setEditorMode`

- [ ] Task 3: Create SuiteJsonEditor component
  - [ ] 3.1 Create `frontend/src/components/test-suites/SuiteJsonEditor.vue` wrapping CodeMirror 6
  - [ ] 3.2 Props: `modelValue: string` (JSON string), emits: `update:modelValue`, `has-errors` (boolean)
  - [ ] 3.3 Mount `EditorView` in `onMounted`, destroy in `onUnmounted`
  - [ ] 3.4 Apply `EditorView.theme()` with hex values from CSS custom properties
  - [ ] 3.5 Enable `lintGutter` + JSON linting + error count in status bar
  - [ ] 3.6 Create `frontend/src/components/test-suites/SuiteJsonEditor.test.ts`

- [ ] Task 4: Integrate dual-mode into SuiteEditor
  - [ ] 4.1 Add `AppTabs` with "Form" / "JSON" tabs to editor panel in `SuiteEditor.vue`
  - [ ] 4.2 Bind tab selection to `editorStore.editorMode` via `setEditorMode`
  - [ ] 4.3 In Form mode: show existing TestCaseForm / no-selection state + "JSON synced ✓" indicator
  - [ ] 4.4 In JSON mode: show `SuiteJsonEditor` bound to `JSON.stringify(definition, null, 2)`
  - [ ] 4.5 On JSON change (valid): parse and call `suiteStore.saveDefinition`; set `jsonHasErrors = false`
  - [ ] 4.6 On JSON change (invalid): set `jsonHasErrors = true`; suppress form rendering
  - [ ] 4.7 In Form mode when `jsonHasErrors`: show "JSON has errors — fix in JSON tab" banner instead of form fields

- [ ] Task 5: Update SuiteEditor tests
  - [ ] 5.1 Add test: "JSON" tab renders `SuiteJsonEditor` component
  - [ ] 5.2 Add test: error banner shown in Form mode when `jsonHasErrors` is true
  - [ ] 5.3 Add test: "JSON synced ✓" indicator visible in Form mode (no errors)
  - [ ] 5.4 Add test: `editorMode` restored from store on mount

- [ ] Task 6: Run all frontend tests and verify

## Dev Notes

### Architecture Patterns
- Same store patterns as suites.ts and suiteEditor.ts: setup syntax, vi.mock for tests
- JSON is source of truth: both form and JSON views are projections of `activeSuite.definition`
- CodeMirror 6 packages required (NOT yet in frontend/package.json — must install in Task 1):
  - `@codemirror/view` — EditorView, keymap
  - `@codemirror/state` — EditorState, transactions
  - `@codemirror/lang-json` — json() language support
  - `@codemirror/lint` — lintGutter, linter
- CodeMirror is ~200KB; no SSR concerns since this is a pure SPA

### suiteEditorStore Extension
```typescript
// Add to suiteEditor.ts:
const editorMode = ref<'form' | 'json'>('form')

function setEditorMode(mode: 'form' | 'json') {
  editorMode.value = mode
}

// Add to return:
return { ..., editorMode, setEditorMode }
```

### SuiteJsonEditor Component
```typescript
// frontend/src/components/test-suites/SuiteJsonEditor.vue
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { lintGutter } from '@codemirror/lint'

// Mount in onMounted, destroy in onUnmounted
// Emit 'update:modelValue' on doc changes
// Emit 'has-errors' true/false based on lint diagnostics

// Theme: use EditorView.theme() with hard-coded hex values matching CSS custom properties
// (CSS vars are not accessible from TS at runtime without getComputedStyle)
// Map --color-success → #22c55e, --color-error → #ef4444, etc. (read from tailwind config or use defaults)
```

The `EditorView.theme()` approach:
```typescript
const editorTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', fontSize: '0.875rem' },
  '.cm-content': { fontFamily: 'JetBrains Mono, monospace' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none' },
  '.cm-lintRange-error': { borderBottom: '2px solid #ef4444' },
  '.cm-tooltip.cm-tooltip-lint': { backgroundColor: '#1e1e2e', color: '#cdd6f4' },
})
```

### SuiteEditor Dual-Mode Layout
```vue
<!-- In SuiteEditor.vue editor panel, replace current content with: -->
<AppTabs
  :tabs="[{ key: 'form', label: 'Form' }, { key: 'json', label: 'JSON' }]"
  :model-value="editorStore.editorMode"
  @update:model-value="editorStore.setEditorMode"
>
  <template #form>
    <!-- "JSON has errors" banner if jsonHasErrors -->
    <!-- existing TestCaseForm / no-selection state -->
    <!-- "JSON synced ✓" indicator (green, small, bottom) -->
  </template>
  <template #json>
    <SuiteJsonEditor
      :model-value="jsonString"
      @update:model-value="onJsonChange"
      @has-errors="jsonHasErrors = $event"
    />
  </template>
</AppTabs>
```

### JSON sync strategy
- `jsonString` is a computed: `JSON.stringify(definition.value, null, 2)`
- `onJsonChange(val: string)`: attempt `JSON.parse(val)` — on success call `saveDefinition`; on failure set `jsonHasErrors = true`
- `jsonHasErrors` is a local `ref<boolean>(false)` in `SuiteEditor.vue`
- The "JSON synced ✓" indicator: `v-if="editorStore.editorMode === 'form' && !jsonHasErrors"`

### Test Patterns
- `SuiteJsonEditor.test.ts`: stub `EditorView` entirely with `vi.mock('@codemirror/view', ...)` — CodeMirror manipulates real DOM and is not testable in jsdom
- `SuiteEditor.test.ts`: update `makeEditorStoreMock` to add `editorMode: 'form'` and `setEditorMode: vi.fn()`; test tab switching behavior via emitting on the `AppTabs` mock
- Do NOT attempt to test CodeMirror's internal editor state in unit tests; test only component-level behavior (tab rendering, banner display, indicator visibility)

### Mocking CodeMirror in tests
```typescript
// In SuiteJsonEditor.test.ts:
vi.mock('@codemirror/view', () => ({
  EditorView: class {
    static theme() { return {} }
    constructor() {}
    destroy() {}
    dispatch() {}
    get state() { return { doc: { toString: () => '' } } }
  },
  keymap: { of: vi.fn() },
}))
vi.mock('@codemirror/state', () => ({
  EditorState: { create: vi.fn(() => ({})) },
}))
vi.mock('@codemirror/lang-json', () => ({ json: vi.fn(() => ({})) }))
vi.mock('@codemirror/lint', () => ({ lintGutter: vi.fn(() => ({})), linter: vi.fn(() => ({})) }))
```

## Dev Agent Record

### Implementation Plan
1. Install CodeMirror 6 packages (npm install in frontend/)
2. Add `editorMode` + `setEditorMode` to suiteEditorStore
3. Create `SuiteJsonEditor.vue` with CodeMirror 6 mount/destroy lifecycle
4. Integrate dual-mode tabs into `SuiteEditor.vue`
5. Update tests

## File List

- `_bmad-output/implementation-artifacts/8-2-json-editor-and-dual-mode-sync.md` (new — story file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story 8.2 added)
- `frontend/package.json` (modified — CodeMirror 6 dependencies added)
- `frontend/src/stores/suiteEditor.ts` (modified — editorMode + setEditorMode)
- `frontend/src/stores/suiteEditor.test.ts` (modified — editorMode tests)
- `frontend/src/components/test-suites/SuiteJsonEditor.vue` (new)
- `frontend/src/components/test-suites/SuiteJsonEditor.test.ts` (new)
- `frontend/src/views/SuiteEditor.vue` (modified — dual-mode tabs, JSON synced indicator, error banner)
- `frontend/src/views/SuiteEditor.test.ts` (modified — new tests for tab switching, banners)

### Review Findings

- [x] [Review][Decision] AppTabs not used — manual tab buttons implemented — Accepted: `v-show` manual tabs are functionally equivalent; HeadlessUI unmount behavior incompatible with CodeMirror lifecycle. AppTabs variant with unmount control deferred for future consideration.
- [x] [Review][Patch] `errorCount` always 0/1 but template has dead pluralisation branch [`frontend/src/components/test-suites/SuiteJsonEditor.vue`]
- [x] [Review][Patch] Missing test for `watch(() => props.suite.id)` callback — should assert `fetchSuite` re-called and `selectTestCase(null)` on suite ID change [`frontend/src/views/SuiteEditor.test.ts`]
- [x] [Review][Patch] Missing test for `onTestCaseUpdate` — should assert `updateTestCase` + `saveDefinition` call sequence [`frontend/src/views/SuiteEditor.test.ts`]
- [x] [Review][Patch] Missing test for `onRemoveTestCase` deselection — should assert `selectTestCase(null)` when removed test is currently selected [`frontend/src/views/SuiteEditor.test.ts`]
- [x] [Review][Defer] Direct mutation of `suiteStore.activeSuite` from view bypasses Pinia actions [`frontend/src/views/SuiteEditor.vue`] — deferred, pre-existing pattern in codebase
- [x] [Review][Defer] No rollback on `saveDefinition` failure after optimistic `activeSuite` update [`frontend/src/views/SuiteEditor.vue`] — deferred, intentional optimistic update pattern
- [x] [Review][Defer] No debounce on `onJsonChange` — concurrent saves can race and overwrite out-of-order [`frontend/src/views/SuiteEditor.vue`] — deferred, needs dedicated debounce story
- [x] [Review][Defer] Suite switch race: concurrent `fetchSuite` calls when `suite.id` changes rapidly [`frontend/src/views/SuiteEditor.vue`] — deferred, pre-existing async pattern
- [x] [Review][Defer] `watch(modelValue)` in SuiteJsonEditor overwrites editor content during invalid-JSON mid-edit if parent `jsonString` recomputes [`frontend/src/components/test-suites/SuiteJsonEditor.vue`] — deferred, known CodeMirror v-model round-trip limitation

## Change Log

| Date | Change |
|------|--------|
| 2026-03-31 | Created Story 8.2 — JSON Editor & Dual-Mode Sync |
| 2026-03-31 | Code review complete — 1 decision-needed, 4 patch, 5 deferred, ~10 dismissed |
