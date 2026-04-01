# Story 9.1: Execution Engine & Run API

## Status: done

## Story

As a developer,
I want a REST API that triggers test suite execution against ephemeral OpenFGA stores and reports results,
So that suites can be run from both the UI and CI/CD pipelines.

## Acceptance Criteria

**AC1:** Given the backend starts with DATABASE_URL configured, when migrations run, then the `runs` table is created with columns: id (UUID), suite_id (FK → suites), status (VARCHAR), started_at, completed_at, error (TEXT), summary (JSONB), created_at; and the `run_results` table is created with columns: id (UUID), run_id (FK → runs), test_case (JSONB), actual (BOOLEAN nullable), passed (BOOLEAN), duration_ms (INTEGER), error (TEXT nullable)

**AC2:** Given a suite exists with a valid fixture and test cases, when POST `/api/suites/:suiteId/run` is called, then a run record is created with status `pending` and 202 is returned with `{ runId }`; execution starts in a detached async function (fire-and-forget)

**AC3:** Given a run is executing, when the execution engine processes the run, then status transitions are persisted in order: pending → provisioning → running → completed/failed; during provisioning an ephemeral OpenFGA store is created (named `test-run-{runId}`) and the fixture model + tuples are loaded; during running each test case executes a `check` API call comparing actual vs expected with per-test timing; results are persisted to `run_results` BEFORE cleanup begins; cleanup destroys the ephemeral store via try/finally — guaranteed even on errors

**AC4:** Given the fixture is invalid (bad model syntax, malformed tuples), when execution attempts to load the fixture, then the run status is set to `failed` with a clear error message describing the fixture problem; the ephemeral store is still cleaned up

**AC5:** Given an infrastructure error occurs (OpenFGA unreachable, network timeout), when the execution engine catches the error, then the run status is set to `failed` with the error message; run results distinguish execution errors from assertion failures — execution errors have `error` field set, assertion failures have `passed: false` with `actual` populated

**AC6:** Given a run exists, when GET `/api/runs/:runId` is called, then the run is returned with status, summary `{ total, passed, failed, errored, durationMs }`, and per-test results array; each result includes: testCase definition, expected, actual, passed, durationMs, error

**AC7:** Given a run does not exist, when GET `/api/runs/:runId` is called, then 404 is returned with `{ error: "Run not found" }`

**AC8:** Given a suite has no fixture or no test cases, when POST `/api/suites/:suiteId/run` is called, then 400 is returned with `{ error: "Suite has no fixture" }` or `{ error: "Suite has no test cases" }`

## Tasks / Subtasks

- [ ] Task 1: Create migration files
  - [ ] 1.1 `002_create-runs.sql` — runs table with FK to suites, status, summary JSONB, timestamps
  - [ ] 1.2 `003_create-run-results.sql` — run_results table with FK to runs, test_case JSONB, actual, passed, duration_ms, error

- [ ] Task 2: Add types in `types/run.ts`
  - [ ] 2.1 `RunStatus` type: `'pending' | 'provisioning' | 'running' | 'completed' | 'failed'`
  - [ ] 2.2 `RunSummary` interface: `{ total, passed, failed, errored, durationMs }`
  - [ ] 2.3 `RunResult` interface: per-test result shape
  - [ ] 2.4 `Run` interface: full run record with results array

- [ ] Task 3: Add Zod schemas in `schemas/run.ts`
  - [ ] 3.1 `triggerRunParamsSchema` — validates `suiteId` param exists
  - [ ] 3.2 `runIdParamsSchema` — validates `runId` param exists

- [ ] Task 4: Create `repositories/run-repository.ts`
  - [ ] 4.1 `createRun(suiteId)` — INSERT into runs, returns run with status `pending`
  - [ ] 4.2 `updateStatus(runId, status, error?)` — UPDATE status, set started_at/completed_at as appropriate
  - [ ] 4.3 `saveSummary(runId, summary)` — UPDATE summary JSONB
  - [ ] 4.4 `saveResults(runId, results[])` — batch INSERT into run_results
  - [ ] 4.5 `findById(runId)` — SELECT run with all run_results joined
  - [ ] 4.6 Row mapping: snake_case → camelCase (same pattern as suite-repository)

