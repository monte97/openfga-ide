# Story 6.2: Import and Restore Store Data

Status: done

## Story

As a user,
I want to import a JSON file containing model and tuples into a store,
so that I can restore backups, set up demo environments, or share authorization configurations.

## Acceptance Criteria

1. Given I am on the Import/Export view, When I see the import section, Then I see a FileImportDropzone that accepts JSON files via click-to-browse or drag-and-drop

2. Given I drag a file over the FileImportDropzone, When the file is over the drop zone, Then the dropzone shows a visual dragover state indicating it's ready to receive the file

3. Given I drop or select a JSON file, When the file is read, Then the dropzone validates the JSON structure before uploading and shows an error if the format is invalid (missing `model` or `tuples` keys)

4. Given a valid JSON file is selected, When I choose "Import to new store", Then a dialog asks for a store name, the backend creates a new store and writes the model + tuples via `POST /api/import`, a success toast appears ("Import complete — N tuples imported"), and the header auto-selects the new store

5. Given a valid JSON file is selected, When I choose "Import to current store", Then a ConfirmDialog appears: "This will overwrite the current model. Continue?" with Cancel and Import buttons

6. Given I confirm import to current store, When the import executes, Then the backend writes the model + tuples to the current store via `POST /api/stores/:storeId/import`, and a success toast appears ("Import complete — N tuples imported")

7. Given I am on the Store Admin view, When I click "Restore" on a StoreCard, Then a FileImportDropzone dialog opens to select the backup file, and the import proceeds into that store with the same overwrite confirmation flow

8. Given the import fails (invalid data, backend error), When the error is returned, Then an error toast persists with the specific error message from the API

## Tasks / Subtasks

