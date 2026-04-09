# Code Quality Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three code quality issues: deduplicate the `applyDagreLayout` function into a shared utility, surface real group/test counts in SuiteCard, and add `.trim()` to Zod string validators to reject whitespace-only input.

**Architecture:** Each task is independent with no cross-dependencies. Task 1 is a pure refactor (no behavior change). Task 2 adds computed columns to the SQL query and threads them through backend types → frontend types → component. Task 3 is a mechanical search-and-replace across backend schema files with new tests to verify the behavior.

**Tech Stack:** TypeScript, Vue 3, Pinia, Vitest, Zod, dagre, @vue-flow/core, PostgreSQL JSONB

---

## File Map

**Task 1 — Extract `applyDagreLayout`:**
- Create: `frontend/src/utils/graphLayout.ts`
- Create: `frontend/src/utils/__tests__/graphLayout.spec.ts`
- Modify: `frontend/src/composables/useModelGraph.ts` — remove local function, call shared utility
- Modify: `frontend/src/composables/useRelationshipGraph.ts` — remove local function, call shared utility

**Task 2 — SuiteCard real counts:**
- Modify: `backend/src/test-suites/types/suite.ts:45-53` — add `groupCount`/`testCount` to `SuiteListItem`
- Modify: `backend/src/test-suites/repositories/suite-repository.ts:5-44` — extend SQL, update mapper
- Modify: `backend/src/test-suites/repositories/suite-repository.test.ts` — update `findAll` test fixture and assertions
- Modify: `frontend/src/stores/suites.ts:8-16` — add `groupCount`/`testCount` to `SuiteListItem`
- Modify: `frontend/src/components/test-suites/SuiteCard.vue:126` — replace hardcoded "— groups · — tests"

**Task 3 — Zod `.trim()` validators:**
- Modify: `backend/src/schemas/tuple.ts` (4 occurrences)
- Modify: `backend/src/schemas/query.ts` (11 occurrences)
- Modify: `backend/src/schemas/store.ts` (1 occurrence)
- Modify: `backend/src/schemas/model.ts` (1 occurrence)
- Modify: `backend/src/schemas/import.ts` (6 occurrences)
- Modify: `backend/src/schemas/export.ts` (1 occurrence)
- Modify: `backend/src/test-suites/schemas/suite.ts` (6 occurrences)
- Create: `backend/src/schemas/__tests__/trim-validation.test.ts`
- Create: `backend/src/test-suites/schemas/__tests__/trim-validation.test.ts`

---

### Task 1: Extract `applyDagreLayout` to shared utility

**Files:**
- Create: `frontend/src/utils/graphLayout.ts`
- Create: `frontend/src/utils/__tests__/graphLayout.spec.ts`
- Modify: `frontend/src/composables/useModelGraph.ts`
- Modify: `frontend/src/composables/useRelationshipGraph.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/__tests__/graphLayout.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyDagreLayout } from '../graphLayout'
import type { Node, Edge } from '@vue-flow/core'

describe('applyDagreLayout', () => {
  it('assigns non-zero positions to all nodes', () => {
    const nodes: Node[] = [
      { id: 'a', type: 'default', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'default', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const result = applyDagreLayout(nodes, edges, {
      rankdir: 'LR', nodeWidth: 160, nodeHeight: 60, nodesep: 60, ranksep: 100,
    })
    expect(result).toHaveLength(2)
    // Dagre places nodes at non-zero positions when there is an edge
    expect(result[0].position.x).not.toBe(0)
    expect(result[1].position.x).not.toBe(0)
  })

  it('nodes in LR layout have different x positions', () => {
    const nodes: Node[] = [
      { id: 'a', type: 'default', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'default', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const result = applyDagreLayout(nodes, edges, {
      rankdir: 'LR', nodeWidth: 160, nodeHeight: 60, nodesep: 60, ranksep: 100,
    })
    expect(result[0].position.x).not.toBe(result[1].position.x)
  })

  it('preserves all node data properties', () => {
    const nodes: Node[] = [
      { id: 'x', type: 'typeNode', position: { x: 0, y: 0 }, data: { typeName: 'user', color: '#blue' } },
    ]
    const result = applyDagreLayout(nodes, [], {
      rankdir: 'TB', nodeWidth: 180, nodeHeight: 50, nodesep: 80, ranksep: 120,
    })
    expect(result[0].data).toEqual({ typeName: 'user', color: '#blue' })
    expect(result[0].type).toBe('typeNode')
    expect(result[0].id).toBe('x')
  })

  it('returns empty array when no nodes', () => {
    const result = applyDagreLayout([], [], {
      rankdir: 'LR', nodeWidth: 160, nodeHeight: 60, nodesep: 60, ranksep: 100,
    })
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/utils/__tests__/graphLayout.spec.ts
```

