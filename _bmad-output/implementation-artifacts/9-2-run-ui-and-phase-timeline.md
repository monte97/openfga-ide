# Story 9.2: Run UI & Phase Timeline

## Status: done

## Story

As a developer,
I want to trigger suite execution from the editor and watch the execution progress via a live phase timeline,
So that I get immediate feedback on test results without leaving the editor.

## Acceptance Criteria

**AC1:** Given a suite is open in the editor with a valid fixture, when the user clicks "Run Suite" (primary button, top-right of editor header) or presses Ctrl+Enter, then a run is triggered via POST `/api/suites/:suiteId/run`, the Pinia runs store starts polling GET `/api/runs/:runId` every 2 seconds, and polling stops when status reaches `completed` or `failed` or on component unmount

**AC2:** Given a run is in progress, when the RunPhaseTimeline component renders, then it shows a vertical 4-phase timeline: Provisioning, Loading fixtures, Running checks, Cleanup; each phase shows: status icon (gray dash = pending, amber spinner = running, green check = completed, red cross = failed), label, and elapsed timer; the Running checks phase shows a progress counter "N/M" updating as results arrive; each phase has `aria-label` with status description

**AC3:** Given a run is in progress, when the RunSummaryBadge component renders in the editor header, then it shows amber state with spinner during execution; on completion it shows "N/N passed" (green if all pass, red if any fail); the badge is always visible in the editor header regardless of tree panel state; `aria-label` reads "N of M tests passed"

**AC4:** Given a run is in progress, when the user navigates away from the Editor tab, then the run continues in the background (polling continues in Pinia store), and returning to the Editor shows updated status and results

**AC5:** Given a suite has no fixture defined, when the user views the Run Suite button, then the button is disabled with a tooltip "No fixture — add one to run tests" and the run is not triggered

**AC6:** Given a run completes with all tests passing, then a success toast auto-dismisses: "Suite '[name]' passed (N/N)"; when failures exist, an error toast persists until dismissed: "Suite '[name]': M failures"

## Tasks / Subtasks

- [x] Task 1: Create `frontend/src/stores/runs.ts`
  - [x] 1.1 `RunStatus`, `RunSummary`, `RunResult`, `Run` TypeScript interfaces
  - [x] 1.2 `useRunStore` with setup syntax: `currentRun`, `loading`, `error`, `pollInterval` refs
  - [x] 1.3 `triggerRun(suiteId)` — POST, set currentRun to null, start polling
  - [x] 1.4 `fetchRun(runId)` — GET, update currentRun, stop polling on terminal status
  - [x] 1.5 `startPolling(runId)` — setInterval every 2s, immediate first fetch, clears existing interval first
  - [x] 1.6 `stopPolling()` — clearInterval + null out ref
  - [x] 1.7 `clearRun()` — reset currentRun and error

- [x] Task 2: Create `frontend/src/components/test-suites/RunPhaseTimeline.vue`
  - [x] 2.1 Props: `run: Run | null`, `totalTestCases: number`
  - [x] 2.2 Computed phase statuses from `run.status` (see phase mapping in Dev Notes)
  - [x] 2.3 Elapsed timer per phase using `Date.now()` ticked by interval while phase is running
  - [x] 2.4 Status icons: gray dash (pending), amber spinner (running), green check (completed), red cross (failed)
  - [x] 2.5 Running checks phase: progress counter showing `run.results.length / totalTestCases`
  - [x] 2.6 `aria-label` on each phase item: `"${phase}: ${status}, ${elapsed}"`

- [x] Task 3: Create `frontend/src/components/test-suites/RunSummaryBadge.vue`
  - [x] 3.1 Props: `run: Run | null`
  - [x] 3.2 Variant logic: null/no run = gray "Never run"; pending/provisioning/running = amber + spinner; completed = green "N/N passed"; failed = red "M/N passed"
  - [x] 3.3 `aria-label` reads "N of M tests passed" or "Running" or "Never run"

