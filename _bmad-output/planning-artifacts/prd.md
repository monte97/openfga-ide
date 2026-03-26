---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments:
  - '/home/monte97/Projects/openfga-playground/docs/superpowers/specs/2026-03-26-openfga-viewer-design.md'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
  externalSpecs: 1
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
workflowType: 'prd'
---

# Product Requirements Document - openfga-viewer

**Author:** monte
**Date:** 2026-03-26

## Executive Summary

OpenFGA Viewer is a standalone web application for managing, visualizing, and simulating changes on OpenFGA authorization stores. It targets developers, platform engineers, and project managers who work with OpenFGA on deployed instances — not just local development setups. Unlike the official Playground, which is coupled to the OpenFGA instance and suffers from CORS limitations when run locally, OpenFGA Viewer operates as an independent service with a backend proxy, providing full control over connectivity, authentication, and server-side logic.

The tool connects to any existing OpenFGA instance via configurable URL and pre-shared key authentication, enabling teams to inspect and manage stores that were deployed without the Playground. It is designed to become part of a commercial suite of services and training materials, with full IP control.

### What Makes This Special

- **Dry-run & Impact Analysis** — Simulate the effect of model and tuple changes before applying them. Answer "who gains or loses access if I do X?" without touching production data.
- **Store Administration** — Full lifecycle management: create, list, delete stores, plus backup/restore and clone across instances.
- **Independent Architecture** — Backend proxy eliminates CORS issues and provides a secure, controllable layer between the UI and OpenFGA. Pre-shared key authentication (v1), with OIDC/mTLS as future evolution.
- **Connect to Real Instances** — Purpose-built for existing deployments, not just local experimentation.
- **Commercial Licensing** — Proprietary license, part of a broader services/training ecosystem. Not constrained by Apache 2.0 limitations of existing alternatives.

## Project Classification

- **Type:** Web application (Vue 3 SPA + Express backend proxy)
- **Domain:** Developer tooling / Infrastructure management
- **Complexity:** Low — standard web stack, well-defined OpenFGA API surface
- **Context:** Greenfield — new project, no existing codebase

## Success Criteria

### User Success

- Developers and platform engineers can connect to any existing OpenFGA instance and immediately visualize models, manage tuples, and run permission queries — without CORS issues or Playground dependency.
- The "aha" moment: simulating a model/tuple change and seeing exactly who gains or loses access before applying it to a real instance.
- The UI is intuitive and frictionless — a developer unfamiliar with the tool can complete core tasks (connect, view model, query permissions) without documentation.
- Non-technical stakeholders (project managers, business) can read the visual model graph and understand green/red query results without developer assistance.

### Business Success

- Good engagement on LinkedIn when promoting the tool — likes, comments, reposts, inbound interest.
- The tool demonstrates expertise in the OpenFGA/authorization space, supporting the broader services and training offering.
- Positive reception from the developer community as a useful, professional-grade tool.

### Technical Success

- Stable connection to OpenFGA instances via backend proxy with pre-shared key authentication.
- Responsive UI with fast rendering of model graphs and relationship visualizations.
- Clean, maintainable codebase (Vue 3 + Express monorepo) that can be extended with simulation features post-MVP.

### Measurable Outcomes

- MVP feature-complete and deployable within a reasonable development cycle.
- Zero CORS-related issues when connecting to remote OpenFGA instances.
- All OpenFGA query types (check, list-objects, list-users, expand) functional through the UI.

## User Journeys

### Journey 1: Marco, the Backend Developer — First Connection

Marco has just joined a team that uses OpenFGA for authorization in their microservices platform. The existing OpenFGA instance is deployed on Kubernetes, but nobody installed the Playground alongside it. Until now, Marco has been using curl commands to inspect the model and test permissions — slow, error-prone, and hard to visualize.

**Opening Scene:** Marco opens OpenFGA Viewer, enters the OpenFGA instance URL and the pre-shared key his team lead shared. He clicks "Test Connection" — green badge, connected.

**Rising Action:** He navigates to Model Viewer and for the first time sees the authorization model as a visual graph — types as nodes, relations as edges. What was a wall of JSON suddenly makes sense. He clicks on the `document` type and sees all its relations and who can access what.

**Climax:** Marco switches to the Query Console, types in `user:marco`, relation `viewer`, object `document:roadmap` — green checkmark, allowed. He tries `editor` — red, denied. In seconds he understands his own permissions without reading a single line of JSON.