Expected: FAIL with "Cannot find module '../graphLayout'"

- [ ] **Step 3: Create the shared utility**

Create `frontend/src/utils/graphLayout.ts`:

```typescript
import dagre from 'dagre'
import type { Node, Edge } from '@vue-flow/core'

export interface DagreLayoutOptions {
  rankdir: 'LR' | 'TB' | 'RL' | 'BT'
  nodeWidth: number
  nodeHeight: number
  nodesep: number
  ranksep: number
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: DagreLayoutOptions,
): Node[] {
  const { rankdir, nodeWidth, nodeHeight, nodesep, ranksep } = options
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir, nodesep, ranksep })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        x: pos.x - nodeWidth / 2,
        y: pos.y - nodeHeight / 2,
      },
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/utils/__tests__/graphLayout.spec.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Update `useModelGraph.ts` to use the shared utility**

In `frontend/src/composables/useModelGraph.ts`:

Remove the local `applyDagreLayout` function (lines 41-65) and the `NODE_WIDTH`/`NODE_HEIGHT` constants (lines 38-39).

Add import at the top (after existing imports):
```typescript
import { applyDagreLayout } from '@/utils/graphLayout'
```

Replace the call site at line 144:
```typescript
// Before:
const laidOutNodes = applyDagreLayout(rawNodes, rawEdges)

// After:
const laidOutNodes = applyDagreLayout(rawNodes, rawEdges, {
  rankdir: 'LR',
  nodeWidth: 160,
  nodeHeight: 60,
  nodesep: 60,
  ranksep: 100,
})
```

- [ ] **Step 6: Update `useRelationshipGraph.ts` to use the shared utility**

In `frontend/src/composables/useRelationshipGraph.ts`:

Remove the local `applyDagreLayout` function (lines 17-41) and the `NODE_WIDTH`/`NODE_HEIGHT` constants (lines 14-15).

Add import at the top (after existing imports):
```typescript
import { applyDagreLayout } from '@/utils/graphLayout'
```

Replace the call site at line 85 (inside `buildGraph`):
```typescript
// Before:
const laidOutNodes = applyDagreLayout(rawNodes, rawEdges)

// After:
const laidOutNodes = applyDagreLayout(rawNodes, rawEdges, {
  rankdir: 'TB',
  nodeWidth: 180,
  nodeHeight: 50,
  nodesep: 80,
  ranksep: 120,
})
```

- [ ] **Step 7: Run full frontend test suite to confirm no regressions**

```bash
cd frontend && npx vitest run
```

Expected: all pre-existing tests pass

- [ ] **Step 8: Commit**

```bash
git add frontend/src/utils/graphLayout.ts \
        frontend/src/utils/__tests__/graphLayout.spec.ts \
        frontend/src/composables/useModelGraph.ts \
        frontend/src/composables/useRelationshipGraph.ts
git commit -m "refactor: extract applyDagreLayout to shared utility"
```

---

### Task 2: SuiteCard real group/test counts

**Files:**
- Modify: `backend/src/test-suites/types/suite.ts`
- Modify: `backend/src/test-suites/repositories/suite-repository.ts`
- Modify: `backend/src/test-suites/repositories/suite-repository.test.ts`
- Modify: `frontend/src/stores/suites.ts`
- Modify: `frontend/src/components/test-suites/SuiteCard.vue`

- [ ] **Step 1: Add counts to backend `SuiteListItem` type**

In `backend/src/test-suites/types/suite.ts`, update `SuiteListItem` (currently lines 45-53):

```typescript
export interface SuiteListItem {
  id: string
  name: string
  description: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  lastRun: SuiteLastRun | null
  groupCount: number
  testCount: number
}
```

- [ ] **Step 2: Write a failing test for the new counts**

In `backend/src/test-suites/repositories/suite-repository.test.ts`, add a new test in the `findAll()` describe block (after the existing tests):

```typescript
it('returns groupCount and testCount from definition', async () => {
  const rowWithDefinition = {
    ...dbRow,
    group_count: 2,
    test_count: 5,
  }
  mockQuery.mockResolvedValue({ rows: [rowWithDefinition] })
  const result = await findAll()
  expect(result[0].groupCount).toBe(2)
  expect(result[0].testCount).toBe(5)
})

