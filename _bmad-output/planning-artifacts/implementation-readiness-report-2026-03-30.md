---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
files:
  prd: prd.md
  architecture: architecture.md
  epics: epics.md
  ux: ux-design-specification.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-03-30
**Project:** openfga-viewer

## Step 1: Document Discovery

### Document Inventory

| Document Type | File | Size | Last Modified |
|---|---|---|---|
| PRD | prd.md | 33.7 KB | Mar 30 2026 |
| Architecture | architecture.md | 31.7 KB | Mar 26 2026 |
| Epics & Stories | epics.md | 46.1 KB | Mar 26 2026 |
| UX Design | ux-design-specification.md | 70.4 KB | Mar 26 2026 |

### Issues
- No duplicates found
- No missing documents
- All 4 required document types present as whole files

## Step 2: PRD Analysis

### Functional Requirements (45 total)

| ID | Requirement |
|---|---|
| FR1 | User can create a new test suite with name, description, and tags |
| FR2 | User can view a list of all test suites with name, description, tags, and last run status |
| FR3 | User can open a test suite for editing |
| FR4 | User can delete a test suite |
| FR5 | User can organize test cases within a suite into named groups with descriptions |
| FR6 | User can add a test case to a group specifying user, relation, object, expected result (allowed/denied), and metadata (description, tags, severity) |
| FR7 | User can edit an existing test case within a suite |
| FR8 | User can remove a test case from a suite |
| FR9 | User can add and remove groups within a suite |
| FR10 | User can view and edit the suite definition as raw JSON (dual-mode editor) |
| FR11 | User can switch between form-based editor and JSON editor without data loss |
| FR12 | User can define a fixture (model + tuples) inline within a suite definition |
| FR13 | User can view and edit the fixture (model and tuples) within the suite editor |
| FR14 | System uses the existing export format ({ model, tuples }) as the fixture format |
| FR15 | User can trigger execution of an entire test suite |
| FR16 | System creates an ephemeral OpenFGA store for each test run |
| FR17 | System loads the suite's fixture (model + tuples) into the ephemeral store before executing tests |
| FR18 | System executes check API calls against the ephemeral store for each test case |
| FR19 | System compares the actual result against the expected result for each test case |
| FR20 | System destroys the ephemeral store after test execution completes, regardless of success or failure |
| FR21 | System tracks execution state transitions (pending -> provisioning -> running -> completed/failed -> cleanup) |
| FR22 | System guarantees no orphaned ephemeral stores remain after execution |
| FR23 | System distinguishes execution errors from test assertion failures in run results |
| FR24 | User can view the results of a test run with summary statistics (total, passed, failed, errored, duration) |
| FR25 | User can view per-test results showing pass/fail/error status, expected vs. actual result, and timing |
| FR26 | User can see the full test case definition alongside each test result |
| FR27 | User can view the last run result for each suite from the suite list |
| FR28 | System persists run results in PostgreSQL |
| FR29 | User can export a suite definition as a JSON file |
| FR30 | User can import a suite definition from a JSON file |
| FR31 | Suite definition JSON format is compatible with git storage and version control |
| FR32 | Suite definitions are independent of any specific OpenFGA instance; execution uses the currently active connection |
| FR33 | System validates suite definition structure and fixture format on save |
| FR34 | System reports specific validation errors to the user on invalid suite definitions |
| FR35 | System validates fixture format before execution and reports clear errors if invalid |
| FR36 | System exposes CRUD endpoints for suite management (/api/suites/*) |
| FR37 | System exposes an endpoint to trigger suite execution (POST /api/suites/:id/run) |
| FR38 | System exposes endpoints to poll run status and retrieve results (/api/runs/*) |
| FR39 | System exposes an endpoint to list all suites with metadata (GET /api/suites) |
| FR40 | API responses follow the existing error envelope pattern ({ error, details? }) |
| FR41 | API supports running multiple suites in sequence (separate API calls) |
| FR42 | System persists suite definitions in PostgreSQL |
| FR43 | System persists run records and results in PostgreSQL |
| FR44 | System manages database schema via migrations |
| FR45 | System starts and serves existing viewer features when PostgreSQL is unavailable |

### Non-Functional Requirements (17 total)

| ID | Category | Requirement |
|---|---|---|
| NFR1 | Performance | Suite of 100 check assertions completes in < 30 seconds end-to-end |
| NFR2 | Performance | Run status polling API responds in < 200ms |
| NFR3 | Performance | Suite editor loads a suite with 100+ test cases in < 1 second |
| NFR4 | Performance | Results page renders 100 test results in < 500ms |
| NFR5 | Performance | PostgreSQL queries for suite CRUD complete in < 50ms |
| NFR6 | Performance | Ephemeral store creation and fixture loading completes in < 5 seconds |
| NFR7 | Security | PostgreSQL credentials stored only in environment variables; never exposed to frontend or logged |
| NFR8 | Security | No per-user access control in MVP (trusted environment assumption) |
| NFR9 | Security | API input validation via Zod on all test suite endpoints |
| NFR10 | Security | Ephemeral stores created with unique names to prevent collision |
| NFR11 | Integration | Backend communicates with OpenFGA via existing openfga-client service |
| NFR12 | Integration | PostgreSQL connection via standard DATABASE_URL environment variable |
| NFR13 | Integration | Suite definition JSON uses standard JSON, consumable by any HTTP client |
| NFR14 | Integration | Export format identical to existing viewer export format for fixtures |
| NFR15 | Reliability | Ephemeral store cleanup guaranteed via try/finally — no orphaned stores |
| NFR16 | Reliability | Existing viewer features work when PostgreSQL is unavailable |
| NFR17 | Reliability | Run results persisted before ephemeral store cleanup begins |

### Additional Requirements & Constraints

- **Module boundary:** Test suite code isolated in its own directory; depends on existing connection/store infrastructure but does not modify it
- **Fixture format:** Reuses existing export format ({ model, tuples }) — zero new format to learn
- **Migration path:** PostgreSQL is optional for existing features; app must start without it
- **No ORM in MVP:** Raw SQL or lightweight query builder (Kysely, Drizzle)
- **Desktop-first:** 1280px+ minimum, no mobile/tablet layout
- **No real-time push in MVP:** UI polls run status via REST
- **Browser support:** Chrome, Firefox, Edge (last 2 major); Safari not targeted

### PRD Completeness Assessment

The PRD is thorough and well-structured. All 45 FRs are clearly numbered and unambiguous. NFRs include specific, measurable targets. User journeys (7 total) comprehensively cover all personas and use cases. Phasing strategy (MVP/Growth/Expansion) is clearly delineated with explicit deferral rationale. Risk mitigation is documented for technical, market, and resource risks.

## Step 3: Epic Coverage Validation

### Critical Finding

**The epics document (`epics.md`) covers the ORIGINAL openfga-viewer Epics 1-6 (FR1-FR41 from the original project scope).** It does NOT contain any epics or stories for the new Authorization Test Suite Management feature described in the current PRD.

The current PRD defines 45 NEW functional requirements (FR1-FR45) for test suite management. These are an entirely different set of requirements from the original viewer FRs (also numbered FR1-FR41 in the epics document). There is a **naming collision** — both documents use FR1, FR2, etc. but for completely different requirements.

### Coverage Matrix

| PRD FR | Requirement Summary | Epic Coverage | Status |
|---|---|---|---|
| FR1 | Create test suite with name, description, tags | **NOT FOUND** | MISSING |
| FR2 | View list of all test suites with metadata | **NOT FOUND** | MISSING |
| FR3 | Open test suite for editing | **NOT FOUND** | MISSING |
| FR4 | Delete a test suite | **NOT FOUND** | MISSING |
| FR5 | Organize test cases into named groups | **NOT FOUND** | MISSING |
| FR6 | Add test case with user, relation, object, expected result, metadata | **NOT FOUND** | MISSING |
| FR7 | Edit existing test case | **NOT FOUND** | MISSING |
| FR8 | Remove test case from suite | **NOT FOUND** | MISSING |
| FR9 | Add and remove groups within suite | **NOT FOUND** | MISSING |
| FR10 | View/edit suite as raw JSON (dual-mode) | **NOT FOUND** | MISSING |
| FR11 | Switch form/JSON editor without data loss | **NOT FOUND** | MISSING |
| FR12 | Define fixture (model + tuples) inline | **NOT FOUND** | MISSING |
| FR13 | View/edit fixture within suite editor | **NOT FOUND** | MISSING |
| FR14 | Use existing export format for fixtures | **NOT FOUND** | MISSING |
| FR15 | Trigger suite execution | **NOT FOUND** | MISSING |
| FR16 | Create ephemeral store per test run | **NOT FOUND** | MISSING |
| FR17 | Load fixture into ephemeral store | **NOT FOUND** | MISSING |
| FR18 | Execute check API calls per test case | **NOT FOUND** | MISSING |
| FR19 | Compare actual vs expected result | **NOT FOUND** | MISSING |
| FR20 | Destroy ephemeral store after execution | **NOT FOUND** | MISSING |
| FR21 | Track execution state transitions | **NOT FOUND** | MISSING |
| FR22 | Guarantee no orphaned ephemeral stores | **NOT FOUND** | MISSING |
| FR23 | Distinguish execution errors from assertion failures | **NOT FOUND** | MISSING |
| FR24 | View run results with summary statistics | **NOT FOUND** | MISSING |
| FR25 | View per-test pass/fail/error with expected vs actual | **NOT FOUND** | MISSING |
| FR26 | See test case definition alongside results | **NOT FOUND** | MISSING |
| FR27 | View last run result per suite from list | **NOT FOUND** | MISSING |
| FR28 | Persist run results in PostgreSQL | **NOT FOUND** | MISSING |
| FR29 | Export suite definition as JSON | **NOT FOUND** | MISSING |
| FR30 | Import suite definition from JSON | **NOT FOUND** | MISSING |
| FR31 | Suite JSON compatible with git/version control | **NOT FOUND** | MISSING |
| FR32 | Suite definitions independent of OpenFGA instance | **NOT FOUND** | MISSING |
| FR33 | Validate suite definition on save | **NOT FOUND** | MISSING |
| FR34 | Report validation errors on invalid definitions | **NOT FOUND** | MISSING |
| FR35 | Validate fixture before execution | **NOT FOUND** | MISSING |
| FR36 | CRUD endpoints for suite management | **NOT FOUND** | MISSING |
| FR37 | Endpoint to trigger suite execution | **NOT FOUND** | MISSING |
| FR38 | Endpoints to poll run status/results | **NOT FOUND** | MISSING |
| FR39 | Endpoint to list suites with metadata | **NOT FOUND** | MISSING |
| FR40 | API error envelope pattern | **NOT FOUND** | MISSING |
| FR41 | API supports running multiple suites in sequence | **NOT FOUND** | MISSING |
| FR42 | Persist suite definitions in PostgreSQL | **NOT FOUND** | MISSING |
| FR43 | Persist run records/results in PostgreSQL | **NOT FOUND** | MISSING |
| FR44 | Manage database schema via migrations | **NOT FOUND** | MISSING |
| FR45 | Serve existing features when PostgreSQL unavailable | **NOT FOUND** | MISSING |

### Coverage Statistics

- **Total PRD FRs:** 45
- **FRs covered in epics:** 0
- **Coverage percentage:** 0%

### Diagnosis

The epics document is from the original project scope (Epics 1-6, already implemented). **New epics and stories need to be created** for the Authorization Test Suite Management PRD before implementation can begin. The architecture document should also be checked to determine if it covers the new feature or only the original scope.

## Step 4: UX Alignment Assessment

### UX Document Status

**Found:** `ux-design-specification.md` (70.4 KB)

However, the UX document covers the **original openfga-viewer** features (Epics 1-6) only. It contains a single "future vision" mention of test suite management but no UX specifications for the new feature.

### Alignment Issues

1. **UX document does not cover the new PRD scope.** The PRD describes a visual suite editor, form-based test case editing, run results UI, pass/fail reporting, dual-mode editor (form + JSON), and import/export flows — none of which have UX specifications.

2. **Architecture document does not cover the new PRD scope.** The architecture document (`architecture.md`) contains no mention of PostgreSQL, migrations, execution engine, ephemeral stores, or test suite management. It covers only the original stateless viewer architecture.

3. **All three supporting documents (architecture, epics, UX) are from the original project scope.** The new PRD is the only document that addresses the Authorization Test Suite Management feature.

### Warnings

- **BLOCKER:** No UX design specification exists for the test suite editor, run results, or any of the 45 PRD functional requirements. Given the dual-audience design (developers + PMs/stakeholders), UX design is critical for this feature.
- **BLOCKER:** No architecture document exists for the new feature. PostgreSQL introduction, execution engine design, async state machine, and ephemeral store lifecycle are significant architectural decisions that need documentation.
- **BLOCKER:** No epics or stories exist for the new feature. The existing epics document is for the original viewer (already implemented).

## Step 5: Epic Quality Review

### Assessment

**No epics exist for the new PRD.** The epic quality review cannot be performed because there are no epics to review for the Authorization Test Suite Management feature.

The existing epics (1-6) for the original viewer are structurally sound — included here for reference:

#### Existing Epics Quality (Original Viewer — Already Implemented)

| Epic | User Value | Independence | Story Structure | Forward Deps |
|---|---|---|---|---|
| Epic 1: Connect & Manage Stores | User-centric | Standalone | Given/When/Then ACs | None |
| Epic 2: Visualize Auth Models | User-centric | Needs Epic 1 only | Given/When/Then ACs | None |
| Epic 3: Manage Tuples | User-centric | Needs Epic 1 only | Given/When/Then ACs | None |
| Epic 4: Query Permissions | User-centric | Needs Epics 1-2 | Given/When/Then ACs | None |
| Epic 5: Visualize Relationships | User-centric | Needs Epics 1, 3 | Given/When/Then ACs | None |
| Epic 6: Import/Export & Backup | User-centric | Needs Epic 1 only | Given/When/Then ACs | None |

The existing epic structure follows best practices and can serve as a template for the new test suite epics.

### Critical Violations

- **No epics for new PRD (BLOCKER):** 45 FRs have zero epic decomposition. Implementation cannot begin.

### Recommendations for New Epics

Based on the PRD's functional requirement groupings, the new test suite feature would logically decompose into epics such as:

1. **PostgreSQL Foundation & Suite Data Model** — FR42-FR45 (persistence, migrations, graceful degradation)
2. **Suite Management & Visual Editor** — FR1-FR14 (CRUD, groups, test cases, fixtures, dual-mode editor)
3. **Execution Engine & Ephemeral Store Lifecycle** — FR15-FR23 (run execution, state machine, cleanup guarantee)
4. **Run Results & History** — FR24-FR28 (results UI, per-test detail, run history)
5. **Import/Export & REST API** — FR29-FR41 (suite import/export, full API surface)
6. **Validation & Error Handling** — FR33-FR35 (validation on save, pre-execution validation)

Note: This is a preliminary suggestion — actual epic design should follow the full create-epics-and-stories workflow to ensure user-centric framing and proper independence.

## Summary and Recommendations

### Overall Readiness Status

**NOT READY**

The project has a thorough, high-quality PRD for the Authorization Test Suite Management feature. However, the three supporting documents required for implementation — Architecture, UX Design, and Epics/Stories — all cover the **original openfga-viewer** (Epics 1-6, already implemented) and contain zero coverage of the new feature.

### Critical Issues Requiring Immediate Action

| # | Issue | Severity | Impact |
|---|---|---|---|
| 1 | **No architecture document for test suite feature** | BLOCKER | PostgreSQL, execution engine, async state machine, and ephemeral store lifecycle are significant architectural decisions without documentation |
| 2 | **No UX design specification for test suite feature** | BLOCKER | Visual suite editor, run results UI, dual-mode editor, and dual-audience reporting have no UX specs |
| 3 | **No epics or stories for test suite feature** | BLOCKER | 45 FRs have zero epic decomposition — implementation cannot begin |
| 4 | **FR numbering collision** | WARNING | Both the new PRD and the existing epics document use FR1, FR2, etc. for different requirements — risks confusion |

### Recommended Next Steps

1. **Create Architecture document** for the test suite feature — covering PostgreSQL schema design, execution engine state machine, ephemeral store lifecycle, API design, module boundaries, and integration with the existing codebase. Use `bmad-create-architecture`.

2. **Create UX Design specification** for the test suite feature — covering suite list view, suite editor (form + JSON dual-mode), fixture editor, run execution UI, run results page, import/export flows. Use `bmad-create-ux-design`.

3. **Create Epics and Stories** decomposing the 45 FRs into implementable work — following the same quality patterns as the existing Epics 1-6. Use `bmad-create-epics-and-stories`.

4. **Resolve FR numbering** — consider prefixing the new PRD's FRs (e.g., TS-FR1 through TS-FR45) or renumbering from FR42 onward to avoid collision with the original viewer FRs (FR1-FR41).

5. **Re-run implementation readiness check** after creating the above documents to validate full coverage and alignment.

### What's in Good Shape

- The **PRD itself is excellent** — 45 clearly numbered FRs, 17 measurable NFRs, 7 comprehensive user journeys, clear phasing strategy, and explicit risk mitigation.
- The **existing codebase** (Epics 1-6) is fully implemented and provides the foundation the new feature will build upon.
- The PRD's technical requirements section provides enough architectural guidance to inform the architecture document creation.

### Final Note

This assessment identified **4 issues** across **3 categories** (architecture, UX, epics). All 3 blocker issues stem from the same root cause: the supporting documents were created for the original viewer scope and have not yet been updated for the new test suite management feature. The PRD is ready — the pipeline needs architecture → UX → epics before implementation can begin.

**Assessed by:** Implementation Readiness Workflow
**Date:** 2026-03-30
