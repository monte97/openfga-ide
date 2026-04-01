# Story 9.3: Results Display & Suite List Integration

## Status: done

## Story

As a developer,
I want to see detailed per-test results with sentence rendering in the editor and last-run status badges in the suite list,
So that I can quickly diagnose failures and monitor suite health at a glance.

## Acceptance Criteria

**AC1:** Given a run has completed, when the user views the tree panel, then each test case node shows a pass/fail icon (green ✓ / red ✗) next to the sentence label. And within each expanded group, failed tests sort to the top for quick access.

**AC2:** Given the user selects a failed test case, when the SentenceView renders with a result, then it shows: "Can `user:mallory` `delete` `document:budget`? → Expected: No, Got: Yes" with red highlight on the mismatch. And timing is shown as a subtle badge (e.g., "12ms").

**AC3:** Given the user selects a passed test case, when the SentenceView renders with a result, then it shows: "Can `user:alice` `view` `document:roadmap`? → Yes ✓" in green. And timing is shown.

**AC4:** Given the tree panel has groups with run results, when a group header is rendered (collapsed or expanded), then it shows a pass/fail ratio badge (e.g., "5/5" green or "3/5" red) when results are available. Badge updates reactively as polling delivers new results.

**AC5:** Given a user clicks the run icon (▶) on a test case row in the tree, when the run completes, then only that single test case is executed and the result updates the tree icon for that row.

**AC6:** Given suites exist with previous run results, when the user views the Suite List, then each SuiteCard shows the last run result as an inline badge: green "N/N passed", red "M/N passed", or gray "Never run". Cards with failures show a subtle red border accent.

**AC7:** Given the suite list API is called, when GET `/api/suites` returns data, then each suite object includes `lastRun: { status, summary } | null` so the frontend renders badges without extra calls.

## Tasks / Subtasks

- [x] Task 1: Backend — add `lastRun` to GET `/api/suites`
  - [x] 1.1 Modify `findAll()` in `backend/src/test-suites/repositories/suite-repository.ts` to LEFT JOIN LATERAL with `runs` and return the most recent run's `status` and `summary`
  - [x] 1.2 Update `mapRowToSuiteListItem` to include `lastRun: { status, summary } | null`
  - [x] 1.3 Add `lastRun` field to the `SuiteListItem` type in `backend/src/test-suites/types/suite.ts`
  - [x] 1.4 Update `suite-repository.test.ts` to cover the `lastRun` field (mock run row present + absent)

- [x] Task 2: Backend — single test case run filter
  - [x] 2.1 Update `POST /api/suites/:suiteId/run` body schema to accept optional `testCaseId?: string`
  - [x] 2.2 Pass `testCaseId` from route → `triggerRun()` → `executeRun()`
  - [x] 2.3 In `execution-engine.ts`, if `testCaseId` provided, filter `definition.groups` to only the matching test case before executing checks
  - [x] 2.4 Update `run-service.test.ts` / `execution-engine.test.ts` to cover the single-test-case filter path

- [x] Task 3: Frontend types — update `SuiteListItem`
  - [x] 3.1 Import `RunSummary` from `@/stores/runs` in `frontend/src/stores/suites.ts`
  - [x] 3.2 Add `lastRun: { status: string; summary: RunSummary | null } | null` field to `SuiteListItem` interface

- [x] Task 4: `SuiteCard.vue` — last run badge + failure accent
  - [x] 4.1 Replace the hardcoded "Never run" placeholder in the footer with a computed display driven by `suite.lastRun`
  - [x] 4.2 Show "N/N passed" (green) or "M/N passed" (red) when summary is present; "Failed" (red) when status=failed with no summary; "Never run" (gray) when `lastRun` is null
  - [x] 4.3 Add `border-error/40 bg-error/5` when `lastRun?.summary?.failed > 0`; use `data-testid="suite-card-last-run-badge"` on the badge element

- [x] Task 5: `SuiteTreePanel.vue` — pass/fail icons and group ratio badges
  - [x] 5.1 Add `results: RunResult[]` prop (import `RunResult` from `@/stores/runs`; default empty array)
  - [x] 5.2 Computed `resultByKey`: `Map<string, RunResult>` keyed by `"${user}:${relation}:${object}:${expected}"` for O(1) lookup
  - [x] 5.3 On each test case row: show `CheckCircle2` (success) or `XCircle` (error) icon from `lucide-vue-next` if a result exists, replacing the existing dot indicator; use `data-testid="tc-result-pass"` / `data-testid="tc-result-fail"`
  - [x] 5.4 Sort test cases within expanded groups: failed results first, passed last, unresolved last (stable sort — do not mutate the store)
  - [x] 5.5 On each group header row: show a `"X/Y"` ratio badge next to the test count when `results.length > 0`; green if all pass, red if any fail; use `data-testid="group-result-badge-{groupId}"`
  - [x] 5.6 Add ▶ (Play) icon button per test case row: `emit('run-test-case', groupId, testCaseId)`; use `data-testid="run-tc-button"` and `aria-label="Run test case"`

