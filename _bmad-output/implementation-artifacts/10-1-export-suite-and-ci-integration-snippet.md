# Story 10.1: Export Suite & CI Integration Snippet

## Status: done

## Story

As a developer,
I want to export a suite definition as a JSON file and get a ready-to-use curl command for CI/CD integration,
So that I can version-control my suites in git and automate them in pipelines without writing API calls from scratch.

## Acceptance Criteria

**AC1:** Given a suite exists, when the user opens the context menu on a SuiteCard and selects "Export", then the suite definition is downloaded as a JSON file named `{suite-name}.json`. The JSON format contains the full suite structure (name, description, tags, fixture, groups with test cases) — no server-generated fields (id, timestamps) (FR31). The format uses standard JSON with no proprietary encoding (FR32).

**AC2:** Given a suite exists, when GET `/api/suites/:suiteId/export` is called, then the suite definition is returned as a JSON response with fields `{ name, description, tags, definition }` — identical format whether called from UI or API.

**AC3:** Given a suite exists, when the user opens the context menu and selects "CI Integration", then a Dialog (informational styling, not warning) shows a copyable curl snippet with the suite ID pre-filled (UX-DR16). Brief polling instructions are shown below the snippet. A "Copy" button copies the snippet to clipboard. "Close" dismisses the dialog.

**AC4:** Given the suite definition is exported and committed to git, when a different user imports it on another instance, then the definition is independent of any specific OpenFGA instance — execution uses the currently active connection (FR32).

## Tasks / Subtasks

- [x] Task 1: Backend — add `GET /api/suites/:suiteId/export`
  - [x] 1.1 Add export route to `backend/src/test-suites/routes/suites.ts`: `GET /api/suites/:suiteId/export` calls `suiteService.getSuite(suiteId)` then returns `{ name, description, tags, definition }` (strips id/timestamps)
  - [x] 1.2 Add test in `backend/src/test-suites/routes/suites.test.ts` — mock `suiteService.getSuite`, verify response shape excludes id/timestamps

- [x] Task 2: Frontend — `exportSuite` action in `suites.ts` store
  - [x] 2.1 Add `exportSuite(suiteId: string, suiteName: string): Promise<void>` to `useSuiteStore` in `frontend/src/stores/suites.ts`
  - [x] 2.2 Add test in `frontend/src/stores/suites.test.ts` — mock `useApi`, verify `api.get` called with correct path; test toast on success

- [x] Task 3: `SuiteCard.vue` — add Export and CI Integration menu items
  - [x] 3.1 Add `export: [suite: SuiteListItem]` and `ci-integration: [suite: SuiteListItem]` to `defineEmits`
  - [x] 3.2 Add "Export" and "CI Integration" buttons above "Delete" in the dropdown menu; style "Export" and "CI Integration" as normal menu items (not red); add `data-testid="suite-menu-export"` and `data-testid="suite-menu-ci"` to the buttons
  - [x] 3.3 Wire click handlers: stop propagation, close menu, emit event
  - [x] 3.4 Add tests in `frontend/src/components/test-suites/SuiteCard.test.ts` — Export and CI Integration items visible in menu; click emits correct events

- [x] Task 4: `SuiteList.vue` — propagate new events
  - [x] 4.1 Add `export` and `ci-integration` to `defineEmits` and propagate from SuiteCard

- [x] Task 5: `CiIntegrationDialog.vue` — new component
  - [x] 5.1 Create `frontend/src/components/test-suites/CiIntegrationDialog.vue` using Headless UI `Dialog`/`DialogPanel`/`DialogTitle` (same pattern as `ConfirmDialog.vue`)
  - [x] 5.2 Props: `open: boolean`, `suite: SuiteListItem | null`. Emits: `close: []`
  - [x] 5.3 Content: dialog title "CI Integration", `<pre data-testid="ci-dialog-snippet">` showing the curl snippet (computed from `window.location.origin` + `suite.id`), brief polling instructions below the snippet, "Copy" button (`data-testid="ci-dialog-copy-btn"`) that calls `navigator.clipboard.writeText(snippet)`, "Close" button that emits `close`
  - [x] 5.4 Create `frontend/src/components/test-suites/CiIntegrationDialog.test.ts`

