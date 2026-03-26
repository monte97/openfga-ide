---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-26'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
workflowType: 'architecture'
project_name: 'openfga-viewer'
user_name: 'monte'
date: '2026-03-26'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
41 functional requirements across 7 domains. The architecture must support:
- A backend proxy layer that mediates ALL OpenFGA communication (FR1-7, plus every data operation)
- Two distinct graph visualization contexts: schema-level model graph (FR14-16) and instance-level relationship graph (FR28-34), both using Vue Flow/dagre
- Full CRUD operations for stores (FR8-13) and tuples (FR18-22) with batch support
- Four query types with visual feedback: Check, List Objects, List Users, Expand (FR23-27)
- Self-contained import/export format for backup, restore, and sharing (FR35-38)
- Persistent navigation context: sidebar + header with connection status and active store (FR39-41)

**Non-Functional Requirements:**
- Performance: SPA bundle < 3s, model graph (20 types) < 2s, queries < 1s e2e, relationship graph (500 entities) < 3s, tuple table smooth with 10K rows
- Security: API key backend-only, input validation/sanitization on backend, no credential persistence, trusted environment assumption
- Integration: OpenFGA API v1 (HTTP REST), `@openfga/syntax-transformer` for DSL conversion, self-contained JSON export format

**Scale & Complexity:**
- Primary domain: Full-stack web (Vue 3 SPA + Express/TypeScript)
- Complexity level: Low
- Estimated architectural components: ~10 (connection service, store service, model service, tuple service, query service, import/export service on backend; corresponding Vue views/composables + 2 graph renderers on frontend)

### Technical Constraints & Dependencies

- Vue 3 + Composition API, Vite, Vue Router, Pinia (mandated by PRD)
- Express + TypeScript backend proxy (mandated by PRD)
- npm workspaces monorepo with `frontend/` and `backend/` packages
- Docker Compose for local dev
- `@openfga/syntax-transformer` — pinned version, validated at startup
- Vue Flow for graph visualization (both model and relationship graphs)
- Desktop-first (1280px+), no mobile layout, no SSR, no PWA, no i18n
- Proprietary license — no Apache 2.0 dependencies that would force copyleft

### Cross-Cutting Concerns Identified

- **Connection state management** — active connection URL, auth status, and selected store must be accessible across all views (header badge, API calls, store context)
- **Error handling pipeline** — OpenFGA API errors must be caught by backend, translated to meaningful messages, and displayed consistently in frontend (toast/alert pattern)
- **Graph rendering performance** — Vue Flow + dagre layout used in two views with different data scales; shared performance strategies (viewport culling, lazy rendering) needed
- **Store context propagation** — selected store ID is a prerequisite for all data operations; views must react to store changes and handle "no store selected" state

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (Vue 3 SPA + Express/TypeScript backend proxy), based on PRD-mandated technology choices.

### Starter Options Considered

| Option | Pros | Cons |
|---|---|---|
| Manual npm workspaces + create-vue | Full control, no unnecessary deps, latest Vite 8, official Vue tooling | Requires manual backend scaffolding (~15 files) |
| biggestcookie/vue-express-template | Pre-built monorepo structure, shared TS interfaces | Bundles Sequelize (unneeded), git submodules, lower maintenance |
| Nx/Turborepo wrappers | Build caching, task orchestration | Massive overhead for 2-package solo-dev project |

### Selected Starter: Manual npm Workspaces + create-vue

**Rationale for Selection:**
- `create-vue` is the official Vue scaffolding tool, always aligned with latest Vue/Vite versions
- npm workspaces is the simplest monorepo approach — no extra tooling, first-party Node support
- The Express backend is a thin proxy with no ORM/database — hand-rolling it is trivial and avoids unwanted dependencies
- Full control over project structure means no fighting against template opinions

**Initialization Command:**