- [x] Task 6: `SentenceView.vue` — result variant
  - [x] 6.1 Add optional props: `result?: { passed: boolean; actual: boolean | null; durationMs?: number | null } | null`
  - [x] 6.2 When `result` is provided and `passed === true`: replace the "Allowed/Denied" span with "→ Yes ✓" or "→ No ✓" in `text-success`
  - [x] 6.3 When `result` is provided and `passed === false`: show "→ Expected: {{expected ? 'Yes' : 'No'}}, Got: {{actual ? 'Yes' : 'No'}}" with the "Got" value in `text-error`; add `bg-error/5 border-error/30` to the container
  - [x] 6.4 When `result.durationMs` is provided: show `"{{durationMs}}ms"` as a subtle `text-xs text-text-secondary/60` badge after the outcome

- [x] Task 7: Wire results into `SuiteEditor.vue` and `SuiteTreePanel` + tests
  - [x] 7.1 In `SuiteEditor.vue`: pass `:results="runsStore.currentRun?.results ?? []"` to `SuiteTreePanel`
  - [x] 7.2 In `SuiteEditor.vue`: handle `@run-test-case="onRunTestCase"` — add `async function onRunTestCase(groupId: string, testCaseId: string)` that calls `runsStore.triggerRun(props.suite.id, testCaseId)` (update `triggerRun` signature to accept optional `testCaseId`)
  - [x] 7.3 Update `useRunStore.triggerRun(suiteId, testCaseId?)` to include `testCaseId` in the POST body when provided
  - [x] 7.4 Read `TestCaseForm.vue` first; add optional `result` prop to `TestCaseForm` and pass it through to `SentenceView`; in `SuiteEditor.vue`, compute `selectedTestCaseResult` from `runsStore.currentRun?.results` matched by `(user, relation, object, expected)` tuple
  - [x] 7.5 Write `SuiteCard.test.ts` — lastRun null badge, lastRun completed all-pass badge, lastRun failed badge, red border accent
  - [x] 7.6 Write `SuiteTreePanel.test.ts` additions — results prop shows pass/fail icons, failed tests sort first, group ratio badge, run-test-case event emitted
  - [x] 7.7 Write `SentenceView.test.ts` — null result (current behavior unchanged), pass result variant, fail result variant, duration badge
  - [x] 7.8 Update `SuiteEditor.test.ts` — results passed to tree, onRunTestCase calls triggerRun with testCaseId

## Dev Notes

### Backend: `findAll()` LEFT JOIN Query

```sql
SELECT
  s.id, s.name, s.description, s.tags, s.created_at, s.updated_at,
  lr.status AS last_run_status,
  lr.summary AS last_run_summary
FROM suites s
LEFT JOIN LATERAL (
  SELECT status, summary
  FROM runs
  WHERE suite_id = s.id
  ORDER BY created_at DESC
  LIMIT 1
) lr ON true
ORDER BY s.updated_at DESC
```

Update `mapRowToSuiteListItem`:
```typescript
function mapRowToSuiteListItem(row: Record<string, unknown>): SuiteListItem {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    lastRun: row.last_run_status
      ? { status: row.last_run_status as string, summary: (row.last_run_summary as RunSummary | null) ?? null }
      : null,
  }
}
```

The backend `SuiteListItem` type is in `backend/src/test-suites/types/suite.ts`. Add `lastRun` there.

### Backend: Execution Engine Single Test Filter

In `execution-engine.ts`, the `executeRun` function needs to accept an optional `testCaseId`:

```typescript
export async function executeRun(runId: string, suite: Suite, testCaseId?: string): Promise<void>
```

Filter the groups before executing:
```typescript
let groups = suite.definition.groups
if (testCaseId) {
  groups = groups.map(g => ({
    ...g,
    testCases: g.testCases.filter(tc => tc.id === testCaseId)
  })).filter(g => g.testCases.length > 0)
}
// Proceed with filtered groups for tuple loading and check execution
```

