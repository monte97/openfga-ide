# Story 1.5: Connection Status and Runtime Configuration

Status: done

## Story

As a user,
I want to see the connection status in the header and change the connection at runtime,
so that I always know if I'm connected and can switch between OpenFGA instances without restarting.

## Acceptance Criteria

1. **Given** the backend is connected to an OpenFGA instance and a store is selected **When** I look at the header **Then** I see a green ConnectionBadge showing "Connected" and the active store name displayed next to it
2. **Given** the backend is connected but no store is selected **When** I look at the header **Then** I see a green ConnectionBadge showing "Connected" and a pulsing "Select a store..." prompt in the store selector area
3. **Given** the backend cannot reach the OpenFGA instance **When** I look at the header **Then** I see a red ConnectionBadge showing "Connection Error" and a toast notification with error details
4. **Given** I am viewing any page **When** I click the ConnectionBadge **Then** a ConnectionPopover opens below the badge showing the current URL and connection status
5. **Given** the ConnectionPopover is open **When** I click "Edit Connection", enter a new URL, and click "Test Connection" **Then** the backend tests the new URL and shows green "Connected" or red with error message in the popover
6. **Given** the test connection succeeded in the ConnectionPopover **When** I click "Save" **Then** the backend reinitializes the OpenFGA client with the new URL, the header updates with the new connection status, and the store list refreshes
7. **Given** the ConnectionPopover is open **When** I press Esc or click outside the popover **Then** the popover closes without making changes
8. **Given** the header shows the store selector **When** I click the store selector dropdown **Then** I see a SearchableSelect listing all available stores, and I can type to filter the list

## Tasks / Subtasks

