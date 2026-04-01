---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/brainstorming/authorization-test-suite-management.md'
  - '_bmad-output/planning-artifacts/prd.md (original, Epics 1-6)'
  - '_bmad-output/planning-artifacts/architecture.md'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 2
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
workflowType: 'prd'
---

# Product Requirements Document - openfga-viewer

**Author:** monte
**Date:** 2026-03-30

## Executive Summary

OpenFGA Viewer is evolving from an authorization inspection tool into an authorization operations platform. The first capability driving this transformation is **Authorization Test Suite Management** — a full lifecycle for defining, executing, and verifying authorization policy tests against OpenFGA stores.

Today, developers working with OpenFGA have limited options for testing authorization policies: the OpenFGA CLI offers model-level assertions against local files, and generic API tools (Postman, scripts) can hit endpoints but lack domain awareness. Neither provides a structured, repeatable, integration-level testing workflow against deployed or ephemeral stores. The result: authorization policies are deployed on trust, not on evidence.

This feature introduces a complete test lifecycle — define suites in a visual editor or JSON, execute them against ephemeral stores (created, loaded with fixtures, tested, and destroyed automatically), view results with clear pass/fail reporting, and export suite definitions for CI/CD automation. The API-first design ensures every capability is consumable programmatically, making the same tool usable from the UI during development and from a pipeline in production.

The primary user is the developer who writes and maintains OpenFGA authorization models. The visual reporting layer serves a secondary audience: project managers and business stakeholders who need to verify that authorization policies match business rules — without reading code or JSON. This dual-audience design positions the test suite as a communication artifact, not just a technical one.

This feature is the first module in a planned platform expansion. The architectural investments it requires — PostgreSQL for persistence, an async execution engine, server-side business logic — become shared infrastructure for future capabilities already in the backlog. The tool is part of a commercial ecosystem (services + training + consulting) with full IP control.

### What Makes This Special

- **Full integration testing lifecycle** — Define test suites, run them against ephemeral OpenFGA stores (create → load fixture → execute checks → destroy), and verify results. No existing tool covers this end-to-end workflow.
- **Complementary to the OpenFGA CLI** — The CLI validates models statically against local files. This tool validates deployed behavior against real stores. Unit testing vs. integration testing for authorization.
- **API-first, UI-best** — Every feature is available via REST endpoints. The UI is the best client, not the only client. A dedicated CLI can follow without rearchitecting.
- **Dual-audience reporting** — Developers define suites; developers and business stakeholders read results. The same suite that runs in CI is readable by a PM in the browser.
- **Platform foundation** — PostgreSQL, async execution, and API-first aren't just for test suites. They're infrastructure for model editing, dry-run simulation, and future capabilities.

## Project Classification

- **Type:** Web application (Vue 3 SPA + Fastify backend, extending existing openfga-viewer)
- **Domain:** Developer tooling / Authorization infrastructure
- **Complexity:** Medium — introduces persistence (PostgreSQL), async execution engine (state machine), and ephemeral store orchestration to a previously stateless project
- **Context:** Brownfield — extends a fully implemented 6-epic codebase with a new major feature module

## Success Criteria

### User Success

- A developer can define a test suite, run it against an ephemeral store, and see pass/fail results — end to end — without leaving the tool.
- The "aha" moment: exporting a suite definition, dropping it into a CI pipeline, and having it catch an authorization regression automatically. The tool proves its value when it prevents a production incident.
- A project manager or business stakeholder can open a test run report in the UI and understand which authorization policies passed and which failed — without developer assistance.
- The test suite becomes a shared language between developers and business: "here's the proof that our model enforces these rules."

### Business Success

- The tool is usable as a live component in OpenFGA workshops and training sessions — defining and running suites during a demo is smooth and impressive.
- Positive engagement on LinkedIn when showcasing the test suite capability — likes, comments, inbound interest from the OpenFGA community.
- The feature differentiates monte's consulting offering: no competitor can demonstrate structured authorization testing with visual reporting.

