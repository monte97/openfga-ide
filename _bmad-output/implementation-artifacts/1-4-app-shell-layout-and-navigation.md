# Story 1.4: App Shell Layout and Navigation

Status: review

## Story

As a user,
I want a polished dark-themed app with navigation sidebar and header,
so that I can orient myself and navigate between all views of the tool.

## Acceptance Criteria

1. **Given** I open the application **When** the page loads **Then** I see a dark-themed UI (gray-950 base) with a 56px header bar at the top displaying the app title, and a collapsible sidebar on the left with navigation links to all views (Model Viewer, Tuple Manager, Query Console, Relationship Graph, Store Admin, Import/Export)

2. **Given** the sidebar is expanded (240px) **When** I click the collapse toggle or press the keyboard shortcut **Then** the sidebar collapses to 64px showing only icons, and the content area expands

3. **Given** I collapse or expand the sidebar **When** I reload the page **Then** the sidebar retains its collapsed/expanded state from localStorage

4. **Given** the viewport width is less than 1280px **When** the page loads **Then** the sidebar auto-collapses to 64px

5. **Given** the viewport width is less than 1024px **When** the page loads **Then** a warning banner appears: "OpenFGA Viewer is designed for desktop browsers (1280px+)"

6. **Given** the app is loaded **When** I navigate using only keyboard (Tab, Enter, arrow keys, Esc) **Then** all interactive elements have visible focus rings, sidebar links are navigable, and a skip-to-content link is available before the sidebar

7. **Given** the app is loaded **When** I inspect the HTML structure **Then** semantic landmarks are present: header, nav (sidebar), main (content area)

8. **Given** the useApi composable is implemented **When** a component calls useApi.get('/api/stores') **Then** the composable prepends the /api/ prefix, parses the error envelope on failure, triggers a toast notification on error, and returns typed data on success

9. **Given** any view has no data to display **When** the view renders **Then** it shows an EmptyState component with a Lucide icon, descriptive message, and an action button pointing to the logical next step

## Tasks / Subtasks

