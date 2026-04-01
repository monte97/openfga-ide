---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-31'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/brainstorming/authorization-test-suite-management.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md (original viewer only — context reference)'
workflowType: 'architecture'
project_name: 'openfga-viewer'
user_name: 'monte'
date: '2026-03-30'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
45 FRs across 8 domains. The architecture must support:
- Suite management CRUD with hierarchical data model: suites → groups → test cases (FR1-11)
- Fixture management reusing existing export format ({ model, tuples }) (FR12-14)
- Async execution engine with ephemeral OpenFGA store lifecycle: create → load fixture → execute checks → report → destroy (FR15-23)
- Run results persistence with summary statistics and per-test detail (FR24-28)
- Suite definition import/export as git-friendly JSON (FR29-32)
- Validation pipeline: suite structure on save, fixture format before execution (FR33-35)
- Complete REST API surface for CI/CD consumption (FR36-41)
- PostgreSQL persistence with migrations, optional for existing viewer features (FR42-45)

**Non-Functional Requirements:**
17 NFRs driving architectural decisions:
- Performance: 100 checks in <30s e2e (NFR1), polling <200ms (NFR2), editor loads 100+ tests <1s (NFR3), CRUD <50ms (NFR5), store provisioning <5s (NFR6)
- Security: DB credentials env-only (NFR7), Zod validation on all endpoints (NFR9), unique ephemeral store names (NFR10)
- Reliability: Guaranteed cleanup via try/finally (NFR15), graceful degradation without PostgreSQL (NFR16), results persisted before cleanup (NFR17)
- Integration: Existing openfga-client service for store operations (NFR11), standard DATABASE_URL (NFR12), existing export format for fixtures (NFR14)

**Scale & Complexity:**
- Primary domain: Full-stack web (Vue 3 SPA + Fastify backend)
- Complexity level: Medium — introduces persistence layer, async execution engine, and state machine to previously stateless architecture
- Estimated architectural components: ~12 (suite service, execution engine, run service, fixture validator, PostgreSQL pool + migrations, suite API routes, run API routes, suite store, run store, suite editor components, results components, import/export handlers)

### Technical Constraints & Dependencies

- **Existing codebase:** 6 epics already implemented — Vue 3 + Composition API, Vite, Vue Router, Pinia, Fastify backend, npm workspaces monorepo
- **Fastify backend** (not Express) — existing codebase uses Fastify, contradicting original architecture doc which said Express. Must align with what's actually deployed
- **Module isolation:** Test suite code must be isolated in its own directory. Depends on existing connection/store infrastructure but must not modify it
- **PostgreSQL optional:** App must start and serve all existing viewer features when PostgreSQL is unavailable. Test suite features show "database not configured"
- **No ORM in MVP:** Raw SQL or lightweight query builder (Kysely or Drizzle)
- **Fixture format:** Reuses existing export format ({ model, tuples }) — zero new format
- **Desktop-first:** 1280px+, no mobile/tablet
- **No real-time push in MVP:** UI polls run status via REST
- **Zod v4.3.x:** Runtime schema validation, consistent with existing patterns

### Cross-Cutting Concerns Identified

