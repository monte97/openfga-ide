# Story 10.2: Import Suite with Validation Preview

## Status: done

## Story

As a developer,
I want to import a suite definition from a JSON file with inline validation and a preview of what will be created,
So that I can confidently reuse suites across environments without importing broken definitions.

## Acceptance Criteria

**AC1:** Given the user is on the Suite List view, when the user clicks "Import Suite" or drags a JSON file onto the dropzone, then the Suites tab shows a full-panel ImportPreview experience (not a modal). The file content loads into a CodeMirror editor in read-write mode.

**AC2:** Given a JSON file is loaded in the ImportPreview, when Zod validation runs automatically, then if valid: a green summary banner shows "Will create: [Suite Name] — N groups, M tests, fixture with K tuples". The "Import" primary button is enabled.

**AC3:** Given the imported JSON has validation errors, when the CodeMirror editor renders, then lintGutter shows red markers at error lines with actionable messages mapped to line numbers (e.g., "groups[0].testCases[2].user: must be non-empty"). An error summary banner shows "N errors found — fix to enable import". The "Import" button is disabled until all errors are resolved. Error count is announced via `aria-live`.

**AC4:** Given the user fixes errors directly in the CodeMirror preview editor, when validation re-runs after edits, then resolved errors disappear from the lintGutter. Once all errors are cleared, the summary banner and Import button appear.

**AC5:** Given the user clicks "Import" on a valid definition, when POST `/api/suites` succeeds, then the new suite appears in the Suite List with a "Never run" badge. A success toast shows "Imported '[Suite Name]' (N groups, M tests)". Focus moves back to the Suites tab (import preview closes).

**AC6:** Given the user clicks "Cancel" during import, when the ImportPreview closes, then the previous suite list state is restored (no suite created) and the Suites tab is active.

**AC7:** Given the import reuses the same Zod schemas as the API, when validation runs on the frontend, then it produces the same errors as server-side validation — zero divergence (FR30, FR33).

## Tasks / Subtasks

- [x] Task 1: Install `zod` on frontend + create frontend schema
  - [x] 1.1 Run `npm install zod` in the `frontend/` directory
  - [x] 1.2 Create `frontend/src/schemas/suite.ts` — replicate the backend `createSuiteSchema` exactly (copy the Zod schema structure from `backend/src/test-suites/schemas/suite.ts`)
  - [x] 1.3 Export: `importSuiteSchema` (same as `createSuiteSchema`), `ImportSuitePayload = z.infer<typeof importSuiteSchema>`

- [x] Task 2: `importSuite` action in `suites.ts` store
  - [x] 2.1 Add `importSuite(payload: ImportSuitePayload): Promise<SuiteListItem>` to `useSuiteStore` — calls `api.post<SuiteListItem>('suites', payload)`, prepends suite to `suites.value`, shows success toast: `"Imported '${suite.name}' (${groupCount} groups, ${testCount} tests)"`
  - [x] 2.2 Add test in `frontend/src/stores/suites.test.ts` — verify `api.post` called with payload, suite prepended to list, correct toast message

- [x] Task 3: `ImportJsonEditor.vue` — CodeMirror editor with JSON + Zod linting
  - [x] 3.1 Create `frontend/src/components/test-suites/ImportJsonEditor.vue` — own CodeMirror 6 setup (do NOT modify `SuiteJsonEditor.vue`) with `jsonParseLinter()` + a custom Zod schema linter extension
  - [x] 3.2 The custom Zod linter: on each document change, run `JSON.parse` (skip if syntax errors present), then run `importSuiteSchema.safeParse(parsed)`. Convert ZodError issues to CodeMirror `Diagnostic[]` using `findPathOffset()` helper (see Dev Notes)
  - [x] 3.3 Props: `modelValue: string`. Emits: `update:modelValue: [string]`, `validation-result: [{ valid: boolean; errors: ZodIssue[]; parsed: ImportSuitePayload | null }]`
  - [x] 3.4 Status bar at bottom: shows "N schema errors" in red, or "Valid" in green (separate from JSON syntax errors)

