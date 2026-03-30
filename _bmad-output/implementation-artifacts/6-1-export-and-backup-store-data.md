# Story 6.1: Export and Backup Store Data

Status: review

## Story

As a user,
I want to export a store's model and tuples as a single JSON file,
so that I can back up my authorization data and share it with others.

## Acceptance Criteria

1. **Given** a store with a model and tuples is selected **When** I send `GET /api/stores/:storeId/export` **Then** I receive a self-contained JSON file (with `Content-Disposition: attachment`) containing `{ "storeName": "<name>", "exportedAt": "<ISO8601>", "model": <model_json>, "tuples": [<all_tuples>] }`

2. **Given** I am on the Import/Export view **When** I click "Export" **Then** the browser downloads the JSON file with filename pattern `<store-name>-<date>.json` and a success toast appears ("Export complete — N tuples exported")

3. **Given** I am on the Store Admin view **When** I click the "Backup" button on a StoreCard **Then** the same export is triggered for that store, downloading the JSON file with a success toast ("Backup complete — N tuples exported")

4. **Given** a store with no model **When** I attempt to export **Then** the export still succeeds with `"model": null` and `"tuples": []`

## Tasks / Subtasks

- [x] Task 1: Backend — TypeScript types for export domain (AC: #1, #4)
  - [x] In `backend/src/types/openfga.ts` (MODIFY), add:
    - `ExportPayload` — `{ storeName: string; exportedAt: string; model: AuthorizationModel | null; tuples: TupleKey[] }`

- [x] Task 2: Backend — Zod schema for export params (AC: #1)
  - [x] Create `backend/src/schemas/export.ts`
  - [x] `exportParamsSchema` — `{ storeId: z.string().min(1) }` for route params
  - [x] No body schema needed (GET endpoint)

- [x] Task 3: Backend — `export-service.ts` (AC: #1, #4)
  - [ ] Create `backend/src/services/export-service.ts`
  - [x] Implement `exportStore(storeId: string): Promise<ExportPayload>`
    - Fetch store name via list-and-filter
    - Fetch model via `getModel(storeId)`
    - Paginate all tuples with `do...while` loop
    - Build and return `ExportPayload`
  - [x] Create `backend/src/services/export-service.test.ts`

- [x] Task 4: Backend — `routes/export.ts` (AC: #1, #4)
  - [x] Created `backend/src/routes/export.ts` with `Router({ mergeParams: true })`
  - [x] `GET /` validates params, sets `Content-Disposition: attachment` header, returns JSON
  - [x] Create `backend/src/routes/export.test.ts`

- [x] Task 5: Backend — register export router in `app.ts` (AC: #1)
  - [x] Added `exportRouter` at `/api/stores/:storeId/export` before `errorHandler`

- [x] Task 6: Pinia store — `frontend/src/stores/importExport.ts` (AC: #2, #3)
  - [x] Created with `loading`, `error`, `exportStore(storeId, storeName, label)` action
  - [x] Blob URL download approach, toast with tuple count
  - [x] Create `frontend/src/stores/importExport.test.ts`

- [x] Task 7: Frontend — `ImportExport.vue` view (AC: #2, #4)
  - [x] Rewrote from scaffold: EmptyState when no store, Export button when store selected
  - [x] Button disabled during loading, error display
  - [x] Create `frontend/src/views/ImportExport.test.ts`

- [x] Task 8: Frontend — router route (already present, verified)

- [x] Task 9: Frontend — StoreCard "Backup" button (AC: #3)
  - [x] Removed `disabled` + tooltip, added `emit('backup', props.store.id)` with `.stop`
  - [x] Added `handleBackup` in `StoreAdmin.vue` wired to `@backup`
  - [x] Updated `frontend/src/components/__tests__/StoreCard.spec.ts`
  - [x] Updated `frontend/src/views/__tests__/StoreAdmin.spec.ts`

- [x] Task 10: Tests — backend export service (5 tests, all pass)

- [x] Task 11: Tests — backend export route (5 tests, all pass)

- [x] Task 12: Tests — frontend importExport store (5 tests, all pass)

- [x] Task 13: Tests — ImportExport.vue view (4 tests, all pass)

## Dev Notes

### Backend Architecture

**New files to create:**
- `backend/src/routes/export.ts` — GET `/` handler with `Content-Disposition` header
- `backend/src/routes/export.test.ts` — supertest integration tests
- `backend/src/services/export-service.ts` — orchestrates model + tuple fetching, builds payload
- `backend/src/services/export-service.test.ts` — unit tests with mocked dependencies
- `backend/src/schemas/export.ts` — Zod param schema

**Modified files:**
- `backend/src/app.ts` — register `exportRouter` at `/api/stores/:storeId/export` before error handler
- `backend/src/types/openfga.ts` — add `ExportPayload` interface

**Route registration pattern (from `app.ts`):**
```typescript
import exportRouter from './routes/export.js'
// Add alongside other store-scoped routers:
app.use('/api/stores/:storeId/export', exportRouter)
```
All existing routers use `Router({ mergeParams: true })` when mounted at a parameterized path — follow this pattern.

**Fetching store name:**
The `GET /stores` endpoint returns `{ stores: StoreInfo[] }` where `StoreInfo = { id, name, created_at, updated_at }`. The export service must retrieve the name for the payload. Strategy: call `openfgaClient.get('/stores/' + storeId)` if OpenFGA supports single-store GET (check at implementation time). If not, call `openfgaClient.get('/stores')` and find the store by ID. The list approach works reliably since the existing `stores.ts` route already uses it. Cast result as `StoreInfo`.

**Fetching ALL tuples — pagination loop:**
The existing `readTuples` in `tuple-service.ts` is paginated and returns one page at a time. The export service must NOT use `readTuples` as-is for a single page. Instead, implement a dedicated pagination loop directly in `export-service.ts` that calls `openfgaClient.post('/stores/' + storeId + '/read', ...)` in a `do...while` loop until `continuation_token` is `""` (empty string) or absent. The export collects `TupleKey` objects only (`.key` from each `Tuple`), discarding `timestamp`. OpenFGA's `page_size` max is 100 — use 100 per page for efficiency.

Loop implementation note from Story 3.1: `continuation_token` is an empty string `""` when there are no more pages, NOT `null` or `undefined`. The loop condition must be `while (token)` (empty string is falsy in JS/TS).

**Fetching model:**
Reuse the existing `getModel(storeId)` from `backend/src/services/model-service.ts`. It already handles the "no model" case by returning `{ json: null, ... }`. Use `modelResponse.json` for the export payload.

**Content-Disposition approach (recommended: backend header):**
Set `Content-Disposition: attachment; filename="<store-name>-<date>.json"` on the backend response. This is simpler than the frontend Blob approach for a GET endpoint and keeps download logic server-side. The filename is sanitized: replace non-alphanumeric chars with `-`, lowercase, append `-YYYY-MM-DD.json`. The frontend can also implement a Blob URL trigger (see below) as a fallback for cases where the browser handles the header inconsistently in SPA context.

### Frontend Architecture

**New files to create:**
- `frontend/src/stores/importExport.ts` — Pinia store for export operations
- `frontend/src/stores/importExport.test.ts` — store tests
- `frontend/src/views/ImportExport.vue` — view for Import/Export page
- `frontend/src/views/ImportExport.test.ts` — view tests

**Modified files:**
- `frontend/src/components/StoreCard.vue` — enable Backup button (remove disabled, add emit)
- `frontend/src/components/StoreCard.test.ts` — add backup button tests
- `frontend/src/views/StoreAdmin.vue` — handle `@backup` event on StoreCard
- `frontend/src/views/StoreAdmin.test.ts` — add backup handler test

**Router and Sidebar: no changes needed.**
The `/import-export` route already exists in `frontend/src/router/index.ts` (confirmed — it was scaffolded pointing to `ImportExport.vue`). The AppSidebar already includes the "Import / Export" nav item with the `ArrowUpDown` icon (confirmed in `AppSidebar.vue` line 23).

**Browser download via Blob URL (recommended for frontend):**
Because the backend sends `Content-Disposition: attachment`, the browser SHOULD download automatically when navigating to the URL. However, in a Vite SPA context with the dev proxy, this may be unreliable. The robust approach is to fetch the export URL programmatically, read the response as JSON (to get tuple count for the toast), then create a Blob and trigger download:

```typescript
const res = await fetch(`/api/stores/${storeId}/export`)
if (!res.ok) throw new Error(await res.text())
const payload = await res.json() as ExportPayload
const tupleCount = payload.tuples.length
const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `${storeName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
a.click()
URL.revokeObjectURL(url)
```

This approach: (1) works reliably in all browsers with SPA routing, (2) lets the store read `tupleCount` for the toast message, (3) keeps the download filename logic on the frontend (consistent with AC2/AC3 filename pattern).

**Why NOT use `useApi` composable for export:**
`useApi` is designed for JSON API calls where it parses the response envelope and triggers toasts on error. For export, we need the raw `Response` to handle blob creation and read tuple count. Use the native `fetch` directly in the Pinia store action, with manual error handling matching the project's toast pattern.

**Pinia store pattern (from architecture.md + existing stores):**
```typescript
export const useImportExportStore = defineStore('importExport', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function exportStore(storeId: string, storeName: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // fetch + blob + download logic here
      // show success toast
    } catch (e) {
      error.value = (e as Error).message
      // show error toast
    } finally {
      loading.value = false
    }
  }

  return { loading, error, exportStore }
})
```

**Toast usage:**
Use the existing `useToast` composable (available from Story 1.3). Success message: `"Export complete — N tuples exported"` (AC2) or `"Backup complete — N tuples exported"` (AC3). The Pinia store action receives context indicating whether it's a backup (from StoreCard) or export (from ImportExport view) — OR use a single message format by deriving context from the caller. Simplest: pass a `mode: 'export' | 'backup'` parameter to the store action, or just always use `"Export complete — N tuples exported"` for both (both ACs use "N tuples exported" as the common suffix). Review AC2 vs AC3 — they differ only in "Export complete" vs "Backup complete" prefix. Accept a `label` parameter:
```typescript
async function exportStore(storeId: string, storeName: string, label = 'Export'): Promise<void>
// then: toast.success(`${label} complete — ${tupleCount} tuples exported`)
```

**StoreCard "Backup" button modification:**
Story 1.6 Task 5 notes: "Backup button rendered but disabled with tooltip 'Coming in Phase 2' (Epic 6)". In `StoreCard.vue`, find the disabled Backup button and:
1. Remove `disabled` attribute
2. Remove the "Coming in Phase 2" tooltip
3. Add `@click.stop="emit('backup', store.id)"` (`.stop` prevents card selection)
4. Add `'backup'` to the `defineEmits` list

In `StoreAdmin.vue`, add handler:
```typescript
const importExportStore = useImportExportStore()
function handleBackup(storeId: string, storeName: string) {
  importExportStore.exportStore(storeId, storeName, 'Backup')
}
```
Wire `<StoreCard @backup="(id) => handleBackup(id, store.name)" />`.

### Export Payload Format

```typescript
interface ExportPayload {
  storeName: string         // human-readable store name
  exportedAt: string        // ISO 8601 UTC timestamp, e.g. "2026-03-27T10:30:00.000Z"
  model: AuthorizationModel | null  // full model JSON (same shape as OpenFGA authorization_models[0])
  tuples: TupleKey[]        // array of { user, relation, object } — NO timestamps
}
```

**AC4 compliance:** when `getModel` returns `{ json: null }` and the pagination loop yields zero tuples, the payload is `{ storeName, exportedAt, model: null, tuples: [] }`. The backend must NOT error in this case.

### Critical Technical Details

**ESM import extensions:** All backend imports must use `.js` extensions:
```typescript
import { exportStore } from '../services/export-service.js'
import { getModel } from '../services/model-service.js'
import { openfgaClient } from '../services/openfga-client.js'
```

**`req.params['storeId']` typing:** Use `as string` cast — Express types it as `string | string[]` but route param is always a single string. Pattern established in Story 2.1 and followed in all subsequent stories.

**Express 5 async propagation:** No try/catch needed in routes — async errors propagate to the global error handler automatically (Express 5.1.0).

**`page_size` in pagination loop:** OpenFGA's Read API accepts `page_size` as an integer. Do NOT wrap in `Number()` in the request body — the literal `100` is already a number.

**openfgaClient interface (confirmed from Story 1.2):**
```typescript
openfgaClient.get(path: string): Promise<unknown>
openfgaClient.post(path: string, body: unknown): Promise<unknown>
```
All OpenFGA calls go through this client exclusively — no direct `fetch`.

**Vitest mock patterns (confirmed from Stories 2.1, 3.1):**
```typescript
vi.mock('../services/export-service.js', () => ({ exportStore: vi.fn() }))
// Double-cast for type assertions:
const mockExportStore = exportStore as unknown as ReturnType<typeof vi.fn>
```

**Filename sanitization:** Use `.replace(/[^a-z0-9]/gi, '-').toLowerCase()` on the store name before constructing the filename. This handles spaces, colons, slashes, and other special characters. Example: `"My Store: Test"` → `"my-store--test-2026-03-27.json"`.

### Project Structure Notes

**Files to CREATE:**
```
backend/src/
├── routes/
│   ├── export.ts                     # NEW: GET /
│   └── export.test.ts                # NEW: route tests
├── services/
│   ├── export-service.ts             # NEW: exportStore function
│   └── export-service.test.ts        # NEW: service tests
└── schemas/
    └── export.ts                     # NEW: exportParamsSchema

frontend/src/
├── stores/
│   ├── importExport.ts               # NEW: Pinia store for export ops
│   └── importExport.test.ts          # NEW: store tests
└── views/
    ├── ImportExport.vue              # NEW: Import/Export view
    └── ImportExport.test.ts          # NEW: view tests
```

**Files to MODIFY:**
```
backend/src/
├── app.ts                            # Register exportRouter
└── types/openfga.ts                  # Add ExportPayload interface

frontend/src/
├── components/
│   ├── StoreCard.vue                 # Enable Backup button
│   └── StoreCard.test.ts             # Add backup emit test
└── views/
    ├── StoreAdmin.vue                # Handle @backup event
    └── StoreAdmin.test.ts            # Add backup handler test
```

**Files confirmed as-is (no changes needed):**
- `frontend/src/router/index.ts` — `/import-export` route already exists
- `frontend/src/components/layout/AppSidebar.vue` — "Import / Export" nav item already exists

### References

- [Source: epics.md#Story 6.1] — User story, all 4 acceptance criteria
- [Source: architecture.md#Structure Patterns] — `import-export.ts` route file name, `ImportExport.vue` view name
- [Source: architecture.md#API & Communication Patterns] — Thin passthrough proxy, error envelope, Zod on all routes
- [Source: architecture.md#Frontend Architecture] — Pinia setup syntax, `useApi` composable, Toast composable
- [Source: architecture.md#Communication Patterns] — Pinia store setup pattern with loading/error
- [Source: architecture.md#Naming Patterns] — kebab-case backend, PascalCase Vue, `use...Store` Pinia
- [Source: implementation-artifacts/3-1-backend-tuple-endpoints.md] — Pagination loop, `continuation_token` empty string sentinel, `openfgaClient.post('/stores/{id}/read')`, ESM extensions, Vitest double-cast pattern
- [Source: implementation-artifacts/1-6-store-administration.md] — StoreCard props/emits, toast usage, Pinia store action pattern, Express 5 async propagation, `useApi` composable
- [Source: backend/src/services/model-service.ts] — `getModel(storeId)` returns `ModelResponse { json: AuthorizationModel | null, ... }`
- [Source: backend/src/services/tuple-service.ts] — `readTuples` pagination contract, `OpenFgaReadResponse` shape
- [Source: backend/src/types/openfga.ts] — Existing `TupleKey`, `AuthorizationModel`, `StoreInfo` types
- [Source: backend/src/app.ts] — Router registration pattern
- [Source: frontend/src/router/index.ts] — `/import-export` route already registered
- [Source: frontend/src/components/layout/AppSidebar.vue] — "Import / Export" nav item already present

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Backend list-and-filter approach used for store name (no single-store GET needed)
- Empty storeId in URL path hits 404 (Express routing), not 400 — test updated accordingly
- `document.createElement` mock in view test replaced with `vi.mock('@/stores/importExport')` pattern to avoid infinite recursion
- `StoreCard.spec.ts` had an existing test asserting Backup is disabled — updated to assert backup event emitted

### File List

**Created:**
- `backend/src/schemas/export.ts`
- `backend/src/services/export-service.ts`
- `backend/src/services/export-service.test.ts`
- `backend/src/routes/export.ts`
- `backend/src/routes/export.test.ts`
- `frontend/src/stores/importExport.ts`
- `frontend/src/stores/importExport.test.ts`
- `frontend/src/views/ImportExport.test.ts`
- `frontend/src/components/StoreCard.test.ts`

**Modified:**
- `backend/src/types/openfga.ts` — added `ExportPayload`
- `backend/src/app.ts` — registered `exportRouter`
- `frontend/src/views/ImportExport.vue` — rewritten from scaffold
- `frontend/src/components/StoreCard.vue` — enabled Backup button with emit
- `frontend/src/views/StoreAdmin.vue` — added `@backup` handler
- `frontend/src/components/__tests__/StoreCard.spec.ts` — updated backup test
- `frontend/src/views/__tests__/StoreAdmin.spec.ts` — added backup handler test