**Resolution:** Marco bookmarks the tool. He can now onboard himself on the authorization model independently, test permissions in real-time, and stop bothering the team lead with "do I have access to X?" questions.

**Requirements revealed:** Connection configuration, pre-shared key auth, model visualization, query console, clear visual feedback (green/red).

### Journey 2: Marco, the Backend Developer — Debugging a Permission Issue

A week later, a colleague reports that `user:sara` can't access `document:specs` even though she should be able to. Marco needs to investigate.

**Opening Scene:** Marco opens the Tuple Manager and filters by `object:document:specs`. He sees all tuples related to that document.

**Rising Action:** He switches to the Relationship Graph and searches for `user:sara`. He can see Sara's relationships visually — she's a member of `team:backend`, but there's no edge connecting `team:backend` to `document:specs`. The missing link is obvious in the graph.

**Climax:** Marco adds the missing tuple (`team:backend`, `viewer`, `document:specs`) via the Tuple Manager form. He goes back to Query Console, checks `user:sara` / `viewer` / `document:specs` — green. Fixed.

**Resolution:** What would have been 20 minutes of curl commands and JSON parsing took 3 minutes with a clear visual trail. Marco exports the current state as a backup before moving on.

**Requirements revealed:** Tuple filtering, relationship graph navigation, tuple CRUD, query verification, export/backup.

### Journey 3: Lucia, the Platform Engineer — Store Administration & Backup

Lucia manages three OpenFGA instances: development, staging, and production. She needs to keep them in sync and ensure she can recover from mistakes.

**Opening Scene:** Lucia connects OpenFGA Viewer to the production instance. She navigates to Store Administration and sees all stores listed with their IDs and creation dates.

**Rising Action:** Before a major model update, Lucia runs a full backup of the production store — model + all tuples exported as a single JSON file. She saves it with today's date. She then connects to the staging instance and restores the backup into a new store to test the update safely.

**Climax:** After verifying the model on staging, she's confident. She applies the same change to production, knowing she has a backup ready if anything goes wrong.

**Resolution:** Lucia has a reliable workflow: backup production, test on staging, apply with confidence. No more manual JSON manipulation or scripting. She schedules weekly backups as part of her ops routine.

**Requirements revealed:** Multi-instance connection switching, store listing, backup/restore, import to new store, store CRUD.

### Journey 4: Monte, the Trainer — Live Demo for a Workshop

Monte is running an OpenFGA workshop for a client team. He needs to demonstrate authorization concepts live, with a pre-configured environment.

**Opening Scene:** Monte has prepared a JSON export file with a sample model (users, teams, documents with hierarchical permissions) and realistic tuples. He imports it into a fresh store on his demo OpenFGA instance.

**Rising Action:** He walks the audience through the Model Viewer — showing the visual graph of types and relations. He switches to Tuple Manager and adds a new user to a team live. The Relationship Graph updates, showing the new connections.

**Climax:** Monte opens the Query Console and asks the audience: "Should `user:newbie` have access to `document:confidential`?" He runs the check — red, denied. He then adds `newbie` to the `admin` team, runs the check again — green. The audience sees authorization in action, not as abstract JSON but as a visual, interactive experience.

**Resolution:** The workshop is effective because participants can see cause and effect immediately. Monte shares the export file so attendees can replicate the demo on their own instances using OpenFGA Viewer.

**Requirements revealed:** Import from JSON file, store creation, live tuple manipulation, visual model exploration, query console for interactive demos, export for sharing.

### Journey 5: Alessia, the Project Manager — Proving the Model to Stakeholders

Alessia is the project manager for a platform that uses OpenFGA. The business team has asked for proof that the authorization model correctly enforces their access policies before going live. Alessia is not technical — she doesn't read JSON or DSL — but she needs to verify and demonstrate compliance to stakeholders.

**Opening Scene:** Alessia sits with a developer who opens OpenFGA Viewer and navigates to the Model Viewer. The visual graph shows types and relations in a way Alessia can follow — "So `organization` contains `teams`, and `teams` have access to `repositories`... yes, that matches our policy."

**Rising Action:** They move to the Query Console. Alessia reads from the access policy document: "A team lead should be able to edit any repository in their organization." The developer types the check — green. "An external contractor should NOT be able to see HR documents." Check — red. Each policy rule gets verified live.