### Technical Success

- Ephemeral store lifecycle (create → load fixture → execute checks → destroy) completes reliably, with guaranteed cleanup even on failure.
- Execution engine handles suites of 100+ test cases in under 30 seconds end-to-end.
- PostgreSQL persistence is stable and provides the foundation for future modules without rearchitecting.
- All test suite features are fully available via REST API — the UI consumes the same API that CI/CD pipelines will use.
- Async execution engine correctly manages state transitions (pending → provisioning → running → completed/failed → cleanup) without orphaned resources.

### Measurable Outcomes

- MVP feature-complete: suite CRUD, execution engine, visual editor, run results, import/export — all working end-to-end.
- Zero orphaned ephemeral stores after test runs (cleanup guarantee).
- API response time for suite execution status polling < 200ms.
- Suite of 100 check assertions completes in < 30 seconds including store provisioning and cleanup.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — deliver the complete test lifecycle for `check` assertions. If monte can define a suite, run it against an ephemeral store, see results, and export the definition for CI/CD, the MVP is validated.

**Resource Requirements:** Solo developer. Every feature must justify its implementation cost. The existing codebase (6 epics) provides the foundation — connection management, store context, import/export format.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- J1 (Build confidence in new model) — fully supported
- J1b (Maintain suite after policy change) — fully supported
- J2 (Debug a regression) — supported (pass/fail + test definition, no "why" analysis)
- J3 (Workshop demo) — fully supported
- J4 (Policy compliance evidence) — fully supported
- J5 (CI/CD automated gate) — fully supported
- J6 (DevOps wiring) — fully supported

**Must-Have Capabilities:**
- PostgreSQL setup with migrations and connection pooling
- Suite data model: suites → groups → test cases, with metadata (name, description, tags, severity)
- Suite CRUD API (`/api/suites/*`)
- Fixture management: inline fixture using existing export format (`{ model, tuples }`), editable in suite editor
- Execution engine: async, ephemeral store lifecycle (create → write model → write tuples → run checks → report → destroy), guaranteed cleanup
- Run management API (`/api/runs/*`): create run, poll status, get results
- Visual suite editor: form-based (suite/group/test) + JSON view tab (dual-mode)
- Run results UI: summary (total/passed/failed), per-test pass/fail with test definition visible, timing
- Import/export suite definitions as JSON
- Run history: last run result per suite

**Deferred from MVP:**
- Query types beyond `check` (list-objects, list-users, expand) — deferred to Phase 2
- `$ref` fixture resolution — deferred to Phase 2
- Real-time push (SSE/WebSocket) — polling is sufficient
- "Why" analysis for failures — pass/fail with test definition is enough for MVP
- Advanced run history and retention policies

### Phase 2 — Growth

- Additional query types: `list-objects`, `list-users`, `expand` with assertion matching (subset, superset, exact)
- `$ref` resolution for shared fixtures across suites
- JUnit XML output for native CI integration
- Run on existing store (smoke test mode, non-ephemeral)
- "Why" exploration for failed tests (expand/trace integration)
- Retention policy for run history (keep last N successful, last M failed)
- SSE/WebSocket for real-time execution progress

### Phase 3 — Expansion

- Dedicated CLI wrapper consuming the same API
- Test generation from model (audit/debug — discover unintended side-effects)
- Authorization policy drift detection (scheduled suite runs with alerting)
- Docker image for standalone deployment
- Integration with broader commercial platform

### Risk Mitigation Strategy

**Technical Risks:**
- Ephemeral store performance — benchmark OpenFGA store create/delete latency early (Story 1). If >5 seconds per store, the 30-second target for 100 tests is at risk. Fallback: batch checks per store, or smoke test mode against existing stores.
- PostgreSQL introduction — clean module boundary. Existing features don't depend on it. App starts without it. Risk is low.
- Async execution complexity — state machine is straightforward (5 states, linear transitions). Guaranteed cleanup via try/finally is the critical path.