- [x] Task 4: Modify `frontend/src/views/SuiteEditor.vue`
  - [x] 4.1 Import and use `useRunStore`
  - [x] 4.2 Add `hasFixture` computed from `activeSuite.definition.fixture`
  - [x] 4.3 Add `totalTestCases` computed from `activeSuite.definition.groups`
  - [x] 4.4 Add `runSuite()` async function: calls `runsStore.triggerRun(suite.id)`, guarded by `hasFixture`
  - [x] 4.5 Add Ctrl+Enter keyboard handler: `window.addEventListener('keydown', onKeydown)` in `onMounted`, removed in `onUnmounted`
  - [x] 4.6 Add `onUnmounted(runsStore.stopPolling)` cleanup
  - [x] 4.7 Watch `runsStore.currentRun` status for terminal state → show toast
  - [x] 4.8 Add editor header bar (above tabs): "Run Suite" AppButton + RunSummaryBadge (right-aligned)
  - [x] 4.9 Show RunPhaseTimeline in content area when run is in progress (pending/provisioning/running)
  - [x] 4.10 Clear run on suite change (`watch(() => props.suite.id, () => runsStore.clearRun())`)

- [x] Task 5: Write tests
  - [x] 5.1 `stores/runs.test.ts` — triggerRun calls POST, startPolling interval behavior, stopPolling clears interval, terminal status stops polling, clearRun resets state
  - [x] 5.2 `components/test-suites/RunPhaseTimeline.test.ts` — renders correct phase statuses for each run status value, shows progress counter, aria-labels
  - [x] 5.3 `components/test-suites/RunSummaryBadge.test.ts` — all badge variants, aria-label content
  - [x] 5.4 `views/SuiteEditor.test.ts` — Run Suite button visibility, disabled when no fixture, Ctrl+Enter triggers run, onUnmounted stops polling, watch triggers toast on completion/failure

## Dev Notes

### useApi URL Convention

`useApi()` prepends `/api/` automatically. Use paths WITHOUT the `/api/` prefix:
```typescript
const api = useApi()
await api.post<{ runId: string }>(`suites/${suiteId}/run`, {})
await api.get<Run>(`runs/${runId}`)
```

### Runs Store Pattern

Follow existing stores exactly (setup syntax, `useApi`, `useToast`):

```typescript
// frontend/src/stores/runs.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'

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

export const useRunStore = defineStore('runs', () => {
  const api = useApi()
  const currentRun = ref<Run | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)

  async function triggerRun(suiteId: string): Promise<string> {
    loading.value = true
    error.value = null
    try {
      currentRun.value = null
      const data = await api.post<{ runId: string }>(`suites/${suiteId}/run`, {})
      startPolling(data.runId)
      return data.runId
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchRun(runId: string): Promise<void> {
    try {
      const run = await api.get<Run>(`runs/${runId}`)
      currentRun.value = run
      if (run.status === 'completed' || run.status === 'failed') {
        stopPolling()
      }
    } catch (err) {
      error.value = (err as Error).message
    }
  }

  function startPolling(runId: string): void {
    stopPolling()
    void fetchRun(runId)  // immediate first fetch
    pollInterval.value = setInterval(() => {
      void fetchRun(runId)
    }, 2000)
  }

  function stopPolling(): void {
    if (pollInterval.value !== null) {
      clearInterval(pollInterval.value)
      pollInterval.value = null
    }
  }

  function clearRun(): void {
    currentRun.value = null
    error.value = null
    stopPolling()
  }

  return { currentRun, loading, error, pollInterval, triggerRun, fetchRun, startPolling, stopPolling, clearRun }
})
```

### Phase Status Mapping

Backend statuses map to 4 UI phases (Provisioning, Loading Fixtures, Running Checks, Cleanup):