- [x] Task 1: Backend types (AC: #4, #6)
  - [x] In `backend/src/types/openfga.ts` (MODIFY), add:
    - `ImportPayload` — `{ storeName?: string; model: AuthorizationModel | null; tuples: TupleKey[] }`
    - `ImportResult` — `{ storeId: string; storeName: string; modelWritten: boolean; tuplesImported: number }`

- [x] Task 2: Backend Zod schemas (AC: #4, #6, #8)
  - [x] Create `backend/src/schemas/import.ts`
  - [x] `importBodySchema` — validates `{ storeName?: z.string().min(1).max(256).optional(), model: z.unknown().nullable(), tuples: z.array(z.object({ user: z.string().min(1), relation: z.string().min(1), object: z.string().min(1) })) }` — note: `model` accepted as `unknown` for passthrough to OpenFGA; structural validation is done client-side and by OpenFGA itself
  - [x] `importParamsSchema` — `{ storeId: z.string().min(1) }` for the existing-store route

- [x] Task 3: Backend import-service.ts (AC: #4, #6)
  - [x] Create `backend/src/services/import-service.ts`
  - [x] Implement `importToNewStore(storeName: string, model: unknown, tuples: TupleKey[]): Promise<ImportResult>`
    - Call `openfgaClient.post('/stores', { name: storeName })` → get `{ id, name }`
    - If model is non-null: call `openfgaClient.post('/stores/' + newStoreId + '/authorization-models', model)` to write the model
    - Batch-write tuples in chunks of 100 via `openfgaClient.post('/stores/' + newStoreId + '/write', { writes: { tuple_keys: chunk } })` — loop over all chunks sequentially
    - Return `{ storeId: newStoreId, storeName, modelWritten: model !== null, tuplesImported: tuples.length }`
  - [x] Implement `importToExistingStore(storeId: string, model: unknown, tuples: TupleKey[]): Promise<ImportResult>`
    - If model is non-null: call `openfgaClient.post('/stores/' + storeId + '/authorization-models', model)`
    - Batch-write tuples in chunks of 100 (same loop pattern)
    - Return `{ storeId, storeName: '', modelWritten: model !== null, tuplesImported: tuples.length }`
  - [x] Extract private helper `writeTuplesInBatches(storeId: string, tuples: TupleKey[], batchSize = 100)` — iterates with a for-loop, slices array, calls openfgaClient.post for each batch; throws on first batch failure (no partial-success silencing)

- [x] Task 4: Backend import routes (AC: #4, #6, #8)
  - [x] Create `backend/src/routes/import.ts`
  - [x] `POST /` (mounted at `/api/import`): validate body with `importBodySchema`, extract `storeName` (required for this route — validate `storeName` is present), call `importService.importToNewStore(storeName, model, tuples)`, return 201 with `ImportResult`
  - [x] `POST /stores/:storeId/import` (mounted at `/api/stores/:storeId/import`): validate params with `importParamsSchema`, validate body with `importBodySchema`, call `importService.importToExistingStore(storeId, model, tuples)`, return 200 with `ImportResult`
  - [x] Use `Router({ mergeParams: true })` for the store-scoped route; use plain `Router()` for the top-level `/api/import` route
  - [x] Both routes: no try/catch — Express 5 async propagation handles errors

- [x] Task 5: Register import routes in app.ts (AC: #4, #6)
  - [x] In `backend/src/app.ts` (MODIFY), import and register:
    - `import importRouter from './routes/import.js'`
    - `app.use('/api/import', importRouter)` (for the new-store route)
    - `app.use('/api/stores/:storeId/import', storeImportRouter)` (for the existing-store route)
  - [x] Both registrations must appear BEFORE `app.use(errorHandler)`

- [x] Task 6: Backend tests (AC: #4, #6, #8)
  - [x] Create `backend/src/services/import-service.test.ts`
    - Mock `openfga-client.ts` via `vi.mock`
    - Test: `importToNewStore` — creates store, writes model, writes tuples in batches of 100, returns correct ImportResult
    - Test: `importToNewStore` — with 250 tuples: verifies exactly 3 batch calls (100+100+50)
    - Test: `importToNewStore` — with null model: skips model write call, `modelWritten: false`
    - Test: `importToExistingStore` — writes model + batched tuples to existing storeId
    - Test: `importToExistingStore` — error on second batch: error propagates (no partial silencing)
    - Test: `importToNewStore` — store creation failure propagates immediately
  - [x] Create `backend/src/routes/import.test.ts`
    - Mock `import-service.ts` via `vi.mock`
    - Use supertest against the Express app
    - Test: `POST /api/import` with valid body + storeName returns 201 with ImportResult
    - Test: `POST /api/import` missing `storeName` returns 400
    - Test: `POST /api/import` missing `tuples` field returns 400
    - Test: `POST /api/stores/store-01/import` with valid body returns 200 with ImportResult
    - Test: `POST /api/stores/store-01/import` missing `tuples` returns 400
    - Test: when service throws, error handler returns error envelope with appropriate status

- [x] Task 7: FileImportDropzone component (AC: #1, #2, #3)
  - [x] Create `frontend/src/components/common/FileImportDropzone.vue`
  - [x] Props: `accept?: string` (default `'application/json'`), `disabled?: boolean`
  - [x] Emits: `file-selected: [file: File]`, `validation-error: [message: string]`
  - [x] Internal state: `isDragOver: boolean`, `error: string | null`
  - [x] Template: outer `<div>` with drag event listeners (`@dragover.prevent`, `@dragleave`, `@drop.prevent`); inner hidden `<input type="file" ref="fileInput">` triggered on div click via `fileInput.value?.click()`
  - [x] Dragover CSS state: when `isDragOver` is true, apply `border-info bg-info/10` classes (border changes from `border-surface-border` to `border-info`); transition with `transition-colors`
  - [x] On drop or file input change: call `handleFile(file: File)` — validates extension (must be `.json`) and reads with `FileReader.readAsText`; on load calls `validateJson(text)`
  - [x] `validateJson(text: string)`: `JSON.parse(text)` in try/catch — if parse fails emit `validation-error('Invalid JSON file')`; if parse succeeds but `typeof parsed.model === 'undefined'` or `!Array.isArray(parsed.tuples)` emit `validation-error('Invalid format: file must contain "model" and "tuples" keys')`; otherwise emit `file-selected(file)` and store parsed data internally via a `parsedData` ref for the parent to retrieve
  - [x] Expose `parsedData` ref via `defineExpose({ parsedData })` so ImportExport.vue can read the validated payload without re-parsing
  - [x] Display error message slot below dropzone when `error` is non-null: `<p class="text-error text-sm mt-2">{{ error }}</p>`
  - [x] Slot for inner content (icon + label) so callers can customize the dropzone appearance
  - [x] Default slot content: UploadCloud icon (lucide-vue-next) + "Drop a JSON file here, or click to browse" label

- [x] Task 8: useImport composable (AC: #4, #5, #6, #8)
  - [x] Create `frontend/src/composables/useImport.ts`
  - [x] Accepts no arguments (uses `useConnectionStore` internally for active `storeId`)
  - [x] State: `importing: Ref<boolean>`, `importError: Ref<string | null>`
  - [x] `importToNewStore(storeName: string, payload: ImportPayload): Promise<ImportResult>` — POST to `/api/import` with `{ storeName, model: payload.model, tuples: payload.tuples }`; on success: call `connectionStore.selectStore(result.storeId)` + call `connectionStore.fetchStores()` to refresh store list; show success toast `"Import complete — ${result.tuplesImported} tuples imported"`; return result
  - [x] `importToCurrentStore(payload: ImportPayload): Promise<ImportResult>` — POST to `/api/stores/${storeId}/import` with `{ model: payload.model, tuples: payload.tuples }`; on success: show success toast; return result
  - [x] `importToStore(targetStoreId: string, payload: ImportPayload): Promise<ImportResult>` — POST to `/api/stores/${targetStoreId}/import`; on success: show success toast; return result (used by StoreCard Restore flow)
  - [x] All methods: set `importing.value = true` before request, `false` in finally; on catch: `importError.value = (err as Error).message`; show persistent error toast; rethrow so the caller can handle UI state

- [x] Task 9: ImportExport.vue — import section (AC: #1, #2, #3, #4, #5, #6)
  - [x] Rewrite `frontend/src/views/ImportExport.vue` (MODIFY — currently a stub EmptyState)
  - [x] The view is shared with Story 6.1 (export section) — this task adds the import section; coordinate with 6.1 file structure if 6.1 is done first
  - [x] Layout: two-section page — "Export" section (from Story 6.1) and "Import" section; use AppCard wrappers with section headings
  - [x] Import section contains:
    - `FileImportDropzone` — on `file-selected`: store the File and parsed payload in local refs (`selectedFile`, `parsedPayload`)
    - Two AppButton controls rendered once a valid file is selected: "Import to New Store" and "Import to Current Store" (disabled if no store is connected)
    - A small file-info display: filename + tuple count from parsed payload
  - [x] "Import to New Store" flow:
    - Opens an inline form (similar to StoreAdmin create-store form pattern) or a Headless UI Dialog asking for `newStoreName` text input
    - On submit: call `useImport().importToNewStore(newStoreName, parsedPayload)`; on success: reset UI state (clear selected file, close dialog)
    - Show `LoadingSpinner` inline while `importing` is true
  - [x] "Import to Current Store" flow:
    - Opens a `ConfirmDialog` (existing common component) with title "Overwrite Current Store", message "This will overwrite the current model. Continue?", confirm-label "Import", variant "info"
    - On confirm: call `useImport().importToCurrentStore(parsedPayload)`; on success: reset UI state
  - [x] Guard: if `connectionStore.storeId` is empty, show EmptyState with "Select a store to import data" and link to Store Admin (same guard pattern as other views)

- [x] Task 10: StoreCard — enable Restore button (AC: #7)
  - [x] Modify `frontend/src/components/StoreCard.vue` (MODIFY)
  - [x] Remove `disabled` attribute and "Coming in Phase 2" tooltip from the Archive/Backup button
  - [x] Rename button label from "Backup" to "Restore" (or add a separate "Restore" button alongside "Backup" from 6.1 — coordinate with 6.1)
  - [x] Change button emitted event: emit `restore` (separate from `delete`); stop propagation with `.stop`
  - [x] Add `restore: []` to `defineEmits`

- [x] Task 11: StoreAdmin.vue — Restore flow (AC: #7)
  - [x] Modify `frontend/src/views/StoreAdmin.vue` (MODIFY)
  - [x] Add state: `restoreTargetStore: StoreInfo | null`
  - [x] On `@restore` from StoreCard: set `restoreTargetStore` to the relevant store object, open `RestoreDialog`
  - [x] Create or inline a `RestoreDialog`: a Headless UI Dialog containing a `FileImportDropzone` and a `ConfirmDialog`-style flow
    - Step 1: Show FileImportDropzone — user selects or drops a backup file; "Restore" button enabled once valid file selected
    - Step 2 (after clicking Restore): show inline confirm text "This will overwrite the model of '[store name]'. Continue?" with Cancel + Import buttons
    - On confirm: call `useImport().importToStore(restoreTargetStore.id, parsedPayload)` — shows success toast; close dialog; reset state
  - [x] Handle `@restore` event: `function requestRestore(storeId: string) { restoreTargetStore = storesStore.storeList.find(s => s.id === storeId) ?? null }`

- [x] Task 12: Frontend tests (AC: #1-8)
  - [x] Create `frontend/src/components/common/FileImportDropzone.test.ts`
    - Test: renders dropzone with default slot content
    - Test: click triggers hidden file input click
    - Test: dragover sets `isDragOver` → dragover CSS classes applied
    - Test: dragleave clears `isDragOver`
    - Test: drop with non-JSON file emits `validation-error`
    - Test: drop with invalid JSON emits `validation-error('Invalid JSON file')`
    - Test: drop with JSON missing `model` key emits `validation-error` with format message
    - Test: drop with JSON missing `tuples` key emits `validation-error` with format message
    - Test: drop with valid JSON emits `file-selected` and exposes `parsedData`
  - [x] Create `frontend/src/composables/useImport.test.ts`
    - Mock `useApi` and `useConnectionStore`
    - Test: `importToNewStore` — calls POST /api/import, calls `selectStore`, shows success toast with tuple count
    - Test: `importToNewStore` — on error: sets `importError`, shows persistent error toast, rethrows
    - Test: `importToCurrentStore` — calls POST /api/stores/{storeId}/import with current storeId
    - Test: `importToStore` — calls POST /api/stores/{targetId}/import with specified storeId
    - Test: `importing` flag is true during request, false after
  - [x] Create `frontend/src/views/ImportExport.test.ts`
    - Test: shows EmptyState when no store selected
    - Test: renders FileImportDropzone in import section
    - Test: "Import to New Store" button disabled until valid file selected
    - Test: "Import to Current Store" button disabled until valid file selected
    - Test: "Import to Current Store" opens ConfirmDialog on click
    - Test: confirms import triggers `useImport().importToCurrentStore`
    - Test: successful import resets selectedFile state
  - [x] Modify `frontend/src/components/StoreCard.test.ts` (MODIFY)
    - Test: Restore button emits `restore` event on click
    - Test: Restore button click does not emit `select`

## Dev Notes

### Dependency on Story 6.1

Story 6.2 depends on Story 6.1 being complete. Story 6.1 owns:
- The `ImportExport.vue` view file (currently a stub — 6.1 builds the export section)
- The `backend/src/services/export-service.ts` (sibling service — do not merge into it)

When implementing Task 9 (ImportExport.vue), extend the file created or rewritten by 6.1. The import section is added alongside the existing export section. If 6.1 is not yet complete, the developer should coordinate or implement both sections together.

### FileImportDropzone Component

**File path:** `frontend/src/components/common/FileImportDropzone.vue`

**Drag-and-drop events pattern:**
```html
<div
  class="..."
  :class="{ 'border-info bg-info/10': isDragOver, 'border-surface-border': !isDragOver }"
  @click="fileInput?.click()"
  @dragover.prevent="isDragOver = true"
  @dragleave="isDragOver = false"
  @drop.prevent="onDrop"
>
  <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFileInputChange" />
  <slot>
    <!-- default content: UploadCloud icon + label -->
  </slot>
  <p v-if="error" class="text-error text-sm mt-2">{{ error }}</p>
</div>
```

**Client-side JSON validation logic:**
```typescript
function validateAndEmit(file: File) {
  if (!file.name.endsWith('.json')) {
    error.value = 'Only JSON files are accepted'
    emit('validation-error', error.value)
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      error.value = 'Invalid JSON file'
      emit('validation-error', error.value)
      return
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('model' in parsed) ||
      !('tuples' in parsed) ||
      !Array.isArray((parsed as Record<string, unknown>).tuples)
    ) {
      error.value = 'Invalid format: file must contain "model" and "tuples" keys'
      emit('validation-error', error.value)
      return
    }
    error.value = null
    parsedData.value = parsed as ImportPayload
    emit('file-selected', file)
  }
  reader.readAsText(file)
}
```

**`defineExpose`:** `defineExpose({ parsedData })` — the parent reads `dropzoneRef.value?.parsedData` to get the validated payload without re-reading the file.

**`isDragOver` reset:** set `isDragOver = false` also on `@drop` (after `.prevent`) to clear the visual state.

### Import to New Store Dialog

Reuse the same inline-form pattern from `StoreAdmin.vue` (create store form):
- Show form with `AppInput` for `newStoreName` (model: `newStoreName`, placeholder "Store name")
- Submit button: "Import", disabled when `newStoreName.trim()` is empty or `importing` is true; show `LoadingSpinner` inline when loading
- Cancel button: secondary variant, resets `newStoreName` and closes form
- Alternatively: open a Headless UI `Dialog` (like `ConfirmDialog`) with the name input inside — either approach is acceptable; prefer the inline form for simplicity if no modal is strictly required by the design

### Import to Current Store ConfirmDialog

Reuse the existing `ConfirmDialog` component from `frontend/src/components/common/ConfirmDialog.vue`. Props:
```html
<ConfirmDialog
  :open="showImportCurrentConfirm"
  title="Overwrite Current Store"
  message="This will overwrite the current model. Continue?"
  confirm-label="Import"
  variant="info"
  @confirm="confirmImportToCurrent"
  @cancel="showImportCurrentConfirm = false"
/>
```

### Auto-Select New Store After Import

After `importToNewStore` succeeds, the frontend must update the active store. The `useImport` composable handles this:
```typescript
const connectionStore = useConnectionStore()
// After successful POST /api/import response (result.storeId is the new store's ID):
connectionStore.selectStore(result.storeId)
await connectionStore.fetchStores()  // refresh store list so header shows correct name
```

`connectionStore.selectStore(id)` sets `storeId.value = id`. `fetchStores()` refreshes `stores` array so `activeStoreName` computed property resolves correctly. Do NOT call `useStoresStore().selectStore()` here (that triggers auto-navigation to Model Viewer, which is undesirable after import).

### Backend Route Registration in app.ts

Two separate router registrations are needed:

```typescript
// Route for creating a new store via import
import importRouter from './routes/import.js'
app.use('/api/import', importRouter)

// Route for importing into an existing store
app.use('/api/stores/:storeId/import', importRouter)  // same router, mergeParams: true
```

**Alternative:** register a single router for both routes if the router file is structured to handle both paths. The cleaner approach is one router file with two handlers, mounted at both paths separately. Check if Express mergeParams correctly resolves `:storeId` when the same router is used at multiple mount points — if there are issues, create two separate router instances or files.

The preferred structure: one `import.ts` route file that exports two routers:
```typescript
// backend/src/routes/import.ts
export const importRouter = Router()         // for POST /api/import (new store)
export const storeImportRouter = Router({ mergeParams: true })  // for POST /api/stores/:storeId/import
```

### Batch Tuple Write (OpenFGA Constraint)

OpenFGA's `/write` endpoint has a limit of 100 tuple keys per request (per call). The backend service must batch writes:

```typescript
async function writeTuplesInBatches(storeId: string, tuples: TupleKey[], batchSize = 100) {
  for (let i = 0; i < tuples.length; i += batchSize) {
    const chunk = tuples.slice(i, i + batchSize)
    await openfgaClient.post(`/stores/${storeId}/write`, {
      writes: { tuple_keys: chunk },
    })
  }
}
```

**Failure behavior:** if any batch fails, the error propagates immediately. There is NO partial-success recovery — the import is treated as failed. The success toast is only shown if ALL batches succeed. This matches the behavior of the export story (all-or-nothing semantics).

**Partial import state:** if the model write succeeded but tuple batch N fails, the store will have a new model with 0 to (N-1)*100 tuples. This is an acceptable edge case for MVP — document it in the error toast if possible (the backend error will include the batch index context from the OpenFGA error message).

### Model Write (WriteAuthorizationModel)

Use the OpenFGA `POST /stores/{storeId}/authorization-models` endpoint:
```typescript
await openfgaClient.post(`/stores/${storeId}/authorization-models`, model)
```

The `model` object from the export payload is the raw `AuthorizationModel` JSON (which includes `schema_version`, `type_definitions`, `conditions`). Pass it as-is to OpenFGA. Do NOT include the `id` field from the source model — OpenFGA assigns a new model ID on write.

**Null model handling:** if `payload.model` is `null` (store exported with no model), skip the model write entirely. The `modelWritten` field in `ImportResult` will be `false`.

### StoreCard Restore Button

The current `StoreCard.vue` has the Archive/Backup button rendered but `disabled` with a "Coming in Phase 2" tooltip (from Story 1.6). This story enables it:

1. Remove `disabled` attribute and `title="Coming in Phase 2"` from the Archive button
2. Rename the visible label to "Restore" (the Archive icon can remain, or switch to a RotateCcw icon from lucide)
3. Add `restore: []` to `defineEmits` and emit it on click (with `.stop` to prevent select)
4. StoreAdmin.vue listens to `@restore` and opens the restore dialog

**Note on "Backup" button:** Story 6.1 owns the Backup/Export button behavior. Story 6.2 only activates the Restore functionality. Coordinate with Story 6.1 implementation — if 6.1 has already added a "Backup" button, this story adds a separate "Restore" button, or repurposes the existing disabled button depending on the final 6.1 StoreCard design.

### StoreAdmin Restore Dialog Pattern

The restore dialog in StoreAdmin follows a two-step flow inside a Headless UI Dialog:
- Step 1: FileImportDropzone — user selects backup file
- Step 2 (after file selected): show "Import" button; clicking it shows an inline confirmation text before proceeding
- On confirm: call `useImport().importToStore(targetStoreId, parsedPayload)`

Keep dialog internal state minimal: `restoreTargetStoreId: string | null`, `restoreStep: 'dropzone' | 'confirm'`, `restoreParsedPayload: ImportPayload | null`.

### Error Handling

- **Client-side validation errors:** displayed inline under the dropzone via the `error` prop/slot; do NOT show a toast for validation errors
- **Backend errors:** caught in `useImport` composable; `useToast().show({ type: 'error', message })` — error toasts persist until dismissed (per the useToast design from Story 1.3)
- **Batch partial failure:** the error message from OpenFGA will indicate which operation failed; the composable re-throws after showing the toast so the view can reset the loading state

### TypeScript Types for Frontend

Define an `ImportPayload` interface in the composable or a shared types file:
```typescript
interface ImportPayload {
  storeName?: string
  exportedAt?: string
  model: Record<string, unknown> | null
  tuples: Array<{ user: string; relation: string; object: string }>
}

interface ImportResult {
  storeId: string
  storeName: string
  modelWritten: boolean
  tuplesImported: number
}
```

These can be defined locally in `useImport.ts` — no need for a separate shared types file for MVP.

### Project Structure Notes

```
backend/src/
├── app.ts                                # MODIFIED: register import routes
├── routes/
│   ├── import.ts                         # NEW: POST /api/import + POST /api/stores/:storeId/import
│   └── import.test.ts                    # NEW: route integration tests
├── services/
│   ├── import-service.ts                 # NEW: importToNewStore, importToExistingStore
│   └── import-service.test.ts            # NEW: service unit tests
├── schemas/
│   └── import.ts                         # NEW: Zod schemas
└── types/
    └── openfga.ts                        # MODIFIED: add ImportPayload, ImportResult

frontend/src/
├── components/
│   ├── common/
│   │   ├── FileImportDropzone.vue        # NEW: drag-and-drop + click-to-browse
│   │   └── FileImportDropzone.test.ts    # NEW: component tests
│   └── StoreCard.vue                     # MODIFIED: enable Restore button, add restore emit
├── composables/
│   ├── useImport.ts                      # NEW: importToNewStore, importToCurrentStore, importToStore
│   └── useImport.test.ts                 # NEW: composable tests
├── views/
│   ├── ImportExport.vue                  # MODIFIED: add import section (extends 6.1 export section)
│   ├── ImportExport.test.ts              # NEW (or MODIFIED if 6.1 created it): import section tests
│   └── StoreAdmin.vue                    # MODIFIED: add restore flow + RestoreDialog
```

### References

- [Source: epics.md#Story 6.2] — User story and all 8 acceptance criteria
- [Source: implementation-artifacts/6-1-export-and-backup-store-data.md] — Prerequisite story; shares ImportExport.vue, export-service.ts sibling service, backend service patterns
- [Source: implementation-artifacts/1-6-store-administration.md] — StoreCard patterns, ConfirmDialog usage, StoreAdmin form pattern, store creation flow, `useToast` pattern
- [Source: implementation-artifacts/3-1-backend-tuple-endpoints.md] — OpenFGA `/write` endpoint shape (`{ writes: { tuple_keys: [...] } }`), batch delete pattern, ESM import conventions, Router({ mergeParams: true }) pattern
- [Source: implementation-artifacts/1-3-design-system-foundation-and-base-components.md] — ConfirmDialog props/events, useToast singleton, ToastContainer error-persist behavior
- [Source: backend/src/app.ts] — Route registration order, errorHandler placement
- [Source: backend/src/routes/queries.ts] — Route file structure, validate middleware usage, mergeParams pattern
- [Source: frontend/src/stores/connection.ts] — `selectStore`, `fetchStores`, `storeId`, `activeStoreName` — used by useImport to auto-select new store
- [Source: frontend/src/stores/stores.ts] — `createStore` pattern (POST /stores), store list management — NOT reused directly; import-service creates store via openfgaClient directly on backend
- [Source: frontend/src/components/StoreCard.vue] — Current disabled Backup/Archive button to be enabled as Restore
- [Source: frontend/src/views/StoreAdmin.vue] — ConfirmDialog usage pattern, inline create-store form pattern (reuse for store name input in import flow)
- [Source: architecture.md#API & Communication Patterns] — Thin passthrough proxy, error envelope
- [Source: architecture.md#Naming Patterns] — `import-service.ts`, `FileImportDropzone.vue`, `useImport.ts`
- [Source: architecture.md#Authentication & Security] — Zod validation on all routes

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Two routers exported from `routes/import.ts`: `importRouter` (plain Router) for `/api/import` and `storeImportRouter` (mergeParams: true) for `/api/stores/:storeId/import`
- `importNewStoreBodySchema` added as a separate Zod schema that requires `storeName` (distinct from `importBodySchema` which makes it optional) — avoids runtime validation logic in the route handler
- `restorePayload` in `StoreAdmin.vue` read via `restoreDropzoneRef.value?.parsedData?.value` (double-unwrap: component ref + exposed ref value)
- Story file tasks were not checked off during implementation — updated during Epic 6 retrospective

### File List

**Created:**
- `backend/src/schemas/import.ts`
- `backend/src/services/import-service.ts`
- `backend/src/services/import-service.test.ts`
- `backend/src/routes/import.ts`
- `backend/src/routes/import.test.ts`
- `frontend/src/components/common/FileImportDropzone.vue`
- `frontend/src/components/common/FileImportDropzone.test.ts`
- `frontend/src/composables/useImport.ts`
- `frontend/src/composables/useImport.test.ts`

**Modified:**
- `backend/src/types/openfga.ts` — added `ImportPayload`, `ImportResult`
- `backend/src/app.ts` — registered `importRouter` and `storeImportRouter`
- `frontend/src/views/ImportExport.vue` — added import section (extends 6.1 export section)
- `frontend/src/views/ImportExport.test.ts` — added import section tests
- `frontend/src/components/StoreCard.vue` — enabled Restore button with `restore` emit
- `frontend/src/views/StoreAdmin.vue` — added restore dialog flow