**Climax:** Alessia asks the hard question: "What if we remove someone from the `engineering` team — do they immediately lose access to all engineering repos?" They remove the tuple in the Tuple Manager, run the checks — all red. The model enforces revocation correctly. Alessia has the evidence she needs.

**Resolution:** Alessia screenshots the query results and includes them in her compliance report for the business stakeholders. The visual graph and green/red check results are understandable by non-technical people. She doesn't need to trust the developers' word — she can see it herself.

**Requirements revealed:** Visual model graph readable by non-technical users, clear green/red query feedback, ability to run checks from policy language, visual evidence suitable for reports/screenshots.

### Journey Requirements Summary

| Capability | J1 | J2 | J3 | J4 | J5 |
|---|---|---|---|---|---|
| Connection config + pre-shared key | x | | x | | |
| Model Viewer (DSL + graph) | x | | | x | x |
| Tuple Manager (CRUD + filters) | | x | | x | x |
| Query Console (all query types) | x | x | | x | x |
| Relationship Graph | | x | | x | |
| Import/Export | | x | x | x | |
| Store Administration (CRUD, backup/restore) | | | x | x | |

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — deliver a fully functional tool that solves the Playground's limitations (CORS, no connection to existing instances, no store admin) from day one.

**Resource Requirements:** Solo developer. Every feature must justify its implementation cost.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- J1 (First Connection) — fully supported
- J2 (Debugging Permissions) — fully supported
- J3 (Store Admin & Backup) — fully supported
- J4 (Training Demo) — supported (model viewing, not editing)
- J5 (Stakeholder Proof) — fully supported

**Must-Have Capabilities:**
- Connection & Settings — OpenFGA URL + pre-shared key via env vars, test connection, status badge
- Model Viewer — DSL view with syntax highlighting + Vue Flow visual graph (read-only)
- Tuple Manager — data table with filters, add/delete single and batch, pagination
- Query Console — Check, List Objects, List Users, Expand with clear green/red feedback
- Relationship Graph — interactive Vue Flow graph of entities from tuples, dagre layout, colored by type
- Import/Export — export model + tuples as JSON, import to current or new store
- Store Administration — list, create, delete stores, backup and restore

**Deferred from MVP:**
- Model Editor (upload/write new models, diff preview) — moved to Phase 2. In MVP, models are managed via CLI/API or import.

### Phase 2 — Growth

- Model Editor — upload/paste models in JSON or DSL, backend conversion, diff preview before applying
- Dry-run & Impact Analysis — simulate model/tuple changes and visualize permission impact
- Store Clone — backup from one instance, restore to another
- Real-time updates (WebSocket/SSE) if cost is low

### Phase 3 — Expansion

- OIDC / mTLS authentication
- Suite integration with services/training platform

### Risk Mitigation Strategy

**Technical Risks:**
- Vue Flow graph performance with large models (50+ types) — mitigate with lazy rendering, viewport culling, and testing with large models early in development.
- `@openfga/syntax-transformer` compatibility — pin version, test DSL<->JSON conversion thoroughly.

**Market Risks:**
- Low engagement on launch — mitigate with LinkedIn content strategy showing the tool in action (screenshots, short demos of real use cases).
- Competing tools may emerge — the dry-run feature in Phase 2 is the long-term differentiator.

**Resource Risks:**
- Solo developer bottleneck — lean MVP scope already reflects this. If blocked, Model Viewer + Query Console alone provide value.
- Scope creep — strict Phase 1/2/3 boundaries. No Phase 2 work until MVP is shipped.

## Technical Requirements

### Architecture

- **SPA Architecture** — Vue 3 with Composition API, Vite build, Vue Router for navigation, Pinia for state management.
- **Backend Proxy** — Express + TypeScript thin proxy layer. All OpenFGA communication goes through the backend. Frontend never contacts OpenFGA directly.
- **Monorepo** — npm workspaces with `frontend/` and `backend/` packages.
- **Dev Environment** — Docker Compose for local development (frontend + backend).

### Browser Support

| Browser | Support Level |
|---|---|
| Chrome (last 2 major) | Full |
| Firefox (last 2 major) | Full |
| Edge (last 2 major) | Full |
| Safari | Not targeted — may work, not tested |

### Design Constraints

