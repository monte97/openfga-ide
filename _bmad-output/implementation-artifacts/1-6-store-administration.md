# Story 1.6: Store Administration

Status: review

## Story

As a user,
I want to list, create, delete, and select stores on my OpenFGA instance,
so that I can manage my authorization stores and choose which one to work with.

## Acceptance Criteria

1. **Given** I navigate to the Store Admin view **When** the page loads **Then** I see a list of all stores on the connected instance, each displayed as a StoreCard showing store name, ID, and creation date, with the currently selected store highlighted

2. **Given** I am on the Store Admin view **When** I click "Create Store" and enter a name **Then** the backend creates the store via POST /api/stores, a success toast appears ("Store created"), and the new store appears in the list

3. **Given** I see a store in the list **When** I click the "Delete" button on a StoreCard **Then** a ConfirmDialog appears asking "Are you sure you want to delete [store-name]?" with Cancel and Delete buttons

4. **Given** the ConfirmDialog is showing for store deletion **When** I click "Delete" **Then** the backend deletes the store via DELETE /api/stores/:storeId, a success toast appears ("Store deleted"), and the store is removed from the list

5. **Given** I see a store in the list **When** I click on a StoreCard to select it **Then** the store becomes the active store, the header updates to show the store name, and all subsequent API calls use this store ID

6. **Given** no store is selected when the app starts **When** the app loads **Then** views show an EmptyState prompting me to select or create a store, and the header shows the pulsing "Select a store..." prompt

7. **Given** I select a store for the first time in this session **When** the store becomes active **Then** the app auto-navigates to the Model Viewer for the initial "aha" moment

8. **Given** the OpenFGA instance has no stores **When** I navigate to Store Admin **Then** I see an EmptyState with "No stores on this instance" and a "Create Store" action button

## Tasks / Subtasks