- [x] Task 4: `ImportPreview.vue` — full-panel import experience
  - [x] 4.1 Create `frontend/src/components/test-suites/ImportPreview.vue`
  - [x] 4.2 Internal state: `jsonText: ref('')`, `fileLoaded: ref(false)`, `validationResult: ref(null)`, `importing: ref(false)`
  - [x] 4.3 **File pick phase** (when `!fileLoaded`): simple dropzone area (see Dev Notes) — click to open file picker OR drag-and-drop JSON; reads file via `FileReader`, sets `jsonText` and `fileLoaded = true`
  - [x] 4.4 **Editor phase** (when `fileLoaded`): renders `ImportJsonEditor` with `v-model="jsonText"`, listening to `@validation-result`; shows validation banner; shows "Import" + "Cancel" buttons
  - [x] 4.5 Validation banner (below editor, `aria-live="polite"`):
    - Valid: green banner `data-testid="import-preview-valid-banner"` — "Will create: [name] — N groups, M tests, fixture with K tuples"
    - Invalid: red banner `data-testid="import-preview-error-banner"` — "N errors found — fix to enable import"
    - JSON syntax error: amber banner — "Fix JSON syntax errors first"
  - [x] 4.6 "Import" button: `variant="primary"`, `data-testid="import-preview-confirm-btn"`, disabled unless `validationResult.valid === true`. On click: calls `emit('confirm', validationResult.parsed)`
  - [x] 4.7 "Cancel" button: `variant="secondary"`, `data-testid="import-preview-cancel-btn"`. Emits `cancel`
  - [x] 4.8 Emits: `confirm: [payload: ImportSuitePayload]`, `cancel: []`

- [x] Task 5: Wire into `TestSuites.vue`
  - [x] 5.1 Add `showImportPreview = ref(false)` and `onImportConfirm(payload)` handler — calls `await suiteStore.importSuite(payload)`, then `showImportPreview.value = false`
  - [x] 5.2 Add "Import Suite" button to the Suites tab header (next to "New Suite", `variant="secondary"`)
  - [x] 5.3 In the Suites tab template, wrap the existing content in `v-if="!showImportPreview"` and add `<ImportPreview v-else @confirm="onImportConfirm" @cancel="showImportPreview = false" />`

- [x] Task 6: Tests
  - [x] 6.1 `frontend/src/components/test-suites/ImportPreview.test.ts` — see test checklist below
  - [x] 6.2 `frontend/src/views/TestSuites.test.ts` additions — "Import Suite" button visible, shows ImportPreview panel on click, onImportConfirm calls importSuite then hides preview, cancel hides preview

## Dev Notes

### Frontend Schema — `frontend/src/schemas/suite.ts`

Install zod: `cd frontend && npm install zod`

```typescript
import { z } from 'zod'

const testCaseSchema = z.object({
  user: z.string().min(1, 'User must be non-empty'),
  relation: z.string().min(1, 'Relation must be non-empty'),
  object: z.string().min(1, 'Object must be non-empty'),
  expected: z.boolean({ required_error: 'Expected must be a boolean' }),
  meta: z.object({
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    severity: z.enum(['critical', 'warning', 'info']).optional(),
  }).optional(),
})

const testGroupSchema = z.object({
  name: z.string().min(1, 'Group name must be non-empty'),
  description: z.string().optional(),
  testCases: z.array(testCaseSchema).max(500),
})

const suiteFixtureSchema = z.object({
  model: z.unknown().optional(),
  tuples: z.array(z.unknown()).optional(),
})

const suiteDefinitionSchema = z.object({
  fixture: suiteFixtureSchema.optional(),
  groups: z.array(testGroupSchema).max(100),
})

export const importSuiteSchema = z.object({
  name: z.string().min(1, 'Suite name is required').max(255),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  definition: suiteDefinitionSchema.optional(),
})

export type ImportSuitePayload = z.infer<typeof importSuiteSchema>
```