it('returns groupCount 0 and testCount 0 when definition is null', async () => {
  const rowWithNull = { ...dbRow, group_count: 0, test_count: 0 }
  mockQuery.mockResolvedValue({ rows: [rowWithNull] })
  const result = await findAll()
  expect(result[0].groupCount).toBe(0)
  expect(result[0].testCount).toBe(0)
})
```

Also update the existing "returns mapped list items" test to include the new fields in the fixture:

```typescript
// Update dbRow at the top of the file to include the new columns:
const dbRow = {
  id: 'suite-uuid-1',
  name: 'My Suite',
  description: 'A test suite',
  tags: ['tag1', 'tag2'],
  definition: null,
  created_at: NOW,
  updated_at: NOW,
  group_count: 0,
  test_count: 0,
}
```

- [ ] **Step 3: Run the new tests to verify they fail**

```bash
cd backend && npx vitest run src/test-suites/repositories/suite-repository.test.ts
```

Expected: FAIL — `result[0].groupCount` is `undefined`

- [ ] **Step 4: Update `findAll()` SQL and `mapRowToSuiteListItem`**

In `backend/src/test-suites/repositories/suite-repository.ts`, replace the `findAll()` function and `mapRowToSuiteListItem`:

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
    groupCount: (row.group_count as number) ?? 0,
    testCount: (row.test_count as number) ?? 0,
  }
}

export async function findAll(): Promise<SuiteListItem[]> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       s.id, s.name, s.description, s.tags, s.created_at, s.updated_at,
       lr.status AS last_run_status,
       lr.summary AS last_run_summary,
       jsonb_array_length(COALESCE(s.definition->'groups', '[]'::jsonb)) AS group_count,
       (
         SELECT COALESCE(SUM(jsonb_array_length(g->'testCases')), 0)
         FROM jsonb_array_elements(COALESCE(s.definition->'groups', '[]'::jsonb)) AS g
       ) AS test_count
     FROM suites s
     LEFT JOIN LATERAL (
       SELECT status, summary
       FROM runs
       WHERE suite_id = s.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lr ON true
     ORDER BY s.updated_at DESC`,
  )
  return rows.map(mapRowToSuiteListItem)
}
```

- [ ] **Step 5: Run backend tests to verify they pass**

```bash
cd backend && npx vitest run src/test-suites/repositories/suite-repository.test.ts
```

Expected: PASS (all tests including the 2 new ones)

- [ ] **Step 6: Add counts to frontend `SuiteListItem`**

In `frontend/src/stores/suites.ts`, update `SuiteListItem` (lines 8-16):

```typescript
export interface SuiteListItem {
  id: string
  name: string
  description: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  lastRun: { status: string; summary: RunSummary | null } | null
  groupCount: number
  testCount: number
}
```

- [ ] **Step 7: Update `SuiteCard.vue` to show real counts**

In `frontend/src/components/test-suites/SuiteCard.vue`, replace line 126:

```html
<!-- Before: -->
<span>— groups · — tests</span>

<!-- After: -->
<span>{{ suite.groupCount }} {{ suite.groupCount === 1 ? 'group' : 'groups' }} · {{ suite.testCount }} {{ suite.testCount === 1 ? 'test' : 'tests' }}</span>
```

- [ ] **Step 8: Run frontend tests to verify no regressions**

The SuiteCard tests and suite store tests need mock data updated to include the new fields. Find and update any test fixtures using `SuiteListItem` objects by adding `groupCount: 0, testCount: 0`.

Search for existing fixture objects:
```bash
grep -rn "createdAt:.*updatedAt:" frontend/src --include="*.ts" --include="*.spec.ts"
```

For each found mock object, add:
```typescript
groupCount: 0,
testCount: 0,
```

Then run:
```bash
cd frontend && npx vitest run
```

Expected: all tests pass

- [ ] **Step 9: Commit**

```bash
git add \
  backend/src/test-suites/types/suite.ts \
  backend/src/test-suites/repositories/suite-repository.ts \
  backend/src/test-suites/repositories/suite-repository.test.ts \
  frontend/src/stores/suites.ts \
  frontend/src/components/test-suites/SuiteCard.vue