- **PostgreSQL availability detection** — at startup, test if DB is reachable. If not, disable test suite routes gracefully while keeping viewer routes active
- **Ephemeral store cleanup guarantee** — every code path that creates an ephemeral store must guarantee destruction via try/finally, even on network errors or process interruption
- **Error type distinction** — execution errors (infra failures, OpenFGA unreachable, fixture rejected) vs assertion failures (expected ≠ actual) must be clearly separated in run results (FR23)
- **Existing feature isolation** — PostgreSQL dependency must not leak into existing viewer features. No import of test-suite modules from viewer code
- **Connection reuse** — execution engine reuses the existing openfga-client service and active connection for ephemeral store operations
- **API consistency** — new /api/suites/* and /api/runs/* endpoints follow existing error envelope pattern ({ error, details? }) and Zod validation middleware

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (Vue 3 SPA + Express backend), brownfield extension of existing 6-epic codebase.

### Starter Evaluation: Not Applicable (Brownfield)

This is a brownfield project with an established technology stack. No starter template evaluation needed. The new test suite feature extends the existing codebase.

### Existing Technology Stack (Verified from Codebase)

**Frontend:** Vue 3 + Composition API, Vite, Vue Router, Pinia, Tailwind CSS v4.2, TanStack Table, Vue Flow, Headless UI, Shiki (syntax highlighting), Vitest
**Backend:** Express 5.1 + TypeScript, Zod v4.3.x, Pino (structured logging), @openfga/syntax-transformer
**Monorepo:** npm workspaces (frontend/ + backend/)
**Dev Environment:** Docker Compose (frontend + backend + OpenFGA), Vite proxy for /api/*
**Production:** Single multi-stage Dockerfile, Express serves SPA static files

**Note:** The PRD references "Fastify backend" but the actual codebase uses Express 5.1. This architecture document aligns with the implemented reality (Express).

### New Dependencies Required for Test Suite Feature

- **PostgreSQL client:** pg + @types/pg (connection pooling via pg.Pool)
- **Migration tool:** node-pg-migrate (SQL-native, up/down migrations)
- **JSON editor:** CodeMirror 6 (frontend, ~200KB, modular JSON mode)
- No new frontend framework dependencies beyond CodeMirror

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- PostgreSQL via pg + raw SQL with isolated query layer (repository pattern)
- node-pg-migrate for schema migrations
- Fire-and-forget execution with polling for run status
- JSON as source of truth for dual-mode suite editor
- CodeMirror 6 for JSON editing

**Important Decisions (Shape Architecture):**
- Auto-migrate on startup in dev, explicit CLI in production
- PostgreSQL added to Docker Compose with named volume + health check
- Repository pattern isolates SQL for future query builder migration

**Deferred Decisions (Post-MVP):**
- Background job queue for concurrent test runs (MVP is sequential)
- SSE/WebSocket for real-time execution progress (MVP uses polling)
- Run result retention/archival policy

### Data Architecture

| Decision | Choice | Rationale |
|---|---|---|
| PostgreSQL client | pg (node-postgres) | Battle-tested, pg.Pool for connection pooling, natural fit with Express patterns |
| Query approach | Raw SQL via pg, isolated in repository layer | Full control for 3-4 tables; repository pattern enables future migration to Kysely/Drizzle without touching services |
| Migration tool | node-pg-migrate | SQL-native, explicit up/down migrations, no ORM coupling — matches the "no magic" philosophy |
| Connection config | DATABASE_URL env var, pg.Pool | Standard PostgreSQL connection string, pool managed at app level |

**Repository Pattern:**
Each domain entity (suites, runs, run_results) gets a repository module that encapsulates all SQL. Services call repositories, never pg directly. This boundary enables swapping the query layer later without changing service logic.

### Authentication & Security

No new decisions — existing patterns carry forward:
- Trusted environment assumption (no per-user auth)
- Zod validation on all new endpoints
- DB credentials via DATABASE_URL env var only, never exposed to frontend or logged

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| Execution model | Fire-and-forget with polling | POST /suites/:id/run returns 202 + runId immediately; execution runs in detached async function; client polls GET /runs/:runId. Matches PRD state machine and CI/CD journey (J5/J6) |
| New route namespaces | /api/suites/* (CRUD), /api/runs/* (status/results) | Consistent with existing /api/* patterns |
| Error handling | Same envelope { error, details? } | Extends existing pattern to new endpoints |
| Run state transitions | pending → provisioning → running → completed/failed → cleanup | Persisted in PostgreSQL, queryable via GET /runs/:runId |

**Execution Flow:**
1. `POST /api/suites/:id/run` → create run record (status: pending), return 202 + `{ runId }`
2. Detached async: update status → provisioning → create ephemeral store → load fixture
3. Update status → running → execute checks sequentially → persist results
4. Update status → completed/failed → cleanup (destroy ephemeral store) → update status → done
5. Client polls `GET /api/runs/:runId` for status + results

### Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Suite editor state model | JSON as source of truth | Both form and JSON views are projections of the same Pinia store object. Lossless switching by design |
| JSON editor | CodeMirror 6 | ~200KB, modular, good JSON mode. Sufficient for suite definition editing without Monaco's 2MB overhead |
| State management | Pinia stores for suites, runs | Consistent with existing stores pattern (setup syntax, loading/error/data refs) |
| Polling | setInterval in Pinia store action | Poll GET /runs/:runId while status is not terminal. Clear interval on completed/failed or component unmount |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| PostgreSQL in Docker Compose | New service with named volume + health check | Data persists across restarts, backend waits for readiness |
| Migration execution | Auto on startup (dev) + explicit CLI (prod/CI) | Dev convenience with `npm run migrate` available for controlled environments |
| Graceful degradation | Startup DB check; if unavailable, skip migration, disable test suite routes | FR45: existing viewer features unaffected |

### Decision Impact Analysis

**Implementation Sequence:**
1. Add PostgreSQL to Docker Compose + pg dependency + connection pool setup
2. Set up node-pg-migrate + initial schema migration (suites, runs, run_results tables)
3. Repository layer (suite-repository, run-repository)
4. Suite CRUD API routes + service layer
5. Execution engine (fire-and-forget, state machine, ephemeral store lifecycle)
6. Run status/results API routes
7. Frontend: suite list + suite editor (form + CodeMirror JSON view)
8. Frontend: run execution + polling + results display
9. Import/export suite definitions

**Cross-Component Dependencies:**
- Repository layer depends on pg.Pool (initialized at startup)
- Execution engine depends on repository layer (persist state) + existing openfga-client (ephemeral store ops)
- Suite API routes depend on repository layer + validation schemas
- Run API routes depend on repository layer + execution engine
- Frontend suite store depends on suite API
- Frontend run store depends on run API + polling logic

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 5 areas where AI agents could make different choices — all resolved below.

### Naming Patterns

**Database Naming (PostgreSQL):**
- Tables: snake_case, plural → `suites`, `runs`, `run_results`
- Columns: snake_case → `suite_id`, `created_at`, `expected_result`
- Primary keys: `id` (UUID)
- Foreign keys: `<entity>_id` → `suite_id`, `run_id`
- Indexes: `idx_<table>_<columns>` → `idx_runs_suite_id`
- Enums: snake_case values → `'pending'`, `'provisioning'`, `'running'`, `'completed'`, `'failed'`

**API Naming (consistent with existing codebase):**
- Endpoints: plural, kebab-case → `/api/suites`, `/api/suites/:suiteId/run`, `/api/runs/:runId`
- JSON fields: camelCase → `{ suiteId, createdAt, expectedResult }`
- Query parameters: camelCase → `?status=completed`

**Code Naming (consistent with existing codebase):**
- Backend files: kebab-case → `suite-service.ts`, `run-repository.ts`, `execution-engine.ts`
- Frontend Vue components: PascalCase → `SuiteEditor.vue`, `RunResults.vue`
- Frontend stores: camelCase → `suites.ts`, `runs.ts`
- Pinia stores: `use...Store` → `useSuiteStore`, `useRunStore`
- TypeScript types: PascalCase → `SuiteDefinition`, `RunStatus`, `TestCaseResult`
- Constants: UPPER_SNAKE_CASE → `RUN_POLL_INTERVAL_MS`, `MAX_EPHEMERAL_STORE_RETRIES`

**Repository ↔ JS mapping:**
Repositories handle snake_case → camelCase conversion at the boundary. Services and routes only see camelCase objects.

### Structure Patterns

**Backend — Dedicated subdirectory for test suite module:**

```
backend/src/test-suites/
  routes/
    suites.ts              # CRUD /api/suites/*
    runs.ts                # /api/runs/*
  services/
    suite-service.ts       # Suite CRUD business logic
    execution-engine.ts    # Fire-and-forget run orchestration
    run-service.ts         # Run status/results queries
  repositories/
    suite-repository.ts    # SQL for suites table
    run-repository.ts      # SQL for runs + run_results tables
  schemas/
    suite.ts               # Zod schemas for suite API validation
    run.ts                 # Zod schemas for run API validation
  types/
    suite.ts               # SuiteDefinition, TestCase, TestGroup, etc.
    run.ts                 # RunStatus, RunResult, RunSummary, etc.
  db/
    pool.ts                # pg.Pool initialization, availability check
    migrate.ts             # node-pg-migrate runner (startup + CLI)
  migrations/
    001_create-suites.sql
    002_create-runs.sql
    003_create-run-results.sql
```

**Frontend — test-suites feature directory:**

```
frontend/src/
  stores/
    suites.ts              # Suite CRUD + list state
    runs.ts                # Run polling + results state
  views/
    TestSuites.vue         # Suite list page
    SuiteEditor.vue        # Suite editor page (form + JSON tabs)
    RunResults.vue         # Run results page
  components/
    test-suites/
      SuiteList.vue
      SuiteForm.vue        # Form-based test case editor
      SuiteJsonEditor.vue  # CodeMirror 6 JSON editor
      FixtureEditor.vue    # Fixture (model + tuples) editor
      RunSummary.vue       # Pass/fail summary bar
      TestResultRow.vue    # Per-test result with definition
      RunStatusBadge.vue   # Status badge (pending/running/completed/failed)
```

**Test Location:** Co-located — `suite-service.test.ts` next to `suite-service.ts` (consistent with existing codebase)

### Format Patterns

**API Response Formats (consistent with existing):**

Success: return data directly
```json
{ "suites": [...] }
{ "runId": "uuid", "status": "pending" }
```

Error: existing envelope
```json
{ "error": "Suite not found", "details": { "suiteId": "abc" } }
```

HTTP status codes: 200 (success), 201 (created), 202 (run accepted), 400 (validation), 404 (not found), 500 (server error)

**Run status response:**
```json
{
  "runId": "uuid",
  "suiteId": "uuid",
  "status": "completed",
  "startedAt": "2026-03-30T10:00:00Z",
  "completedAt": "2026-03-30T10:00:12Z",
  "summary": { "total": 23, "passed": 21, "failed": 2, "errored": 0 },
  "results": [
    {
      "testCase": { "user": "user:alice", "relation": "viewer", "object": "doc:roadmap", "expected": true },
      "actual": true,
      "passed": true,
      "durationMs": 12,
      "error": null
    }
  ]
}
```

**Date format:** ISO 8601 strings throughout → `"2026-03-30T10:00:00Z"`

### Communication Patterns

**Pinia Store Pattern (consistent with existing):**

```typescript
export const useSuiteStore = defineStore('suites', () => {
  const api = useApi()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const suites = ref<SuiteListItem[]>([])

  async function fetchSuites() {
    loading.value = true
    error.value = null
    try {
      const data = await api.get('/api/suites')
      suites.value = data.suites
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return { loading, error, suites, fetchSuites }
})
```

**Polling Pattern (new for run status):**

```typescript
const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)

function startPolling(runId: string) {
  pollInterval.value = setInterval(async () => {
    const run = await api.get(`/api/runs/${runId}`)
    currentRun.value = run
    if (['completed', 'failed'].includes(run.status)) {
      stopPolling()
    }
  }, 2000)
}

function stopPolling() {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
}
```

Polling cleans up on component unmount via `onUnmounted(stopPolling)`.

**Repository Pattern (new):**

```typescript
// suite-repository.ts
import { pool } from '../db/pool.js'
import type { SuiteDefinition } from '../types/suite.js'

export async function findAll(): Promise<SuiteListItem[]> {
  const { rows } = await pool.query(
    'SELECT id, name, description, tags, created_at, updated_at FROM suites ORDER BY updated_at DESC'
  )
  return rows.map(mapRowToSuiteListItem)
}

function mapRowToSuiteListItem(row: any): SuiteListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tags: row.tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
```

### Process Patterns

**Execution Engine State Machine:**

```typescript
// execution-engine.ts
export async function executeRun(runId: string, suite: SuiteDefinition): Promise<void> {
  let ephemeralStoreId: string | null = null
  try {
    await runRepository.updateStatus(runId, 'provisioning')
    ephemeralStoreId = await createEphemeralStore(suite.fixture)

    await runRepository.updateStatus(runId, 'running')
    const results = await executeChecks(ephemeralStoreId, suite)

    await runRepository.saveResults(runId, results)
    await runRepository.updateStatus(runId, results.failed > 0 ? 'failed' : 'completed')
  } catch (err) {
    await runRepository.updateStatus(runId, 'failed', errorToString(err))
  } finally {
    if (ephemeralStoreId) {
      await destroyEphemeralStore(ephemeralStoreId).catch(logCleanupError)
    }
  }
}
```

Key rules:
- State transitions ALWAYS go through repository (persisted before proceeding)
- Results persisted BEFORE cleanup begins (NFR17)
- `finally` block guarantees cleanup attempt (NFR15)
- Cleanup errors are logged but don't overwrite the run status

**Error Handling Flow (extends existing):**
1. Repository/OpenFGA error → execution engine catches → updates run status to 'failed' with error message
2. API route errors → existing error-handler middleware → error envelope
3. Frontend `useApi` → detects error envelope → triggers toast

### Enforcement Guidelines

**All AI Agents MUST:**
- Place all test-suite backend code under `backend/src/test-suites/`
- Place all test-suite frontend components under `frontend/src/components/test-suites/`
- Use the repository pattern for ALL database access — services never import pg directly
- Follow snake_case in SQL, camelCase in TypeScript/JSON — repositories handle mapping
- Use try/finally for ANY code path that creates an ephemeral store
- Follow the existing Pinia store pattern (setup syntax, loading/error/data refs, useApi)
- Co-locate tests next to source files
- Use Zod schemas for all new API route validation
- Use the existing error envelope format for all error responses

## Project Structure & Boundaries

### New Files Added for Test Suite Feature

```
backend/src/
  test-suites/
    routes/
      suites.ts                    # CRUD: GET/POST/PUT/DELETE /api/suites, GET /api/suites/:suiteId
      suites.test.ts
      runs.ts                      # POST /api/suites/:suiteId/run, GET /api/runs/:runId, GET /api/runs
      runs.test.ts
    services/
      suite-service.ts             # Suite CRUD orchestration, validation
      suite-service.test.ts
      execution-engine.ts          # Fire-and-forget run: provision → execute → cleanup
      execution-engine.test.ts
      run-service.ts               # Run queries, status, results aggregation
      run-service.test.ts
    repositories/
      suite-repository.ts          # SQL: suites table CRUD, snake_case → camelCase mapping
      suite-repository.test.ts
      run-repository.ts            # SQL: runs + run_results tables, status updates, results persistence
      run-repository.test.ts
    schemas/
      suite.ts                     # Zod: SuiteDefinition, TestGroup, TestCase, Fixture validation
      run.ts                       # Zod: run creation params, status query params
    types/
      suite.ts                     # SuiteDefinition, SuiteListItem, TestCase, TestGroup, Fixture
      run.ts                       # RunStatus, RunResult, RunSummary, TestCaseResult
    db/
      pool.ts                      # pg.Pool init, isAvailable() check, graceful shutdown
      pool.test.ts
      migrate.ts                   # node-pg-migrate runner: auto (startup) + CLI mode
    migrations/
      001_create-suites.sql        # suites table: id, name, description, tags, definition (JSONB), timestamps
      002_create-runs.sql          # runs table: id, suite_id (FK), status, started_at, completed_at, error, timestamps
      003_create-run-results.sql   # run_results table: id, run_id (FK), test_case (JSONB), expected, actual, passed, duration_ms, error

frontend/src/
  stores/
    suites.ts                      # Suite list, CRUD actions, current suite definition
    suites.test.ts
    runs.ts                        # Current run state, polling, results
    runs.test.ts
  views/
    TestSuites.vue                 # Suite list page — grid of suite cards with last run status
    SuiteEditor.vue                # Suite editor — tabs: Form / JSON / Fixture
    RunResults.vue                 # Run results page — summary + per-test detail
  components/
    test-suites/
      SuiteList.vue                # Suite cards grid with name, tags, last run badge
      SuiteCard.vue                # Individual suite card
      SuiteForm.vue                # Form editor: groups → test cases (add/edit/remove)
      SuiteJsonEditor.vue          # CodeMirror 6 JSON editor with validation
      FixtureEditor.vue            # Fixture viewer/editor (model + tuples JSON)
      TestCaseForm.vue             # Single test case form: user, relation, object, expected, meta
      GroupForm.vue                # Group form: name, description, test case list
      RunSummary.vue               # Total/passed/failed/errored bar with timing
      TestResultRow.vue            # Per-test: definition + expected vs actual + status icon + timing
      RunStatusBadge.vue           # Status badge: pending (gray), running (blue), completed (green), failed (red)
      RunProgress.vue              # Polling status display during execution

docker-compose.yml                 # Updated: add postgres service
.env.example                       # Updated: add DATABASE_URL
```

### Architectural Boundaries

**API Boundaries:**
- New routes registered in `backend/src/app.ts` via import from `test-suites/routes/`
- `/api/suites/*` and `/api/runs/*` — new namespace, no overlap with existing `/api/stores/*`
- All new routes use existing `validate` middleware + new Zod schemas from `test-suites/schemas/`
- All new routes use existing `error-handler` middleware

**Module Boundaries:**
- `test-suites/` imports FROM existing code: `services/openfga-client.ts` (ephemeral store ops), `middleware/validate.ts`, `middleware/error-handler.ts`
- Existing code NEVER imports from `test-suites/` — one-way dependency
- `test-suites/db/pool.ts` is self-contained — does not affect existing backend startup if DB unavailable

**Data Boundaries:**
- PostgreSQL is exclusively used by `test-suites/repositories/` — no other code touches it
- Suite definitions stored as JSONB in `suites.definition` column — the full `{ fixture, groups[] }` structure
- Run results stored per-test in `run_results` table — enables per-test querying
- Ephemeral stores are OpenFGA stores created/destroyed via `openfga-client` — no PostgreSQL involvement

### Requirements to Structure Mapping

| FR Category | Backend Files | Frontend Files |
|---|---|---|
| Suite CRUD (FR1-9) | `routes/suites.ts`, `services/suite-service.ts`, `repositories/suite-repository.ts`, `schemas/suite.ts` | `stores/suites.ts`, `views/TestSuites.vue`, `SuiteList.vue`, `SuiteCard.vue` |
| Dual-mode editor (FR10-11) | — (frontend only) | `views/SuiteEditor.vue`, `SuiteForm.vue`, `SuiteJsonEditor.vue`, `GroupForm.vue`, `TestCaseForm.vue` |
| Fixture management (FR12-14) | Validation in `schemas/suite.ts` | `FixtureEditor.vue` |
| Test execution (FR15-23) | `services/execution-engine.ts`, `repositories/run-repository.ts` | `stores/runs.ts`, `RunProgress.vue` |
| Run results (FR24-28) | `routes/runs.ts`, `services/run-service.ts`, `repositories/run-repository.ts` | `views/RunResults.vue`, `RunSummary.vue`, `TestResultRow.vue`, `RunStatusBadge.vue` |
| Import/export (FR29-32) | `routes/suites.ts` (export/import endpoints) | `stores/suites.ts` (import/export actions) |
| Validation (FR33-35) | `schemas/suite.ts`, `services/suite-service.ts` | Toast display via existing `useApi` |
| REST API (FR36-41) | `routes/suites.ts`, `routes/runs.ts` | — (consumed by UI + CI/CD) |
| Persistence (FR42-45) | `db/pool.ts`, `db/migrate.ts`, `migrations/*`, `repositories/*` | — |

### Data Flow

```
User Action → Vue Component → Pinia Store (suites/runs) → useApi composable
    → HTTP /api/suites/* or /api/runs/* → Express Route → Zod Validation
    → Service (suite-service/run-service/execution-engine)
    → Repository (SQL via pg.Pool) → PostgreSQL
    → OR openfga-client → OpenFGA (ephemeral store ops)
    ← Response ← Route (envelope) ← useApi (parse, toast on error)
    ← Pinia Store (update refs) ← Vue Component (reactive render)
```

### Database Schema Overview

**suites:**

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, generated |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | nullable |
| tags | TEXT[] | PostgreSQL array |
| definition | JSONB | Full suite structure: { fixture, groups[] } |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**runs:**

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, generated |
| suite_id | UUID | FK → suites.id |
| status | VARCHAR(20) | pending/provisioning/running/completed/failed |
| started_at | TIMESTAMPTZ | nullable |
| completed_at | TIMESTAMPTZ | nullable |
| error | TEXT | nullable, for infrastructure errors |
| summary | JSONB | { total, passed, failed, errored, durationMs } |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**run_results:**

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, generated |
| run_id | UUID | FK → runs.id |
| test_case | JSONB | { user, relation, object, expected, meta } |
| actual | BOOLEAN | nullable (null if errored) |
| passed | BOOLEAN | NOT NULL |
| duration_ms | INTEGER | execution time for this check |
| error | TEXT | nullable, for per-test execution errors |

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
All technology choices are compatible. pg (node-postgres) + node-pg-migrate + raw SQL with repository pattern form a consistent, minimal data layer. Express 5.1 extends naturally with new route modules. CodeMirror 6 + Pinia JSON state + Vue 3 composition API are well-tested together. Fire-and-forget execution with setInterval polling is a standard async UI pattern.

**Pattern Consistency:**
- Naming: snake_case (SQL) ↔ camelCase (TS/JSON) with repository as the mapping boundary — consistent across all entities
- Structure: dedicated `test-suites/` subdirectory follows the module isolation principle; frontend follows existing component/store/view pattern
- Communication: Pinia stores + useApi composable + error envelope — identical to existing codebase patterns
- Process: try/finally for cleanup, repository for all DB access, Zod for all validation — no exceptions

**Structure Alignment:**
Directory structure directly supports all decisions. Backend test-suites module has clear internal layers (routes → services → repositories → db). Frontend has clear separation (views → components → stores). One-way dependency from test-suites → existing code is enforced by structure.

### Requirements Coverage Validation

**Functional Requirements Coverage:**
All 45 FRs mapped to specific files (see Requirements to Structure Mapping table). Every FR category has dedicated backend and frontend components.

**Non-Functional Requirements Coverage:**
- NFR1 (100 checks <30s): Sequential execution via openfga-client, ephemeral store provisioning <5s (NFR6). Architecture doesn't block this — performance depends on OpenFGA latency.
- NFR2 (polling <200ms): Simple SELECT from `runs` table by PK — well within target.
- NFR3 (editor loads 100+ tests <1s): JSON from single JSONB column, rendered by Vue — no architectural bottleneck.
- NFR5 (CRUD <50ms): Simple CRUD queries on 3 tables — trivially met with PostgreSQL.
- NFR7-10 (security): DATABASE_URL env-only, Zod validation, unique ephemeral store names via UUID.
- NFR11-14 (integration): openfga-client reuse, standard DATABASE_URL, JSON format, existing export format.
- NFR15-17 (reliability): try/finally cleanup, graceful degradation, results-before-cleanup ordering.

### Implementation Readiness Validation

**Decision Completeness:**
All critical decisions documented with specific technology choices. No ambiguous items remain for MVP. Deferred items (job queue, SSE, retention policy) explicitly listed.

**Structure Completeness:**
Every file in the new module has a clear purpose with FR references. Integration points between test-suites module and existing code are well-defined (openfga-client, validate middleware, error-handler middleware, useApi composable).

**Pattern Completeness:**
All 5 conflict areas resolved with concrete code examples (repository pattern, Pinia store pattern, polling pattern, execution engine state machine, naming conventions).

### Gap Analysis Results

**No critical gaps.**

**Minor implementation notes:**
- FR27 (last run status in suite list): Implement via LEFT JOIN in `suite-repository.findAll()` — no schema change needed. The repository query joins `suites` with the latest `runs` row per suite.
- Suite definition JSONB validation: The `definition` column stores the full suite structure. Zod schema validates before INSERT/UPDATE. PostgreSQL JSONB enables future querying by test case fields if needed.
- Ephemeral store naming: Use `test-run-{runId}` as the store name to ensure uniqueness (UUID-based) and enable cleanup identification if orphaned stores are discovered.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (45 FRs, 17 NFRs, brownfield constraints)
- [x] Scale and complexity assessed (medium — persistence + async + state machine)
- [x] Technical constraints identified (existing codebase, Express 5.1, optional PostgreSQL)
- [x] Cross-cutting concerns mapped (DB availability, cleanup guarantee, error distinction, feature isolation)

**Architectural Decisions**
- [x] Critical decisions documented (pg, raw SQL, node-pg-migrate, fire-and-forget, CodeMirror 6, JSON source of truth)
- [x] Technology stack fully specified with rationale
- [x] Integration patterns defined (repository pattern, openfga-client reuse, existing middleware)
- [x] Performance considerations addressed (polling interval, JSONB queries, sequential execution)

**Implementation Patterns**
- [x] Naming conventions established (SQL snake_case, TS/JSON camelCase, repository mapping)
- [x] Structure patterns defined (dedicated subdirectory, co-located tests)
- [x] Communication patterns specified (Pinia store, useApi, polling, error envelope)
- [x] Process patterns documented (execution engine state machine, try/finally cleanup, error handling flow)

**Project Structure**
- [x] Complete directory structure defined (all new files listed with purpose)
- [x] Component boundaries established (one-way dependency, module isolation)
- [x] Integration points mapped (openfga-client, middleware, useApi)
- [x] Requirements to structure mapping complete (all 45 FRs → files)
- [x] Database schema defined (3 tables with column types and relationships)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clean module isolation — test-suites is a self-contained subdirectory with one-way dependency on existing code
- Repository pattern provides future-proof SQL abstraction without current overhead
- Fire-and-forget + polling is simple, debuggable, and matches CI/CD polling pattern from PRD
- JSONB for suite definitions enables flexible schema evolution without migrations
- Existing patterns (Pinia, useApi, error envelope, Zod) extend naturally — no new paradigms to learn

**Areas for Future Enhancement:**
- Background job queue for concurrent test runs (replace fire-and-forget with proper queue)
- SSE/WebSocket for real-time execution progress (replace polling)
- Run retention/archival policy (scheduled cleanup of old runs)
- Microservice extraction (move test-suites/ to standalone service)
- Shared types package between frontend/backend (if type duplication grows)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently — especially repository pattern and try/finally cleanup
- Respect module boundaries: test-suites/ imports from existing code, never the reverse
- Place ALL test-suite code in the dedicated subdirectory structure
- Refer to this document for all architectural questions

**First Implementation Priority:**
1. Add PostgreSQL to Docker Compose + `.env.example`
2. Install pg + @types/pg + node-pg-migrate in backend
3. Implement `db/pool.ts` (pg.Pool init + availability check)
4. Implement `db/migrate.ts` (auto-run + CLI)
5. Create initial migrations (3 tables)
6. Implement suite repository + service + routes (CRUD vertical slice)