- [x] Task 1: Create Vue Router configuration with all 6 routes + placeholder views (AC: #1)
  - [x] Replace `frontend/src/router/index.ts` with routes: `/model-viewer`, `/tuple-manager`, `/query-console`, `/relationship-graph`, `/store-admin`, `/import-export`
  - [x] Add redirect from `/` to `/model-viewer` (default landing view)
  - [x] Create placeholder views: `frontend/src/views/ModelViewer.vue`, `TupleManager.vue`, `QueryConsole.vue`, `RelationshipGraph.vue`, `StoreAdmin.vue`, `ImportExport.vue`
  - [x] Each placeholder view renders an EmptyState component with appropriate Lucide icon, message, and action button per UX-DR16
  - [x] Remove default scaffolding views (`HomeView.vue`, `AboutView.vue`) and related components (`HelloWorld.vue`, `TheWelcome.vue`, `WelcomeItem.vue`, icons/)

- [x] Task 2: Create EmptyState component (AC: #9)
  - [x] Create `frontend/src/components/common/EmptyState.vue`
  - [x] Props: `icon` (Lucide component), `title` (string), `message` (string), `actionLabel` (string, optional), `actionTo` (string route path, optional)
  - [x] Renders centered vertically: Lucide icon (48px, gray-400), title (text-lg, gray-100), message (text-sm, gray-400), AppButton (if actionLabel provided, uses router-link to actionTo)
  - [x] Uses semantic HTML and is keyboard-accessible

- [x] Task 3: Create AppHeader component (AC: #1, #7)
  - [x] Create `frontend/src/components/layout/AppHeader.vue`
  - [x] Fixed at top, height 56px, full width, bg-gray-900, border-b border-gray-700
  - [x] Left side: app title "OpenFGA Viewer" in text-lg font-semibold text-white
  - [x] Right side: placeholder `<slot name="connection" />` for ConnectionBadge (Story 1.5)
  - [x] Uses `<header>` semantic element with `role="banner"`

- [x] Task 4: Create AppSidebar component (AC: #1, #2, #3, #4, #6, #7)
  - [x] Create `frontend/src/components/layout/AppSidebar.vue`
  - [x] Width: 240px expanded, 64px collapsed; transition on width change (duration-200)
  - [x] Background: bg-gray-900, border-r border-gray-700
  - [x] Navigation items with Lucide icons: FileCode2 (Model Viewer), Database (Tuple Manager), Search (Query Console), GitBranch (Relationship Graph), Settings (Store Admin), ArrowUpDown (Import/Export)
  - [x] Active item styling: border-l-2 border-info text-info bg-gray-800/50; inactive: text-gray-400 hover:text-gray-100 hover:bg-gray-800/30
  - [x] Collapsed mode: show only icons centered, tooltip with label on hover
  - [x] Collapse toggle button at bottom of sidebar (ChevronLeft / ChevronRight icon)
  - [x] Keyboard shortcut: `Ctrl+B` toggles collapse/expand (prevent default, works globally)
  - [x] Read/write collapsed state from `localStorage` key `sidebar-collapsed`
  - [x] On mount: if `window.innerWidth < 1280`, auto-collapse regardless of localStorage
  - [x] Uses `<nav>` semantic element with `aria-label="Main navigation"`

- [x] Task 5: Create App.vue layout shell (AC: #1, #5, #7)
  - [x] Rewrite `frontend/src/App.vue` with layout: AppHeader (fixed top) + AppSidebar (fixed left, below header) + `<main>` content area (flex-1, overflow-auto, p-6)
  - [x] Content area: `margin-left` matches sidebar width (240px or 64px), `margin-top: 56px`
  - [x] Viewport warning banner: if `window.innerWidth < 1024`, show fixed banner at top of content area: "OpenFGA Viewer is designed for desktop browsers (1280px+)" with dismiss button, bg-warning/10 text-warning
  - [x] `<RouterView>` inside `<main id="main-content">`
  - [x] Include ToastContainer from Story 1.3 (rendered at App level)

- [x] Task 6: Create useApi composable (AC: #8)
  - [x] Create `frontend/src/composables/useApi.ts`
  - [x] Export functions: `get<T>(path)`, `post<T>(path, body)`, `put<T>(path, body)`, `del<T>(path)`
  - [x] Each function prepends `/api/` prefix to the path (caller passes e.g. `'stores'`, composable calls `/api/stores`)
  - [x] On response: if `!res.ok`, parse JSON body for error envelope `{ error, details? }`, call `useToast().show({ type: 'error', message: error })`, then throw
  - [x] On network error: call `useToast().show({ type: 'error', message: 'Network error' })`, then throw
  - [x] On success: parse JSON and return typed `T`
  - [x] Uses native `fetch()` (available in all modern browsers)

- [x] Task 7: Implement skip-to-content link (AC: #6)
  - [x] Add visually-hidden skip link as first focusable element in App.vue: `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to content</a>`
  - [x] On focus: link becomes visible at top-left with z-50, bg-gray-900, text-white, padding

- [x] Task 8: Tests (AC: #2, #3, #6, #8)
  - [x] Create `frontend/src/composables/useApi.test.ts` — tests: prepends /api/ prefix, returns typed data on success, parses error envelope on failure and triggers toast, handles network error
  - [x] Create `frontend/src/components/layout/AppSidebar.test.ts` — tests: renders all 6 nav links, collapse toggle changes width, reads/writes localStorage, keyboard shortcut Ctrl+B
  - [x] Create `frontend/src/router/index.test.ts` — tests: all 6 routes resolve, / redirects to /model-viewer
  - [x] Create `frontend/src/components/common/EmptyState.test.ts` — tests: renders icon/title/message, renders action button when props provided, no button when actionLabel omitted

## Dev Notes

### Previous Story Intelligence (Story 1.1, 1.2, 1.3)

- Monorepo with `frontend/` and `backend/` packages via npm workspaces
- Frontend: Vue 3.5.30, Vue Router 5.0.3, Pinia 3.0.4, Vite 7.3.1, TypeScript 5.9, Vitest 4.0.18
- Frontend uses ESM (`"type": "module"`)
- Current `frontend/src/router/index.ts` has default scaffolding routes (`/` and `/about`) — must be replaced
- Current `frontend/src/App.vue` and views are default create-vue scaffolding — must be rewritten
- Default scaffolding components to remove: `HelloWorld.vue`, `TheWelcome.vue`, `WelcomeItem.vue`, `icons/` directory
- Backend: Express 5.1.0, Pino, Zod v4, connection endpoints working
- Story 1.3 (DEPENDENCY): Delivers Tailwind v4.2 dark theme, 13 base components (AppButton, AppInput, AppBadge, AppCard, etc.), useToast composable, ToastContainer. This story MUST be complete before 1.4 begins
- Vite proxy configured: `/api/*` proxies to `http://localhost:3000`

### Architecture Compliance

- **Layout structure:** AppHeader 56px fixed top, AppSidebar 240px/64px collapsible left, content area flex-1. [Source: architecture.md#Frontend Organization]
- **File locations:** `components/layout/AppHeader.vue`, `components/layout/AppSidebar.vue`, `composables/useApi.ts`, `router/index.ts`, views in `views/` directory. [Source: architecture.md#Structure Patterns]
- **Naming:** Vue composables use `use` prefix camelCase (`useApi.ts`). Vue components use PascalCase (`AppHeader.vue`). [Source: architecture.md#Naming Patterns]
- **API composable:** ALL frontend API calls go through `useApi` composable. Prepends `/api/`, parses error envelope, triggers toast on error. [Source: architecture.md#Enforcement Guidelines]
- **Error flow:** Backend error envelope `{ error, details? }` -> `useApi` detects -> `useToast` displays -> Pinia store sets error ref. [Source: architecture.md#Process Patterns]
- **Test co-location:** Tests next to source files (`AppSidebar.test.ts` next to `AppSidebar.vue`). [Source: architecture.md#Enforcement Guidelines]
- **Semantic HTML:** `<header>`, `<nav>`, `<main>` landmarks required. [Source: UX-DR9]

### Technical Details

- **Vue Router 5:** Import from `vue-router`. Use `createRouter` + `createWebHistory`. Lazy-load views with `() => import(...)` for code splitting
- **Lucide Vue:** Install `lucide-vue-next`. Import individual icons: `import { FileCode2, Database, Search, GitBranch, Settings, ArrowUpDown } from 'lucide-vue-next'`. Each icon is a Vue component accepting `size` and `class` props
- **localStorage sidebar state:** Key: `sidebar-collapsed`, values: `"true"` / `"false"`. Read on mount, write on toggle. Type: `string` (localStorage only stores strings)
- **Keyboard shortcut:** Use `window.addEventListener('keydown', handler)` in `onMounted`, clean up in `onUnmounted`. Check `e.ctrlKey && e.key === 'b'`, call `e.preventDefault()`
- **useApi implementation pattern:**
  ```typescript
  export function useApi() {
    const toast = useToast()

    async function get<T>(path: string): Promise<T> {
      const res = await fetch(`/api/${path}`)
      if (!res.ok) {
        const body = await res.json()
        toast.show({ type: 'error', message: body.error || 'Request failed' })
        throw new Error(body.error || 'Request failed')
      }
      return res.json() as Promise<T>
    }
    // post, put, del follow same pattern with method + body
    return { get, post, put, del }
  }
  ```
- **EmptyState per view (UX-DR16):**
  - Model Viewer: icon=FileCode2, "No authorization model loaded", action="Go to Import/Export" -> /import-export
  - Tuple Manager: icon=Database, "No tuples in this store", action="Go to Import/Export" -> /import-export
  - Query Console: icon=Search, "No model loaded", action="Go to Model Viewer" -> /model-viewer
  - Relationship Graph: icon=GitBranch, "No tuples to visualize", action="Go to Tuple Manager" -> /tuple-manager
  - Store Admin: icon=Settings, "No stores on this instance", action="Create Store" (no route, button emits event)
  - Import/Export: icon=ArrowUpDown, "Select a store to import or export data", action="Go to Store Admin" -> /store-admin
- **Responsive breakpoints:** `window.innerWidth` checked on mount. No resize listener needed for auto-collapse (only on initial load per AC #4). Warning banner uses resize listener or `matchMedia` for reactivity below 1024px
- **Skip-to-content:** Must be first focusable element in DOM. Uses Tailwind `sr-only` class (visually hidden), `focus:not-sr-only` to reveal on focus. Links to `#main-content`

### File Structure After This Story

```
frontend/src/
├── App.vue                          # REWRITTEN: layout shell (header + sidebar + main + toast)
├── main.ts                          # UNCHANGED (already mounts App with router + pinia)
├── router/
│   └── index.ts                     # REWRITTEN: 6 routes + / redirect
├── composables/
│   ├── useApi.ts                    # NEW: fetch wrapper, /api/ prefix, error envelope, toast
│   ├── useApi.test.ts               # NEW: 4 tests
│   └── useToast.ts                  # FROM STORY 1.3 (unchanged)
├── views/
│   ├── ModelViewer.vue              # NEW: placeholder with EmptyState
│   ├── TupleManager.vue             # NEW: placeholder with EmptyState
│   ├── QueryConsole.vue             # NEW: placeholder with EmptyState
│   ├── RelationshipGraph.vue        # NEW: placeholder with EmptyState
│   ├── StoreAdmin.vue               # NEW: placeholder with EmptyState
│   └── ImportExport.vue             # NEW: placeholder with EmptyState
├── components/
│   ├── layout/
│   │   ├── AppHeader.vue            # NEW: 56px header bar
│   │   └── AppSidebar.vue           # NEW: collapsible sidebar
│   │       └── AppSidebar.test.ts   # NEW: 4 tests
│   └── common/
│       ├── EmptyState.vue           # NEW: reusable empty state
│       ├── EmptyState.test.ts       # NEW: 3 tests
│       └── ToastContainer.vue       # FROM STORY 1.3 (unchanged)
└── router/
    └── index.test.ts                # NEW: 3 tests
```

### What NOT to Do

- Do NOT create ConnectionBadge behavior (connection status display) -- that is Story 1.5
- Do NOT create ConnectionPopover (edit connection settings) -- that is Story 1.5
- Do NOT create store selector in header -- that is Story 1.5
- Do NOT create StoreAdmin view content (store CRUD UI) -- that is Story 1.6
- Do NOT create any feature view content -- just placeholder views with EmptyState
- Do NOT install `@openfga/sdk` -- backend uses raw HTTP client
- Do NOT create Pinia stores (connection, model, tuples, etc.) -- those come in later stories
- Do NOT add actual data fetching in views -- placeholder only, real data comes with feature stories
- Do NOT create mobile/responsive layouts beyond the warning banner -- desktop-only (1280px+)
- Do NOT add CORS middleware or configuration -- same-origin deployment via Vite proxy

### Dependencies

- **Story 1.3 MUST be complete** before starting this story. Required deliverables from 1.3:
  - Tailwind v4.2 dark theme with design tokens (gray-950 base, etc.)
  - AppButton component (used in EmptyState action buttons)
  - useToast composable (used by useApi for error notifications)
  - ToastContainer component (rendered in App.vue)
  - All base component styles and focus ring utilities

### References

- [Source: architecture.md#Structure Patterns] -- Frontend organization, component grouping
- [Source: architecture.md#Naming Patterns] -- Vue composable and component naming
- [Source: architecture.md#Enforcement Guidelines] -- useApi as sole API client, co-located tests
- [Source: architecture.md#Process Patterns] -- Error handling flow through useApi -> useToast
- [Source: architecture.md#API & Communication Patterns] -- /api/ prefix, error envelope
- [Source: epics.md#UX-DR4] -- Collapsible sidebar spec (240px/64px, localStorage, auto-collapse)
- [Source: epics.md#UX-DR9] -- Accessibility: focus rings, keyboard nav, semantic landmarks
- [Source: epics.md#UX-DR16] -- EmptyState guidance per view
- [Source: epics.md#UX-DR18] -- Viewport warning banner below 1024px

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Removed stale HelloWorld.spec.ts (HelloWorld.vue was deleted in Task 1)
- Fixed useApi.spec.ts: replaced `require()` with static ESM `import` for useToast
- Fixed AppSidebar/EmptyState tests: `onMounted` state changes need `await $nextTick()` to reflect in DOM
- Fixed AppSidebar tests: double `vi.spyOn` on same property — reuse existing spy ref via `mockReturnValue()`
- 59 frontend tests pass across 10 files in 6.72s

### Completion Notes List

- Vue Router 5: 6 lazy-loaded routes + `/` redirect to `/model-viewer`
- Removed scaffolding: HomeView.vue, AboutView.vue, HelloWorld.vue, TheWelcome.vue, WelcomeItem.vue, icons/
- EmptyState updated with `title` prop + `actionTo` for RouterLink integration
- AppHeader: fixed 56px, semantic `<header role="banner">`, connection slot for Story 1.5
- AppSidebar: 240px/64px collapsible with Tailwind transition, 6 nav items with Lucide icons, active state via router path match, localStorage persistence, auto-collapse on <1280px, Ctrl+B keyboard shortcut
- App.vue: skip-to-content link, viewport warning banner (<1024px), ToastContainer, main margin synced with sidebar state
- useApi: fetch wrapper with /api/ prefix, error envelope parsing, toast on error, typed returns

### Change Log

- 2026-03-26: Story implemented — all 8 tasks complete, 59 tests passing

### File List

- frontend/src/router/index.ts (modified — replaced with 6 app routes + / redirect)
- frontend/src/App.vue (modified — rewritten as layout shell)
- frontend/src/views/ModelViewer.vue (new)
- frontend/src/views/TupleManager.vue (new)
- frontend/src/views/QueryConsole.vue (new)
- frontend/src/views/RelationshipGraph.vue (new)
- frontend/src/views/StoreAdmin.vue (new)
- frontend/src/views/ImportExport.vue (new)
- frontend/src/views/HomeView.vue (deleted)
- frontend/src/views/AboutView.vue (deleted)
- frontend/src/components/HelloWorld.vue (deleted)
- frontend/src/components/TheWelcome.vue (deleted)
- frontend/src/components/WelcomeItem.vue (deleted)
- frontend/src/components/icons/ (deleted)
- frontend/src/components/__tests__/HelloWorld.spec.ts (deleted)
- frontend/src/components/common/EmptyState.vue (modified — added title + actionTo props, RouterLink)
- frontend/src/components/common/__tests__/EmptyState.spec.ts (new)
- frontend/src/components/layout/AppHeader.vue (new)
- frontend/src/components/layout/AppSidebar.vue (new)
- frontend/src/components/layout/__tests__/AppSidebar.spec.ts (new)
- frontend/src/composables/useApi.ts (new)
- frontend/src/composables/index.ts (modified — added useApi export)
- frontend/src/composables/__tests__/useApi.spec.ts (new)
- frontend/src/router/__tests__/index.spec.ts (new)