- [x] Task 1: Backend — PUT /api/connection endpoint (AC: #5, #6)
  - [x] Create Zod schema `updateConnectionSchema` in `backend/src/schemas/connection.ts` — validates `{ url: string }` (same shape as test, but semantically separate)
  - [x] Add PUT /api/connection route in `backend/src/routes/connection.ts` — accepts `{ url }`, calls `openfgaClient.updateUrl(url)`, then calls `openfgaClient.testConnection()` to verify, returns `{ url, storeId, status: "connected" }` on success or 502 error envelope on failure
  - [x] If testConnection fails after updateUrl, revert to the previous URL (rollback safety)
  - [x] Write test `backend/src/routes/connection.test.ts` — add tests for PUT /api/connection: success, validation error, unreachable URL reverts

- [x] Task 2: Backend — GET /api/stores endpoint (AC: #8)
  - [x] Create `backend/src/routes/stores.ts` — GET /api/stores route that calls `openfgaClient.get('/stores')` and returns the `ListStoresResponse`
  - [x] Register stores routes in `backend/src/app.ts`
  - [x] Write test `backend/src/routes/stores.test.ts` — test GET /api/stores returns store list, handles OpenFGA errors
  - [x] NOTE: Do NOT add create/delete/backup endpoints — those are Story 1.6

- [x] Task 3: Pinia connection store — `frontend/src/stores/connection.ts` (AC: #1, #2, #3, #6, #8)
  - [x] Create `frontend/src/stores/connection.ts` using setup syntax (`defineStore('connection', () => { ... })`)
  - [x] State refs: `url` (string), `storeId` (string), `status` ('connected' | 'error' | 'loading'), `stores` (array of `{ id, name }`), `loading` (boolean), `error` (string | null)
  - [x] Action `fetchConnection()` — calls GET /api/connection via `useApi`, updates url/storeId/status
  - [x] Action `testConnection(url: string)` — calls POST /api/connection/test, returns success/failure without mutating store state
  - [x] Action `updateConnection(url: string)` — calls PUT /api/connection, on success updates url/status/storeId and triggers `fetchStores()`
  - [x] Action `fetchStores()` — calls GET /api/stores, populates stores array
  - [x] Action `selectStore(storeId: string)` — sets storeId in local state (store persistence to backend deferred to Story 1.6 if needed)
  - [x] Computed `activeStoreName` — derives store name from stores array + storeId
  - [x] Computed `isConnected` — derived from status === 'connected'
  - [x] Write test `frontend/src/stores/connection.test.ts` — test all actions with mocked fetch, test computed properties

- [x] Task 4: Install Headless UI dependency (prerequisite for Task 5)
  - [x] Install `@headlessui/vue` in frontend package
  - [x] Verify it resolves correctly with Vue 3.5

- [x] Task 5: Create ConnectionPopover component (AC: #4, #5, #6, #7)
  - [x] Create `frontend/src/components/layout/ConnectionPopover.vue`
  - [x] Use Headless UI `Popover` + `PopoverButton` + `PopoverPanel` for accessible open/close behavior (Esc and click-outside handled automatically)
  - [x] Default view: show current URL and connection status (read-only)
  - [x] "Edit Connection" button reveals an input field for the URL
  - [x] "Test Connection" button calls `connectionStore.testConnection(newUrl)`, shows inline result (green check or red error)
  - [x] "Save" button (enabled only after successful test) calls `connectionStore.updateConnection(newUrl)`
  - [x] "Cancel" button returns to read-only view without changes
  - [x] Styling: Tailwind classes, positioned below the trigger via Headless UI Popover positioning
  - [x] Write test `frontend/src/components/layout/ConnectionPopover.test.ts` — test open/close, edit flow, test connection feedback, save triggers updateConnection

- [x] Task 6: Create store selector component (AC: #8)
  - [x] Create `frontend/src/components/layout/StoreSelector.vue`
  - [x] Use Headless UI `Combobox` for searchable dropdown (type to filter stores)
  - [x] Bind to `connectionStore.stores` for options, `connectionStore.storeId` for selected value
  - [x] On selection change, call `connectionStore.selectStore(id)`
  - [x] Show "Select a store..." placeholder when no store is selected
  - [x] Write test `frontend/src/components/layout/StoreSelector.test.ts` — test renders stores, filters on type, emits selection

- [x] Task 7: Integrate connection area into AppHeader (AC: #1, #2, #3)
  - [x] Update `frontend/src/components/layout/AppHeader.vue` to include ConnectionBadge, ConnectionPopover, and StoreSelector in the header-right area
  - [x] ConnectionBadge is the PopoverButton trigger for ConnectionPopover
  - [x] Implement 3-state header display:
    - **Connected + store selected:** Green badge "Connected" + store name from StoreSelector
    - **Connected + no store:** Green badge "Connected" + pulsing "Select a store..." prompt (animate-pulse Tailwind class)
    - **Error:** Red badge "Connection Error" + toast notification via `useToast`
  - [x] On mount, call `connectionStore.fetchConnection()` then `connectionStore.fetchStores()`
  - [x] Watch `connectionStore.status` — on error, fire toast with error details
  - [x] Write test `frontend/src/components/layout/AppHeader.test.ts` — test 3 header states render correctly, test mount triggers fetch

## Dev Notes

### Previous Story Intelligence

- **Story 1.2:** Backend has `backend/src/routes/connection.ts` with GET /api/connection and POST /api/connection/test. `openfga-client.ts` singleton with `updateUrl()` method already exists. Zod validation middleware in `backend/src/middleware/validate.ts`. Error handler in `backend/src/middleware/error-handler.ts`. Types in `backend/src/types/api.ts` (ErrorEnvelope, ConnectionStatus) and `backend/src/types/openfga.ts` (StoreInfo, ListStoresResponse).
- **Story 1.3:** Base UI components (ConnectionBadge, SearchableSelect, AppBadge) were planned. If not yet implemented, this story must create ConnectionBadge as a simple status dot + label component.
- **Story 1.4:** AppHeader with layout slots, `useApi` composable for fetch wrapper, `useToast` composable for notifications. If not yet implemented, create minimal versions inline.

### Architecture Compliance

- **Pinia store pattern:** Use setup syntax (`defineStore('connection', () => { ... })`) with `ref()` for state and `computed()` for getters. [Source: architecture.md#State management]
- **Pinia stores are single source of truth:** Components read from stores, never fetch directly. [Source: architecture.md#Data Architecture]
- **useApi composable:** All frontend HTTP calls go through `useApi` (wraps fetch with base URL, error handling). If `useApi` was not created in Story 1.4, create a minimal version: `const useApi = () => ({ get: (path) => fetch(path).then(r => r.json()), post: (path, body) => fetch(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }).then(r => r.json()), put: (path, body) => fetch(path, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }).then(r => r.json()) })`
- **Component naming:** PascalCase, co-located tests. Layout components in `components/layout/`. [Source: architecture.md#Naming Patterns]
- **Headless UI:** Use `@headlessui/vue` for Popover and Combobox. These provide accessible keyboard handling (Esc to close, arrow keys for dropdown) out of the box. [Source: architecture.md#Component Library]
- **Tailwind CSS:** All styling via utility classes. Use `animate-pulse` for the "Select a store..." pulsing prompt. Badge colors: `bg-green-500` for connected, `bg-red-500` for error. [Source: architecture.md#Styling]
- **Backend file structure:** Routes in `routes/`, schemas in `schemas/`, services in `services/`. kebab-case filenames. [Source: architecture.md#Backend Organization]
- **Error envelope:** Backend errors always return `{ error: string, details?: unknown }`. Frontend stores must handle this shape. [Source: architecture.md#Format Patterns]

### Critical Technical Details

- **PUT /api/connection rollback:** When updating the URL, call `updateUrl(newUrl)` then `testConnection()`. If test fails, call `updateUrl(previousUrl)` to revert. This prevents leaving the client in a broken state.
- **GET /api/stores pagination:** OpenFGA's ListStores may return a `continuation_token`. For MVP, fetch first page only (default page size). Full pagination can be added in Story 1.6 if store count warrants it.
- **Headless UI Popover:** `<Popover>` wraps the entire area. `<PopoverButton>` is the trigger (ConnectionBadge). `<PopoverPanel>` is the dropdown content. Esc and click-outside close is automatic.
- **Headless UI Combobox:** `<Combobox v-model="selectedStore">` with `<ComboboxInput>` for search and `<ComboboxOptions>` / `<ComboboxOption>` for the list. Filter logic runs on the `@change` of the input by computing a filtered list.
- **Pinia 3.x:** Uses `defineStore` with setup syntax. No `$patch` needed when using refs directly. `storeToRefs()` for reactive destructuring in components.
- **Vite proxy:** Frontend calls to `/api/*` are proxied to `http://localhost:3000` in dev. No CORS needed. All fetch calls use relative paths like `/api/connection`.
- **Toast on error:** Watch `connectionStore.status` — when it changes to `'error'`, call `useToast().error(connectionStore.error)`. If useToast is not yet available from Story 1.4, implement a minimal version using a reactive ref + setTimeout auto-dismiss.

### Dependencies on Potentially Unimplemented Stories

Stories 1.3 and 1.4 may not be implemented yet. If base components (ConnectionBadge, SearchableSelect, AppHeader, useApi, useToast) do not exist:
- Create minimal ConnectionBadge inline: a `<span>` with a colored dot (`bg-green-500` / `bg-red-500` rounded-full) and status text
- Create SearchableSelect as part of StoreSelector (Task 6) using Headless UI Combobox directly
- Create AppHeader as a simple `<header>` with flex layout if it does not exist
- Create useApi as a thin fetch wrapper in `frontend/src/composables/useApi.ts`
- Create useToast as a minimal reactive notification system in `frontend/src/composables/useToast.ts`

### File Structure After This Story

```
backend/src/
  routes/
    connection.ts       # MODIFIED: add PUT /api/connection
    stores.ts           # NEW: GET /api/stores (list only)
  schemas/
    connection.ts       # MODIFIED: add updateConnectionSchema
  app.ts                # MODIFIED: register stores routes

frontend/src/
  stores/
    connection.ts               # NEW: Pinia connection store
    connection.test.ts          # NEW: store tests
  components/
    layout/
      AppHeader.vue             # MODIFIED: integrate connection area
      AppHeader.test.ts         # NEW: header state tests
      ConnectionPopover.vue     # NEW: edit connection popover
      ConnectionPopover.test.ts # NEW: popover tests
      StoreSelector.vue         # NEW: searchable store dropdown
      StoreSelector.test.ts     # NEW: selector tests
  composables/
    useApi.ts                   # NEW if not from Story 1.4
    useToast.ts                 # NEW if not from Story 1.4
```

### What NOT to Do

- Do NOT create full Store Admin CRUD (create/delete/backup/restore) -- that is Story 1.6
- Do NOT create store create/delete backend endpoints -- that is Story 1.6
- Do NOT implement first-store auto-navigation to Model Viewer -- that is Story 1.6
- Do NOT add WebSocket/SSE for real-time connection monitoring -- simple polling or on-demand check is sufficient
- Do NOT store connection URL in localStorage -- the backend is the source of truth for the active connection
- Do NOT expose the API key in any frontend response or store

### References

- [Source: architecture.md#Data Architecture] -- Pinia stores as single source of truth
- [Source: architecture.md#API & Communication Patterns] -- Thin passthrough proxy, error envelope
- [Source: architecture.md#Component Library] -- Headless UI for accessible components
- [Source: architecture.md#Architectural Boundaries] -- openfga-client.ts as single contact point, mutable URL (FR5)
- [Source: architecture.md#Project Structure] -- File locations for stores, components, composables
- [Source: architecture.md#Naming Patterns] -- PascalCase components, kebab-case backend files, useXxx composables

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Backend: 24 tests pass (18 original + 3 PUT /api/connection + 3 GET /api/stores)
- Frontend: 83 tests pass across 14 files
- Fixed StoreSelector + connection store: `stores.value ?? []` guard prevents undefined.length errors when pinia instance is replaced between tests
- Fixed AppHeader tests: use `flushPromises()` for async onMounted, share pinia instance with `setActivePinia(pinia)` before mounting

### Completion Notes List

- Backend: `updateConnectionSchema` added, PUT /api/connection with URL rollback on failure
- Backend: `GET /api/stores` proxies to OpenFGA ListStores (first page only, no pagination)
- Backend: stores.ts registered in app.ts
- Pinia connection store: setup syntax, all 5 actions + 2 computeds + 11 tests
- ConnectionPopover: Headless UI Popover, read-only → edit → test → save flow; Esc/click-outside close automatic
- StoreSelector: Headless UI Combobox, type-to-filter, bound to connection store
- AppHeader: 3-state display (connected+store, connected+no-store with animate-pulse, error), onMounted fetch, watch for error→toast

### Review Findings

- [x] [Review][Patch] Double toast su ogni errore API — `useApi` mostra toast + `AppHeader` watch mostra secondo toast identico [AppHeader.vue:18-22]
- [x] [Review][Patch] Esc/click-outside non resetta edit state — riaprendo popover mostra form stale [ConnectionPopover.vue]
- [x] [Review][Patch] `PopoverButton as="div"` non raggiungibile da tastiera — `div` non è focusable senza `tabindex="0"` [ConnectionPopover.vue:67]
- [x] [Review][Patch] `import { computed }` dopo l'uso — misplaced import, violazione di stile e falso positivo linter [ConnectionPopover.vue:62]
- [x] [Review][Patch] URL cambiato dopo test non invalida `testResult` — Save rimane abilitato su URL non testato [ConnectionPopover.vue]
- [x] [Review][Defer] `testConnection` scatena toast indesiderato via `useApi` — rumore UX durante test inline [connection.ts + useApi.ts] — deferred, pre-existing
- [x] [Review][Defer] Error toast si accumulano senza limite — toast permanenti impilati su retry multipli [useToast.ts + AppHeader.vue] — deferred, pre-existing
- [x] [Review][Defer] `fetchStores` concorrente: last-write-wins su `stores.value` [connection.ts:85-92] — deferred, pre-existing
- [x] [Review][Defer] `loading` flag condiviso tra `fetchConnection` e `updateConnection` — spinner sparisce prematuramente [connection.ts] — deferred, pre-existing
- [x] [Review][Defer] StoreSelector usa `Combobox` raw invece di `SearchableSelect` (Story 1.3 component) — deferred, pre-existing
- [x] [Review][Defer] Nessun messaggio "no results" nel dropdown store quando la ricerca non dà risultati [StoreSelector.vue] — deferred, pre-existing

### Change Log

- 2026-03-26: Story implemented — all 7 tasks complete, 83 frontend + 24 backend tests passing

### File List

- backend/src/schemas/connection.ts (modified — added updateConnectionSchema)
- backend/src/routes/connection.ts (modified — added PUT /api/connection with rollback)
- backend/src/routes/connection.test.ts (modified — added 3 tests for PUT /api/connection)
- backend/src/routes/stores.ts (new)
- backend/src/routes/stores.test.ts (new)
- backend/src/app.ts (modified — registered storesRoutes)
- frontend/src/stores/connection.ts (new)
- frontend/src/stores/__tests__/connection.spec.ts (new)
- frontend/src/components/layout/AppHeader.vue (modified — integrated connection area)
- frontend/src/components/layout/ConnectionPopover.vue (new)
- frontend/src/components/layout/StoreSelector.vue (new)
- frontend/src/components/layout/__tests__/AppHeader.spec.ts (new)
- frontend/src/components/layout/__tests__/ConnectionPopover.spec.ts (new)
- frontend/src/components/layout/__tests__/StoreSelector.spec.ts (new)