**Market Risks:**
- Category creation — mitigated by the training/consulting ecosystem. Monte creates demand by using the tool in workshops. The tool IS the methodology.
- Low initial adoption — acceptable. The tool is built for monte first, community second. Dogfooding validates before marketing.

**Resource Risks:**
- Solo developer — MVP scope is deliberately lean. `check`-only, no advanced history, no real-time push. If blocked, the API layer alone provides value (CI/CD can consume it without the UI).

## User Journeys

### Journey 1: Marco, the Backend Developer — Building Confidence in a New Model

Marco has updated the authorization model with a new `project` type and hierarchical permissions. He needs to verify the model enforces the intended access matrix before deploying.

**Opening Scene:** Marco navigates to Test Suites, creates a new suite "Project permissions — access matrix," and sets the fixture to a JSON export from his staging environment.

**Rising Action:** Using the form editor, he builds two groups: "Direct permissions" (15 tests covering basic allow/deny cases) and "Inherited permissions" (8 tests verifying org admins inherit access through the hierarchy). He switches to the JSON tab to review the full suite definition — everything looks clean.

**Climax:** Marco hits "Run Suite." The tool creates an ephemeral store, loads his fixture, executes all 23 checks, and presents results: 21 passed, 2 failed. The two failures are in the inheritance group — org admins can't edit projects. Marco spots the missing relation in his model, fixes it, re-runs. All green.

**Resolution:** Marco exports the suite definition as JSON and commits it to the repo alongside the model change. In CI, the pipeline calls `POST /suites/:id/run`, polls for completion, and gates the merge on all tests passing. Two weeks later, a colleague's model change breaks inherited permissions — the pipeline catches it before it reaches production.

**Requirements revealed:** Suite CRUD, form editor, fixture from export format, ephemeral store execution, pass/fail results, JSON export, API for CI/CD.

### Journey 1b: Marco — Maintaining a Suite After a Policy Change

Three months after creating his "Project permissions" suite, Marco's team introduces a new role: `auditor`. Auditors can view all projects but cannot edit anything. Marco needs to update the test suite.

**Opening Scene:** Marco opens the existing suite in the visual editor. He sees his two existing groups: "Direct permissions" and "Inherited permissions." He adds a third group: "Auditor role."

**Rising Action:** Marco adds 6 new test cases: auditor can view each project type, auditor cannot edit any project type. He also updates one existing test — the old "only editors and admins can access project settings" test now needs to account for auditors having read-only view. He edits the fixture inline to add the auditor tuples.

**Climax:** Marco runs the updated suite. 27/29 passed, 2 failed — the new auditor view tests fail because he missed one tuple in the fixture. He updates the fixture inline, re-runs. All green.

**Resolution:** Marco commits the updated suite JSON. The CI pipeline now validates the auditor role on every future change. The suite evolved alongside the model — it's a living document, not a snapshot.

**Requirements revealed:** Edit existing suites (add/remove groups, add/remove tests), inline fixture viewing and editing, re-run after edits, suite versioning through git (export → commit → import).

### Journey 2: Marco, the Backend Developer — Debugging a Regression

A CI pipeline run fails on Marco's "Project permissions" suite after a colleague's model change. Marco needs to investigate.

**Opening Scene:** Marco opens the failed run in the Test Suites UI. He sees the summary: 21 passed, 2 failed. The failed tests are highlighted in the results list with the full test definition visible alongside the result — `user:orgadmin` / `editor` / `project:alpha` → expected: allowed, actual: denied.

**Rising Action:** Marco reads the test case metadata — description says "Org admins inherit edit access via parent org membership." The test definition and fixture tuples are visible next to the result, giving him immediate context without leaving the tool. He compares with his colleague's model diff.

**Climax:** Marco shows his colleague the failed test report in the UI. No need to explain OpenFGA internals — the test case reads: "orgadmin should be able to edit project:alpha — FAILED." The colleague immediately understands what broke and why.