- [x] Task 1: Backend — POST /api/stores, DELETE /api/stores/:storeId (AC: #2, #4)
  - [x] Add POST /api/stores route in `backend/src/routes/stores.ts` — accepts `{ name }`, calls store service, returns 201 with created store
  - [x] Add DELETE /api/stores/:storeId route in `backend/src/routes/stores.ts` — calls store service, returns 204 on success
  - [x] Register new routes in `backend/src/app.ts`
- [x] Task 2: Backend — store-service.ts (AC: #2, #4)
  - [x] Create `backend/src/services/store-service.ts`
  - [x] Implement `createStore(name: string)` — calls `openfgaClient.post('/stores', { name })`, returns created store object
  - [x] Implement `deleteStore(storeId: string)` — calls `openfgaClient.delete('/stores/' + storeId)`, returns void
  - [x] If deleting the currently active store, clear storeId on the openfga-client
- [x] Task 3: Backend — schemas/store.ts (AC: #2)
  - [x] Create `backend/src/schemas/store.ts` — Zod schema for create store request: `{ name: z.string().min(1).max(256) }`
  - [x] Apply `validate(createStoreSchema)` middleware to POST /api/stores route
- [x] Task 4: Pinia stores store (stores/stores.ts) (AC: #1, #2, #4, #5)
  - [x] Create `frontend/src/stores/stores.ts` — Pinia store for store list management
  - [x] State: `storeList: StoreInfo[]`, `loading: boolean`, `error: string | null`
  - [x] Action `fetchStores()` — calls GET /api/stores via useApi, populates storeList
  - [x] Action `createStore(name: string)` — calls POST /api/stores, adds result to storeList, shows success toast
  - [x] Action `deleteStore(storeId: string)` — calls DELETE /api/stores/:storeId, removes from storeList, shows success toast
  - [x] Action `selectStore(storeId: string)` — delegates to connection store's `selectStore`, sets active store
- [x] Task 5: StoreCard feature component (AC: #1, #3, #5)
  - [x] Create `frontend/src/components/StoreCard.vue` (or extend from Story 1.3 base)
  - [x] Props: `store: StoreInfo`, `isActive: boolean`
  - [x] Display store name, ID (truncated), and formatted creation date
  - [x] Active indicator: highlighted border/background when `isActive` is true
  - [x] Emit `select` event on card click
  - [x] "Delete" button emits `delete` event (stops propagation so it doesn't also trigger select)
  - [x] "Backup" button rendered but disabled with tooltip "Coming in Phase 2" (Epic 6)
- [x] Task 6: StoreAdmin.vue view (AC: #1, #2, #6, #8)
  - [x] Create `frontend/src/views/StoreAdmin.vue`
  - [x] On mount: call `fetchStores()` from the stores Pinia store
  - [x] Render StoreCard list, passing `isActive` based on connection store's storeId
  - [x] "Create Store" button opens inline form or modal — input for store name, submit calls `createStore`
  - [x] When storeList is empty: render EmptyState with "No stores on this instance" message and "Create Store" action button
  - [x] Loading spinner while fetching
  - [x] Error display if fetch fails
- [x] Task 7: First-store auto-navigation (AC: #7)
  - [x] Track `hasNavigatedThisSession` flag (in stores Pinia store or connection store)
  - [x] On `selectStore`: if `hasNavigatedThisSession` is false, call `router.push('/model-viewer')` and set flag to true
  - [x] Subsequent store selections do NOT trigger navigation
- [x] Task 8: EmptyState guidance for views needing a store (AC: #6)
  - [x] In views that require a selected store (Model Viewer, Tuple Manager, etc.), check `connectionStore.storeId`
  - [x] If no storeId: render EmptyState with "Select a store to get started" and a button/link to Store Admin
  - [x] AppHeader: show pulsing "Select a store..." text when no store is selected
- [x] Task 9: Tests (AC: #1-8)
  - [x] Create `backend/src/services/store-service.test.ts` — tests for createStore, deleteStore, active store clearing
  - [x] Create `backend/src/routes/stores.test.ts` — tests for POST /api/stores (201, 400 validation), DELETE /api/stores/:storeId (204, 404)
  - [x] Create `frontend/src/views/StoreAdmin.test.ts` — tests for store list rendering, create flow, delete flow with ConfirmDialog, empty state
  - [x] Create `frontend/src/components/StoreCard.test.ts` — tests for active indicator, click events, delete button
  - [x] Test first-store auto-navigation logic: first select navigates, second does not

## Dev Notes

### Previous Story Intelligence (Stories 1.1-1.5)

- Express 5.1.0 with native async error handling — no try/catch wrappers needed in routes
- Backend uses ESM (`"type": "module"` in package.json), TypeScript 5.9 strict mode
- `openfga-client.ts` exposes `get(path)`, `post(path, body)`, `delete(path, body)` with Bearer auth injection
- `validate(schema)` middleware factory in `backend/src/middleware/validate.ts` for Zod validation on routes
- Error handler middleware returns `{ error, details }` envelope
- GET /api/stores already exists from Story 1.5 in `backend/src/routes/stores.ts`
- Connection store (`frontend/src/stores/connection.ts`) already has `storeId`, `selectStore()`, `fetchStores()`
- `useApi` composable available for frontend HTTP calls
- ConfirmDialog, EmptyState, ToastContainer components available from Story 1.3
- Vue Router configured from Story 1.4 with AppHeader and AppSidebar
- Pino for logging, Zod v4 for validation, Vitest for testing
- File naming: kebab-case for backend, PascalCase for Vue components
- Tests co-located next to source files

### Architecture Compliance

- **Backend routes:** Add POST and DELETE to existing `backend/src/routes/stores.ts`. Thin passthrough — call store-service, return response. [Source: architecture.md#API & Communication Patterns]
- **Store service:** `backend/src/services/store-service.ts` encapsulates store CRUD logic. Uses openfga-client as single contact point. [Source: architecture.md#Architectural Boundaries]
- **Zod validation:** Create store request validated via `validate(createStoreSchema)` middleware. [Source: architecture.md#Authentication & Security]
- **Pinia store:** `frontend/src/stores/stores.ts` manages store list state. Actions wrap API calls. [Source: architecture.md#Frontend State Management]
- **StoreCard:** Feature component in `frontend/src/components/StoreCard.vue`. Shows name, ID, date, active state. [Source: architecture.md#Component Organization]
- **EmptyState:** Per-view empty states with action buttons per UX-DR16. [Source: architecture.md#UX Decision Records]
- **First-store navigation:** `router.push('/model-viewer')` on first selection for "aha" moment. Session flag prevents repeated nav. [Source: architecture.md#Navigation Patterns]
- **Error handling:** Backend errors logged with Pino, returned as error envelope. Frontend shows toast on failure. [Source: architecture.md#Format Patterns]

### Critical Technical Details

- **POST /api/stores:** OpenFGA API expects `{ name: string }`, returns `{ id, name, created_at, updated_at }` with status 201
- **DELETE /api/stores/:storeId:** OpenFGA API returns 204 No Content on success. Route param `:storeId` extracted from `req.params`
- **Existing routes file:** GET /api/stores already registered in `backend/src/routes/stores.ts` from Story 1.5 — ADD to this file, do not create a new one
- **Connection store integration:** `selectStore(storeId)` in connection store updates the storeId and likely sets the openfga-client's storeId on the backend too (via PUT /api/connection or similar mechanism from Story 1.5)
- **ConfirmDialog usage:** Import and use the ConfirmDialog from Story 1.3. Pass title, message, confirm label, and handle confirm/cancel events
- **Toast usage:** Use ToastContainer/toast composable from Story 1.3 for success/error notifications
- **Backup button:** Render on StoreCard but keep disabled with `disabled` attribute and tooltip — Epic 6 will enable it

### File Structure After This Story

```
backend/src/
├── routes/
│   └── stores.ts               # MODIFIED: add POST /api/stores, DELETE /api/stores/:storeId
├── services/
│   ├── store-service.ts        # NEW: createStore, deleteStore
│   └── store-service.test.ts   # NEW: store service tests
├── schemas/
│   └── store.ts                # NEW: Zod schema for create store request
└── routes/
    └── stores.test.ts          # NEW: route tests for POST and DELETE

frontend/src/
├── stores/
│   └── stores.ts               # NEW: Pinia store for store list management
├── components/
│   ├── StoreCard.vue           # NEW (or MODIFIED from 1.3 base): full feature component
│   └── StoreCard.test.ts       # NEW: component tests
└── views/
    ├── StoreAdmin.vue          # NEW: store administration view
    └── StoreAdmin.test.ts      # NEW: view tests
```

### What NOT to Do

- Do NOT implement backup/restore on StoreCard — that is Epic 6 (Story 6.1/6.2). Render button disabled only
- Do NOT create model viewer content — that is Epic 2
- Do NOT implement store clone — that is Phase 2
- Do NOT create a new routes/stores.ts file — extend the existing one from Story 1.5
- Do NOT install `@openfga/sdk` — use existing openfga-client.ts

### References

- [Source: architecture.md#API & Communication Patterns] — Thin passthrough proxy, POST/DELETE routes
- [Source: architecture.md#Architectural Boundaries] — openfga-client.ts as single contact point
- [Source: architecture.md#Authentication & Security] — Zod validation on all routes
- [Source: architecture.md#Frontend State Management] — Pinia stores for state management
- [Source: architecture.md#Component Organization] — StoreCard as feature component
- [Source: architecture.md#UX Decision Records] — UX-DR16: EmptyState per view with action buttons
- [Source: architecture.md#Navigation Patterns] — First-store auto-navigation to Model Viewer

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- ResizeObserver not defined in jsdom when Headless UI Dialog opens — stubbed in StoreAdmin.spec.ts
- useApi.del returned res.json() on 204 No Content — fixed with `if (res.status === 204) return undefined as T`

### Completion Notes List

- `useApi.del` patched to handle 204 No Content responses (no body to parse)
- `useStoresStore.selectStore` calls `useConnectionStore()` inside the action (cross-store access pattern safe in Pinia)
- `useRouter()` used inside Pinia store setup — works because router is installed before any store is accessed
- Views (ModelViewer, TupleManager, QueryConsole) updated to show "No store selected" EmptyState when `connectionStore.storeId` is empty

### Change Log

- 2026-03-26: Story file created — status: pending
- 2026-03-26: Implementation complete — status: review

### File List

- backend/src/routes/stores.ts (MODIFIED)
- backend/src/services/store-service.ts (NEW)
- backend/src/services/store-service.test.ts (NEW)
- backend/src/schemas/store.ts (NEW)
- backend/src/routes/stores.test.ts (MODIFIED)
- frontend/src/composables/useApi.ts (MODIFIED — 204 handling)
- frontend/src/stores/stores.ts (NEW)
- frontend/src/stores/__tests__/stores.spec.ts (NEW)
- frontend/src/components/StoreCard.vue (NEW)
- frontend/src/components/__tests__/StoreCard.spec.ts (NEW)
- frontend/src/views/StoreAdmin.vue (REWRITTEN)
- frontend/src/views/__tests__/StoreAdmin.spec.ts (NEW)
- frontend/src/views/ModelViewer.vue (MODIFIED)
- frontend/src/views/TupleManager.vue (MODIFIED)
- frontend/src/views/QueryConsole.vue (MODIFIED)