- [x] Task 6: `TestSuites.vue` — wire export and CI integration
  - [x] 6.1 Add `onExportSuite(suite)` → calls `suiteStore.exportSuite(suite.id, suite.name)`
  - [x] 6.2 Add `ciDialogSuite` ref and `onCiIntegration(suite)` handler
  - [x] 6.3 Import and mount `CiIntegrationDialog` — bind `:open="!!ciDialogSuite"`, `:suite="ciDialogSuite"`, `@close="ciDialogSuite = null"`
  - [x] 6.4 Wire `@export` and `@ci-integration` on `<SuiteList>`; update `<SuiteList>` to forward both events

## Dev Notes

### Backend: Export Route

Add this to `backend/src/test-suites/routes/suites.ts` after the existing GET `:suiteId` route:

```typescript
router.get('/api/suites/:suiteId/export', async (req, res, next) => {
  try {
    const suite = await suiteService.getSuite(req.params.suiteId)
    res.json({
      name: suite.name,
      description: suite.description,
      tags: suite.tags,
      definition: suite.definition,
    })
  } catch (err) {
    next(err)
  }
})
```

This reuses the existing `suiteService.getSuite()` — no new service method needed. The 404 error handling from `getSuite` propagates via `next(err)` exactly as the other routes do.

### Frontend: `exportSuite` in `suites.ts` store

Follow the **identical pattern** as `frontend/src/stores/importExport.ts#exportStore()`. Use `api.get` (not raw `fetch`) to stay consistent with the Pinia store pattern:

```typescript
async function exportSuite(suiteId: string, suiteName: string): Promise<void> {
  try {
    const payload = await api.get<{ name: string; description: string | null; tags: string[]; definition: unknown }>(`suites/${suiteId}/export`)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${suiteName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.show({ type: 'success', message: `Suite '${suiteName}' exported` })
  } catch (err) {
    toast.show({ type: 'error', message: (err as Error).message || 'Export failed' })
  }
}
```

Add `toast` from `useToast()` at the top of the store (check if `useSuiteStore` already imports it — if not, add the import).

Do NOT add loading/error refs for this action — it's fire-and-forget with toast feedback (same as `importExport.ts`).

Add `exportSuite` to the return object.

### Frontend: Test Pattern for `exportSuite`

**Do NOT mock `document.createElement`** — per CLAUDE.md, this causes infinite recursion in Vue.

In `frontend/src/stores/suites.test.ts`, mock `useApi` and stub `api.get` to return a mock payload. Verify `api.get` was called with `'suites/suite-1/export'`. Verify toast was shown. Do not test the Blob/anchor DOM steps.

```typescript
it('exportSuite calls api.get with correct path', async () => {
  vi.mocked(useApi).mockReturnValue({
    ...mockApi,
    get: vi.fn().mockResolvedValue({ name: 'Auth Suite', description: null, tags: [], definition: { groups: [] } }),
  } as unknown as ReturnType<typeof useApi>)
  const store = useSuiteStore()
  await store.exportSuite('suite-1', 'Auth Suite')
  expect(vi.mocked(useApi)().get).toHaveBeenCalledWith('suites/suite-1/export')
})
```

### Frontend: `SuiteCard.vue` — menu expansion

Currently the menu dropdown is `w-36`. Expand to `w-44` to fit "CI Integration". Add Export and CI Integration items before Delete, with a `<hr>` divider before Delete:

```vue
<!-- Export -->
<button
  class="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-info focus:ring-inset"
  role="menuitem"
  data-testid="suite-menu-export"
  @click="onExportClick"
>
  Export
</button>

<!-- CI Integration -->
<button
  class="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-info focus:ring-inset"
  role="menuitem"
  data-testid="suite-menu-ci"
  @click="onCiIntegrationClick"
>
  CI Integration
</button>

<!-- Divider -->
<hr class="border-surface-border my-1" />

<!-- Delete (existing — unchanged) -->
```

Add handlers:
```typescript
function onExportClick(e: MouseEvent) {
  e.stopPropagation()
  menuOpen.value = false
  emit('export', props.suite)
}

function onCiIntegrationClick(e: MouseEvent) {
  e.stopPropagation()
  menuOpen.value = false
  emit('ci-integration', props.suite)
}
```

### Frontend: `CiIntegrationDialog.vue`

Use `@headlessui/vue` — already installed (used by `ConfirmDialog.vue` and `SearchableSelect.vue`). Follow the exact `ConfirmDialog.vue` structure.