**Resolution:** The colleague reverts the breaking change. The suite re-runs green. The test suite served as both safety net and communication tool — the failure was understandable by someone who didn't write the test.

**Requirements revealed:** Run results with per-test detail, test definition visible alongside results, test metadata (description), clear pass/fail display, readable by non-authors.

### Journey 3: Monte, the Trainer — Live Workshop Demo

Monte is running an OpenFGA workshop. He wants to demonstrate that authorization policies can be tested systematically, not just manually checked.

**Opening Scene:** Monte has pre-built a suite "Workshop — document access control" with 12 test cases covering viewers, editors, and admin inheritance on a document management model. He imports the suite JSON into the workshop OpenFGA instance via the UI.

**Rising Action:** Monte walks the audience through the suite definition in the visual editor — groups organized by permission level, each test case readable as a sentence: "alice can view document:roadmap," "bob cannot edit document:confidential." The audience sees that authorization rules are expressed as testable assertions.

**Climax:** Monte runs the suite live. The ephemeral store spins up, tests execute, and results appear — all green. He then asks the audience: "What if we remove alice from the editors team?" He modifies one fixture tuple inline and re-runs. One test flips to red. The audience sees cause and effect: change a relationship, break a permission, catch it with a test.

**Resolution:** Monte shares the suite JSON with attendees. They can import it into their own instances and run the same tests. The test suite becomes a teaching artifact — not just a verification tool, but a way to explore how authorization models behave.

**Requirements revealed:** Import suite from JSON, visual editor as read-along tool, inline fixture editing, fast execution for live demos, shareable suite definitions.

### Journey 4: Alessia, the Project Manager — Policy Compliance Evidence

Alessia needs to prove to stakeholders that the authorization model correctly enforces the company's access policies before a production rollout.

**Opening Scene:** Alessia opens the Test Suites section and sees the suite Marco built: "Production access matrix — Q2 policy." She doesn't need to understand the OpenFGA model — she just needs to see whether the policy rules are verified.

**Rising Action:** She clicks on the latest run. The results page shows: 45/45 passed. Each test case reads as a policy assertion: "External contractor cannot access HR documents — PASSED." "Team lead can edit any repository in their organization — PASSED." Alessia can map each test directly to a line in the access policy document.

**Climax:** Alessia screenshots the results summary and the detailed pass/fail list. She includes them in her compliance report. For the first time, she has evidence that the authorization model matches the business rules — not a developer's verbal assurance, but a structured, repeatable verification.

**Resolution:** Alessia requests that the suite be run weekly as part of the ops routine. Any future model change that breaks a policy assertion will be caught before it reaches production. She doesn't need to attend every change — the test suite is her proxy.

**Requirements revealed:** Readable results for non-technical users, run history, test descriptions as policy language, visual report suitable for screenshots/sharing.

### Journey 5: CI/CD Pipeline — Automated Gate

The DevOps team integrates test suite execution into the deployment pipeline. No human interacts with the UI.

**Opening Scene:** The CI pipeline triggers after a model change is pushed. A script calls `POST /api/suites/:id/run` with the suite ID stored in the repo's CI config.

**Rising Action:** The script polls `GET /api/runs/:runId` every 2 seconds. The run transitions: pending → provisioning → running → completed. The ephemeral store is created, fixtures loaded, checks executed, results stored, store destroyed.

**Climax:** The run completes with status `completed` and summary `{ total: 45, passed: 45, failed: 0 }`. The script checks `failed === 0` and exits with code 0. The pipeline proceeds to deploy.

**Resolution:** On a future run, 2 tests fail. The script exits with code 1, blocking the deploy. The developer opens the run in the UI to investigate (→ Journey 2). The pipeline and the UI consume the same API, the same engine, the same results.

**Requirements revealed:** REST API for run creation and status polling, machine-readable run results, non-zero exit semantic (failed > 0), async execution with status transitions, same results viewable in UI.

### Journey 6: Dario, the DevOps Engineer — Wiring Test Suites into CI/CD