**Critical:** Keep this in sync with `backend/src/test-suites/schemas/suite.ts`. If the backend schema changes, update this file too.

### `importSuite` Action Pattern

```typescript
async function importSuite(payload: ImportSuitePayload): Promise<SuiteListItem> {
  const suite = await api.post<SuiteListItem>('suites', payload)
  suites.value = [suite, ...suites.value]
  const groupCount = payload.definition?.groups.length ?? 0
  const testCount = payload.definition?.groups.reduce((s, g) => s + g.testCases.length, 0) ?? 0
  toast.show({ type: 'success', message: `Imported '${suite.name}' (${groupCount} groups, ${testCount} tests)` })
  return suite
}
```

Add `importSuite` to the return object.

### `ImportJsonEditor.vue` — Zod Linter Extension

The Zod linter is a CodeMirror `linter()` extension that runs after JSON parse succeeds:

```typescript
import { linter, type Diagnostic } from '@codemirror/lint'
import { importSuiteSchema } from '@/schemas/suite'
import type { ZodIssue } from 'zod'

function zodLinter(view: EditorView): Diagnostic[] {
  const text = view.state.doc.toString()
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { return [] }  // JSON errors handled by jsonParseLinter

  const result = importSuiteSchema.safeParse(parsed)
  if (result.success) return []

  return result.error.issues.map((issue) => {
    const pathStr = issue.path.join('.')
    const offset = findPathOffset(text, issue.path) ?? 0
    return {
      from: offset,
      to: offset + 1,
      severity: 'error' as const,
      message: `${pathStr}: ${issue.message}`,
    }
  })
}
```

**`findPathOffset(text, path)` helper** — finds the character offset of a JSON path in the text string. This is an approximation: stringify the path as a sequence of key lookups and search the string.

```typescript
function findPathOffset(text: string, path: (string | number)[]): number {
  // Simple approach: search for the last key in the path as a quoted string
  // Works well for named keys; for array indices, finds the parent key
  for (let i = path.length - 1; i >= 0; i--) {
    const key = path[i]
    if (typeof key === 'string') {
      const idx = text.indexOf(`"${key}"`)
      if (idx !== -1) return idx
    }
  }
  return 0
}
```

**Important:** This is approximate — it finds the first occurrence of the key name in the JSON. For most suite definition errors (missing `user`, `relation`, etc.) this gives a good enough line number. A more precise implementation using `json-source-map` can be added if needed (install `npm install json-source-map`).

`ImportJsonEditor.vue` complete structure:

```typescript
// extensions array:
[
  json(),
  lintGutter(),
  linter(jsonParseLinter()),          // JSON syntax errors
  linter((view) => zodLinter(view)),   // Zod schema errors
  editorTheme,                         // same theme as SuiteJsonEditor
  EditorView.lineWrapping,
  EditorView.updateListener.of((update) => {
    if (!update.docChanged) return
    const value = update.state.doc.toString()
    emit('update:modelValue', value)

    // Emit validation result
    let parsed: unknown = null
    try { parsed = JSON.parse(value) } catch { /* syntax error */ }
    if (parsed !== null) {
      const result = importSuiteSchema.safeParse(parsed)
      emit('validation-result', {
        valid: result.success,
        errors: result.success ? [] : result.error.issues,
        parsed: result.success ? result.data : null,
      })
    } else {
      emit('validation-result', { valid: false, errors: [], parsed: null })
    }
  }),
]
```

**Do NOT modify `SuiteJsonEditor.vue`** — it is used in the suite editor tab and has different requirements. Create `ImportJsonEditor.vue` as a separate component.

### `ImportPreview.vue` — File Pick Phase

Do NOT reuse `FileImportDropzone.vue` — it validates for `model + tuples` keys (viewer import format). Suite import needs a different dropzone. Build a simple inline one:

```vue
<!-- File pick phase (v-if="!fileLoaded") -->
<div
  class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 cursor-pointer transition-colors"
  :class="isDragOver ? 'border-info bg-info/10' : 'border-surface-border hover:border-info/60'"
  @click="fileInput?.click()"
  @dragover.prevent="isDragOver = true"
  @dragleave="isDragOver = false"
  @drop.prevent="onDrop"
>
  <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onFileInputChange" />
  <UploadCloud class="size-8 text-text-secondary" aria-hidden="true" />
  <span class="text-sm text-text-secondary">Drop a suite JSON file here, or click to browse</span>
</div>
```

File reading:
```typescript
function loadFile(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    jsonText.value = e.target?.result as string ?? ''
    fileLoaded.value = true
  }
  reader.readAsText(file)
}
```

### `TestSuites.vue` — Suites Tab Template Change

```vue
<template #suites>
  <!-- Import Preview (replaces suite list) -->
  <ImportPreview
    v-if="showImportPreview"
    class="pt-4"
    @confirm="onImportConfirm"
    @cancel="showImportPreview = false"
  />

  <!-- Normal suite list mode -->
  <div v-else class="pt-4">
    <!-- Header row: add Import Suite button next to New Suite -->
    <div class="flex items-center justify-between mb-4 max-w-3xl">
      <h1 class="text-lg font-semibold text-text-emphasis">Test Suites</h1>
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="showImportPreview = true">
          Import Suite
        </AppButton>
        <AppButton v-if="suiteStore.suites.length > 0" variant="primary" @click="openCreateForm">
          <Plus class="size-4" aria-hidden="true" />
          New Suite
        </AppButton>
      </div>
    </div>
    <!-- ... rest unchanged ... -->
  </div>
</template>
```

`onImportConfirm` handler:
```typescript
async function onImportConfirm(payload: ImportSuitePayload) {
  try {
    await suiteStore.importSuite(payload)
    showImportPreview.value = false
  } catch {
    // error already surfaced via useApi toast
  }
}
```

### Summary Banner Computation

```typescript
const summaryInfo = computed(() => {
  const p = validationResult.value?.parsed
  if (!p) return null
  const groupCount = p.definition?.groups.length ?? 0
  const testCount = p.definition?.groups.reduce((s, g) => s + g.testCases.length, 0) ?? 0
  const tupleCount = p.definition?.fixture?.tuples?.length ?? 0
  return { name: p.name, groupCount, testCount, tupleCount }
})
```

Banner text: `"Will create: ${summaryInfo.name} — ${groupCount} groups, ${testCount} tests, fixture with ${tupleCount} tuples"`

### Test Checklist for `ImportPreview.test.ts`

- Renders dropzone when no file loaded
- After loading a valid file: shows editor, valid banner, Import button enabled
- After loading invalid JSON: Import button disabled
- After loading JSON with Zod errors: error banner visible with error count, Import button disabled
- User edits JSON in editor to fix errors: Import button becomes enabled
- Clicking "Import" with valid payload emits `confirm` with parsed payload
- Clicking "Cancel" emits `cancel`
- `aria-live` region updated when error count changes