- [ ] Task 5: Create `services/execution-engine.ts`
  - [ ] 5.1 `executeRun(runId, suite)` — fire-and-forget async orchestration
  - [ ] 5.2 Provisioning phase: create ephemeral store via `openfgaClient`, write model, write tuples
  - [ ] 5.3 Running phase: iterate test cases, call check endpoint, capture actual + timing
  - [ ] 5.4 Results persistence: batch-save all results to run_results, compute and save summary
  - [ ] 5.5 Cleanup phase: try/finally delete ephemeral store — guaranteed even on errors
  - [ ] 5.6 Error handling: distinguish fixture errors vs infrastructure errors vs assertion failures

- [ ] Task 6: Create `services/run-service.ts`
  - [ ] 6.1 `triggerRun(suiteId)` — validate suite has fixture + test cases, create run record, spawn executeRun, return `{ runId }`
  - [ ] 6.2 `getRun(runId)` — fetch run with results, 404 if not found

- [ ] Task 7: Create `routes/runs.ts` and mount in `app.ts`
  - [ ] 7.1 `POST /api/suites/:suiteId/run` — validate params, call triggerRun, return 202
  - [ ] 7.2 `GET /api/runs/:runId` — call getRun, return run with results
  - [ ] 7.3 Mount runs router in `app.ts` with same DB availability middleware

- [ ] Task 8: Write tests
  - [ ] 8.1 `run-repository.test.ts` — createRun, updateStatus, saveResults, findById
  - [ ] 8.2 `execution-engine.test.ts` — happy path, fixture error, infra error, cleanup guarantee
  - [ ] 8.3 `run-service.test.ts` — triggerRun validation, getRun 404
  - [ ] 8.4 `routes/runs.test.ts` — POST 202, GET 200, GET 404, POST 400 (no fixture), 503 (no DB)

## Dev Notes

### OpenFGA Client — Ephemeral Store Operations

The existing `openfgaClient` singleton (`backend/src/services/openfga-client.ts`) makes HTTP calls against the configured OpenFGA server. It has `get`, `post`, `delete` methods. The `storeId` field is the user's active store — do NOT modify it.

For ephemeral stores, construct paths directly using the ephemeral store ID:

```typescript
import { openfgaClient } from '../../services/openfga-client.js'

// 1. Create ephemeral store
const store = await openfgaClient.post('/stores', { name: `test-run-${runId}` }) as { id: string }
const ephemeralStoreId = store.id

// 2. Write authorization model (if fixture.model is defined)
if (fixture.model) {
  await openfgaClient.post(
    `/stores/${ephemeralStoreId}/authorization-models`,
    fixture.model,
  )
}

// 3. Write tuples (if fixture.tuples has entries)
if (fixture.tuples && fixture.tuples.length > 0) {
  await openfgaClient.post(`/stores/${ephemeralStoreId}/write`, {
    writes: { tuple_keys: fixture.tuples },
  })
}

// 4. Check access (per test case)
const result = await openfgaClient.post(`/stores/${ephemeralStoreId}/check`, {
  tuple_key: { user: tc.user, relation: tc.relation, object: tc.object },
}) as { allowed: boolean }

// 5. Delete ephemeral store (cleanup)
await openfgaClient.delete(`/stores/${ephemeralStoreId}`)
```

**Important:** The 5000ms `AbortSignal.timeout` on `openfgaClient` applies per request. For fixture loading with many tuples, consider batching (OpenFGA supports max 100 tuples per write call). If `fixture.tuples.length > 100`, split into batches:

```typescript
const BATCH_SIZE = 100
for (let i = 0; i < tuples.length; i += BATCH_SIZE) {
  const batch = tuples.slice(i, i + BATCH_SIZE)
  await openfgaClient.post(`/stores/${ephemeralStoreId}/write`, {
    writes: { tuple_keys: batch },
  })
}
```

### Execution Engine Pattern