The curl snippet (computed):
```typescript
const snippet = computed(() => {
  if (!props.suite) return ''
  const origin = window.location.origin
  const id = props.suite.id
  return `# Trigger suite run:\ncurl -X POST ${origin}/api/suites/${id}/run \\\n  -H "Content-Type: application/json" \\\n  -d '{}'\n\n# Poll for result (replace RUN_ID with the runId from the response):\ncurl ${origin}/api/runs/RUN_ID`
})
```

Dialog layout:
- Title: "CI Integration — {suite.name}"
- `<pre>` with monospace styling, `data-testid="ci-dialog-snippet"` — the snippet
- Small note below: "Run multiple suites sequentially with separate curl calls."
- Buttons row: "Copy" (`data-testid="ci-dialog-copy-btn"`, calls `navigator.clipboard.writeText(snippet.value)`), "Close" (secondary, emits `close`)

### Frontend: `CiIntegrationDialog.test.ts`

```typescript
// test pattern
vi.mock('@headlessui/vue', () => ({
  Dialog: { template: '<div v-if="open"><slot /></div>', props: ['open'] },
  DialogPanel: { template: '<div><slot /></div>' },
  DialogTitle: { template: '<h2><slot /></h2>' },
}))
```

Tests:
- Dialog hidden when `open=false`
- Dialog visible when `open=true` with `suite` prop
- Snippet contains suite.id
- Copy button click calls `navigator.clipboard.writeText`
- Close button emits `close`

For clipboard mock: `vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })`

### Frontend: `TestSuites.vue` wiring

After adding `ciDialogSuite` ref and handlers, update the `<SuiteList>` element:
```vue
<SuiteList
  :suites="suiteStore.suites"
  :loading="suiteStore.loading"
  @delete="onDeleteRequested"
  @open="openInEditor"
  @create="openCreateForm"
  @export="onExportSuite"
  @ci-integration="onCiIntegration"
/>
```

Mount `CiIntegrationDialog` at the bottom of the template (next to `ConfirmDialog`):
```vue
<CiIntegrationDialog
  :open="!!ciDialogSuite"
  :suite="ciDialogSuite"
  @close="ciDialogSuite = null"
/>
```

### Test Pattern: SuiteCard (additive — do NOT break existing 17 tests)

```typescript
describe('context menu actions', () => {
  it('shows Export item in menu', async () => {
    // open menu, find data-testid="suite-menu-export"
  })
  it('emits export event with suite when Export clicked', async () => {
    // open menu, click Export, expect emitted('export')[0][0] === suite
  })
  it('shows CI Integration item in menu', async () => { ... })
  it('emits ci-integration event with suite when CI Integration clicked', async () => { ... })
  it('closes menu after clicking Export', async () => { ... })
})
```

### Key File Locations

| File | Action |
|------|--------|
| `backend/src/test-suites/routes/suites.ts` | Add export route |
| `backend/src/test-suites/routes/suites.test.ts` | Add export route test |
| `frontend/src/stores/suites.ts` | Add `exportSuite` action |
| `frontend/src/stores/suites.test.ts` | Add `exportSuite` test |
| `frontend/src/components/test-suites/SuiteCard.vue` | Add Export + CI Integration menu items |
| `frontend/src/components/test-suites/SuiteCard.test.ts` | Add menu item tests |
| `frontend/src/components/test-suites/SuiteList.vue` | Propagate new events |
| `frontend/src/components/test-suites/CiIntegrationDialog.vue` | New component |
| `frontend/src/components/test-suites/CiIntegrationDialog.test.ts` | New test file |
| `frontend/src/views/TestSuites.vue` | Wire export + CI integration handlers |

### CLAUDE.md Patterns Apply

- No `@pinia/testing` — use `vi.mock` pattern throughout
- Do NOT mock `document.createElement` — mock the Pinia store action (`exportSuite: vi.fn()`) in component tests
- For store unit tests: mock `useApi` composable
- `@headlessui/vue` Dialog components: stub them in component tests (same pattern as ConfirmDialog tests)

### Story 10.2 Preview (do NOT implement in this story)

Story 10.2 covers the import flow: FileImportDropzone → ImportPreview (CodeMirror with Zod lintGutter) → validation → confirm. Do not add import UI in this story — only export and CI integration.