git commit -m "feat: show real group/test counts in SuiteCard"
```

---

### Task 3: Add `.trim()` to Zod string validators

**Files:**
- Modify: `backend/src/schemas/tuple.ts`
- Modify: `backend/src/schemas/query.ts`
- Modify: `backend/src/schemas/store.ts`
- Modify: `backend/src/schemas/model.ts`
- Modify: `backend/src/schemas/import.ts`
- Modify: `backend/src/schemas/export.ts`
- Modify: `backend/src/test-suites/schemas/suite.ts`
- Create: `backend/src/schemas/__tests__/trim-validation.test.ts`
- Create: `backend/src/test-suites/schemas/__tests__/trim-validation.test.ts`

- [ ] **Step 1: Write failing tests for whitespace rejection**

Create `backend/src/schemas/__tests__/trim-validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { tupleParamsSchema, tupleBodySchema } from '../tuple.js'
import { queryCheckSchema, queryExpandSchema, queryListObjectsSchema, queryListUsersSchema } from '../query.js'
import { createStoreSchema } from '../store.js'
import { modelParamsSchema } from '../model.js'
import { exportParamsSchema } from '../export.js'
import {
  createStoreImportSchema,
  existingStoreImportSchema,
  importTupleSchema,
} from '../import.js'

describe('Zod schema whitespace rejection', () => {
  describe('tupleParamsSchema', () => {
    it('rejects whitespace-only storeId', () => {
      expect(tupleParamsSchema.safeParse({ storeId: '   ' }).success).toBe(false)
    })
    it('trims and accepts padded valid value', () => {
      expect(tupleParamsSchema.safeParse({ storeId: '  valid-id  ' }).success).toBe(true)
    })
  })

  describe('tupleBodySchema', () => {
    it('rejects whitespace-only user', () => {
      expect(tupleBodySchema.safeParse({ user: '   ', relation: 'viewer', object: 'doc:1' }).success).toBe(false)
    })
    it('rejects whitespace-only relation', () => {
      expect(tupleBodySchema.safeParse({ user: 'user:alice', relation: '  ', object: 'doc:1' }).success).toBe(false)
    })
    it('rejects whitespace-only object', () => {
      expect(tupleBodySchema.safeParse({ user: 'user:alice', relation: 'viewer', object: '  ' }).success).toBe(false)
    })
  })

  describe('createStoreSchema', () => {
    it('rejects whitespace-only name', () => {
      expect(createStoreSchema.safeParse({ name: '   ' }).success).toBe(false)
    })
    it('trims and accepts padded name', () => {
      const result = createStoreSchema.safeParse({ name: '  My Store  ' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.name).toBe('My Store')
    })
  })

  describe('exportParamsSchema', () => {
    it('rejects whitespace-only storeId', () => {
      expect(exportParamsSchema.safeParse({ storeId: '   ' }).success).toBe(false)
    })
  })

  describe('modelParamsSchema', () => {
    it('rejects whitespace-only storeId', () => {
      expect(modelParamsSchema.safeParse({ storeId: '   ' }).success).toBe(false)
    })
  })

  describe('existingStoreImportSchema', () => {
    it('rejects whitespace-only storeId', () => {
      const payload = { storeId: '   ', tuples: [] }
      expect(existingStoreImportSchema.safeParse(payload).success).toBe(false)
    })
  })
})
```

Create `backend/src/test-suites/schemas/__tests__/trim-validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createSuiteSchema, updateSuiteSchema } from '../suite.js'