```typescript
// services/execution-engine.ts
import { openfgaClient } from '../../services/openfga-client.js'
import * as runRepository from '../repositories/run-repository.js'
import { logger } from '../../logger.js'
import type { Suite, TestCase } from '../types/suite.js'
import type { RunResult } from '../types/run.js'

export async function executeRun(runId: string, suite: Suite): Promise<void> {
  let ephemeralStoreId: string | null = null
  try {
    // Phase 1: Provisioning
    await runRepository.updateStatus(runId, 'provisioning')
    const fixture = suite.definition!.fixture!
    const store = await openfgaClient.post('/stores', { name: `test-run-${runId}` }) as { id: string }
    ephemeralStoreId = store.id

    if (fixture.model) {
      await openfgaClient.post(`/stores/${ephemeralStoreId}/authorization-models`, fixture.model)
    }
    if (fixture.tuples && fixture.tuples.length > 0) {
      // Batch tuples in groups of 100
      for (let i = 0; i < fixture.tuples.length; i += 100) {
        await openfgaClient.post(`/stores/${ephemeralStoreId}/write`, {
          writes: { tuple_keys: fixture.tuples.slice(i, i + 100) },
        })
      }
    }

    // Phase 2: Running checks
    await runRepository.updateStatus(runId, 'running')
    const startedAt = Date.now()
    const results: RunResult[] = []

    const allTestCases = suite.definition!.groups.flatMap((g) =>
      g.testCases.map((tc) => ({ ...tc, groupName: g.name }))
    )

    for (const tc of allTestCases) {
      const tcStart = Date.now()
      try {
        const checkResult = await openfgaClient.post(`/stores/${ephemeralStoreId}/check`, {
          tuple_key: { user: tc.user, relation: tc.relation, object: tc.object },
        }) as { allowed: boolean }

        results.push({
          testCase: { user: tc.user, relation: tc.relation, object: tc.object, expected: tc.expected },
          actual: checkResult.allowed,
          passed: checkResult.allowed === tc.expected,
          durationMs: Date.now() - tcStart,
          error: null,
        })
      } catch (err) {
        results.push({
          testCase: { user: tc.user, relation: tc.relation, object: tc.object, expected: tc.expected },
          actual: null,
          passed: false,
          durationMs: Date.now() - tcStart,
          error: (err as Error).message,
        })
      }
    }

    // Phase 3: Persist results BEFORE cleanup (NFR17)
    await runRepository.saveResults(runId, results)

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed && r.actual !== null).length,
      errored: results.filter((r) => r.error !== null).length,
      durationMs: Date.now() - startedAt,
    }
    await runRepository.saveSummary(runId, summary)

    const hasFailures = summary.failed > 0 || summary.errored > 0
    await runRepository.updateStatus(runId, hasFailures ? 'failed' : 'completed')
  } catch (err) {
    // Infrastructure/fixture error — whole run fails
    await runRepository.updateStatus(runId, 'failed', (err as Error).message).catch((e) =>
      logger.error({ err: e }, 'Failed to update run status')
    )
  } finally {
    // Phase 4: Cleanup — guaranteed
    if (ephemeralStoreId) {
      try {
        await openfgaClient.delete(`/stores/${ephemeralStoreId}`)
      } catch (cleanupErr) {
        logger.error({ err: cleanupErr, runId, ephemeralStoreId }, 'Failed to cleanup ephemeral store')
      }
    }
  }
}
```

### Migration SQL

**`002_create-runs.sql`:**
```sql
CREATE TABLE IF NOT EXISTS runs (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id     UUID          NOT NULL REFERENCES suites(id) ON DELETE CASCADE,
  status       VARCHAR(20)   NOT NULL DEFAULT 'pending',
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error        TEXT,
  summary      JSONB,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_suite_id ON runs (suite_id);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs (created_at DESC);
```

**`003_create-run-results.sql`:**
```sql
CREATE TABLE IF NOT EXISTS run_results (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID          NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  test_case    JSONB         NOT NULL,
  actual       BOOLEAN,
  passed       BOOLEAN       NOT NULL,
  duration_ms  INTEGER,
  error        TEXT
);

CREATE INDEX IF NOT EXISTS idx_run_results_run_id ON run_results (run_id);
```

### Types

```typescript
// types/run.ts
export type RunStatus = 'pending' | 'provisioning' | 'running' | 'completed' | 'failed'

export interface RunSummary {
  total: number
  passed: number
  failed: number
  errored: number
  durationMs: number
}

export interface RunResultTestCase {
  user: string
  relation: string
  object: string
  expected: boolean
}

export interface RunResult {
  testCase: RunResultTestCase
  actual: boolean | null
  passed: boolean
  durationMs: number
  error: string | null
}

export interface Run {
  id: string
  suiteId: string
  status: RunStatus
  startedAt: string | null
  completedAt: string | null
  error: string | null
  summary: RunSummary | null
  createdAt: string
  results: RunResult[]
}
```

### Run Repository Pattern

Follow `suite-repository.ts` exactly. Key methods:

```typescript
// repositories/run-repository.ts
import { getPool } from '../db/pool.js'
import type { Run, RunResult, RunStatus, RunSummary } from '../types/run.js'

export async function createRun(suiteId: string): Promise<{ id: string; status: RunStatus }> {
  const pool = getPool()
  const { rows } = await pool.query(
    `INSERT INTO runs (suite_id) VALUES ($1) RETURNING id, status`,
    [suiteId],
  )
  return { id: rows[0].id, status: rows[0].status }
}

export async function updateStatus(runId: string, status: RunStatus, error?: string): Promise<void> {
  const pool = getPool()
  const timestampField = status === 'provisioning' ? 'started_at' : status === 'completed' || status === 'failed' ? 'completed_at' : null
  if (timestampField) {
    await pool.query(
      `UPDATE runs SET status = $1, ${timestampField} = NOW(), error = $3 WHERE id = $2`,
      [status, runId, error ?? null],
    )
  } else {
    await pool.query(
      `UPDATE runs SET status = $1, error = $3 WHERE id = $2`,
      [status, runId, error ?? null],
    )
  }
}

export async function saveSummary(runId: string, summary: RunSummary): Promise<void> {
  const pool = getPool()
  await pool.query('UPDATE runs SET summary = $1 WHERE id = $2', [JSON.stringify(summary), runId])
}

export async function saveResults(runId: string, results: RunResult[]): Promise<void> {
  if (results.length === 0) return
  const pool = getPool()
  // Batch insert — build VALUES clause
  const values: unknown[] = []
  const placeholders: string[] = []
  results.forEach((r, i) => {
    const offset = i * 5
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`)
    values.push(runId, JSON.stringify(r.testCase), r.actual, r.passed, r.durationMs ?? null)
    // Note: r.error is NOT in the batch insert for simplicity — add as 6th column if needed
  })
  // Actually include error column:
  // Adjust to 6 params per row
  // See implementation below for correct approach
}
```

**Batch insert — correct implementation with error column:**

```typescript
export async function saveResults(runId: string, results: RunResult[]): Promise<void> {
  if (results.length === 0) return
  const pool = getPool()
  const values: unknown[] = []
  const placeholders: string[] = []
  results.forEach((r, i) => {
    const o = i * 6
    placeholders.push(`($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5}, $${o+6})`)
    values.push(runId, JSON.stringify(r.testCase), r.actual, r.passed, r.durationMs, r.error)
  })
  await pool.query(
    `INSERT INTO run_results (run_id, test_case, actual, passed, duration_ms, error) VALUES ${placeholders.join(', ')}`,
    values,
  )
}
```

### Run Service

```typescript
// services/run-service.ts
import * as suiteService from './suite-service.js'
import * as runRepository from '../repositories/run-repository.js'
import { executeRun } from './execution-engine.js'

export async function triggerRun(suiteId: string): Promise<{ runId: string }> {
  const suite = await suiteService.getSuite(suiteId) // 404 if not found

  if (!suite.definition?.fixture) {
    const err = new Error('Suite has no fixture') as Error & { statusCode: number }
    err.statusCode = 400
    throw err
  }

  const testCaseCount = suite.definition.groups.reduce((sum, g) => sum + g.testCases.length, 0)
  if (testCaseCount === 0) {
    const err = new Error('Suite has no test cases') as Error & { statusCode: number }
    err.statusCode = 400
    throw err
  }

  const run = await runRepository.createRun(suiteId)

  // Fire-and-forget: do NOT await (AR5)
  executeRun(run.id, suite).catch(() => {
    // Errors handled inside executeRun; this catch prevents unhandled rejection
  })

  return { runId: run.id }
}
```

### Routes

```typescript
// routes/runs.ts
import { Router } from 'express'
import * as runService from '../services/run-service.js'

const router = Router()

router.post('/api/suites/:suiteId/run', async (req, res, next) => {
  try {
    const { runId } = await runService.triggerRun(req.params.suiteId)
    res.status(202).json({ runId })
  } catch (err) {
    next(err)
  }
})

router.get('/api/runs/:runId', async (req, res, next) => {
  try {
    const run = await runService.getRun(req.params.runId)
    res.json(run)
  } catch (err) {
    next(err)
  }
})

export default router
```

**Mount in `app.ts` — add BEFORE `app.use(errorHandler)`:**

```typescript
import runsRouter from './test-suites/routes/runs.js'