```bash
# Root monorepo setup
mkdir openfga-viewer && cd openfga-viewer
npm init -y
# Set workspaces in root package.json: "workspaces": ["frontend", "backend"]

# Frontend scaffold
npm create vue@latest frontend -- --typescript --router --pinia --vitest --eslint-with-prettier

# Backend scaffold (manual)
mkdir -p backend/src && cd backend && npm init -y
# Add Express, TypeScript, @openfga/syntax-transformer dependencies
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript across both packages. `create-vue` configures `tsconfig.json` with Vue-specific paths and strict mode. Backend uses `tsx` or `ts-node` for development.

**Styling Solution:**
Not provided by starter — to be decided in architectural decisions step. PRD does not mandate a CSS framework.

**Build Tooling:**
Vite 8 (Rolldown-based bundler) for frontend. `tsc` for backend compilation. npm workspaces for dependency management.

**Testing Framework:**
Vitest for unit tests (frontend, included by create-vue). Backend testing framework to be decided.

**Code Organization:**
- `frontend/` — Vue 3 SPA (src/views, src/components, src/stores, src/router)
- `backend/` — Express proxy (src/routes, src/services, src/middleware)
- Root — shared scripts, Docker Compose, workspace config

**Development Experience:**
Vite HMR for frontend, `tsx --watch` for backend, Docker Compose for full-stack local dev.

**Note:** Project initialization using this approach should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Thin passthrough API pattern (frontend → backend → OpenFGA)
- Same-origin deployment (Express serves SPA static files)
- Zod for request/response validation
- Tailwind CSS v4.2 for styling
- TanStack Table v8 for data tables

**Important Decisions (Shape Architecture):**
- Pino for structured logging (OpenTelemetry-ready via pino-opentelemetry-transport)
- Single multi-stage Docker image for production
- Consistent error envelope ({ error, details? }) across all API responses

**Deferred Decisions (Post-MVP):**
- OpenTelemetry full integration (Phase 2/3)
- OIDC / mTLS authentication (Phase 3)
- WebSocket/SSE for real-time updates (Phase 2)

### Data Architecture

No database — backend is a stateless proxy to OpenFGA.

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| Data validation | Zod | v4.3.x | Runtime schema validation with TypeScript inference; shared schemas between frontend/backend |
| Data persistence | None | N/A | Stateless proxy — all data lives in OpenFGA |
| Caching | None in MVP | N/A | Queries are real-time against OpenFGA; caching would risk stale permission data |

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| API authentication | Pre-shared key (env var) | Backend-only, never exposed to frontend. Read from `OPENFGA_API_KEY` on startup |
| User authentication | None in MVP | Trusted environment assumption (local dev, internal network) |
| CORS policy | Same-origin (no CORS needed) | Express serves SPA static files in production; Vite proxy in dev |
| Input sanitization | Zod validation on all backend routes | Validates before forwarding to OpenFGA |

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| API pattern | Thin passthrough proxy | Mirrors OpenFGA REST API structure under `/api/*`. Backend adds: auth injection, Zod validation, DSL conversion, error translation |
| Error handling | Consistent envelope `{ error: string, details?: any }` | Backend catches OpenFGA errors, wraps in envelope. Frontend `useApi` composable handles envelope + toast notifications |
| API prefix | `/api/` | All backend routes under `/api/*`, static SPA files served from root |

### Frontend Architecture

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| Styling | Tailwind CSS | v4.2.x | Utility-first, fast iteration for desktop-first tooling UI. No component library overhead |
| Data table | TanStack Table | v8.x | Headless — works with Tailwind, handles pagination/filtering/selection for 10K+ rows |
| Graph rendering | Vue Flow | latest | Mandated by PRD for both model graph and relationship graph. Dagre layout |
| State management | Pinia | latest | Mandated by PRD. Stores for: connection, active store, model, tuples, query results |
| Notifications | Toast composable | custom | Lightweight toast system for success/error feedback. No external library needed |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| Production image | Single multi-stage Dockerfile | Builds frontend (Vite), copies static assets into Express, one image to deploy |
| Dev environment | Docker Compose | Frontend (Vite dev server) + Backend (tsx --watch) + OpenFGA instance |
| Dev proxy | Vite proxy | Frontend dev server proxies `/api/*` to Express backend — no CORS in dev |
| Environment config | dotenv (.env) + standard env vars | `OPENFGA_URL`, `OPENFGA_API_KEY`, `OPENFGA_STORE_ID`, `PORT` |
| Logging | Pino | Structured JSON logging, OpenTelemetry-ready via `pino-opentelemetry-transport` for future OTel integration |
| Monitoring | None in MVP | Deferred — Pino + OTel transport provides the foundation |

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo scaffolding (npm workspaces, create-vue, Express setup)
2. Backend proxy core (Express + Pino + Zod + OpenFGA connection)
3. Frontend shell (Vue Router, Pinia stores, Tailwind, layout/header/sidebar)
4. Feature modules (model viewer, tuple manager, query console, graphs, import/export, store admin)

**Cross-Component Dependencies:**
- Zod schemas shared between backend validation and frontend type safety
- Pinia connection store drives both header badge and all API calls
- Vue Flow shared between Model Viewer and Relationship Graph (different data models, same renderer)
- Error envelope pattern used consistently by all backend routes and consumed by frontend `useApi`

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 6 areas where AI agents could make different choices — all resolved below.

### Naming Patterns

**API Naming Conventions:**
- Endpoints: plural, kebab-case → `/api/stores`, `/api/stores/:storeId/tuples`, `/api/stores/:storeId/query/check`
- JSON fields: camelCase → `{ storeId, createdAt, authorizationModelId }`
- Query parameters: camelCase → `?pageSize=50&continuationToken=abc`
- Route parameters: camelCase → `:storeId`, `:tupleKey`

**Code Naming Conventions:**
- Vue components: PascalCase files → `ModelViewer.vue`, `TupleTable.vue`
- Vue composables: camelCase with `use` prefix → `useApi.ts`, `useToast.ts`
- Pinia stores: `use...Store` pattern → `useConnectionStore`, `useModelStore`
- Backend files: kebab-case → `store-routes.ts`, `tuple-service.ts`, `error-handler.ts`
- TypeScript types/interfaces: PascalCase → `StoreInfo`, `TupleEntry`, `CheckQueryResult`
- Constants: UPPER_SNAKE_CASE → `DEFAULT_PAGE_SIZE`, `API_PREFIX`

### Structure Patterns

**Frontend Organization (hybrid: top-level by type, components grouped by feature):**

```
frontend/src/
  views/                    # one per route
    ModelViewer.vue
    TupleManager.vue
    QueryConsole.vue
    RelationshipGraph.vue
    StoreAdmin.vue
    ImportExport.vue
  components/               # grouped by feature when >1 component
    layout/
      AppHeader.vue
      AppSidebar.vue
    model/
      ModelDslView.vue
      ModelGraphView.vue
    tuples/
      TupleTable.vue
      TupleForm.vue
    query/
      CheckQuery.vue
      ListObjectsQuery.vue
      ListUsersQuery.vue
      ExpandQuery.vue
    graph/
      RelationshipGraphCanvas.vue
      GraphNodeDetail.vue
    common/
      ToastContainer.vue
      ConnectionBadge.vue
      ConfirmDialog.vue
  stores/
    connection.ts
    model.ts
    tuples.ts
    queries.ts
    stores.ts
  composables/
    useApi.ts
    useToast.ts
  router/
    index.ts
  types/
    openfga.ts
    api.ts
```

**Backend Organization:**

```
backend/src/
  routes/                   # one file per domain
    stores.ts
    model.ts
    tuples.ts
    queries.ts
    import-export.ts
    connection.ts
  services/                 # OpenFGA API interaction logic
    openfga-client.ts
    model-service.ts
    tuple-service.ts
    query-service.ts
    store-service.ts
    import-export-service.ts
  middleware/
    error-handler.ts
    validate.ts
  schemas/                  # Zod schemas
    store.ts
    tuple.ts
    query.ts
    import-export.ts
  types/
    openfga.ts
    api.ts
  app.ts                    # Express app setup
  server.ts                 # Entry point
```

**Test Location:** Co-located — `ModelViewer.test.ts` next to `ModelViewer.vue`, `tuple-service.test.ts` next to `tuple-service.ts`

### Format Patterns

**API Response Formats:**

Success responses return data directly:
```json
{ "stores": [...], "continuationToken": "abc" }
```

Error responses use consistent envelope:
```json
{ "error": "Store not found", "details": { "storeId": "abc123" } }
```

HTTP status codes: 200 (success), 201 (created), 400 (validation error), 404 (not found), 500 (OpenFGA/server error)

**Date Format:** ISO 8601 strings throughout → `"2026-03-26T10:30:00Z"`

### Communication Patterns

**Pinia Store Pattern:**

Each store follows the same structure:
```typescript
export const useExampleStore = defineStore('example', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const data = ref<T | null>(null)

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      data.value = await api.get('/api/...')
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return { loading, error, data, fetchData }
})
```

**Frontend API Composable Pattern:**

All API calls go through `useApi` composable:
- Prepends `/api/` prefix
- Parses error envelope → triggers toast on error
- Returns typed data on success
- Handles network errors uniformly

### Process Patterns

**Error Handling Flow:**
1. OpenFGA returns error → backend catches in route try/catch
2. Backend logs with Pino (includes request context)
3. Backend responds with `{ error, details? }` envelope + appropriate HTTP status
4. Frontend `useApi` detects error envelope → triggers toast notification
5. Pinia store sets `error` ref → view can show inline error if needed

**Loading State Pattern:**
- Each Pinia store manages its own `loading` boolean
- Views bind to store `loading` to show spinners/skeletons
- No global loading state — each feature is independent

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow naming conventions exactly as specified above
- Use the Pinia store pattern (setup syntax with loading/error/data)
- Route all API calls through the `useApi` composable
- Use Zod schemas for all backend route validation
- Co-locate tests next to source files
- Use the error envelope format for all backend error responses
- Log all backend errors with Pino before responding

## Project Structure & Boundaries

### Complete Project Directory Structure

```
openfga-viewer/
├── package.json                    # Root: npm workspaces config
├── .gitignore
├── .env.example                    # Template for env vars
├── docker-compose.yml              # Dev: frontend + backend + OpenFGA
├── Dockerfile                      # Prod: multi-stage single image
├── LICENSE                         # Proprietary license
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts              # Vite 8 + proxy config for /api/*
│   ├── tailwind.config.ts          # Tailwind v4.2
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── index.html
│   ├── env.d.ts
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.ts                 # App entry point
│       ├── App.vue                 # Root component (layout shell)
│       ├── style.css               # Tailwind base imports
│       ├── router/
│       │   └── index.ts            # Vue Router config (all routes)
│       ├── stores/
│       │   ├── connection.ts       # OpenFGA connection state + active store
│       │   ├── model.ts            # Authorization model (JSON + DSL)
│       │   ├── tuples.ts           # Tuple list, pagination, filters
│       │   ├── queries.ts          # Query results (check, list-objects, list-users, expand)
│       │   └── stores.ts           # Store list (CRUD)
│       ├── composables/
│       │   ├── useApi.ts           # HTTP client: /api/* prefix, error envelope handling, toast trigger
│       │   └── useToast.ts         # Toast notification state + show/dismiss
│       ├── views/
│       │   ├── ModelViewer.vue     # FR14-17: DSL view + graph view (tabs)
│       │   ├── TupleManager.vue    # FR18-22: data table + add/delete form
│       │   ├── QueryConsole.vue    # FR23-27: tabbed query interface
│       │   ├── RelationshipGraph.vue # FR28-34: entity graph from tuples
│       │   ├── StoreAdmin.vue      # FR8-13: store list, create, delete, backup/restore
│       │   └── ImportExport.vue    # FR35-38: import/export JSON files
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppHeader.vue   # FR40: title, connection badge, active store
│       │   │   └── AppSidebar.vue  # FR39: navigation links
│       │   ├── model/
│       │   │   ├── ModelDslView.vue    # FR14: DSL with syntax highlighting
│       │   │   └── ModelGraphView.vue  # FR15-16: Vue Flow type/relation graph
│       │   ├── tuples/
│       │   │   ├── TupleTable.vue      # FR18-19: TanStack Table with filters
│       │   │   └── TupleForm.vue       # FR20: add tuple form
│       │   ├── query/
│       │   │   ├── CheckQuery.vue      # FR23: check with green/red result
│       │   │   ├── ListObjectsQuery.vue # FR24: list objects result
│       │   │   ├── ListUsersQuery.vue  # FR25: list users result
│       │   │   └── ExpandQuery.vue     # FR26: expand as collapsible tree
│       │   ├── graph/
│       │   │   ├── RelationshipGraphCanvas.vue  # FR28-31, FR34: Vue Flow canvas
│       │   │   └── GraphNodeDetail.vue          # FR33: node detail panel
│       │   └── common/
│       │       ├── ToastContainer.vue
│       │       ├── ConnectionBadge.vue  # FR7: connected/error badge
│       │       └── ConfirmDialog.vue    # Reusable confirm modal (delete ops)
│       └── types/
│           ├── openfga.ts          # OpenFGA domain types (Store, Model, Tuple, etc.)
│           └── api.ts              # API response/request types
│
└── backend/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── server.ts               # Entry point: create app, listen on PORT
        ├── app.ts                   # Express app: middleware, routes, static files
        ├── config.ts                # Env var loading (dotenv): OPENFGA_URL, API_KEY, STORE_ID, PORT
        ├── routes/
        │   ├── connection.ts        # FR4-6: GET /api/connection, POST /api/connection/test
        │   ├── stores.ts            # FR8-13: /api/stores CRUD + backup/restore
        │   ├── model.ts             # FR14-17: GET /api/stores/:storeId/model (JSON + DSL)
        │   ├── tuples.ts            # FR18-22: /api/stores/:storeId/tuples CRUD + batch
        │   ├── queries.ts           # FR23-27: /api/stores/:storeId/query/{check,list-objects,list-users,expand}
        │   └── import-export.ts     # FR35-38: /api/stores/:storeId/export, /api/import
        ├── services/
        │   ├── openfga-client.ts    # HTTP client to OpenFGA instance (auth header injection)
        │   ├── store-service.ts     # Store CRUD + backup logic
        │   ├── model-service.ts     # Model fetch + DSL conversion via syntax-transformer
        │   ├── tuple-service.ts     # Tuple read/write/delete + pagination
        │   ├── query-service.ts     # Check, ListObjects, ListUsers, Expand
        │   └── import-export-service.ts  # Export (model+tuples→JSON), Import (JSON→store)
        ├── middleware/
        │   ├── error-handler.ts     # Global error handler: catch → Pino log → error envelope
        │   └── validate.ts          # Zod validation middleware factory
        ├── schemas/
        │   ├── store.ts             # Zod: create store, backup/restore params
        │   ├── tuple.ts             # Zod: tuple CRUD, batch delete, filter params
        │   ├── query.ts             # Zod: check, list-objects, list-users, expand params
        │   └── import-export.ts     # Zod: import file structure validation
        └── types/
            ├── openfga.ts           # OpenFGA API response types
            └── api.ts               # Internal API types (error envelope, etc.)
```

### Architectural Boundaries

**API Boundaries:**
- Frontend → Backend: all traffic via `/api/*` prefix. Frontend never contacts OpenFGA directly.
- Backend → OpenFGA: `openfga-client.ts` is the single point of contact. All services use it. Auth header injected here.
- External boundary: OpenFGA instance URL + pre-shared key, configured via env vars.

**Component Boundaries:**
- Each Vue view is self-contained and owns its page-level layout
- Views compose feature components (e.g., `ModelViewer` uses `ModelDslView` + `ModelGraphView`)
- Components in `common/` are reusable across all views
- Pinia stores are the single source of truth — components read from stores, never fetch directly

**Service Boundaries (Backend):**
- Routes handle HTTP (parse request, call service, send response)
- Services handle business logic (call OpenFGA client, transform data)
- `openfga-client.ts` handles transport (HTTP to OpenFGA, auth injection)
- Schemas handle validation (Zod, invoked via `validate` middleware)

### Requirements to Structure Mapping

| FR Category | Frontend | Backend |
|---|---|---|
| Connection & Config (FR1-7) | `stores/connection.ts`, `ConnectionBadge.vue`, `AppHeader.vue` | `routes/connection.ts`, `config.ts`, `openfga-client.ts` |
| Store Admin (FR8-13) | `views/StoreAdmin.vue`, `stores/stores.ts` | `routes/stores.ts`, `store-service.ts`, `schemas/store.ts` |
| Model Viewing (FR14-17) | `views/ModelViewer.vue`, `ModelDslView.vue`, `ModelGraphView.vue`, `stores/model.ts` | `routes/model.ts`, `model-service.ts` |
| Tuple Mgmt (FR18-22) | `views/TupleManager.vue`, `TupleTable.vue`, `TupleForm.vue`, `stores/tuples.ts` | `routes/tuples.ts`, `tuple-service.ts`, `schemas/tuple.ts` |
| Queries (FR23-27) | `views/QueryConsole.vue`, `Check/ListObjects/ListUsers/ExpandQuery.vue`, `stores/queries.ts` | `routes/queries.ts`, `query-service.ts`, `schemas/query.ts` |
| Rel. Graph (FR28-34) | `views/RelationshipGraph.vue`, `RelationshipGraphCanvas.vue`, `GraphNodeDetail.vue` | Reuses `tuple-service.ts` (reads tuples for graph) |
| Import/Export (FR35-38) | `views/ImportExport.vue` | `routes/import-export.ts`, `import-export-service.ts`, `schemas/import-export.ts` |
| Navigation (FR39-41) | `AppSidebar.vue`, `AppHeader.vue`, `router/index.ts` | N/A (frontend-only) |

### Cross-Cutting Concerns Mapping

| Concern | Location |
|---|---|
| Error handling | Backend: `middleware/error-handler.ts` → Frontend: `composables/useApi.ts` → `composables/useToast.ts` |
| Connection state | `stores/connection.ts` → consumed by all views + `AppHeader.vue` |
| Store context | `stores/connection.ts` (activeStoreId) → passed to all backend API calls |
| Loading states | Each Pinia store (`loading` ref) → each view binds to its store |
| Validation | Backend: `middleware/validate.ts` + `schemas/*.ts` |
| Logging | Backend: Pino in `app.ts` setup + `error-handler.ts` |

### Data Flow

```
User Action → Vue Component → Pinia Store Action → useApi composable
    → HTTP /api/* → Express Route → Zod Validation → Service
    → openfga-client.ts → OpenFGA Instance
    ← OpenFGA Response ← Service (transform) ← Route (envelope)
    ← HTTP Response ← useApi (parse envelope, toast on error)
    ← Pinia Store (update refs) ← Vue Component (reactive render)
```

### Development Workflow

**Dev mode (Docker Compose):**
- `frontend`: Vite dev server on `:5173`, proxies `/api/*` to backend
- `backend`: `tsx --watch src/server.ts` on `:3000`
- `openfga`: OpenFGA instance on `:8080` (official Docker image)

**Production build (Dockerfile):**
1. Stage 1: Build frontend → `npm run build` → `frontend/dist/`
2. Stage 2: Build backend → `tsc` → `backend/dist/`
3. Stage 3: Runtime → copy backend dist + frontend dist → Express serves SPA from `frontend/dist/`, API from `/api/*`
4. Single image, single port (`PORT` env var, default 3000)

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible and widely used together. Vue 3 + Vite 8 + Tailwind v4.2 + Pinia + Vue Flow on frontend. Express + TypeScript + Pino + Zod on backend. npm workspaces for monorepo. No version conflicts or incompatibilities detected.

**Pattern Consistency:**
Naming conventions align with ecosystem standards (camelCase for JS/TS/JSON, PascalCase for Vue components, kebab-case for backend files). Pinia store pattern (setup syntax with loading/error/data) is uniform. Error envelope is consistent from backend through to frontend toast.

**Structure Alignment:**
Directory structure directly supports all decisions. Clear separation: routes → services → openfga-client. Frontend: views → components → stores → composables. No overlap or ambiguity in file placement.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
All 41 FRs mapped to specific files in both frontend and backend (see Requirements to Structure Mapping). Every FR category has a dedicated view, store, route, and service.

**Non-Functional Requirements Coverage:**
- Performance: Vite 8 (Rolldown) for fast builds, TanStack Table with virtualization for 10K rows, Vue Flow + dagre for graph rendering, Pinia for reactive state (no unnecessary re-renders)
- Security: API key in env var (backend-only), Zod validation on all routes, same-origin deployment eliminates CORS attack surface, no credential persistence
- Integration: `openfga-client.ts` as single integration point, `@openfga/syntax-transformer` for DSL conversion, self-contained JSON export format

### Implementation Readiness Validation ✅

**Decision Completeness:**
All critical decisions documented with specific versions. Technology stack fully specified. No ambiguous "to be decided" items remain for MVP.

**Structure Completeness:**
Every file in the project tree has a clear purpose annotated with FR references. Integration points between frontend and backend are well-defined (`/api/*` prefix, error envelope, Pinia stores ↔ useApi).

**Pattern Completeness:**
All 6 conflict areas resolved. Naming, structure, format, communication, and process patterns are documented with concrete examples (Pinia store template, error flow diagram, data flow diagram).

### Gap Analysis Results

**No critical gaps found.**

**Minor implementation notes:**
- FR5 (runtime URL update): `openfga-client.ts` must accept URL as a mutable config, not a module-level constant. The connection store on frontend sends PUT to `/api/connection` to update, and backend reinitializes the client with the new URL.
- FR32 (graph type filter): The `RelationshipGraphCanvas.vue` component needs a filter control — not shown as a separate component, should be inline within the canvas view.
- DSL syntax highlighting (FR14): No syntax highlighting library was explicitly chosen. `@openfga/syntax-transformer` produces DSL text; a lightweight code highlighter (e.g., Shiki or Prism) may be needed for display. This can be decided at implementation time without architectural impact.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clean, minimal architecture — no over-engineering for a stateless proxy tool
- Every FR traceable to specific files in both frontend and backend
- Consistent patterns that prevent AI agent divergence
- Same-origin deployment eliminates an entire class of CORS/security issues
- Technology choices are all mainstream, well-documented, and actively maintained

**Areas for Future Enhancement:**
- OpenTelemetry integration (Phase 2/3) — Pino foundation is ready
- OIDC/mTLS auth (Phase 3) — middleware slot exists
- WebSocket/SSE for real-time (Phase 2) — architecture doesn't block it
- Shared types package between frontend/backend — currently duplicated in `types/` folders; could become a third workspace package if duplication grows

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- When in doubt, follow the established Pinia store pattern and error handling flow

**First Implementation Priority:**
1. Initialize monorepo with npm workspaces
2. Scaffold frontend with `npm create vue@latest` (TypeScript, Router, Pinia, Vitest, ESLint+Prettier)
3. Initialize backend Express + TypeScript package
4. Set up Docker Compose (frontend + backend + OpenFGA)
5. Implement `openfga-client.ts` + connection test route as the first vertical slice