```typescript
type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed'

function computePhaseStatuses(run: Run | null): [PhaseStatus, PhaseStatus, PhaseStatus, PhaseStatus] {
  if (!run || run.status === 'pending') {
    return ['pending', 'pending', 'pending', 'pending']
  }
  if (run.status === 'provisioning') {
    return ['running', 'pending', 'pending', 'pending']
  }
  if (run.status === 'running') {
    return ['completed', 'completed', 'running', 'pending']
  }
  if (run.status === 'completed') {
    return ['completed', 'completed', 'completed', 'completed']
  }
  // failed — infer from results
  if (run.results.length > 0) {
    // Checks ran to completion, failures are assertion/check errors
    return ['completed', 'completed', 'failed', 'completed']
  }
  // Failed during provisioning or fixture loading
  return ['failed', 'pending', 'pending', 'pending']
}
```

This function is a `computed` inside `RunPhaseTimeline.vue` based on the `run` prop.

### RunPhaseTimeline Component

```vue
<!-- frontend/src/components/test-suites/RunPhaseTimeline.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Run } from '@/stores/runs'

const props = defineProps<{
  run: Run | null
  totalTestCases: number
}>()

const PHASE_LABELS = ['Provisioning', 'Loading fixtures', 'Running checks', 'Cleanup']

const phaseStatuses = computed((): Array<'pending' | 'running' | 'completed' | 'failed'> => {
  // ... computePhaseStatuses(props.run) as above
})

const progressCounter = computed(() =>
  props.run ? `${props.run.results.length}/${props.totalTestCases}` : `0/${props.totalTestCases}`
)
</script>
```

For elapsed timers: use a `ref<number>(Date.now())` updated via `setInterval` every 100ms while any phase is `running`. Compute elapsed per phase using `run.startedAt` (provisioning start) and `Date.now()`. Clean up timer in `onUnmounted`.

For the status icon, use text/Unicode: `–` (pending), amber spinner class (running), `✓` (completed), `✗` (failed). Or use SVG icons following existing patterns in the project.

### RunSummaryBadge Component

```vue
<script setup lang="ts">
import type { Run } from '@/stores/runs'

const props = defineProps<{ run: Run | null }>()

const variant = computed(() => {
  if (!props.run) return 'gray'
  if (['pending', 'provisioning', 'running'].includes(props.run.status)) return 'amber'
  if (props.run.status === 'completed') return 'green'
  return 'red' // failed
})

const label = computed(() => {
  if (!props.run) return 'Never run'
  if (['pending', 'provisioning', 'running'].includes(props.run.status)) return 'Running…'
  const s = props.run.summary
  if (!s) return 'Failed'
  return `${s.passed}/${s.total} passed`
})

const ariaLabel = computed(() => {
  if (!props.run) return 'Never run'
  if (['pending', 'provisioning', 'running'].includes(props.run.status)) return 'Run in progress'
  const s = props.run.summary
  if (!s) return 'Run failed'
  return `${s.passed} of ${s.total} tests passed`
})
</script>
```

### SuiteEditor.vue Modifications

Add to script setup (PRESERVE all existing imports/logic):
```typescript
import { useRunStore } from '@/stores/runs'
import RunPhaseTimeline from '@/components/test-suites/RunPhaseTimeline.vue'
import RunSummaryBadge from '@/components/test-suites/RunSummaryBadge.vue'

const runsStore = useRunStore()

const hasFixture = computed(() => !!suiteStore.activeSuite?.definition?.fixture)

const totalTestCases = computed(() =>
  suiteStore.activeSuite?.definition.groups.reduce((sum, g) => sum + g.testCases.length, 0) ?? 0
)

const isRunning = computed(() =>
  ['pending', 'provisioning', 'running'].includes(runsStore.currentRun?.status ?? '')
)

async function runSuite(): Promise<void> {
  if (!hasFixture.value || isRunning.value) return
  try {
    await runsStore.triggerRun(props.suite.id)
  } catch {
    // error already shown via useApi toast
  }
}

function onKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    void runSuite()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  runsStore.stopPolling()
})

// Toast on run completion
watch(
  () => runsStore.currentRun?.status,
  (status, prevStatus) => {
    if (!status || !prevStatus) return
    if (['completed', 'failed'].includes(prevStatus)) return  // already terminal, ignore
    if (status === 'completed') {
      const s = runsStore.currentRun?.summary
      toast.show({ type: 'success', message: `Suite '${props.suite.name}' passed (${s?.passed}/${s?.total})` })
    } else if (status === 'failed') {
      const s = runsStore.currentRun?.summary
      const failCount = s ? s.failed + s.errored : 1
      toast.show({ type: 'error', message: `Suite '${props.suite.name}': ${failCount} failures` })
    }
  },
)

// Clear run when switching suites
watch(
  () => props.suite.id,
  () => {
    runsStore.clearRun()
    editorStore.selectTestCase(null)
  },
)
```

