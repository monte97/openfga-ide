# Story 7.2: Suite List UI with Create, Delete & Empty State

## Status: done

## Story

As a developer,
I want a visual suite list where I can create new suites, see all existing suites, and delete suites I no longer need,
So that I can manage my test suites without using the API directly.

## Acceptance Criteria

**AC1:** Given the user navigates to the Test Suites section, when no suites exist, then the EmptyState shows a guided quick start with 3 numbered steps (name suite, import fixture, add first test), and a "Create your first suite" CTA button is displayed, and the empty state disappears after the first suite is created

**AC2:** Given suites exist, when the suite list loads, then suites are displayed as full-width SuiteCard components in a single-column max-w-3xl layout, and each card shows: suite name, description, tags, test/group counts, last-run badge (gray "Never run" initially), and skeleton loading cards (3 pulse rectangles) are shown during data fetch

**AC3:** Given the user clicks "New Suite" (or the empty state CTA), when the creation form is presented, then the user can enter name (required), description (optional), and tags (optional), and submitting creates the suite via the API and adds it to the list, and validation errors from the API are displayed inline

**AC4:** Given a suite card is displayed, when the user opens the context menu (three-dot icon) and selects "Delete", then a ConfirmDialog shows "Delete '[Suite Name]'?" with warning text, and confirming deletes the suite via API and removes it from the list, and canceling returns to the list without changes

**AC5:** Given the suite list is displayed, when the user clicks on a suite card, then the Editor tab opens with that suite loaded (placeholder content for now)

**AC6:** Given the Test Suites section is rendered, when the two-tab navigation shell is displayed, then "Suites" and "Editor" tabs are shown, and the Suites tab is active by default

## Tasks / Subtasks

- [x] Task 1: Create Pinia store for suites
  - [x] 1.1 Create frontend/src/stores/suites.ts
  - [x] 1.2 Create frontend/src/stores/suites.test.ts

- [x] Task 2: Create SuiteCard and SuiteList components
  - [x] 2.1 Create frontend/src/components/test-suites/SuiteCard.vue
  - [x] 2.2 Create frontend/src/components/test-suites/SuiteCard.test.ts
  - [x] 2.3 Create frontend/src/components/test-suites/SuiteList.vue

- [x] Task 3: Create TestSuites view
  - [x] 3.1 Create frontend/src/views/TestSuites.vue
  - [x] 3.2 Create frontend/src/views/TestSuites.test.ts

- [x] Task 4: Wire up routing and sidebar
  - [x] 4.1 Add /test-suites route to router/index.ts
  - [x] 4.2 Add Test Suites nav entry to AppSidebar.vue

- [x] Task 5: Run all frontend tests and verify

## Dev Notes

### Architecture Patterns
- Pinia store uses setup syntax with `useApi` composable (path without leading /)
- `api.get('suites')` → `/api/suites`
- Store pattern: loading/error refs, try/catch/finally, vi.mock pattern for tests

### Component Patterns
- `AppTabs` with `{ key, label }` array + `v-model` for Suites/Editor tabs
- `ConfirmDialog` props/events accessed directly in tests (Teleport-safe)
- SuiteCard uses `MoreVertical` Lucide icon for three-dot menu

### EmptyState custom design (3 steps)
The existing EmptyState component only supports one CTA. For the 3-step guided empty state, content is rendered directly in SuiteList.vue.

### SuiteCard menu
Implemented with `ref` toggle + `mousedown` listener on document for outside-click close. `data-suite-menu` attribute used as selector for outside-click detection.

### Test counts
The GET /api/suites list response returns SuiteListItem (no definition/counts). Shows "— groups · — tests" — to be populated in Epic 8 when definition is loaded.

### Test Patterns (Discovered)
- `attachTo: document.body` required for `isVisible()` tests with `v-show`
- Headless UI Dialog uses Teleport — use `wrapper.findComponent({ name: 'ConfirmDialog' })` + emit events directly
- `ResizeObserver` must be stubbed via `vi.stubGlobal` for Headless UI Dialog in jsdom
- Cleanup wrappers in `afterEach` to prevent test pollution

## Dev Agent Record