Dario needs to integrate authorization test suites into the team's GitHub Actions pipeline. He's comfortable with APIs but has never used OpenFGA Viewer.

**Opening Scene:** Dario receives a message from Marco: "I've built an authorization test suite, ID `suite-42`. Can you add it to the deploy pipeline?" Dario calls `GET /api/suites` to verify the suite exists and see its metadata.

**Rising Action:** Dario writes a pipeline step: `POST /api/suites/suite-42/run` to trigger execution, then polls `GET /api/runs/:runId` until status is `completed` or `failed`. He parses the JSON response for `summary.failed` and exits non-zero if > 0.

**Climax:** Dario runs the pipeline manually. The suite executes in 12 seconds, returns all green. He pushes the pipeline config. From now on, every model change is gated by the test suite — no manual intervention needed.

**Resolution:** A month later, Dario adds a second suite to the pipeline. The pattern is identical — just another suite ID. He never opened the UI. The API was self-explanatory, the status codes predictable, the response format consistent.

**Requirements revealed:** Suite listing API with metadata, predictable response format, clear status codes, fast execution for CI context, multiple suites runnable in sequence.

### Journey Requirements Summary

| Capability | J1 | J1b | J2 | J3 | J4 | J5 | J6 |
|---|---|---|---|---|---|---|---|
| Suite CRUD (create, edit, delete) | x | x | | | | | |
| Form-based visual editor | x | x | | x | | | |
| JSON view/edit tab | x | | | | | | |
| Fixture from export format | x | | | x | | | |
| Inline fixture viewing and editing | | x | | x | | | |
| Ephemeral store execution | x | x | | x | | x | x |
| Pass/fail results per test | x | x | x | x | x | x | x |
| Test definition visible alongside results | | | x | | | | |
| Test metadata (description, tags) | | | x | | x | | |
| Import suite from JSON | | | | x | | | |
| Export suite as JSON | x | x | | x | | | |
| Run history (last result per suite) | | | | | x | | |
| REST API (run, poll, results) | x | | | | | x | x |
| Suite listing API with metadata | | | | | | | x |
| Async execution with status | | | | | | x | x |
| Readable by non-technical users | | | x | x | x | | |
| Multiple suites in sequence | | | | | | | x |

## Innovation & Novel Patterns

### Detected Innovation Areas

- **Authorization integration testing as a category** — Static model validation exists (OpenFGA CLI). Generic API testing exists (Postman, scripts). But domain-aware integration testing against ephemeral stores with structured suite management is a new category. This product creates it.
- **Ephemeral store lifecycle for authorization testing** — Borrowing the testcontainer pattern from database/service testing and applying it to authorization stores. Create → load fixture → execute assertions → destroy. Isolated, repeatable, disposable.
- **Test suites as dual-audience communication artifacts** — The same suite definition is readable by a developer (for debugging), a PM (for compliance evidence), and a CI pipeline (for automated gating). Most testing tools optimize for one audience.

### Market Context & Competitive Landscape

| Tool | Coverage | Gap |
|---|---|---|
| OpenFGA CLI (`model test`) | Static model-level assertions against local files | No deployed stores, no visual, no lifecycle, no persistence |
| Generic API tools (Postman, k6) | Raw HTTP calls to OpenFGA endpoints | No domain awareness, no suite management, no ephemeral stores |
| Ory Permissions (commercial) | Managed service with some testing | Locked to Ory platform, not for self-hosted OpenFGA |
| **openfga-viewer test suites** | Full integration testing lifecycle | — |

No direct competitor occupies this space. The positioning is complementary to the OpenFGA CLI (unit vs. integration testing for authorization).

### Validation Approach

- **Dogfooding first** — monte uses the tool in his own OpenFGA workflow and workshops. If it works for the practitioner who teaches OpenFGA, it works.
- **Workshop validation** — running suites live in training sessions provides immediate user feedback from real OpenFGA practitioners.
- **CI/CD integration proof** — a working GitHub Actions example that gates a deploy on suite results validates the API-first design.