**Template changes — editor header (add ABOVE the tab row `div.flex.border-b`):**
```html
<!-- Editor header: suite actions -->
<div class="flex items-center justify-end gap-2 px-3 py-2 border-b border-surface-border shrink-0">
  <RunSummaryBadge :run="runsStore.currentRun" />
  <button
    :disabled="!hasFixture || isRunning"
    :title="!hasFixture ? 'No fixture — add one to run tests' : undefined"
    class="..."
    @click="runSuite"
  >
    Run Suite
  </button>
</div>
```

**Template changes — RunPhaseTimeline (add ABOVE tab panels, inside the `v-else` dual-mode editor div):**
```html
<div v-if="runsStore.currentRun && isRunning" class="border-b border-surface-border shrink-0">
  <RunPhaseTimeline :run="runsStore.currentRun" :total-test-cases="totalTestCases" />
</div>
```

Use `AppButton` (existing component) for the Run Suite button, with `variant="primary"`, `:loading="isRunning"` prop.

### Test Patterns

**`stores/runs.test.ts` — mock useApi, mock setInterval:**

```typescript
vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(),
}))

import { useApi } from '@/composables/useApi'
import { useRunStore } from '@/stores/runs'
import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

const mockPost = vi.fn()
const mockGet = vi.fn()
vi.mocked(useApi).mockReturnValue({ post: mockPost, get: mockGet, put: vi.fn(), del: vi.fn() })
```

Key tests:
- `triggerRun` calls `api.post('suites/suite-1/run', {})` and calls `startPolling`
- `startPolling` calls `fetchRun` immediately and sets interval
- `fetchRun` updates `currentRun` and calls `stopPolling` when status is terminal
- `stopPolling` clears interval and sets `pollInterval` to null
- Advancing timers by 2000ms calls `fetchRun` again

**`views/SuiteEditor.test.ts` — watch and event tests:**

Add to existing SuiteEditor tests (do NOT replace existing tests):

```typescript
// Mock runs store
vi.mock('@/stores/runs', () => ({
  useRunStore: vi.fn(),
}))

import { useRunStore } from '@/stores/runs'

// Per test:
vi.mocked(useRunStore).mockReturnValue(
  reactive({
    currentRun: null,
    loading: false,
    error: null,
    triggerRun: vi.fn(),
    stopPolling: vi.fn(),
    clearRun: vi.fn(),
  }) as unknown as ReturnType<typeof useRunStore>
)
```

Required test cases for SuiteEditor:
- `Run Suite` button is visible in editor header
- Button is disabled when `activeSuite.definition.fixture` is undefined
- Button click calls `runsStore.triggerRun(suite.id)`
- Ctrl+Enter triggers `runSuite()` via keydown event
- `onUnmounted` calls `runsStore.stopPolling()`
- Watch: when `currentRun.status` changes to `completed` → success toast shown
- Watch: when `currentRun.status` changes to `failed` → error toast shown
- Suite id change → `runsStore.clearRun()` called
- `RunPhaseTimeline` is NOT visible when `currentRun` is null
- `RunPhaseTimeline` IS visible when `currentRun.status` is `running`