**Important**: The fixture (model + tuples) is still loaded in full even for single-test runs. Only the check phase is filtered.

In `run-service.ts`, pass `testCaseId` through: `triggerRun(suiteId, testCaseId?: string)` → `void executeRun(run.id, suite, testCaseId)`.

Route body:
```typescript
const { testCaseId } = z.object({ testCaseId: z.string().uuid().optional() }).parse(req.body)
```

### Frontend: `SuiteListItem` type update

In `frontend/src/stores/suites.ts`, import `RunSummary` from `'@/stores/runs'` and add:
```typescript
import type { RunSummary } from '@/stores/runs'

export interface SuiteListItem {
  // ... existing fields ...
  lastRun: { status: string; summary: RunSummary | null } | null
}
```

### Frontend: `SuiteCard.vue` — badge and accent

```vue
<!-- Replace the hardcoded footer badge -->
<span
  v-if="!suite.lastRun"
  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary"
  data-testid="suite-card-last-run-badge"
>
  Never run
</span>
<span
  v-else-if="suite.lastRun.summary"
  :class="[
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
    suite.lastRun.summary.failed > 0
      ? 'bg-error/10 text-error'
      : 'bg-success/10 text-success',
  ]"
  data-testid="suite-card-last-run-badge"
>
  {{ suite.lastRun.summary.passed }}/{{ suite.lastRun.summary.total }} passed
</span>
<span
  v-else
  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/10 text-error text-xs"
  data-testid="suite-card-last-run-badge"
>
  Failed
</span>
```

For the red border accent, add dynamic `:class` to the card root `<div>`:
```vue
:class="[
  'group relative w-full bg-surface-card border rounded-lg p-4 hover:border-info/50 transition-colors cursor-pointer',
  suite.lastRun?.summary?.failed ? 'border-error/40 bg-error/5' : 'border-surface-border',
]"
```

### Frontend: `SuiteTreePanel.vue` — result matching