### Implementation Plan
1. Pinia store (suites.ts) with fetchSuites/createSuite/deleteSuite
2. SuiteCard.vue (card UI + three-dot menu) + SuiteList.vue (skeleton/empty/list)
3. TestSuites.vue (two tabs, create form, delete confirm)
4. Router + sidebar wiring

### Debug Log
- `isVisible()` with `v-show` requires `attachTo: document.body` in Vue Test Utils
- Headless UI Dialog renders via Teleport — cannot use `wrapper.text()` to check dialog content; use `findComponent({ name: 'ConfirmDialog' }).props()` instead
- `AppBadge` only supports `success|error|warning|info` variants — used custom `<span>` for tag chips
- AppSidebar test expected 6 links — updated to 7 after adding Test Suites nav entry

### Completion Notes
- 39 new tests added across 4 test files — all pass
- 5 pre-existing failures (graph ResizeObserver/VueFlow mock issues) unchanged
- Full two-tab shell with Suites list + Editor placeholder
- 503 graceful degradation handled server-side (from Story 7.1)

## File List

- `_bmad-output/implementation-artifacts/7-2-suite-list-ui-with-create-delete-and-empty-state.md` (new — story file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story 7.2 → review)
- `frontend/src/stores/suites.ts` (new)
- `frontend/src/stores/suites.test.ts` (new)
- `frontend/src/components/test-suites/SuiteCard.vue` (new)
- `frontend/src/components/test-suites/SuiteCard.test.ts` (new)
- `frontend/src/components/test-suites/SuiteList.vue` (new)
- `frontend/src/views/TestSuites.vue` (new)
- `frontend/src/views/TestSuites.test.ts` (new)
- `frontend/src/router/index.ts` (modified — /test-suites route)
- `frontend/src/components/layout/AppSidebar.vue` (modified — Test Suites nav entry)
- `frontend/src/components/layout/__tests__/AppSidebar.spec.ts` (modified — updated to 7 links)

### Review Findings

- [x] [Review][Decision] D1: `TestCase.expected` `'allow'|'deny'` vs backend `boolean` — fixed: type changed to `boolean` throughout store and tests
- [x] [Review][Decision] D2: `fetchSuites` error state not shown in UI — fixed: error banner with `role="alert"` added in Suites tab; `useToast` added for delete errors

- [x] [Review][Patch] P1: `TestGroup.tests` → `testCases` to match backend schema — fixed [frontend/src/stores/suites.ts]
- [x] [Review][Patch] P2: `TestGroup.id` not persisted — fixed: `fetchSuite` now assigns `crypto.randomUUID()` to each group and testCase on load [frontend/src/stores/suites.ts]
- [x] [Review][Patch] P3: `confirmDelete` swallows errors — fixed: catch block with `toast.show({ type: 'error' })` [frontend/src/views/TestSuites.vue]
- [x] [Review][Patch] P4: No test for outside-click close behavior — fixed: added mousedown dispatch test [frontend/src/components/test-suites/SuiteCard.test.ts]
- [x] [Review][Patch] P5: `deleteSuite` leaves `activeSuite` stale — fixed: clears `activeSuite` when deleted id matches [frontend/src/stores/suites.ts]
- [x] [Review][Patch] P6: `e: Event` → `e: MouseEvent` in toggleMenu/onDeleteClick [frontend/src/components/test-suites/SuiteCard.vue]
- [x] [Review][Patch] P7: No test for form close after create — fixed: added `await nextTick()` + `exists()` assertion [frontend/src/views/TestSuites.test.ts]

- [x] [Review][Defer] W1: SuiteCard counts hardcoded "— groups · — tests" — by design per dev notes, to be populated in Epic 8 — deferred, pre-existing
- [x] [Review][Defer] W2: `fetchSuite` has no error state tracking — Epic 8 scope — deferred, pre-existing
- [x] [Review][Defer] W3: Tags input has no format/length validation — not spec'd for this story — deferred, pre-existing
- [x] [Review][Defer] W4: `AppTabs` slot naming couples tab key to slot name — pre-existing design pattern — deferred, pre-existing
- [x] [Review][Defer] W5: `crypto.randomUUID()` no polyfill for non-secure contexts — dev tooling only, low risk — deferred, pre-existing

## Change Log

| Date | Change |
|------|--------|
| 2026-03-31 | Implemented Story 7.2 — Suite List UI with Create, Delete & Empty State |