**`RunPhaseTimeline.test.ts` examples:**
```typescript
it('shows all phases as pending when run is null', () => {
  const wrapper = mount(RunPhaseTimeline, { props: { run: null, totalTestCases: 5 } })
  // all 4 phase items have aria-label containing "pending"
})

it('shows provisioning phase as running when run.status is provisioning', () => {
  const run = { status: 'provisioning', results: [], ... }
  const wrapper = mount(RunPhaseTimeline, { props: { run, totalTestCases: 5 } })
  // phase 1 (Provisioning) has running state
  // phase 2,3,4 have pending state
})
```

### CLAUDE.md Conventions (DO NOT BREAK)

- No `@pinia/testing` — use `vi.mock('@/stores/runs', () => ({ useRunStore: vi.fn() }))`
- Reactive mock for watch tests: wrap mock return value in `reactive({...})`
- `setActivePinia(createPinia())` in beforeEach for store unit tests
- Test checklist MUST enumerate: Ctrl+Enter handler, onUnmounted cleanup, watch callbacks (status → toast), watch (suite id → clearRun), isRunning/disabled button state
- Pinia Set mutation pattern: replace Set with new reference (expandedGroupIds already follows this)
- `v-show` + `nextTick` for CSS transitions (if any panel reveals use v-show, not v-if + class simultaneously)

### AppButton Component

The project has an existing `AppButton` component. Check its props before using — it likely supports `variant`, `loading`, `disabled`. If it doesn't exist with those props, use a plain `<button>` with Tailwind classes matching other primary buttons in the codebase.

### File List

- `frontend/src/stores/runs.ts` — new
- `frontend/src/stores/runs.test.ts` — new
- `frontend/src/components/test-suites/RunPhaseTimeline.vue` — new
- `frontend/src/components/test-suites/RunPhaseTimeline.test.ts` — new
- `frontend/src/components/test-suites/RunSummaryBadge.vue` — new
- `frontend/src/components/test-suites/RunSummaryBadge.test.ts` — new
- `frontend/src/views/SuiteEditor.vue` — modified (run header, timeline, keyboard handler, watch)

## Review Findings

- [x] [Review][Decision] AC1 vs AC4 conflict — stopPolling on unmount — Resolved: Option A — removed `runsStore.stopPolling()` from `onUnmounted`; polling survives tab navigation per AC4. `clearRun()` on suite change still stops polling.
- [x] [Review][Patch] Race condition — interval leaks if run completes before setInterval assigned [`frontend/src/stores/runs.ts`] — Fixed: setInterval now assigned before `void fetchRun(runId)` in `startPolling`.
- [x] [Review][Patch] Toast storm on polling errors [`frontend/src/stores/runs.ts`] — Fixed: `fetchRun` now uses raw `fetch` directly, silently swallowing errors instead of routing through `useApi` (which toasts on every failure).
- [x] [Review][Patch] Cleanup phase incorrectly `completed` on checks failure [`frontend/src/components/test-suites/RunPhaseTimeline.vue`] — Fixed: returns `['completed', 'completed', 'failed', 'pending']` for checks-failure case.
- [x] [Review][Patch] 100ms ticker runs indefinitely after terminal state [`frontend/src/components/test-suites/RunPhaseTimeline.vue`] — Fixed: `watch` on `props.run.status` calls `stopTicker()` when status reaches `completed` or `failed`.
- [x] [Review][Defer] "Loading fixtures" failure unreachable [`frontend/src/components/test-suites/RunPhaseTimeline.vue`] — deferred, pre-existing: the backend emits `failed` status without granular phase info; `results.length > 0` heuristic cannot distinguish provisioning failure from fixture-loading failure. Phase 2 failure is visually unreachable. Resolving requires a backend data-model change.
- [x] [Review][Defer] `pollInterval` exposed in public store API [`frontend/src/stores/runs.ts:181`] — deferred, pre-existing: pollInterval is an internal detail included in the store return object per Dev Notes. No functional impact; clean up in a future refactor.

## Change Log

| Date | Change |
|------|--------|
| 2026-03-31 | Created Story 9.2 — Run UI & Phase Timeline |
| 2026-03-31 | Code review findings appended |