- **Desktop-first** — optimized for 1280px+ viewports. No mobile/tablet layout required.
- **Accessibility** — semantic HTML, keyboard navigation, sufficient color contrast for green/red feedback (not relying on color alone). No formal WCAG AA target.
- **No SSR** — pure client-side SPA.
- **No PWA** — no service worker needed.
- **No i18n** — English only in MVP.
- **No analytics/telemetry** in MVP.

## Functional Requirements

### Connection & Configuration

- FR1: User can configure the OpenFGA instance URL via environment variable
- FR2: User can configure a pre-shared API key via environment variable
- FR3: User can configure a default store ID via environment variable
- FR4: User can view the current connection configuration (URL, store, status)
- FR5: User can update the connection configuration (URL, store) at runtime from the UI
- FR6: User can test the connection to the OpenFGA instance and see success or error feedback
- FR7: User can see the connection status (connected/error) and active store name in the header at all times

### Store Administration

- FR8: User can list all stores on the connected OpenFGA instance
- FR9: User can create a new store with a given name
- FR10: User can delete an existing store
- FR11: User can select a store to work with from the list of existing stores
- FR12: User can backup a store (model + all tuples) as a downloadable JSON file
- FR13: User can restore a store from a previously exported JSON backup file

### Model Viewing

- FR14: User can view the current authorization model in DSL format with syntax highlighting
- FR15: User can view the current authorization model as a visual graph (types as nodes, relations as edges)
- FR16: User can click on a type node in the graph to see its relations, metadata, and directly related user types
- FR17: System converts the JSON model to DSL via `@openfga/syntax-transformer` on the backend

### Tuple Management

- FR18: User can view all tuples in a paginated data table
- FR19: User can filter tuples by type, relation, and user
- FR20: User can add a new tuple (user, relation, object)
- FR21: User can delete a single tuple from the table
- FR22: User can select multiple tuples and delete them in batch

### Permission Queries

- FR23: User can run a Check query (user, relation, object) and see allowed (green) or denied (red) result
- FR24: User can run a List Objects query (user, relation, type) and see the list of accessible objects
- FR25: User can run a List Users query (object type + id, relation) and see the list of users with access
- FR26: User can run an Expand query (relation, object) and see the relation expansion as a collapsible tree view
- FR27: User can switch between query types via a tabbed interface

### Relationship Visualization

- FR28: User can view an interactive graph of concrete entities from tuples (e.g., `user:alice`, `repository:acme/api`)
- FR29: System displays edges labeled with the relation name between entities
- FR30: System visually groups and colors nodes by type
- FR31: User can zoom, pan, and drag nodes in the graph
- FR32: User can filter the graph to show/hide specific types
- FR33: User can click on a node to see all its relationships
- FR34: System uses automatic layout (dagre) for graph positioning

### Import & Export

- FR35: User can export the current store's model and tuples as a single JSON file
- FR36: User can import a JSON file containing model and tuples into the current store
- FR37: User can import a JSON file into a newly created store
- FR38: Export file includes model, tuples, store name, and export timestamp

### Navigation & Layout

- FR39: User can navigate between all pages via a fixed sidebar
- FR40: System displays a header bar with app title, connection status badge, and active store name
- FR41: If no store is selected on startup, the system prompts the user to select or create a store

## Non-Functional Requirements

### Performance

- Page load (initial SPA bundle): < 3 seconds.
- Model graph rendering (up to 20 types): < 2 seconds.
- Query response (Check, List Objects, List Users, Expand): < 1 second end-to-end (frontend -> backend -> OpenFGA -> backend -> frontend).
- Tuple table pagination: smooth scrolling and filtering with up to 10,000 tuples.
- Relationship graph rendering (up to 500 entities): < 3 seconds with dagre layout.

### Security

- Pre-shared API key is stored only on the backend; never exposed to the frontend or included in API responses.
- All frontend-to-backend communication over HTTP (HTTPS when deployed behind a reverse proxy).
- Backend validates and sanitizes all input before forwarding to OpenFGA.
- No credential persistence — API key is read from environment variable on startup only.
- No user authentication in MVP — the tool is assumed to run in a trusted environment (local dev, internal network).

### Integration

- Backend must support OpenFGA API v1 (HTTP REST).
- DSL<->JSON conversion via `@openfga/syntax-transformer` — pin to a tested version, validate on startup.
- Export/import format must be self-contained (model + tuples + metadata in a single JSON file).
- Backend must handle OpenFGA API errors gracefully and return meaningful error messages to the frontend.