**Test pattern for `ImportJsonEditor`:** Stub CodeMirror entirely (it's jsdom-incompatible). In `ImportPreview.test.ts`, mock `ImportJsonEditor`:

```typescript
vi.mock('@/components/test-suites/ImportJsonEditor.vue', () => ({
  default: {
    name: 'ImportJsonEditor',
    props: ['modelValue'],
    emits: ['update:modelValue', 'validation-result'],
    template: '<div data-testid="import-json-editor-stub" />',
  },
}))
```

Then trigger `validation-result` events manually to test banner/button states:
```typescript
const editor = wrapper.findComponent({ name: 'ImportJsonEditor' })
await editor.vm.$emit('validation-result', { valid: true, errors: [], parsed: validPayload })
```

**Test pattern for `TestSuites.test.ts` additions:**
- Mock `useSuiteStore` including `importSuite: vi.fn().mockResolvedValue(mockSuite)`
- Verify "Import Suite" button exists
- Click it → `showImportPreview` shows `ImportPreview`
- Emit `confirm` from `ImportPreview` → `suiteStore.importSuite` called
- Emit `cancel` from `ImportPreview` → suite list shown again

### Key File Locations

| File | Action |
|------|--------|
| `frontend/` | `npm install zod` |
| `frontend/src/schemas/suite.ts` | New — import validation schema |
| `frontend/src/stores/suites.ts` | Add `importSuite` action |
| `frontend/src/stores/suites.test.ts` | Add `importSuite` test |
| `frontend/src/components/test-suites/ImportJsonEditor.vue` | New — CodeMirror + JSON + Zod linting |
| `frontend/src/components/test-suites/ImportPreview.vue` | New — full-panel import experience |
| `frontend/src/components/test-suites/ImportPreview.test.ts` | New test file |
| `frontend/src/views/TestSuites.vue` | Add Import Suite button + ImportPreview wiring |
| `frontend/src/views/TestSuites.test.ts` | Add import flow tests |

### Review Findings

- [x] [Review][Patch] `findPathOffset` uses first key occurrence — points to first match of key string in entire doc, not actual error location; duplicate keys give wrong line [frontend/src/components/test-suites/ImportJsonEditor.vue]
- [x] [Review][Patch] `importing` flag resets before parent async completes — `emit('confirm')` is synchronous; `finally` runs before `suiteStore.importSuite()` resolves in parent [frontend/src/components/test-suites/ImportPreview.vue]
- [x] [Review][Patch] FileReader has no `onerror`/`onabort` handler — failed reads leave component stuck with no user feedback [frontend/src/components/test-suites/ImportPreview.vue]
- [x] [Review][Patch] `description: z.string().nullable().optional()` diverges from backend `createSuiteSchema` — backend only accepts `string | undefined`, rejects `null`; import of exported suite with null description would fail [frontend/src/schemas/suite.ts]
- [x] [Review][Patch] `document.createElement` spy else-branch causes latent infinite recursion — `return document.createElement(tag)` calls the mock recursively for non-`'a'` tags [frontend/src/stores/suites.test.ts]
- [x] [Review][Patch] `aria-live` region missing `aria-atomic="true"` — screen readers may announce partial content updates [frontend/src/components/test-suites/ImportPreview.vue]
- [x] [Review][Defer] `ZodIssue` type alias duplicated across files — pre-existing, refactor to shared `schemas/` location later
- [x] [Review][Defer] `hasSyntaxError` computed redundant with CodeMirror JSON linter — computes same JSON.parse independently; divergence risk on fast edits; pre-existing pattern
- [x] [Review][Defer] Drop zone not keyboard accessible — click-based only; aria enhancement for future iteration
- [x] [Review][Defer] Empty `testCases` array passes validation — `z.array(...).max(500)` has no `.min(1)`; intentional design (empty groups may be valid), revisit if spec tightens
- [x] [Review][Defer] `tupleCount` cast `as unknown[]` in summary computed — minor type-safety gap; no runtime risk for well-formed payloads
- [x] [Review][Defer] No MIME type validation on drag-and-drop — non-JSON files fail gracefully at parse; UX improvement only

### CLAUDE.md Patterns Apply

- No `@pinia/testing` — use `vi.mock` pattern throughout
- `reactive()` wrap for store mocks in `watch` tests
- Stub CodeMirror-based components in tests (jsdom cannot render CodeMirror canvas)
- For `ImportPreview.test.ts`: mock `ImportJsonEditor` as a stub, trigger events manually

### Do NOT Implement in This Story

- Story 10.1's export endpoint and CI dialog — already planned separately
- Drag-and-drop on the suite list itself (only the import panel has drag-drop)
- JUnit XML output (Phase 2, not MVP)
- `$ref` resolution for shared fixtures (Phase 2)