### Risk Mitigation

See **Risk Mitigation Strategy** in the Project Scoping section for the complete risk analysis (technical, market, and resource risks with mitigation plans).

## Technical Requirements

### Architecture

- **Extends existing SPA architecture** — Vue 3 + Composition API, Vite, Vue Router, Pinia. Test suite is a new module within the existing frontend.
- **Backend evolves from proxy to service layer** — Fastify backend gains business logic (execution engine, suite management), persistence (PostgreSQL), and async job processing. Existing proxy routes remain unchanged.
- **PostgreSQL** — new dependency. Used exclusively for test suite state: suite definitions, run records, run results. Existing viewer features remain stateless.
- **Async execution engine** — server-side state machine managing ephemeral store lifecycle. Not a background job queue in MVP — sequential execution within a single request context with status tracking in PostgreSQL.

### Browser Support

| Browser | Support Level |
|---|---|
| Chrome (last 2 major) | Full |
| Firefox (last 2 major) | Full |
| Edge (last 2 major) | Full |
| Safari | Not targeted |

### Design Constraints

- **Desktop-first** — same as existing (1280px+). No mobile/tablet layout.
- **Accessibility** — semantic HTML, keyboard navigation, sufficient color contrast for pass/fail indicators (not relying on color alone — use icons/text alongside green/red). Same bar as existing features.
- **No real-time push in MVP** — UI polls run status via REST. SSE/WebSocket deferred to growth phase.
- **No SSR, no PWA, no i18n** — same as existing.

### API Design

- **API-first** — all test suite features available via REST before UI is built. UI consumes the same API as CI/CD pipelines.
- **Consistent with existing API patterns** — `/api/` prefix, error envelope `{ error, details? }`, Zod validation on all routes.
- **New route namespace** — `/api/suites/*` for suite CRUD, `/api/suites/:id/run` for execution, `/api/runs/*` for run status and results.

### Data Persistence

- **PostgreSQL** — managed via migrations (e.g., node-pg-migrate or Drizzle). Schema includes: `suites`, `runs`, `run_results` tables at minimum.
- **No ORM in MVP** — raw SQL or lightweight query builder (e.g., Kysely, Drizzle) to keep the stack lean.
- **Connection pooling** — pg pool, configured via environment variables (`DATABASE_URL`).

### Implementation Considerations

- **Module boundary** — test suite code is isolated in its own directory (routes, services, stores). It depends on existing connection/store infrastructure but does not modify it.
- **Fixture format** — reuses the existing export format (`{ model, tuples }`) from the Import/Export feature. Zero new format to learn.
- **Ephemeral store cleanup** — must be guaranteed via try/finally or equivalent. Orphaned stores are a critical failure mode.
- **Migration path** — PostgreSQL is optional for existing viewer features. The app must start and serve viewer features even if PostgreSQL is unavailable. Test suite features gracefully degrade or show "database not configured."

## Functional Requirements

### Suite Management

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

### Fixture Management

- FR12: User can define a fixture (model + tuples) inline within a suite definition
- FR13: User can view and edit the fixture (model and tuples) within the suite editor
- FR14: System uses the existing export format (`{ model, tuples }`) as the fixture format

### Test Execution

- FR15: User can trigger execution of an entire test suite
- FR16: System creates an ephemeral OpenFGA store for each test run
- FR17: System loads the suite's fixture (model + tuples) into the ephemeral store before executing tests
- FR18: System executes `check` API calls against the ephemeral store for each test case
- FR19: System compares the actual result against the expected result for each test case
- FR20: System destroys the ephemeral store after test execution completes, regardless of success or failure
- FR21: System tracks execution state transitions (pending → provisioning → running → completed/failed → cleanup)
- FR22: System guarantees no orphaned ephemeral stores remain after execution
- FR23: System distinguishes execution errors (infrastructure failures, OpenFGA unreachable, fixture rejected) from test assertion failures (expected ≠ actual) in run results