Match results by a composite key to avoid ID dependency (run results don't carry test case IDs):

```typescript
import type { RunResult } from '@/stores/runs'

const props = defineProps<{
  // ... existing ...
  results: RunResult[]
}>()

function resultKey(user: string, relation: string, object: string, expected: boolean): string {
  return `${user}:${relation}:${object}:${expected}`
}

const resultByKey = computed(() => {
  const map = new Map<string, RunResult>()
  for (const r of props.results) {
    map.set(resultKey(r.testCase.user, r.testCase.relation, r.testCase.object, r.testCase.expected), r)
  }
  return map
})

function getResult(tc: TestCase): RunResult | undefined {
  return resultByKey.value.get(resultKey(tc.user, tc.relation, tc.object, tc.expected))
}
```

For sorting (do NOT mutate the store — create a computed display copy):
```typescript
function sortedTestCases(group: TestGroup): TestCase[] {
  if (props.results.length === 0) return group.testCases
  return [...group.testCases].sort((a, b) => {
    const ra = getResult(a)
    const rb = getResult(b)
    // failed first, then no-result, then passed
    const score = (r?: RunResult) => (!r ? 1 : r.passed ? 2 : 0)
    return score(ra) - score(rb)
  })
}
```

For the group ratio badge:
```typescript
function groupRatio(group: TestGroup): { passed: number; total: number } | null {
  if (props.results.length === 0) return null
  const relevant = group.testCases.filter((tc) => getResult(tc) !== undefined)
  if (relevant.length === 0) return null
  return {
    passed: relevant.filter((tc) => getResult(tc)?.passed).length,
    total: relevant.length,
  }
}
```

### Frontend: `SentenceView.vue` — result variant

Add optional prop and update template:

```typescript
const props = defineProps<{
  user: string
  relation: string
  object: string
  expected: boolean
  result?: { passed: boolean; actual: boolean | null; durationMs?: number | null } | null
}>()
```

```vue
<!-- Replace the outcome span with: -->
<template v-if="result">
  <span class="mx-1">→</span>
  <template v-if="result.passed">
    <span class="font-medium text-success">
      {{ expected ? 'Yes' : 'No' }} ✓
    </span>
  </template>
  <template v-else>
    <span class="font-medium text-text-secondary">
      Expected: {{ expected ? 'Yes' : 'No' }}, Got:
    </span>
    <span class="font-medium text-error">{{ result.actual ? 'Yes' : 'No' }}</span>
  </template>
  <span v-if="result.durationMs != null" class="text-xs text-text-secondary/60 ml-1">
    {{ result.durationMs }}ms
  </span>
</template>
<template v-else>
  <span class="mx-1">→</span>
  <span :class="['font-medium', expected ? 'text-success' : 'text-error']">
    {{ expected ? 'Allowed' : 'Denied' }}
  </span>
</template>
```

Root `<div>` gets conditional class: add `bg-error/5 border-error/30` when `result && !result.passed`.

### Frontend: `TestCaseForm.vue` — read before modifying

Read `TestCaseForm.vue` fully before making changes. Add optional `result` prop and pass it down to `SentenceView`. Do not break existing test update behavior.

### Frontend: `useRunStore.triggerRun` signature update

```typescript
async function triggerRun(suiteId: string, testCaseId?: string): Promise<string> {
  currentRun.value = null
  loading.value = true
  error.value = null
  try {
    const body = testCaseId ? { testCaseId } : {}
    const { runId } = await api.post<{ runId: string }>(`suites/${suiteId}/run`, body)
    startPolling(runId)
    return runId
  } catch (err) {
    error.value = (err as Error).message
    throw err
  } finally {
    loading.value = false
  }
}
```

### Test Pattern: SuiteCard

```typescript
vi.mock('@/stores/suites', ...) // not needed — SuiteCard receives props directly

describe('SuiteCard', () => {
  it('shows "Never run" when lastRun is null', ...)
  it('shows green badge "3/3 passed" when all pass', ...)
  it('shows red badge "1/3 passed" when failures exist', ...)
  it('shows "Failed" badge when lastRun.status=failed with no summary', ...)
  it('applies red border when failures exist', ...)
  it('does not apply red border when all pass', ...)
})
```

### Test Pattern: SuiteTreePanel (additive tests — do NOT break existing tests)

```typescript
// Add to existing SuiteTreePanel.test.ts:
describe('with run results', () => {
  it('shows pass icon for passed test case', ...)
  it('shows fail icon for failed test case', ...)
  it('failed test cases sort before passed', ...)
  it('group header shows ratio badge when results present', ...)
  it('ratio badge is green when all pass', ...)
  it('ratio badge is red when any fail', ...)
  it('emits run-test-case on ▶ click', ...)
})
```

### Test Pattern: SentenceView

```typescript
describe('SentenceView', () => {
  it('shows Allowed/Denied without result prop (existing behavior)', ...)
  it('shows "Yes ✓" in success color for passed result', ...)
  it('shows "Expected: Yes, Got: No" for failed result', ...)
  it('shows duration badge when durationMs provided', ...)
  it('applies error background class for failed result', ...)
})
```

### Key File Locations

| File | Action |
|------|--------|
| `backend/src/test-suites/repositories/suite-repository.ts` | Modify `findAll()` + `mapRowToSuiteListItem` |
| `backend/src/test-suites/types/suite.ts` | Add `lastRun` to `SuiteListItem` |
| `backend/src/test-suites/services/execution-engine.ts` | Add `testCaseId?` filter param |
| `backend/src/test-suites/services/run-service.ts` | Pass `testCaseId?` through |
| `backend/src/test-suites/routes/runs.ts` | Parse `testCaseId` from body |
| `frontend/src/stores/suites.ts` | Add `lastRun` to `SuiteListItem` interface |
| `frontend/src/stores/runs.ts` | Update `triggerRun(suiteId, testCaseId?)` |
| `frontend/src/components/test-suites/SuiteCard.vue` | Dynamic badge + red border |
| `frontend/src/components/test-suites/SuiteTreePanel.vue` | `results` prop, icons, sort, ratio badge, run-tc button |
| `frontend/src/components/test-suites/SentenceView.vue` | `result` prop, outcome variants |
| `frontend/src/components/test-suites/TestCaseForm.vue` | `result` prop → pass to SentenceView |
| `frontend/src/views/SuiteEditor.vue` | Wire results to tree, handle run-test-case |

### Existing Test Files to Update (do NOT break existing tests)

- `frontend/src/components/test-suites/SuiteCard.test.ts` — exists, add lastRun tests
- `frontend/src/components/test-suites/SuiteTreePanel.test.ts` — exists, add results tests
- `frontend/src/views/SuiteEditor.test.ts` — exists, add results wiring + run-test-case

### CLAUDE.md Patterns Apply

- No `@pinia/testing`; use `vi.mock` pattern throughout
- `reactive()` wrap for mock stores in watch tests
- `vi.stubGlobal('fetch', fetchMock)` for store unit tests
- SuiteTreePanel and SentenceView receive data via props — no store mocking needed for those component tests

## Review Findings

- [x] [Review][Patch] testCaseId not validated before creating run — run-service.ts does not check that `testCaseId` exists in the suite definition. If the ID is unknown/stale, `executeRun` filters to zero test cases, the run completes with `summary.total=0, status=completed`, and the UI shows a misleading green "0/0 passed" badge. Fix: add validation in `triggerRun` after `getSuite()` — if `testCaseId` is provided, confirm it exists in `suite.definition.groups`; throw 404 otherwise. [`backend/src/test-suites/services/run-service.ts`]
- [x] [Review][Patch] `fetchSuite` always re-assigns IDs — `frontend/src/stores/suites.ts` unconditionally calls `crypto.randomUUID()` for every group and test case on each `fetchSuite` call. Since these IDs are saved to the DB via `saveDefinition`, subsequent fetches generate different IDs, breaking any `testCaseId` reference held before the re-fetch. Fix: preserve existing IDs — change to `id: g.id || crypto.randomUUID()` and `id: t.id || crypto.randomUUID()`. [`frontend/src/stores/suites.ts:108-115`]
- [x] [Review][Patch] Red border too narrow — only applies when `summary.failed > 0`, but misses: (a) `lastRun.status='failed'` with `summary=null` (provisioning error), and (b) `summary.errored > 0` with `summary.failed === 0` (all failures were errors). Both are failure states per the backend (`hasFailures = summary.failed > 0 || summary.errored > 0`). Fix: red border when `lastRun?.status === 'failed'`. [`frontend/src/components/test-suites/SuiteCard.vue:43`]
- [x] [Review][Patch] SuiteCard shows "Failed" badge for in-flight runs — LEFT JOIN LATERAL returns the most recent run regardless of status. A run with `status='running'` and `summary=null` falls into the `v-else` branch showing a red "Failed" badge. Fix: add a branch for `['pending','provisioning','running'].includes(lastRun.status)` before the `v-else`. [`frontend/src/components/test-suites/SuiteCard.vue:103-120`]
- [x] [Review][Patch] SentenceView renders "Got: No" when `result.actual=null` — when a test errors, `actual` is `null` but `passed=false`. `{{ result.actual ? 'Yes' : 'No' }}` evaluates to `'No'` — factually wrong (the check threw, it didn't return No). The error string is available in `RunResult.error` but not shown. Fix: check `result.actual !== null`; if null, show "Error" (and optionally the error message). [`frontend/src/components/test-suites/SentenceView.vue:54`]
- [x] [Review][Patch] AC2: "Expected:" label not highlighted — only the "Got:" value span has `text-error`; the "Expected: Yes, Got:" prefix uses `text-text-secondary`. The spec says "red highlight on the mismatch". Fix: apply `text-error` to the full fail-variant block or at minimum to the `Expected:` span. [`frontend/src/components/test-suites/SentenceView.vue:51-53`]
- [x] [Review][Defer] `fetchSuite` last-write-wins race on suite change — no cancellation of in-flight API calls; if suite A resolves after suite B, A's data overwrites B's. Pre-existing pattern across all stores. [`frontend/src/views/SuiteEditor.vue:80-84`] — deferred, pre-existing
- [x] [Review][Defer] Polling leaks on permanent network loss — since `onUnmounted` no longer calls `stopPolling` (AC4 fix), an interval stuck on a broken network will fire indefinitely until the tab closes. Trade-off from the AC4 decision. — deferred, accepted trade-off
- [x] [Review][Defer] `groupRatio()` called 3× per group per render — plain function called in 3 template expressions per group; not cached. Benign for typical suite sizes. — deferred, minor perf
- [x] [Review][Defer] `created_at` cast to `Date` without guard — `(row.created_at as Date).toISOString()` assumes pg driver parses timestamps; pre-existing across all repositories. — deferred, pre-existing
- [x] [Review][Defer] `SuiteLastRun.status` untyped string — should be a union type for exhaustiveness checking. — deferred, nice-to-have
- [x] [Review][Defer] `data-testid` on pass/fail icons not unique per test case — both share `"tc-result-pass"` / `"tc-result-fail"`. — deferred, cosmetic
- [x] [Review][Defer] Map key collision risk in SuiteTreePanel — `${user}:${relation}:${object}:${expected}` separator collides if field values contain `:`. Extremely low probability with valid OpenFGA data. — deferred, theoretical