// After suitesRouter, add:
app.use('/api/runs', (_req, res, next) => {
  if (!isAvailable()) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  next()
})
app.use(runsRouter)
```

### findById — Run with Results

```typescript
export async function findById(runId: string): Promise<Run | null> {
  const pool = getPool()
  const { rows: runRows } = await pool.query(
    'SELECT id, suite_id, status, started_at, completed_at, error, summary, created_at FROM runs WHERE id = $1',
    [runId],
  )
  if (runRows.length === 0) return null
  const row = runRows[0]

  const { rows: resultRows } = await pool.query(
    'SELECT test_case, actual, passed, duration_ms, error FROM run_results WHERE run_id = $1',
    [runId],
  )

  return {
    id: row.id as string,
    suiteId: row.suite_id as string,
    status: row.status as RunStatus,
    startedAt: row.started_at ? (row.started_at as Date).toISOString() : null,
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : null,
    error: (row.error as string | null) ?? null,
    summary: (row.summary as RunSummary | null) ?? null,
    createdAt: (row.created_at as Date).toISOString(),
    results: resultRows.map((r) => ({
      testCase: r.test_case as RunResult['testCase'],
      actual: r.actual as boolean | null,
      passed: r.passed as boolean,
      durationMs: (r.duration_ms as number | null) ?? 0,
      error: (r.error as string | null) ?? null,
    })),
  }
}
```

### Test Patterns

**execution-engine.test.ts — mock openfgaClient:**

```typescript
vi.mock('../../services/openfga-client.js', () => ({
  openfgaClient: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../repositories/run-repository.js', () => ({
  updateStatus: vi.fn(),
  saveResults: vi.fn(),
  saveSummary: vi.fn(),
}))

import { openfgaClient } from '../../services/openfga-client.js'
import * as runRepository from '../repositories/run-repository.js'
import { executeRun } from './execution-engine.js'
```

**Key test scenarios:**

1. **Happy path:** fixture loads, all checks pass → status ends at `completed`, results saved, store deleted
2. **Assertion failure:** one check returns `allowed: false` when `expected: true` → status ends at `failed`, results include the failure, store deleted
3. **Fixture error:** model write throws → status set to `failed` with error message, store deleted
4. **Infrastructure error:** check call throws → individual result has `error` field, run continues other tests
5. **Cleanup guarantee:** even when running phase throws, `openfgaClient.delete` is still called
6. **No orphaned stores:** verify delete is called in finally block regardless of error path

**run-repository.test.ts — mock getPool:**

```typescript
vi.mock('../db/pool.js', () => ({
  getPool: vi.fn(),
}))
```

Use `vi.mocked(getPool).mockReturnValue({ query: queryMock } as unknown as ...)` for each test.

**routes/runs.test.ts — mock run-service:**

```typescript
vi.mock('../services/run-service.js', () => ({
  triggerRun: vi.fn(),
  getRun: vi.fn(),
}))
```

### CLAUDE.md Conventions (DO NOT BREAK)

- No `@pinia/testing` (frontend only but applies to project conventions)
- All backend tests use Vitest, co-located with source files
- Repository pattern: snake_case → camelCase mapping at boundary
- Service errors: `err.statusCode = 404` pattern for HTTP error propagation
- Routes: every handler in try/catch, delegate to `next(err)`
- Zod validation via `validate()` middleware from `../../middleware/validate.js`
- Error envelope: `{ error: string, details?: unknown }`
- All queries use parameterized `$1, $2` — NEVER string interpolation

### Performance Considerations

- NFR1: 100 checks < 30s → sequential check calls, ~250ms budget per check
- NFR2: GET /api/runs/:runId < 200ms → single query with JOIN
- NFR6: Ephemeral store creation + fixture loading < 5s
- NFR17: Results persisted BEFORE cleanup
- NFR15: Cleanup in try/finally — guaranteed even on errors

## File List

- `backend/src/test-suites/migrations/002_create-runs.sql` — new
- `backend/src/test-suites/migrations/003_create-run-results.sql` — new
- `backend/src/test-suites/types/run.ts` — new
- `backend/src/test-suites/schemas/run.ts` — new
- `backend/src/test-suites/repositories/run-repository.ts` — new
- `backend/src/test-suites/repositories/run-repository.test.ts` — new
- `backend/src/test-suites/services/execution-engine.ts` — new
- `backend/src/test-suites/services/execution-engine.test.ts` — new
- `backend/src/test-suites/services/run-service.ts` — new
- `backend/src/test-suites/services/run-service.test.ts` — new
- `backend/src/test-suites/routes/runs.ts` — new
- `backend/src/test-suites/routes/runs.test.ts` — new
- `backend/src/app.ts` — modified (mount runs router + DB middleware)

## Change Log

| Date | Change |
|------|--------|
| 2026-03-31 | Created Story 9.1 — Execution Engine & Run API |
