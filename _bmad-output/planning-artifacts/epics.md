---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# openfga-viewer - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for openfga-viewer, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories for the Authorization Test Suite Management feature.

## Requirements Inventory

### Functional Requirements

- FR1: User can create a new test suite with name, description, and tags
- FR2: User can view a list of all test suites with name, description, tags, and last run status
- FR3: User can open a test suite for editing
- FR4: User can delete a test suite
- FR5: User can organize test cases within a suite into named groups with descriptions
- FR6: User can add a test case to a group specifying user, relation, object, expected result (allowed/denied), and metadata (description, tags, severity)
- FR7: User can edit an existing test case within a suite
- FR8: User can remove a test case from a suite
- FR9: User can add and remove groups within a suite
- FR10: User can view and edit the suite definition as raw JSON (dual-mode editor)
- FR11: User can switch between form-based editor and JSON editor without data loss
- FR12: User can define a fixture (model + tuples) inline within a suite definition
- FR13: User can view and edit the fixture (model and tuples) within the suite editor
- FR14: System uses the existing export format ({ model, tuples }) as the fixture format
- FR15: User can trigger execution of an entire test suite
- FR16: System creates an ephemeral OpenFGA store for each test run
- FR17: System loads the suite's fixture (model + tuples) into the ephemeral store before executing tests
- FR18: System executes check API calls against the ephemeral store for each test case
- FR19: System compares the actual result against the expected result for each test case
- FR20: System destroys the ephemeral store after test execution completes, regardless of success or failure
- FR21: System tracks execution state transitions (pending → provisioning → running → completed/failed → cleanup)
- FR22: System guarantees no orphaned ephemeral stores remain after execution
- FR23: System distinguishes execution errors (infrastructure failures, OpenFGA unreachable, fixture rejected) from test assertion failures (expected ≠ actual) in run results
- FR24: User can view the results of a test run with summary statistics (total, passed, failed, errored, duration)
- FR25: User can view per-test results showing pass/fail/error status, expected vs. actual result, and timing
- FR26: User can see the full test case definition alongside each test result
- FR27: User can view the last run result for each suite from the suite list
- FR28: System persists run results in PostgreSQL
- FR29: User can export a suite definition as a JSON file
- FR30: User can import a suite definition from a JSON file
- FR31: Suite definition JSON format is compatible with git storage and version control
- FR32: Suite definitions are independent of any specific OpenFGA instance; execution uses the currently active connection
- FR33: System validates suite definition structure and fixture format on save
- FR34: System reports specific validation errors to the user on invalid suite definitions
- FR35: System validates fixture format before execution and reports clear errors if invalid
- FR36: System exposes CRUD endpoints for suite management (/api/suites/*)
- FR37: System exposes an endpoint to trigger suite execution (POST /api/suites/:id/run)
- FR38: System exposes endpoints to poll run status and retrieve results (/api/runs/*)
- FR39: System exposes an endpoint to list all suites with metadata (GET /api/suites)
- FR40: API responses follow the existing error envelope pattern ({ error, details? })
- FR41: API supports running multiple suites in sequence (separate API calls)
- FR42: System persists suite definitions in PostgreSQL
- FR43: System persists run records and results in PostgreSQL
- FR44: System manages database schema via migrations
- FR45: System starts and serves existing viewer features when PostgreSQL is unavailable

### NonFunctional Requirements

- NFR1: Suite of 100 check assertions completes in < 30 seconds end-to-end (including ephemeral store provisioning and cleanup)
- NFR2: Run status polling API responds in < 200ms
- NFR3: Suite editor loads a suite with 100+ test cases in < 1 second
- NFR4: Results page renders 100 test results in < 500ms
- NFR5: PostgreSQL queries for suite CRUD complete in < 50ms
- NFR6: Ephemeral store creation and fixture loading completes in < 5 seconds
- NFR7: PostgreSQL connection credentials are stored only in environment variables; never exposed to the frontend or logged
- NFR8: Suite definitions and run results are accessible to any user of the tool (no per-user access control in MVP — trusted environment assumption)
- NFR9: API input validation via Zod on all test suite endpoints
- NFR10: Ephemeral stores are created with unique names to prevent collision between concurrent runs
- NFR11: Backend communicates with OpenFGA via the existing openfga-client service for ephemeral store operations
- NFR12: PostgreSQL connection via standard DATABASE_URL environment variable
- NFR13: Suite definition JSON format uses standard JSON with no proprietary encoding
- NFR14: Export format is identical to the existing viewer export format for fixtures ({ model, tuples })
- NFR15: Ephemeral store cleanup is guaranteed via try/finally — no orphaned stores under any failure scenario
- NFR16: If PostgreSQL is unavailable at startup, existing viewer features continue to work normally. Test suite features show "database not configured"
- NFR17: Run results are persisted to PostgreSQL before ephemeral store cleanup begins — no data loss if cleanup fails

### Additional Requirements

From Architecture document:

- AR1: PostgreSQL client via pg (node-postgres) with pg.Pool for connection pooling
- AR2: Raw SQL with repository pattern — repositories handle snake_case → camelCase mapping; services never import pg directly
- AR3: node-pg-migrate for schema migrations (SQL-native, up/down)
- AR4: Auto-migrate on startup in dev mode, explicit CLI command in production/CI
- AR5: Fire-and-forget execution model — POST /suites/:id/run returns 202 + runId immediately; execution runs in detached async function
- AR6: CodeMirror 6 for JSON editing (~200KB, modular JSON mode)
- AR7: Dedicated backend/src/test-suites/ subdirectory with routes/, services/, repositories/, schemas/, types/, db/, migrations/
- AR8: Frontend components in frontend/src/components/test-suites/; stores in frontend/src/stores/
- AR9: Docker Compose updated with PostgreSQL service (named volume + health check)
- AR10: Co-located tests — test files next to source files
- AR11: Zod schemas in backend/src/test-suites/schemas/ for all API validation
- AR12: 3 migration files: 001_create-suites.sql, 002_create-runs.sql, 003_create-run-results.sql
- AR13: Existing code NEVER imports from test-suites/ — one-way dependency
- AR14: Ephemeral store naming: test-run-{runId} for uniqueness and cleanup identification

### UX Design Requirements

- UX-DR1: SuiteCard component — card with inline run badge, context menu (Edit Metadata, CI Integration, Import, Export, Delete), keyboard-navigable, hover elevation, has-failures red border accent
- UX-DR2: SuiteTree component — collapsible hierarchical navigator with role="tree", aria-expanded, arrow key navigation, pass/fail icons per node, run icon per group and per test case
- UX-DR3: SuiteTreeCollapsed component — thin icon strip with group-level badges, live updates during runs (reactive to runs Pinia store), tooltip with group name and counts
- UX-DR4: TestCaseForm component — 4-field editor (user/relation/object/expected) with SearchableSelect autocomplete on focus, live SentenceView preview, expandable metadata (description, tags, severity), run-single-test button, aria-live for autocomplete
- UX-DR5: SentenceView component — universal sentence rendering with result prop variants (null/pass/fail/running), background pills for technical tokens, single readable text node for screen readers
- UX-DR6: RunPhaseTimeline component — vertical 4-phase timeline (provisioning/fixtures/checks/cleanup) with live elapsed timer per phase, progress counter N/M for checks, aria-label per phase
- UX-DR7: RunSummaryBadge component — composite pass/fail badge always visible in editor header, states: all-passed (green), has-failures (red), running (amber spinner), no-runs (gray "Never run")
- UX-DR8: JsonEditor component — CodeMirror 6 wrapper with tailwindCodeMirrorTheme (EditorView.theme() API mapped to CSS custom properties), sync indicator ("JSON synced ✓"), lintGutter for validation errors, read-only mode for import preview
- UX-DR9: ImportPreview component — full editor-panel experience (not modal), FileImportDropzone → CodeMirror with Zod lintGutter → summary preview → confirm/cancel, edit-in-place to fix errors
- UX-DR10: Two-tab navigation (Suites | Editor) with mode persistence in Pinia — form/JSON tab selection and tree collapse state persist across navigation
- UX-DR11: Empty state guided quick start — 3-step onboarding (name suite, import fixture, add first test), disappears after first suite, "Import current store as fixture" smart default
- UX-DR12: Direction C hybrid layout — full-width cards (max-w-3xl, left-aligned), collapsible tree (~280px expanded, thin icon strip collapsed) + dominant editor, inline results integrated in editor panel
- UX-DR13: Editor state persistence — tree selection, scroll position, form/JSON mode, collapsed/expanded tree stored in Pinia suites store (not component-local), survives navigation
- UX-DR14: Keyboard navigation — Ctrl+Enter run suite, arrow keys in tree, Tab through form fields, Enter to select tree node, Space to open context menu, Escape to close dialog
- UX-DR15: Responsive breakpoints — xl (≥1280): full two-column editor; lg (1024-1279): tree collapsed by default; md (768-1023): tree hidden, full-width editor; <768: suite list only, read-only
- UX-DR16: CI Integration modal — copyable curl snippet with suite ID pre-filled from context menu, informational Dialog styling

### FR Coverage Map

- FR1: Epic 7 — Create suite with name, description, tags
- FR2: Epic 7 — View suite list with last run status
- FR3: Epic 7 — Open suite for editing
- FR4: Epic 7 — Delete suite
- FR5: Epic 8 — Organize test cases into named groups
- FR6: Epic 8 — Add test case with user, relation, object, expected, metadata
- FR7: Epic 8 — Edit existing test case
- FR8: Epic 8 — Remove test case
- FR9: Epic 8 — Add and remove groups
- FR10: Epic 8 — View/edit suite as raw JSON
- FR11: Epic 8 — Switch form ↔ JSON without data loss
- FR12: Epic 8 — Define fixture inline
- FR13: Epic 8 — View/edit fixture in editor
- FR14: Epic 8 — Fixture uses existing export format
- FR15: Epic 9 — Trigger suite execution
- FR16: Epic 9 — Create ephemeral store per run
- FR17: Epic 9 — Load fixture into ephemeral store
- FR18: Epic 9 — Execute check API calls
- FR19: Epic 9 — Compare actual vs expected
- FR20: Epic 9 — Destroy ephemeral store after execution
- FR21: Epic 9 — Track execution state transitions
- FR22: Epic 9 — Guarantee no orphaned stores
- FR23: Epic 9 — Distinguish execution errors from assertion failures
- FR24: Epic 9 — View run summary statistics
- FR25: Epic 9 — View per-test pass/fail/error with timing
- FR26: Epic 9 — See test definition alongside result
- FR27: Epic 9 — View last run result per suite in list
- FR28: Epic 9 — Persist run results in PostgreSQL
- FR29: Epic 10 — Export suite as JSON file
- FR30: Epic 10 — Import suite from JSON file
- FR31: Epic 10 — JSON format compatible with git
- FR32: Epic 10 — Suite definitions independent of OpenFGA instance
- FR33: Epic 7 — Validate suite structure on save
- FR34: Epic 7 — Report validation errors on invalid definitions
- FR35: Epic 9 — Validate fixture before execution
- FR36: Epic 7 — CRUD endpoints for suites
- FR37: Epic 9 — Endpoint to trigger execution
- FR38: Epic 9 — Endpoints to poll status and retrieve results
- FR39: Epic 7 — Endpoint to list all suites
- FR40: Epic 7 — API follows existing error envelope
- FR41: Epic 9 — Support running multiple suites in sequence
- FR42: Epic 7 — Persist suite definitions in PostgreSQL
- FR43: Epic 9 — Persist run records and results in PostgreSQL
- FR44: Epic 7 — Manage schema via migrations
- FR45: Epic 7 — Start and serve viewer features when PostgreSQL unavailable

## Epic List

### Epic 7: Suite Management
Users can create, list, and delete test suites with metadata. PostgreSQL persistence is operational with graceful degradation.

This is the foundation epic — delivers infrastructure (PostgreSQL, migrations, Docker Compose) bundled with the first visible user value: a suite list with card-based UI, empty state onboarding, and full CRUD via API and UI.

**FRs covered:** FR1, FR2, FR3, FR4, FR33, FR34, FR36, FR39, FR40, FR42, FR44, FR45
**UX-DRs covered:** UX-DR1, UX-DR11, UX-DR12 (suite list layout, empty state, card component)
**ARs covered:** AR1-AR4, AR7, AR9-AR12, AR13

### Epic 8: Suite Editor
Users can fully author test suites — organize groups, add/edit/remove test cases via a form editor or raw JSON, manage fixtures, and see live sentence previews. The dual-mode editor (form ↔ JSON) round-trips losslessly with JSON as source of truth.

**FRs covered:** FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14
**UX-DRs covered:** UX-DR2, UX-DR4, UX-DR5, UX-DR8, UX-DR10, UX-DR12 (editor layout), UX-DR13, UX-DR14
**ARs covered:** AR6, AR8

### Epic 9: Test Execution & Results
Users can run suites against ephemeral OpenFGA stores, watch execution progress via a phase timeline, and review detailed pass/fail results per test case with sentence rendering. Results are persisted and the last run status appears in the suite list.

**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR35, FR37, FR38, FR41, FR43
**UX-DRs covered:** UX-DR3, UX-DR6, UX-DR7, UX-DR5 (result variants)
**ARs covered:** AR5, AR12 (runs + run_results migrations), AR14

### Epic 10: Import, Export & CI Integration
Users can import/export suite definitions as JSON files for git storage and sharing, with inline validation and preview on import. CI/CD integration is supported via copyable curl snippets from the UI.

**FRs covered:** FR29, FR30, FR31, FR32
**UX-DRs covered:** UX-DR9, UX-DR16

## Epic 7: Suite Management

Users can create, list, and delete test suites with metadata. PostgreSQL persistence is operational with graceful degradation.

### Story 7.1: Suite CRUD API & PostgreSQL Infrastructure

As a developer,
I want a REST API for creating, listing, viewing, updating, and deleting test suites backed by PostgreSQL,
So that suite definitions are persisted and available to both the UI and CI/CD pipelines.

**Acceptance Criteria:**

**Given** the backend starts with DATABASE_URL configured
**When** the application initializes
**Then** pg.Pool connects to PostgreSQL and auto-runs migrations (dev mode)
**And** the `suites` table is created with columns: id (UUID), name, description, tags (TEXT[]), definition (JSONB), created_at, updated_at

**Given** the backend starts without DATABASE_URL or with PostgreSQL unavailable
**When** the application initializes
**Then** existing viewer features work normally
**And** all `/api/suites/*` routes return 503 with `{ error: "Database not configured" }`

**Given** a valid suite payload `{ name, description?, tags?, definition? }`
**When** POST `/api/suites` is called
**Then** a new suite is created and returned with generated UUID and timestamps
**And** Zod validates the payload — invalid requests return 400 with `{ error, details }`

**Given** suites exist in the database
**When** GET `/api/suites` is called
**Then** all suites are returned with id, name, description, tags, createdAt, updatedAt
**And** results are ordered by updatedAt descending

**Given** a suite exists with a known ID
**When** GET `/api/suites/:suiteId` is called
**Then** the full suite including definition is returned
**And** if the suite doesn't exist, 404 is returned with `{ error: "Suite not found" }`

**Given** a suite exists
**When** PUT `/api/suites/:suiteId` is called with updated fields
**Then** the suite is updated and the full updated suite is returned
**And** Zod validates the definition structure on save (FR33)
**And** validation errors return 400 with specific error messages (FR34)

**Given** a suite exists
**When** DELETE `/api/suites/:suiteId` is called
**Then** the suite is deleted and 204 is returned

### Story 7.2: Suite List UI with Create, Delete & Empty State

As a developer,
I want a visual suite list where I can create new suites, see all existing suites, and delete suites I no longer need,
So that I can manage my test suites without using the API directly.

**Acceptance Criteria:**

**Given** the user navigates to the Test Suites section
**When** no suites exist
**Then** the EmptyState component shows a guided quick start with 3 numbered steps (name suite, import fixture, add first test)
**And** a "Create your first suite" CTA button is displayed
**And** the empty state disappears after the first suite is created

**Given** suites exist
**When** the suite list loads
**Then** suites are displayed as full-width SuiteCard components in a single-column `max-w-3xl` layout
**And** each card shows: suite name, description, tags, test/group counts, last-run badge (gray "Never run" initially)
**And** skeleton loading cards (3 pulse rectangles) are shown during data fetch

**Given** the user clicks "New Suite" (or the empty state CTA)
**When** the creation form is presented
**Then** the user can enter name (required), description (optional), and tags (optional)
**And** submitting creates the suite via the API and adds it to the list
**And** validation errors from the API are displayed inline

**Given** a suite card is displayed
**When** the user opens the context menu (three-dot icon) and selects "Delete"
**Then** a ConfirmDialog shows "Delete '[Suite Name]'?" with warning text
**And** confirming deletes the suite via API and removes it from the list
**And** canceling returns to the list without changes

**Given** the suite list is displayed
**When** the user clicks on a suite card
**Then** the Editor tab opens with that suite loaded (placeholder content for now — editor is Epic 8)

**Given** the Test Suites section is rendered
**When** the two-tab navigation shell is displayed
**Then** "Suites" and "Editor" tabs are shown (UX-DR10)
**And** the Suites tab is active by default

## Epic 8: Suite Editor

Users can fully author test suites — organize groups, add/edit/remove test cases via a form editor or raw JSON, manage fixtures, and see live sentence previews. The dual-mode editor (form ↔ JSON) round-trips losslessly with JSON as source of truth.

### Story 8.1: Suite Tree & Form Editor

As a developer,
I want to navigate a suite's groups and test cases in a tree panel and edit test cases via a form with live sentence preview,
So that I can author test suites visually without writing JSON.

**Acceptance Criteria:**

**Given** a suite is opened in the Editor tab
**When** the editor layout renders
**Then** a two-panel layout is displayed: collapsible tree panel (~280px) on the left, editor panel on the right (UX-DR12)
**And** the tree panel shows groups (collapsible) containing test cases (selectable)
**And** the tree uses `role="tree"` with `aria-expanded` on groups (UX-DR2)

**Given** the tree panel is displayed
**When** the user clicks a group header
**Then** the group expands/collapses its test case children
**And** arrow keys navigate between tree nodes, Left/Right collapses/expands groups, Enter selects (UX-DR14)

**Given** the user selects a test case in the tree
**When** the editor panel renders
**Then** the TestCaseForm shows 4 fields: User (SearchableSelect), Relation (SearchableSelect), Object (SearchableSelect), Expected (Allowed/Denied toggle)
**And** autocomplete triggers on focus with options from the connected store's model and tuples (UX-DR4)
**And** free text is allowed (not restricted to known entities)
**And** a live SentenceView preview renders below the form: "Can `user:alice` `view` `document:budget`? → Yes" with background pills for technical tokens (UX-DR5)

**Given** the user is editing a test case form
**When** the user clicks "Show metadata ▾"
**Then** an expandable section shows description (textarea), tags (multi-select), severity (select: critical/warning/info)
**And** collapse/expand state persists per session in Pinia store

**Given** a suite is open in the editor
**When** the user clicks "+ Group"
**Then** a new group is added with a name/description form
**And** the user can click "+ Test Case" within a group to add a new test case (FR5, FR6, FR9)

**Given** a test case exists in a group
**When** the user edits fields and the form loses focus (blur)
**Then** changes are saved to the suite definition in the Pinia store
**And** the user can remove a test case or group via delete action (FR8, FR9)

**Given** the user navigates away from the Editor tab and returns
**When** the Editor tab re-renders
**Then** tree selection, scroll position, form/JSON mode, and collapsed/expanded tree state are all restored from Pinia store (UX-DR13)

### Story 8.2: JSON Editor & Dual-Mode Sync

As a developer,
I want to view and edit my suite definition as raw JSON alongside the form editor, switching between modes without data loss,
So that I can use whichever editing mode fits the task — form for quick edits, JSON for bulk changes.

**Acceptance Criteria:**

**Given** the editor panel is displayed
**When** the user clicks the "JSON" tab (via AppTabs)
**Then** a CodeMirror 6 editor renders the full suite definition as formatted JSON with syntax highlighting and bracket matching (UX-DR8)
**And** the CodeMirror theme uses `EditorView.theme()` API with hex values mapped from existing CSS custom properties (`--color-success`, `--color-error`, etc.)

**Given** the user is in Form mode
**When** a "JSON synced ✓" indicator is displayed (green text, bottom of form)
**Then** it confirms the form and JSON representations are in sync
**And** the indicator disappears while actively editing in JSON mode

**Given** the user edits JSON directly in CodeMirror
**When** the user switches to Form mode
**Then** the form reflects the JSON changes with no data loss (JSON is the source of truth) (FR11)
**And** if the JSON has syntax errors, the form shows "JSON has errors — fix in JSON tab" banner instead of form fields

**Given** the user edits fields in Form mode
**When** the form values change
**Then** the underlying JSON model updates immediately (form writes to JSON model)
**And** switching to JSON mode shows the updated JSON

**Given** JSON has validation errors
**When** the CodeMirror editor is displayed
**Then** lintGutter shows red markers at error lines with actionable error messages
**And** error count is shown in the editor status bar

**Given** the user switches between Form and JSON tabs
**When** navigating away and returning to the Editor
**Then** the previously selected tab (Form or JSON) is preserved in Pinia store — no "mode amnesia" (UX-DR10)

### Story 8.3: Fixture Editor

As a developer,
I want to view and edit the fixture (authorization model + tuples) within the suite editor,
So that I can define the test data my suite runs against without switching tools.

**Acceptance Criteria:**

**Given** a suite is open in the editor
**When** the user navigates to the fixture section
**Then** the fixture is displayed showing model and tuples in the existing export format `{ model, tuples }` (FR14)
**And** the fixture can be edited inline as JSON via a CodeMirror editor instance (reusing the JsonEditor component)

**Given** the user is creating a new suite and is connected to an OpenFGA store
**When** the fixture section is displayed
**Then** an "Import current store as fixture" button is available as a smart default (UX-DR11)
**And** clicking it populates the fixture with the current store's model and tuples

**Given** the user edits the fixture JSON
**When** the fixture contains invalid model or tuples format
**Then** Zod validation errors are shown inline via lintGutter (FR33, FR34)
**And** the suite can still be saved (fixture validation on execution is separate — FR35)

**Given** no fixture is defined for a suite
**When** the user views the fixture section
**Then** a message indicates "No fixture defined" with a CTA to add one
**And** the fixture is stored as part of the suite definition JSONB (FR12)

## Epic 9: Test Execution & Results

Users can run suites against ephemeral OpenFGA stores, watch execution progress via a phase timeline, and review detailed pass/fail results per test case with sentence rendering. Results are persisted and the last run status appears in the suite list.

### Story 9.1: Execution Engine & Run API

As a developer,
I want a REST API that triggers test suite execution against ephemeral OpenFGA stores and reports results,
So that suites can be run from both the UI and CI/CD pipelines.

**Acceptance Criteria:**

**Given** the backend starts with DATABASE_URL configured
**When** migrations run
**Then** the `runs` table is created with columns: id (UUID), suite_id (FK), status (VARCHAR), started_at, completed_at, error (TEXT), summary (JSONB), created_at
**And** the `run_results` table is created with columns: id (UUID), run_id (FK), test_case (JSONB), actual (BOOLEAN nullable), passed (BOOLEAN), duration_ms (INTEGER), error (TEXT nullable)

**Given** a suite exists with a valid fixture and test cases
**When** POST `/api/suites/:suiteId/run` is called
**Then** a run record is created with status `pending` and 202 is returned with `{ runId }`
**And** execution starts in a detached async function (fire-and-forget) (AR5)

**Given** a run is executing
**When** the execution engine processes the run
**Then** status transitions are persisted in order: pending → provisioning → running → completed/failed
**And** during provisioning: an ephemeral OpenFGA store is created (named `test-run-{runId}`) via the existing openfga-client, and the fixture model + tuples are loaded (FR16, FR17, AR14)
**And** during running: each test case executes a `check` API call, comparing actual vs expected, with per-test timing (FR18, FR19)
**And** results are persisted to `run_results` BEFORE cleanup begins (NFR17)
**And** cleanup destroys the ephemeral store via try/finally — guaranteed even on errors (FR20, FR22, NFR15)

**Given** the fixture is invalid (bad model syntax, malformed tuples)
**When** execution attempts to load the fixture
**Then** the run status is set to `failed` with a clear error message describing the fixture problem (FR35)
**And** the ephemeral store is still cleaned up

**Given** an infrastructure error occurs (OpenFGA unreachable, network timeout)
**When** the execution engine catches the error
**Then** the run status is set to `failed` with the error message
**And** run results distinguish execution errors from assertion failures — execution errors have `error` field set, assertion failures have `passed: false` with `actual` populated (FR23)

**Given** a run exists
**When** GET `/api/runs/:runId` is called
**Then** the run is returned with status, summary `{ total, passed, failed, errored, durationMs }`, and per-test results array (FR24, FR25)
**And** each result includes: testCase definition, expected, actual, passed, durationMs, error (FR26)
**And** response time is < 200ms (NFR2)

**Given** a run does not exist
**When** GET `/api/runs/:runId` is called
**Then** 404 is returned with `{ error: "Run not found" }`

**Given** multiple suites need to run
**When** separate POST `/api/suites/:id/run` calls are made for each suite
**Then** each run executes independently with its own ephemeral store (FR41)

### Story 9.2: Run UI & Phase Timeline

As a developer,
I want to trigger suite execution from the editor and watch the execution progress via a live phase timeline,
So that I get immediate feedback on test results without leaving the editor.

**Acceptance Criteria:**

**Given** a suite is open in the editor with a valid fixture
**When** the user clicks "Run Suite" (primary button, top-right of editor header) or presses Ctrl+Enter (UX-DR14)
**Then** a run is triggered via POST `/api/suites/:suiteId/run`
**And** the Pinia runs store starts polling GET `/api/runs/:runId` every 2 seconds
**And** polling stops when status reaches `completed` or `failed`
**And** polling cleans up on component unmount via `onUnmounted`

**Given** a run is in progress
**When** the RunPhaseTimeline component renders
**Then** it shows a vertical 4-phase timeline: Provisioning, Loading fixtures, Running checks, Cleanup (UX-DR6)
**And** each phase shows: status icon (gray dash = pending, amber spinner = running, green check = completed, red cross = failed), label, elapsed timer
**And** the Running checks phase shows a progress counter "N/M" updating as results arrive
**And** each phase has `aria-label` with status description ("Provisioning: completed, 1.2 seconds")

**Given** a run is in progress
**When** the RunSummaryBadge component renders in the editor header
**Then** it shows amber state with spinner during execution (UX-DR7)
**And** on completion it shows "8/10 passed" (green if all pass, red if any fail)
**And** the badge is always visible in the editor header regardless of tree panel state
**And** `aria-label` reads "8 of 10 tests passed"

**Given** a run is in progress
**When** the user navigates away from the Editor tab
**Then** the run continues in the background (polling continues in Pinia store)
**And** returning to the Editor shows updated status and results

**Given** a suite has no fixture defined
**When** the user attempts to click "Run Suite"
**Then** a warning tooltip appears on the Run button: "No fixture — add one to run tests"
**And** the run is not triggered

**Given** a run completes
**When** all tests pass
**Then** a success toast auto-dismisses after 4s: "Suite '[name]' passed (N/N)"
**And** when failures exist, an error toast persists until dismissed: "Suite '[name]': M failures"

### Story 9.3: Results Display & Suite List Integration

As a developer,
I want to see detailed per-test results with sentence rendering in the editor and last-run status badges in the suite list,
So that I can quickly diagnose failures and monitor suite health at a glance.

**Acceptance Criteria:**

**Given** a run has completed
**When** the user views the tree panel
**Then** each test case node shows a pass/fail icon (green ✓ / red ✗) next to the sentence label (UX-DR2)
**And** failed tests float to the top of their group for quick access

**Given** the user selects a failed test case in the tree
**When** the SentenceView renders with `result="fail"` variant
**Then** it shows: "Can `user:mallory` `delete` `document:budget`? → Expected: No, Got: Yes" with red highlight on the mismatch (UX-DR5)
**And** timing is shown as a subtle badge (e.g., "12ms")

**Given** the user selects a passed test case
**When** the SentenceView renders with `result="pass"` variant
**Then** it shows: "Can `user:alice` `view` `document:roadmap`? → Yes ✓" in green

**Given** the tree panel is collapsed
**When** the SuiteTreeCollapsed component renders
**Then** a thin icon strip shows one badge per group with pass/fail ratio (e.g., "5/5", "3/5") (UX-DR3)
**And** badges update live during runs (reactive to runs Pinia store)
**And** each badge has a tooltip with group name and counts

**Given** a user triggers a single test case run (from run icon on test case in tree)
**When** the single test completes
**Then** a compact inline result is shown (row flips to green/red + duration badge) — no full phase timeline for single-test runs

**Given** suites exist with previous run results
**When** the user views the Suite List
**Then** each SuiteCard shows the last run result as an inline badge next to the suite name (FR27)
**And** badge variants: green "N/N passed", red "M/N passed", gray "Never run"
**And** cards with failures show a subtle red border accent (UX-DR1)

**Given** the suite list API is called
**When** GET `/api/suites` returns data
**Then** each suite includes last run summary (via LEFT JOIN in repository) so the frontend can render badges without extra API calls

## Epic 10: Import, Export & CI Integration

Users can import/export suite definitions as JSON files for git storage and sharing, with inline validation and preview on import. CI/CD integration is supported via copyable curl snippets from the UI.

### Story 10.1: Export Suite & CI Integration Snippet

As a developer,
I want to export a suite definition as a JSON file and get a ready-to-use curl command for CI/CD integration,
So that I can version-control my suites in git and automate them in pipelines without writing API calls from scratch.

**Acceptance Criteria:**

**Given** a suite exists
**When** the user opens the context menu on a SuiteCard and selects "Export"
**Then** the suite definition is downloaded as a JSON file named `{suite-name}.json`
**And** the JSON format contains the full suite structure (name, description, tags, fixture, groups with test cases) — no server-generated fields (id, timestamps) (FR31)
**And** the format uses standard JSON with no proprietary encoding (FR32)

**Given** a suite exists
**When** GET `/api/suites/:suiteId/export` is called
**Then** the suite definition is returned as a downloadable JSON response
**And** the format is identical whether exported from UI or API

**Given** a suite exists
**When** the user opens the context menu and selects "CI Integration"
**Then** a Dialog (informational styling, not warning) shows a copyable curl snippet with the suite ID pre-filled (UX-DR16)
**And** brief polling instructions are shown below the snippet
**And** a "Copy" button copies the snippet to clipboard
**And** "Close" dismisses the dialog

**Given** the suite definition is exported and committed to git
**When** a different user imports it on another instance
**Then** the definition is independent of any specific OpenFGA instance — execution uses the currently active connection (FR32)

### Story 10.2: Import Suite with Validation Preview

As a developer,
I want to import a suite definition from a JSON file with inline validation and a preview of what will be created,
So that I can confidently reuse suites across environments without importing broken definitions.

**Acceptance Criteria:**

**Given** the user is on the Suite List view
**When** the user clicks "Import Suite" or drags a JSON file onto the list area
**Then** the Editor tab switches to a full-panel ImportPreview experience (not a modal) (UX-DR9)
**And** the file content loads into a CodeMirror editor in read-write mode

**Given** a JSON file is loaded in the ImportPreview
**When** Zod validation runs automatically against the suite definition schema
**Then** if valid: a green summary banner shows "Will create: [Suite Name] — N groups, M tests, fixture with K tuples"
**And** the "Import" primary button is enabled

**Given** the imported JSON has validation errors
**When** the CodeMirror editor renders
**Then** lintGutter shows red markers at error lines with actionable messages mapped to line numbers (e.g., "line 42: relation field missing in test case 3")
**And** an error summary banner shows "N errors found — fix to enable import"
**And** the "Import" button is disabled until all errors are resolved
**And** error count is announced via `aria-live`

**Given** the user fixes errors directly in the CodeMirror preview editor
**When** validation re-runs after edits
**Then** resolved errors disappear from the lintGutter
**And** once all errors are cleared, the summary banner and Import button appear

**Given** the user clicks "Import" on a valid definition
**When** the suite is created via POST `/api/suites`
**Then** the new suite appears in the Suite List with a "Never run" badge
**And** a success toast shows "Imported '[Suite Name]' (N groups, M tests)"
**And** focus moves to the newly created suite card

**Given** the user clicks "Cancel" during import
**When** the ImportPreview closes
**Then** the previous editor state is restored (no suite created)
**And** the Suites tab is active

**Given** the import reuses the same Zod schemas as the API
**When** validation runs on the frontend
**Then** it produces the same errors as server-side validation — zero divergence (FR30, FR33)

## Epic 11: Async Safety & State Cleanup

Consolidates deferred work items from code reviews across Epics 7-10. Addresses race conditions in async operations, missing state cleanup on suite switch, and polling resilience. These are cross-cutting concerns that affect the suite editor, fixture editor, and run polling subsystems.

### Story 11.1: Suite Switch Async Safety and State Reset

As a developer using the suite editor,
I want suite switching to cancel in-flight operations and reset transient UI state,
So that I never see stale data from a previous suite or trigger saves against the wrong suite.

**Acceptance Criteria:**

**AC1: fetchSuite cancellation on suite switch**
**Given** the user is viewing suite A and `fetchSuite(A)` is in flight
**When** the user navigates to suite B (triggering `fetchSuite(B)`)
**Then** the in-flight request for suite A is aborted via AbortController
**And** `activeSuite` is set only from suite B's response

**AC2: saveDefinition cancellation on suite switch**
**Given** a debounced `saveDefinition` call for suite A is pending or in-flight
**When** the user navigates to suite B
**Then** the pending timer is cleared and any in-flight save for suite A is aborted
**And** no save request completes for suite A after the switch

**AC3: saveDefinition cancellation on rapid edits**
**Given** the user is rapidly editing JSON in SuiteJsonEditor or FixtureEditor
**When** a new debounced save fires while a previous save is still in-flight
**Then** the previous in-flight save is aborted via AbortController
**And** only the most recent save completes

**AC4: UI state reset on suite switch**
**Given** the user has expanded groups and is on the Fixture tab viewing suite A
**When** the user switches to suite B
**Then** `editorMode` resets to `'form'`
**And** `expandedGroupIds` is cleared
**And** `fixtureValidationError` is cleared
**And** pending `jsonSaveTimer` and `fixtureSaveTimer` are cleared

**AC5: Polling circuit breaker**
**Given** run polling is active and the network becomes permanently unavailable
**When** consecutive fetch errors exceed a threshold (e.g., 5)
**Then** polling stops automatically
**And** a user-visible error indicates polling was stopped
**And** a "Retry" action is available to resume polling

### Story 11.2: Connection Store Robustness and UX Polish

As a user managing store connections,
I want concurrent store fetches to be safe, loading states to be accurate, and search to give feedback,
So that I always see correct, up-to-date store data with clear status indicators.

**Acceptance Criteria:**

**AC1: fetchStores deduplication**
**Given** `fetchStores()` is already in-flight
**When** a second `fetchStores()` is triggered (e.g., from mount + updateConnection)
**Then** the second call is deduplicated (either awaits the first or is skipped)
**And** `stores.value` is set exactly once from the response

**AC2: Separate loading flags**
**Given** `fetchConnection` and `updateConnection` are independent operations
**When** both are in progress simultaneously
**Then** each has its own loading state
**And** the UI shows the correct spinner for each operation independently

**AC3: storeList reset on fetch error**
**Given** `storeList` contains cached data from a previous successful fetch
**When** `fetchStores()` fails
**Then** `storeList.value` is set to `[]` to prevent stale data display

**AC4: "No stores found" feedback in StoreSelector**
**Given** the user types in the StoreSelector search field
**When** the search filter matches zero stores
**Then** the dropdown shows "No stores found" instead of disappearing silently

**AC5: Error toast cap**
**Given** multiple API errors occur in rapid succession
**When** error toasts are shown
**Then** a maximum of 3 error toasts are visible simultaneously
**And** newer toasts replace the oldest when the cap is exceeded