### Run Results & History

- FR24: User can view the results of a test run with summary statistics (total, passed, failed, errored, duration)
- FR25: User can view per-test results showing pass/fail/error status, expected vs. actual result, and timing
- FR26: User can see the full test case definition alongside each test result
- FR27: User can view the last run result for each suite from the suite list
- FR28: System persists run results in PostgreSQL

### Import & Export

- FR29: User can export a suite definition as a JSON file
- FR30: User can import a suite definition from a JSON file
- FR31: Suite definition JSON format is compatible with git storage and version control
- FR32: Suite definitions are independent of any specific OpenFGA instance; execution uses the currently active connection

### Validation

- FR33: System validates suite definition structure and fixture format on save
- FR34: System reports specific validation errors to the user on invalid suite definitions
- FR35: System validates fixture format before execution and reports clear errors if invalid

### REST API

- FR36: System exposes CRUD endpoints for suite management (`/api/suites/*`)
- FR37: System exposes an endpoint to trigger suite execution (`POST /api/suites/:id/run`)
- FR38: System exposes endpoints to poll run status and retrieve results (`/api/runs/*`)
- FR39: System exposes an endpoint to list all suites with metadata (`GET /api/suites`)
- FR40: API responses follow the existing error envelope pattern (`{ error, details? }`)
- FR41: API supports running multiple suites in sequence (separate API calls)

### Data Persistence

- FR42: System persists suite definitions in PostgreSQL
- FR43: System persists run records and results in PostgreSQL
- FR44: System manages database schema via migrations
- FR45: System starts and serves existing viewer features when PostgreSQL is unavailable

## Non-Functional Requirements

### Performance

- Suite of 100 check assertions completes in < 30 seconds end-to-end (including ephemeral store provisioning and cleanup).
- Run status polling API responds in < 200ms.
- Suite editor loads a suite with 100+ test cases in < 1 second.
- Results page renders 100 test results in < 500ms.
- PostgreSQL queries for suite CRUD complete in < 50ms.
- Ephemeral store creation and fixture loading completes in < 5 seconds.

### Security

- PostgreSQL connection credentials are stored only in environment variables; never exposed to the frontend or logged.
- Suite definitions and run results are accessible to any user of the tool (no per-user access control in MVP — trusted environment assumption, same as existing viewer).
- API input validation via Zod on all test suite endpoints (consistent with existing patterns).
- Ephemeral stores are created with unique names to prevent collision between concurrent runs.

### Integration

- Backend communicates with OpenFGA via the existing `openfga-client` service for ephemeral store operations (create store, write model, write tuples, check, delete store).
- PostgreSQL connection via standard `DATABASE_URL` environment variable, compatible with all major PostgreSQL hosting providers.
- Suite definition JSON format uses standard JSON with no proprietary encoding — consumable by any HTTP client or scripting language.
- Export format is identical to the existing viewer export format for fixtures (`{ model, tuples }`), ensuring interoperability.

### Reliability

- Ephemeral store cleanup is guaranteed via try/finally or equivalent — no orphaned stores under any failure scenario (network error, process crash during execution, invalid fixture).
- If PostgreSQL is unavailable at startup, existing viewer features continue to work normally. Test suite features show a clear "database not configured" message.
- Run results are persisted to PostgreSQL before ephemeral store cleanup begins — no data loss if cleanup fails.

### Deferred NFR Considerations (Post-MVP)

- **Scalability** — MVP assumes single-user, sequential execution. Future considerations: concurrent test runs (job queue), connection pooling under load, PostgreSQL performance with thousands of stored runs, run result archival/cleanup strategy.
- **Accessibility** — MVP uses the same bar as existing viewer (semantic HTML, keyboard nav, sufficient contrast). Future considerations: WCAG AA compliance for test results reporting (screen reader support for pass/fail tables, aria-live for execution progress), high-contrast mode for green/red indicators, accessible PDF/HTML export of test reports for stakeholder sharing.
