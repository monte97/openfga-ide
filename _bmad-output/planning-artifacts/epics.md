---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# openfga-viewer - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for openfga-viewer, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can configure the OpenFGA instance URL via environment variable
FR2: User can configure a pre-shared API key via environment variable
FR3: User can configure a default store ID via environment variable
FR4: User can view the current connection configuration (URL, store, status)
FR5: User can update the connection configuration (URL, store) at runtime from the UI
FR6: User can test the connection to the OpenFGA instance and see success or error feedback
FR7: User can see the connection status (connected/error) and active store name in the header at all times
FR8: User can list all stores on the connected OpenFGA instance
FR9: User can create a new store with a given name
FR10: User can delete an existing store
FR11: User can select a store to work with from the list of existing stores
FR12: User can backup a store (model + all tuples) as a downloadable JSON file
FR13: User can restore a store from a previously exported JSON backup file
FR14: User can view the current authorization model in DSL format with syntax highlighting
FR15: User can view the current authorization model as a visual graph (types as nodes, relations as edges)
FR16: User can click on a type node in the graph to see its relations, metadata, and directly related user types
FR17: System converts the JSON model to DSL via @openfga/syntax-transformer on the backend
FR18: User can view all tuples in a paginated data table
FR19: User can filter tuples by type, relation, and user
FR20: User can add a new tuple (user, relation, object)
FR21: User can delete a single tuple from the table
FR22: User can select multiple tuples and delete them in batch
FR23: User can run a Check query (user, relation, object) and see allowed (green) or denied (red) result
FR24: User can run a List Objects query (user, relation, type) and see the list of accessible objects
FR25: User can run a List Users query (object type + id, relation) and see the list of users with access
FR26: User can run an Expand query (relation, object) and see the relation expansion as a collapsible tree view
FR27: User can switch between query types via a tabbed interface
FR28: User can view an interactive graph of concrete entities from tuples (e.g., user:alice, repository:acme/api)
FR29: System displays edges labeled with the relation name between entities
FR30: System visually groups and colors nodes by type
FR31: User can zoom, pan, and drag nodes in the graph
FR32: User can filter the graph to show/hide specific types
FR33: User can click on a node to see all its relationships
FR34: System uses automatic layout (dagre) for graph positioning
FR35: User can export the current store's model and tuples as a single JSON file
FR36: User can import a JSON file containing model and tuples into the current store
FR37: User can import a JSON file into a newly created store
FR38: Export file includes model, tuples, store name, and export timestamp
FR39: User can navigate between all pages via a fixed sidebar
FR40: System displays a header bar with app title, connection status badge, and active store name
FR41: If no store is selected on startup, the system prompts the user to select or create a store

### NonFunctional Requirements

NFR1: Page load (initial SPA bundle): < 3 seconds
NFR2: Model graph rendering (up to 20 types): < 2 seconds
NFR3: Query response (Check, List Objects, List Users, Expand): < 1 second end-to-end
NFR4: Tuple table pagination: smooth scrolling and filtering with up to 10,000 tuples
NFR5: Relationship graph rendering (up to 500 entities): < 3 seconds with dagre layout
NFR6: Pre-shared API key is stored only on the backend; never exposed to the frontend or included in API responses
NFR7: All frontend-to-backend communication over HTTP (HTTPS when deployed behind a reverse proxy)
NFR8: Backend validates and sanitizes all input before forwarding to OpenFGA
NFR9: No credential persistence — API key is read from environment variable on startup only
NFR10: No user authentication in MVP — the tool is assumed to run in a trusted environment
NFR11: Backend must support OpenFGA API v1 (HTTP REST)
NFR12: DSL<->JSON conversion via @openfga/syntax-transformer — pin to a tested version, validate on startup
NFR13: Export/import format must be self-contained (model + tuples + metadata in a single JSON file)
NFR14: Backend must handle OpenFGA API errors gracefully and return meaningful error messages to the frontend

### Additional Requirements