describe('suite schema whitespace rejection', () => {
  describe('createSuiteSchema', () => {
    it('rejects whitespace-only name', () => {
      expect(createSuiteSchema.safeParse({ name: '   ' }).success).toBe(false)
    })
    it('trims and accepts padded name', () => {
      const result = createSuiteSchema.safeParse({ name: '  My Suite  ' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.name).toBe('My Suite')
    })
  })

  describe('updateSuiteSchema', () => {
    it('rejects whitespace-only name', () => {
      expect(updateSuiteSchema.safeParse({ name: '   ' }).success).toBe(false)
    })
  })

  describe('testCase nested in definition', () => {
    it('rejects whitespace-only user in test case', () => {
      const payload = {
        name: 'Suite',
        definition: {
          groups: [{
            name: 'Group',
            testCases: [{
              user: '   ',
              relation: 'viewer',
              object: 'doc:1',
              expected: true,
            }],
          }],
        },
      }
      expect(createSuiteSchema.safeParse(payload).success).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx vitest run src/schemas/__tests__/trim-validation.test.ts src/test-suites/schemas/__tests__/trim-validation.test.ts
```

Expected: FAIL — whitespace-only strings pass (`.min(1)` treats `"   "` as length-3 string, not empty)

- [ ] **Step 3: Add `.trim()` to all schema files**

For each file below, replace `z.string().min(1)` with `z.string().trim().min(1)` (all occurrences). The `.trim()` call strips whitespace before `.min(1)` validation, so `"   "` becomes `""` which fails `.min(1)`.

**`backend/src/schemas/tuple.ts`** — replace all 4 occurrences:
```typescript
// Before:
storeId: z.string().min(1),
// ...
user: z.string().min(1),
relation: z.string().min(1),
object: z.string().min(1),

// After:
storeId: z.string().trim().min(1),
// ...
user: z.string().trim().min(1),
relation: z.string().trim().min(1),
object: z.string().trim().min(1),
```

**`backend/src/schemas/query.ts`** — replace all 11 occurrences of `z.string().min(1)` with `z.string().trim().min(1)`.

**`backend/src/schemas/store.ts`** — replace:
```typescript
// Before:
name: z.string().min(1).max(256),
// After:
name: z.string().trim().min(1).max(256),
```

**`backend/src/schemas/model.ts`** — replace:
```typescript
// Before:
storeId: z.string().min(1),
// After:
storeId: z.string().trim().min(1),
```

**`backend/src/schemas/import.ts`** — replace all 6 occurrences of `z.string().min(1)` with `z.string().trim().min(1)`. The `.max(256)` and `.optional()` suffixes are preserved as-is, only `.min(1)` gains the preceding `.trim()`.

**`backend/src/schemas/export.ts`** — replace:
```typescript
// Before:
storeId: z.string().min(1),
// After:
storeId: z.string().trim().min(1),
```

**`backend/src/test-suites/schemas/suite.ts`** — replace all 6 occurrences of `z.string().min(1)` with `z.string().trim().min(1)`. The `.max(255)` and `.optional()` suffixes are preserved.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx vitest run src/schemas/__tests__/trim-validation.test.ts src/test-suites/schemas/__tests__/trim-validation.test.ts
```

Expected: PASS (all tests pass)

- [ ] **Step 5: Run full backend test suite to confirm no regressions**

```bash
cd backend && npx vitest run
```

Expected: all pre-existing tests pass. If any existing test sends a whitespace-only string that was previously accepted, update it to use a valid non-whitespace value.

- [ ] **Step 6: Commit**

```bash
git add \
  backend/src/schemas/tuple.ts \
  backend/src/schemas/query.ts \
  backend/src/schemas/store.ts \
  backend/src/schemas/model.ts \
  backend/src/schemas/import.ts \
  backend/src/schemas/export.ts \
  backend/src/test-suites/schemas/suite.ts \
  backend/src/schemas/__tests__/trim-validation.test.ts \
  backend/src/test-suites/schemas/__tests__/trim-validation.test.ts
git commit -m "fix: reject whitespace-only strings in Zod validators"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 1: `applyDagreLayout` extracted to `frontend/src/utils/graphLayout.ts`, both composables updated
- ✅ Task 2: SQL extended with `group_count`/`test_count`, type updated in backend and frontend, SuiteCard line 126 updated
- ✅ Task 3: All 30 occurrences across 7 files updated, tests cover whitespace rejection and trim behavior

**Placeholder scan:** No TBDs or incomplete sections. All code blocks contain exact implementations.

**Type consistency:** `DagreLayoutOptions` is defined once in Task 1 and used in both composable updates in the same task. `groupCount`/`testCount` naming is consistent across backend types, repository mapper, frontend store type, and SuiteCard template. `z.string().trim().min(1)` pattern is identical across all Task 3 replacements.