- Architecture specifies manual npm workspaces + create-vue as starter template approach (greenfield)
- Monorepo with frontend/ and backend/ packages under npm workspaces
- Express + TypeScript backend proxy — all OpenFGA communication goes through the backend
- Zod v4.3.x for runtime schema validation (shared schemas between frontend/backend)
- Pino for structured JSON logging (OpenTelemetry-ready)
- Single multi-stage Dockerfile for production (build frontend → build backend → single image)
- Docker Compose for local development (frontend + backend + OpenFGA instance)
- Vite dev server proxies /api/* to Express backend in dev (no CORS issues)
- Same-origin deployment: Express serves SPA static files in production
- dotenv for environment configuration: OPENFGA_URL, OPENFGA_API_KEY, OPENFGA_STORE_ID, PORT
- Consistent error envelope { error: string, details?: any } for all backend error responses
- Pinia stores follow setup syntax pattern with loading/error/data refs
- useApi composable handles /api/* prefix, error envelope parsing, toast triggering
- Co-located tests: test files next to source files
- API endpoints: plural, kebab-case under /api/* prefix

### UX Design Requirements

UX-DR1: Implement dark-first theme with Tailwind v4.2 @theme design tokens — surface colors (gray-950 base, gray-900 cards, gray-800 elevated, gray-700 borders), semantic colors (success green, error red, warning amber, info blue), text colors (gray-100 primary, gray-400 secondary, white emphasis)
UX-DR2: Implement 13 base components: AppButton (primary/secondary/danger + loading state), AppInput (with monospace variant), AppTabs (Headless UI TabGroup + arrow key nav), AppBadge (4 variants), AppCard, AppSelect (Headless UI Listbox), SearchableSelect (Headless UI Combobox), ConfirmDialog (Headless UI Dialog + focus trap), ToastContainer (auto-dismiss 5s, stackable, bottom-right), ConnectionBadge, EmptyState (per-view variants with action button), LoadingSpinner (inline + full-view), TypeBadge (deterministic color from 8-color palette via type name hash)
UX-DR3: Implement AppHeader with 3-state machine: connected+store-selected (green badge, store name), connected+no-store (green badge, pulsing "Select a store..." prompt), disconnected (red badge, error details)
UX-DR4: Implement collapsible AppSidebar: 240px expanded / 64px collapsed, icon-only mode, state persisted in localStorage, keyboard shortcut toggle, auto-collapse below 1280px
UX-DR5: Implement ConnectionPopover: opens from ConnectionBadge click, shows current URL + status, edit mode with Test Connection + Save, positioned below badge
UX-DR6: Implement ResolutionPath component for inline "Why?" expansion: chain of TypeBadge nodes with arrows showing permission resolution path, clickable entities navigate to Relationship Graph
UX-DR7: Implement WhyButton component: triggers ResolutionPath expansion on Check results, fetches Expand API on first click
UX-DR8: Implement FileImportDropzone: click to open file picker + drag-and-drop, validates JSON before upload, dragover/uploading/success/error states
UX-DR9: Implement StoreCard: store list item with metadata (ID, created date) + Backup/Delete action buttons, active indicator for selected store
UX-DR10: Implement GraphNodeDetail inspector panel: 320px overlay sliding from right, close on Esc/click-outside, shows node relations + connected entities + "Query this entity" action
UX-DR11: Implement typography system: Inter/system sans-serif for UI, JetBrains Mono (weights 400+700, ligatures OFF) for code/IDs/DSL via @fontsource/jetbrains-mono
UX-DR12: Implement accessibility patterns: skip-to-content link, screen reader landmarks (header/nav/main/aside), focus rings (ring-2 ring-info) on all interactive elements, prefers-reduced-motion respect, minimum 4.5:1 contrast ratios
UX-DR13: Implement feedback patterns: toast notifications for mutations (success auto-dismiss 5s, error persist), inline validation on blur with aria-describedby, ConfirmDialog for all destructive actions
UX-DR14: Implement data freshness pattern: all views re-fetch data on mount (no caching), query inputs and table filters persist across view switches via Pinia stores
UX-DR15: Implement first-store-selection auto-navigation: when user selects a store for the first time in session, auto-navigate to Model Viewer for the "aha" moment
UX-DR16: Implement EmptyState guidance per view: Model Viewer → "Go to Import/Export", Tuple Manager → "Add Tuple" / "Go to Import/Export", Query Console → "Go to Model Viewer", Relationship Graph → "Go to Tuple Manager", Store Admin → "Create Store"
UX-DR17: Implement graph node coloring with deterministic 8-color palette (#3b82f6, #8b5cf6, #f59e0b, #10b981, #ec4899, #06b6d4, #f97316, #84cc16) assigned via hash(typeName) % 8, all passing 4.5:1 on gray-950
UX-DR18: Implement viewport warning banner below 1024px: "OpenFGA Viewer is designed for desktop browsers (1280px+)"

### FR Coverage Map

FR1: Epic 1 - Configure OpenFGA instance URL via env var
FR2: Epic 1 - Configure pre-shared API key via env var
FR3: Epic 1 - Configure default store ID via env var
FR4: Epic 1 - View current connection configuration
FR5: Epic 1 - Update connection configuration at runtime
FR6: Epic 1 - Test connection to OpenFGA instance
FR7: Epic 1 - See connection status and active store in header
FR8: Epic 1 - List all stores on connected instance
FR9: Epic 1 - Create a new store
FR10: Epic 1 - Delete an existing store
FR11: Epic 1 - Select a store to work with
FR12: Epic 6 - Backup a store as downloadable JSON
FR13: Epic 6 - Restore a store from exported JSON
FR14: Epic 2 - View model in DSL format with syntax highlighting
FR15: Epic 2 - View model as visual graph
FR16: Epic 2 - Click type node to see relations and metadata
FR17: Epic 2 - Convert JSON model to DSL on backend
FR18: Epic 3 - View tuples in paginated data table
FR19: Epic 3 - Filter tuples by type, relation, and user
FR20: Epic 3 - Add a new tuple
FR21: Epic 3 - Delete a single tuple
FR22: Epic 3 - Batch delete selected tuples
FR23: Epic 4 - Run Check query with green/red result
FR24: Epic 4 - Run List Objects query
FR25: Epic 4 - Run List Users query
FR26: Epic 4 - Run Expand query as collapsible tree
FR27: Epic 4 - Switch between query types via tabs
FR28: Epic 5 - View interactive graph of entities from tuples
FR29: Epic 5 - Display edges labeled with relation name
FR30: Epic 5 - Visually group and color nodes by type
FR31: Epic 5 - Zoom, pan, and drag nodes
FR32: Epic 5 - Filter graph by type
FR33: Epic 5 - Click node to see all relationships
FR34: Epic 5 - Automatic dagre layout
FR35: Epic 6 - Export store model + tuples as JSON
FR36: Epic 6 - Import JSON into current store
FR37: Epic 6 - Import JSON into newly created store
FR38: Epic 6 - Export file includes model, tuples, store name, timestamp
FR39: Epic 1 - Navigate between pages via fixed sidebar
FR40: Epic 1 - Header bar with title, connection badge, active store
FR41: Epic 1 - Prompt to select/create store if none selected

## Epic List

### Epic 1: Connect and Manage Stores
User can launch the app, connect to an OpenFGA instance, see connection status, and manage stores (list, create, delete, select). This epic delivers the complete app shell, design system, base components, and all foundational infrastructure.
**FRs covered:** FR1-FR11, FR39-FR41
**UX-DRs covered:** UX-DR1-5, UX-DR9, UX-DR11-13, UX-DR15-16, UX-DR18

### Epic 2: Visualize Authorization Models
User can view the authorization model as syntax-highlighted DSL code and as an interactive visual graph with type nodes and relation edges, understanding the structure of their authorization system.
**FRs covered:** FR14-FR17
**UX-DRs covered:** UX-DR17

### Epic 3: Manage Tuples
User can view all tuples in a paginated table, filter by type/relation/user, add new tuples, and delete single or batch tuples.
**FRs covered:** FR18-FR22
**UX-DRs covered:** UX-DR14

### Epic 4: Query Permissions
User can run Check, List Objects, List Users, and Expand queries with clear green/red feedback and inline "Why?" resolution path explanations.
**FRs covered:** FR23-FR27
**UX-DRs covered:** UX-DR6-7

### Epic 5: Visualize Entity Relationships
User can see an interactive graph of concrete entities from tuples, colored by type, with zoom/pan/drag, type filtering, and a detail inspector panel on node click.
**FRs covered:** FR28-FR34
**UX-DRs covered:** UX-DR10

### Epic 6: Import, Export & Backup
User can export store data as JSON, import JSON files into current or new stores, and backup/restore stores for disaster recovery and sharing.
**FRs covered:** FR12-FR13, FR35-FR38
**UX-DRs covered:** UX-DR8

---

## Epic 1: Connect and Manage Stores

User can launch the app, connect to an OpenFGA instance, see connection status, and manage stores (list, create, delete, select). This epic delivers the complete app shell, design system, base components, and all foundational infrastructure.

### Story 1.1: Project Scaffolding and Dev Environment

As a developer,
I want a fully configured monorepo with frontend, backend, and local dev environment,
So that I can start building features on a solid foundation.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** I run `npm install` at the root
**Then** both `frontend/` and `backend/` packages install their dependencies via npm workspaces

**Given** the monorepo is installed
**When** I run `docker compose up`
**Then** the frontend dev server starts on port 5173, the backend starts on port 3000, and an OpenFGA instance starts on port 8080

**Given** the dev environment is running
**When** I open http://localhost:5173 in a browser
**Then** I see a basic Vue 3 app page confirming the frontend is working

**Given** the dev environment is running
**When** I send GET http://localhost:3000/api/health
**Then** I receive a 200 response with `{ "status": "ok" }`

**Given** the frontend dev server is running
**When** the frontend makes a request to /api/health
**Then** Vite proxies the request to the backend on port 3000 and returns the response

**Given** the project structure
**When** I inspect the repository
**Then** I find frontend/ scaffolded with TypeScript, Vue Router, Pinia, Vitest, ESLint+Prettier, and backend/src/ with Express + TypeScript entry point, tsconfig.json, and a .env.example file documenting OPENFGA_URL, OPENFGA_API_KEY, OPENFGA_STORE_ID, PORT

### Story 1.2: Backend Proxy Core and Connection Management

As a developer,
I want the backend to connect to an OpenFGA instance and expose connection status endpoints,
So that the frontend can verify connectivity and the backend can proxy all OpenFGA operations securely.

**Acceptance Criteria:**

**Given** environment variables OPENFGA_URL and OPENFGA_API_KEY are set
**When** the backend starts
**Then** it creates an HTTP client configured to forward requests to the OpenFGA instance with the pre-shared key in the Authorization header

**Given** OPENFGA_STORE_ID is set in environment variables
**When** the backend starts
**Then** it uses that store ID as the default active store

**Given** the backend is running and connected
**When** I send GET /api/connection
**Then** I receive `{ "url": "<configured_url>", "storeId": "<active_store_id>", "status": "connected" }` with the API key NOT included in the response

**Given** the backend is running
**When** I send POST /api/connection/test with `{ "url": "<openfga_url>" }`
**Then** the backend attempts to reach the OpenFGA instance and returns `{ "status": "connected" }` on success or `{ "error": "Connection failed", "details": "<reason>" }` on failure

**Given** an invalid request body is sent to any backend endpoint
**When** the Zod validation middleware processes the request
**Then** it returns 400 with `{ "error": "Validation error", "details": "<zod_errors>" }`

**Given** the OpenFGA instance returns an error
**When** the backend forwards the request
**Then** it logs the error with Pino, wraps it in the error envelope `{ "error": "<message>", "details": "<context>" }`, and returns an appropriate HTTP status code (400/404/500)

### Story 1.3: Design System Foundation and Base Components

As a developer,
I want a complete set of themed, accessible base components and design tokens,
So that all views can be built with a consistent visual language and behavior.

**Acceptance Criteria:**

**Given** the frontend package
**When** I inspect the Tailwind v4.2 configuration
**Then** @theme tokens are defined for: surface colors (gray-950 base, gray-900 cards, gray-800 elevated, gray-700 borders), semantic colors (success #22c55e, error #ef4444, warning #f59e0b, info #3b82f6), text colors (gray-100 primary, gray-400 secondary, white emphasis)

**Given** the design system is configured
**When** I inspect the font setup
**Then** JetBrains Mono is loaded via @fontsource/jetbrains-mono (weights 400/700, ligatures OFF) and Inter/system sans-serif is the default UI font

**Given** the base components are implemented
**When** I import and render each component
**Then** all 13 base components are available: AppButton (primary/secondary/danger + loading/disabled states), AppInput (with monospace variant, validation error state with aria-describedby), AppTabs (Headless UI TabGroup with arrow key navigation, aria-selected), AppBadge (success/error/warning/info variants with aria-label), AppCard (section wrapper), AppSelect (Headless UI Listbox for < 10 items), SearchableSelect (Headless UI Combobox for >= 10 items with type-to-filter), ConfirmDialog (Headless UI Dialog with focus trap, aria-modal), ToastContainer (auto-dismiss 5s, stackable, bottom-right, aria-live="polite"), ConnectionBadge (connected/error states), EmptyState (icon + message + action button), LoadingSpinner (inline + full-view variants), TypeBadge (deterministic color from 8-color palette via hash of type name)

**Given** any interactive base component is rendered
**When** I navigate with keyboard (Tab, Enter, Space, Esc, arrow keys)
**Then** the component has a visible focus ring (ring-2 ring-info) and responds to the appropriate keyboard interactions

**Given** the useToast composable is implemented
**When** I call useToast().show({ type: 'success', message: 'Test' })
**Then** a toast notification appears in the ToastContainer, auto-dismisses after 5 seconds, and supports error toasts that persist until dismissed

### Story 1.4: App Shell Layout and Navigation

As a user,
I want a polished dark-themed app with navigation sidebar and header,
So that I can orient myself and navigate between all views of the tool.

**Acceptance Criteria:**

**Given** I open the application
**When** the page loads
**Then** I see a dark-themed UI (gray-950 base) with a 56px header bar at the top displaying the app title, and a collapsible sidebar on the left with navigation links to all views (Model Viewer, Tuple Manager, Query Console, Relationship Graph, Store Admin, Import/Export)

**Given** the sidebar is expanded (240px)
**When** I click the collapse toggle or press the keyboard shortcut
**Then** the sidebar collapses to 64px showing only icons, and the content area expands

**Given** I collapse or expand the sidebar
**When** I reload the page
**Then** the sidebar retains its collapsed/expanded state from localStorage

**Given** the viewport width is less than 1280px
**When** the page loads
**Then** the sidebar auto-collapses to 64px

**Given** the viewport width is less than 1024px
**When** the page loads
**Then** a warning banner appears: "OpenFGA Viewer is designed for desktop browsers (1280px+)"

**Given** the app is loaded
**When** I navigate using only keyboard (Tab, Enter, arrow keys, Esc)
**Then** all interactive elements have visible focus rings, sidebar links are navigable, and a skip-to-content link is available before the sidebar

**Given** the app is loaded
**When** I inspect the HTML structure
**Then** semantic landmarks are present: `<header>`, `<nav>` (sidebar), `<main>` (content area)

**Given** the useApi composable is implemented
**When** a component calls useApi.get('/api/stores')
**Then** the composable prepends the /api/ prefix, parses the error envelope on failure, triggers a toast notification on error, and returns typed data on success

**Given** any view has no data to display
**When** the view renders
**Then** it shows an EmptyState component with a Lucide icon, descriptive message, and an action button pointing to the logical next step

### Story 1.5: Connection Status and Runtime Configuration

As a user,
I want to see the connection status in the header and change the connection at runtime,
So that I always know if I'm connected and can switch between OpenFGA instances without restarting.

**Acceptance Criteria:**

**Given** the backend is connected to an OpenFGA instance and a store is selected
**When** I look at the header
**Then** I see a green ConnectionBadge showing "Connected" and the active store name displayed next to it

**Given** the backend is connected but no store is selected
**When** I look at the header
**Then** I see a green ConnectionBadge showing "Connected" and a pulsing "Select a store..." prompt in the store selector area

**Given** the backend cannot reach the OpenFGA instance
**When** I look at the header
**Then** I see a red ConnectionBadge showing "Connection Error" and a toast notification with error details

**Given** I am viewing any page
**When** I click the ConnectionBadge
**Then** a ConnectionPopover opens below the badge showing the current URL and connection status

**Given** the ConnectionPopover is open
**When** I click "Edit Connection", enter a new URL, and click "Test Connection"
**Then** the backend tests the new URL and shows green "Connected" or red with error message in the popover

**Given** the test connection succeeded in the ConnectionPopover
**When** I click "Save"
**Then** the backend reinitializes the OpenFGA client with the new URL, the header updates with the new connection status, and the store list refreshes

**Given** the ConnectionPopover is open
**When** I press Esc or click outside the popover
**Then** the popover closes without making changes

**Given** the header shows the store selector
**When** I click the store selector dropdown
**Then** I see a SearchableSelect listing all available stores, and I can type to filter the list

### Story 1.6: Store Administration

As a user,
I want to list, create, delete, and select stores on my OpenFGA instance,
So that I can manage my authorization stores and choose which one to work with.

**Acceptance Criteria:**

**Given** I navigate to the Store Admin view
**When** the page loads
**Then** I see a list of all stores on the connected instance, each displayed as a StoreCard showing store name, ID, and creation date, with the currently selected store highlighted

**Given** I am on the Store Admin view
**When** I click "Create Store" and enter a name
**Then** the backend creates the store via POST /api/stores, a success toast appears ("Store created"), and the new store appears in the list

**Given** I see a store in the list
**When** I click the "Delete" button on a StoreCard
**Then** a ConfirmDialog appears asking "Are you sure you want to delete [store-name]?" with Cancel and Delete buttons

**Given** the ConfirmDialog is showing for store deletion
**When** I click "Delete"
**Then** the backend deletes the store via DELETE /api/stores/:storeId, a success toast appears ("Store deleted"), and the store is removed from the list

**Given** I see a store in the list
**When** I click on a StoreCard to select it
**Then** the store becomes the active store, the header updates to show the store name, and all subsequent API calls use this store ID

**Given** no store is selected when the app starts
**When** the app loads
**Then** views show an EmptyState prompting me to select or create a store, and the header shows the pulsing "Select a store..." prompt

**Given** I select a store for the first time in this session
**When** the store becomes active
**Then** the app auto-navigates to the Model Viewer for the initial "aha" moment

**Given** the OpenFGA instance has no stores
**When** I navigate to Store Admin
**Then** I see an EmptyState with "No stores on this instance" and a "Create Store" action button

---

## Epic 2: Visualize Authorization Models

User can view the authorization model as syntax-highlighted DSL code and as an interactive visual graph, understanding the structure of their authorization system.

### Story 2.1: Backend Model Endpoint and DSL Conversion

As a developer,
I want the backend to serve the authorization model in both JSON and DSL formats,
So that the frontend can display the model in the user's preferred format.

**Acceptance Criteria:**

**Given** a store with an authorization model is selected
**When** I send GET /api/stores/:storeId/model
**Then** I receive `{ "json": <model_json>, "dsl": "<model_dsl>", "authorizationModelId": "<id>" }` with the DSL generated by @openfga/syntax-transformer

**Given** a store with no authorization model
**When** I send GET /api/stores/:storeId/model
**Then** I receive `{ "json": null, "dsl": null, "authorizationModelId": null }`

**Given** the @openfga/syntax-transformer package
**When** the backend starts
**Then** the pinned version is loaded and validated, and DSL conversion is tested with a known input

**Given** the syntax-transformer fails to convert a model
**When** the backend processes the model response
**Then** it returns the JSON model with `"dsl": null` and logs a warning with Pino, rather than failing the entire request

### Story 2.2: Model DSL View with Syntax Highlighting

As a user,
I want to view the authorization model as syntax-highlighted DSL code,
So that I can read and understand the model definition in a familiar code format.

**Acceptance Criteria:**

**Given** I navigate to the Model Viewer with a store that has a model
**When** the DSL tab is active (default)
**Then** I see the model DSL rendered with Shiki syntax highlighting, line numbers, and JetBrains Mono font in a dark theme

**Given** the DSL view is displayed
**When** I click the "Copy" button
**Then** the full DSL text is copied to my clipboard and a success toast confirms "DSL copied to clipboard"

**Given** I navigate to the Model Viewer with a store that has no model
**When** the page loads
**Then** I see an EmptyState: "No authorization model loaded" with a "Go to Import/Export" action button

**Given** the model is loading
**When** the API call is in progress
**Then** I see a LoadingSpinner in the content area

### Story 2.3: Model Graph View with Interactive Nodes

As a user,
I want to view the authorization model as an interactive visual graph,
So that I can understand the type hierarchy and relation structure visually.

**Acceptance Criteria:**

**Given** I navigate to the Model Viewer with a store that has a model
**When** I switch to the Graph tab
**Then** I see a Vue Flow canvas with types rendered as nodes and relations rendered as labeled edges, laid out automatically with dagre

**Given** the model graph is displayed
**When** I look at the nodes
**Then** each type node is colored using the deterministic 8-color palette (hash of type name % 8), matching the TypeBadge colors used elsewhere in the app, and all colors pass 4.5:1 contrast on the dark canvas

**Given** the model graph is displayed
**When** I click on a type node
**Then** a GraphNodeDetail inspector panel (320px) slides in from the right showing the type's relations, metadata, and directly related user types

**Given** the GraphNodeDetail panel is open
**When** I press Esc or click outside the panel
**Then** the panel closes and the graph canvas returns to full width

**Given** the model graph is displayed
**When** I use mouse wheel to zoom, click-drag the canvas to pan, or drag a node
**Then** the graph responds smoothly with zoom, pan, and node repositioning

**Given** a model with up to 20 types
**When** the graph renders
**Then** it completes rendering in under 2 seconds (NFR2)

---

## Epic 3: Manage Tuples

User can view all tuples in a paginated table, filter by type/relation/user, add new tuples, and delete single or batch tuples.

### Story 3.1: Backend Tuple Endpoints

As a developer,
I want backend endpoints for tuple CRUD with pagination and filtering,
So that the frontend can display, add, and delete tuples on any store.

**Acceptance Criteria:**

**Given** a store with tuples exists
**When** I send GET /api/stores/:storeId/tuples
**Then** I receive `{ "tuples": [...], "continuationToken": "<token>" }` with paginated results

**Given** a store with tuples exists
**When** I send GET /api/stores/:storeId/tuples?type=user&relation=viewer&user=user:alice
**Then** I receive only tuples matching all provided filter criteria (AND logic)

**Given** valid tuple data
**When** I send POST /api/stores/:storeId/tuples with `{ "user": "user:alice", "relation": "viewer", "object": "document:roadmap" }`
**Then** the tuple is written to the store and I receive 201 with the created tuple

**Given** an existing tuple
**When** I send DELETE /api/stores/:storeId/tuples with `{ "user": "user:alice", "relation": "viewer", "object": "document:roadmap" }`
**Then** the tuple is deleted and I receive 200

**Given** multiple tuples to delete
**When** I send DELETE /api/stores/:storeId/tuples/batch with `{ "deletes": [<tuple1>, <tuple2>, ...] }`
**Then** all specified tuples are deleted and I receive 200 with a count of deleted tuples

**Given** invalid tuple data (missing fields, wrong format)
**When** I send POST /api/stores/:storeId/tuples
**Then** Zod validation returns 400 with `{ "error": "Validation error", "details": "<specifics>" }`

### Story 3.2: Tuple Table with Filtering and Pagination

As a user,
I want to view all tuples in a filterable, paginated table,
So that I can inspect the concrete relationships in my authorization store.

**Acceptance Criteria:**

**Given** I navigate to the Tuple Manager with a store that has tuples
**When** the page loads
**Then** I see a TanStack Table with columns for user, relation, and object, displaying tuples with TypeBadge-colored identifiers in monospace font

**Given** the tuple table is displayed
**When** I look above the table
**Then** I see three always-visible filter inputs (type, relation, user) in monospace font with clear (X) buttons

**Given** I type a value in any filter input
**When** the filter is applied
**Then** the table updates to show only tuples matching all active filters (AND logic)

**Given** the store has more tuples than fit on one page
**When** I scroll to the bottom of the table
**Then** pagination controls allow me to navigate through pages, and scrolling/filtering is smooth with up to 10,000 tuples (NFR4)

**Given** I have active filters on the Tuple Manager
**When** I navigate to another view and return
**Then** my filter values are preserved via Pinia store (UX-DR14)

**Given** I navigate to the Tuple Manager
**When** the view mounts
**Then** tuples are re-fetched from the API (data freshness pattern — no caching)

**Given** a store with no tuples
**When** I navigate to the Tuple Manager
**Then** I see an EmptyState: "No tuples in this store" with "Add Tuple" and "Go to Import/Export" action buttons

### Story 3.3: Add and Delete Tuples

As a user,
I want to add new tuples and delete existing ones individually or in batch,
So that I can manage the concrete authorization relationships in my store.

**Acceptance Criteria:**

**Given** I am on the Tuple Manager
**When** I click "Add Tuple"
**Then** an inline AddTupleForm appears with three fields: User (monospace input with type:id hint), Relation (AppSelect populated from current model relations), Object (monospace input with type:id hint), and a Submit button

**Given** I fill in the AddTupleForm with valid values
**When** I click Submit
**Then** the tuple is created via POST, a success toast appears ("Tuple added"), the form clears, and the table refreshes to show the new tuple

**Given** I submit the AddTupleForm with invalid or incomplete data
**When** validation runs on blur
**Then** inline validation errors appear below the invalid fields with aria-describedby links

**Given** I see a tuple row in the table
**When** I click the delete button on that row
**Then** the tuple is deleted via DELETE, a success toast appears ("Tuple deleted"), and the row is removed from the table

**Given** I select multiple tuple rows via checkboxes
**When** I click "Delete Selected"
**Then** a ConfirmDialog appears: "Delete [N] selected tuples?" with Cancel and Delete buttons

**Given** the batch delete ConfirmDialog is showing
**When** I click "Delete"
**Then** all selected tuples are deleted via batch DELETE, a success toast appears ("N tuples deleted"), and the table refreshes

---

## Epic 4: Query Permissions

User can run Check, List Objects, List Users, and Expand queries with clear green/red feedback and inline "Why?" resolution path explanations.

### Story 4.1: Backend Query Endpoints

As a developer,
I want backend endpoints for all four OpenFGA query types,
So that the frontend can execute permission queries and display results.

**Acceptance Criteria:**

**Given** a store with a model and tuples
**When** I send POST /api/stores/:storeId/query/check with `{ "user": "user:alice", "relation": "viewer", "object": "document:roadmap" }`
**Then** I receive `{ "allowed": true }` or `{ "allowed": false }`

**Given** a store with a model and tuples
**When** I send POST /api/stores/:storeId/query/list-objects with `{ "user": "user:alice", "relation": "viewer", "type": "document" }`
**Then** I receive `{ "objects": ["document:roadmap", "document:specs", ...] }`

**Given** a store with a model and tuples
**When** I send POST /api/stores/:storeId/query/list-users with `{ "object": { "type": "document", "id": "roadmap" }, "relation": "viewer" }`
**Then** I receive `{ "users": ["user:alice", "user:marco", ...] }`

**Given** a store with a model and tuples
**When** I send POST /api/stores/:storeId/query/expand with `{ "relation": "viewer", "object": "document:roadmap" }`
**Then** I receive the expansion tree as returned by the OpenFGA Expand API

**Given** invalid query parameters
**When** I send a query request with missing or malformed fields
**Then** Zod validation returns 400 with `{ "error": "Validation error", "details": "<specifics>" }`

**Given** any query endpoint
**When** the request completes successfully
**Then** the end-to-end response time (frontend → backend → OpenFGA → backend → frontend) is under 1 second (NFR3)

### Story 4.2: Check Query with Green/Red Result and Why Explanation

As a user,
I want to run a Check query and see a clear allowed/denied result with an explanation of why,
So that I can verify permissions and understand the resolution path.

**Acceptance Criteria:**

**Given** I navigate to the Query Console
**When** the page loads
**Then** I see a tabbed interface with Check as the default active tab, and three input fields: User (monospace), Relation (AppSelect populated from current model), Object (monospace)

**Given** I fill in User, Relation, and Object on the Check tab
**When** I click "Check" or press Enter
**Then** the query executes and I see either a large green checkmark with "Allowed" or a large red X with "Denied", displayed below the input fields with response time

**Given** a Check result is displayed (allowed or denied)
**When** I click the "Why?" button below the result
**Then** the WhyButton triggers an Expand API call and a ResolutionPath component expands inline showing the permission chain as a series of TypeBadge nodes connected with arrows (e.g., `user:marco → member of team:backend → viewer on document:specs`)

**Given** the ResolutionPath is showing a denied result
**When** I look at the chain
**Then** it shows where the resolution breaks with a visual gap or red indicator

**Given** the ResolutionPath is displayed
**When** I click on an entity TypeBadge in the chain
**Then** the app navigates to the Relationship Graph filtered on that entity

**Given** I have query inputs filled in
**When** I navigate to another view and return to Query Console
**Then** my input values are preserved via Pinia store

**Given** no model is loaded for the current store
**When** I navigate to the Query Console
**Then** I see an EmptyState: "No model loaded — a model is required to run queries" with a "Go to Model Viewer" action button

### Story 4.3: List Objects, List Users, and Expand Queries

As a user,
I want to run List Objects, List Users, and Expand queries,
So that I can discover which objects a user can access, which users have access to an object, and how relations expand.

**Acceptance Criteria:**

**Given** I am on the Query Console
**When** I click the "List Objects" tab
**Then** I see input fields for User (monospace), Relation (AppSelect), and Type (AppSelect), with a "List Objects" button

**Given** I fill in the List Objects form and submit
**When** the query executes
**Then** I see a list of matching objects rendered with TypeBadge, or an empty result message if none match

**Given** I am on the Query Console
**When** I click the "List Users" tab
**Then** I see input fields for Object Type (AppSelect), Object ID (monospace), and Relation (AppSelect), with a "List Users" button

**Given** I fill in the List Users form and submit
**When** the query executes
**Then** I see a list of matching users rendered with TypeBadge, or an empty result message if none match

**Given** I am on the Query Console
**When** I click the "Expand" tab
**Then** I see input fields for Relation (AppSelect) and Object (monospace), with an "Expand" button

**Given** I fill in the Expand form and submit
**When** the query executes
**Then** I see the relation expansion rendered as a collapsible tree view with TypeBadge nodes that I can expand/collapse to explore the hierarchy

**Given** any query tab
**When** I switch between tabs
**Then** each tab preserves its own input values independently

---

## Epic 5: Visualize Entity Relationships

User can see an interactive graph of concrete entities from tuples, colored by type, with zoom/pan/drag, type filtering, and a detail inspector panel on node click.

### Story 5.1: Relationship Graph Canvas

As a user,
I want to see an interactive graph of concrete entities and their relationships,
So that I can visually understand who has access to what and debug permission issues.

**Acceptance Criteria:**

**Given** I navigate to the Relationship Graph with a store that has tuples
**When** the page loads
**Then** I see a Vue Flow canvas with entity nodes (e.g., `user:alice`, `document:roadmap`) and edges labeled with relation names (e.g., "viewer"), laid out automatically with dagre

**Given** the relationship graph is displayed
**When** I look at the nodes
**Then** each entity node is colored by its type using the same deterministic 8-color palette as the model graph and TypeBadge components (hash of type name % 8)

**Given** the relationship graph is displayed
**When** I use mouse wheel to zoom, click-drag the canvas to pan, or drag a node
**Then** the graph responds smoothly with zoom, pan, and node repositioning

**Given** the relationship graph is displayed
**When** I look at the edges between nodes
**Then** each edge is labeled with the relation name in gray (#9ca3af)

**Given** a store with up to 500 entities in tuples
**When** the relationship graph renders
**Then** it completes rendering in under 3 seconds with dagre layout (NFR5)

**Given** I navigate to the Relationship Graph
**When** the view mounts
**Then** tuples are re-fetched from the API to build the graph (data freshness pattern)

**Given** a store with no tuples
**When** I navigate to the Relationship Graph
**Then** I see an EmptyState: "No tuples to visualize" with a "Go to Tuple Manager" action button

### Story 5.2: Graph Filtering and Node Detail Inspector

As a user,
I want to filter the graph by type and inspect individual nodes,
So that I can focus on specific entity types and see all relationships for a given entity.

**Acceptance Criteria:**

**Given** the relationship graph is displayed
**When** I look above the canvas
**Then** I see a filter panel with TypeBadge checkboxes for each entity type present in the graph

**Given** the type filter panel is visible
**When** I uncheck a type
**Then** all nodes of that type and their connected edges are hidden from the graph

**Given** I have hidden some types via filters
**When** I re-check a type
**Then** those nodes and edges reappear in the graph

**Given** the relationship graph is displayed
**When** I click on a node
**Then** a GraphNodeDetail inspector panel (320px) slides in from the right as an overlay, showing: the node's type + ID, a list of all its relationships (relation name + connected entity as TypeBadge), and a "Query this entity" action button

**Given** the GraphNodeDetail panel is open
**When** I click "Query this entity"
**Then** the app navigates to the Query Console with the Check tab pre-filled with this entity in the appropriate field (User or Object based on the entity type)

**Given** the GraphNodeDetail panel is open
**When** I click on another node in the graph
**Then** the panel content updates to show the newly clicked node's details (only one panel open at a time)

**Given** the GraphNodeDetail panel is open
**When** I press Esc or click outside the panel
**Then** the panel closes

**Given** data has been refreshed (view re-mounted)
**When** filters were previously active
**Then** filter state resets (intentional — data may have changed)

---

## Epic 6: Import, Export & Backup

User can export store data as JSON, import JSON files into current or new stores, and backup/restore stores for disaster recovery and sharing.

### Story 6.1: Export and Backup Store Data

As a user,
I want to export a store's model and tuples as a single JSON file,
So that I can back up my authorization data and share it with others.

**Acceptance Criteria:**

**Given** a store with a model and tuples is selected
**When** I send GET /api/stores/:storeId/export
**Then** I receive a self-contained JSON file containing `{ "storeName": "<name>", "exportedAt": "<ISO8601>", "model": <model_json>, "tuples": [<all_tuples>] }`

**Given** I am on the Import/Export view
**When** I click "Export"
**Then** the browser downloads the JSON file with a filename pattern `<store-name>-<date>.json` and a success toast appears ("Export complete — N tuples exported")

**Given** I am on the Store Admin view
**When** I click the "Backup" button on a StoreCard
**Then** the same export is triggered for that store, downloading the JSON file with a success toast ("Backup complete — N tuples exported")

**Given** a store with no model
**When** I attempt to export
**Then** the export still succeeds with `"model": null` and `"tuples": []`

### Story 6.2: Import and Restore Store Data

As a user,
I want to import a JSON file containing model and tuples into a store,
So that I can restore backups, set up demo environments, or share authorization configurations.

**Acceptance Criteria:**

**Given** I am on the Import/Export view
**When** I see the import section
**Then** I see a FileImportDropzone that accepts JSON files via click-to-browse or drag-and-drop

**Given** I drag a file over the FileImportDropzone
**When** the file is over the drop zone
**Then** the dropzone shows a visual dragover state indicating it's ready to receive the file

**Given** I drop or select a JSON file
**When** the file is read
**Then** the dropzone validates the JSON structure before uploading and shows an error if the format is invalid (missing model or tuples keys)

**Given** a valid JSON file is selected
**When** I choose "Import to new store"
**Then** a dialog asks for a store name, the backend creates a new store and writes the model + tuples via POST /api/import, a success toast appears ("Import complete — N tuples imported"), and the header auto-selects the new store

**Given** a valid JSON file is selected
**When** I choose "Import to current store"
**Then** a ConfirmDialog appears: "This will overwrite the current model. Continue?" with Cancel and Import buttons

**Given** I confirm import to current store
**When** the import executes
**Then** the backend writes the model + tuples to the current store via POST /api/stores/:storeId/import, and a success toast appears ("Import complete — N tuples imported")

**Given** I am on the Store Admin view
**When** I click "Restore" on a StoreCard
**Then** a FileImportDropzone dialog opens to select the backup file, and the import proceeds into that store with the same overwrite confirmation flow

**Given** the import fails (invalid data, backend error)
**When** the error is returned
**Then** an error toast persists with the specific error message from the API
