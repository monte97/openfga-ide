# Story 4.1: Backend Query Endpoints

Status: done

## Story

As a developer,
I want backend endpoints for all four OpenFGA query types,
so that the frontend can execute permission queries and display results.

## Acceptance Criteria

1. **Given** a store with a model and tuples **When** I send `POST /api/stores/:storeId/query/check` with `{ "user": "user:alice", "relation": "viewer", "object": "document:roadmap" }` **Then** I receive `{ "allowed": true }` or `{ "allowed": false }`

2. **Given** a store with a model and tuples **When** I send `POST /api/stores/:storeId/query/list-objects` with `{ "user": "user:alice", "relation": "viewer", "type": "document" }` **Then** I receive `{ "objects": ["document:roadmap", "document:specs", ...] }`

3. **Given** a store with a model and tuples **When** I send `POST /api/stores/:storeId/query/list-users` with `{ "object": { "type": "document", "id": "roadmap" }, "relation": "viewer" }` **Then** I receive `{ "users": ["user:alice", "user:marco", ...] }`

4. **Given** a store with a model and tuples **When** I send `POST /api/stores/:storeId/query/expand` with `{ "relation": "viewer", "object": "document:roadmap" }` **Then** I receive the expansion tree as returned by the OpenFGA Expand API

5. **Given** invalid query parameters **When** I send a query request with missing or malformed fields **Then** Zod validation returns 400 with `{ "error": "Validation error", "details": "<specifics>" }`

6. **Given** any query endpoint **When** the request completes successfully **Then** the end-to-end response time is under 1 second (NFR3)

## Tasks / Subtasks

- [x] Task 1: TypeScript types for query domain (AC: #1, #2, #3, #4)
  - [x] In `backend/src/types/openfga.ts` (MODIFY existing file), add:
    - `CheckRequest` — `{ user: string, relation: string, object: string, authorizationModelId?: string }`
    - `CheckResponse` — `{ allowed: boolean }`
    - `ListObjectsRequest` — `{ user: string, relation: string, type: string, authorizationModelId?: string }`
    - `ListObjectsResponse` — `{ objects: string[] }`
    - `ListUsersRequest` — `{ object: { type: string, id: string }, relation: string, userFilters?: Array<{ type: string }>, authorizationModelId?: string }`
    - `ListUsersResponse` — `{ users: string[] }`
    - `ExpandRequest` — `{ relation: string, object: string, authorizationModelId?: string }`
    - `ExpandResponse` — `{ tree: unknown }` (OpenFGA tree structure passed through)
    - `OpenFgaCheckResponse` — `{ allowed: boolean, resolution: string }`
    - `OpenFgaListObjectsResponse` — `{ objects: string[] }`
    - `OpenFgaListUsersResponse` — `{ users: Array<{ object: { type: string, id: string } }> }`
    - `OpenFgaExpandResponse` — `{ tree: { root: { name: string, [key: string]: unknown } } }`

- [x] Task 2: Zod schemas for query routes (AC: #1, #2, #3, #4, #5)
  - [x] Create `backend/src/schemas/query.ts`
  - [x] `queryParamsSchema` — `{ storeId: z.string().min(1) }` for route params
  - [x] `checkBodySchema` — `{ user: z.string().min(1), relation: z.string().min(1), object: z.string().min(1) }`
  - [x] `listObjectsBodySchema` — `{ user: z.string().min(1), relation: z.string().min(1), type: z.string().min(1) }`
  - [x] `listUsersBodySchema` — `{ object: z.object({ type: z.string().min(1), id: z.string().min(1) }), relation: z.string().min(1) }`
  - [x] `expandBodySchema` — `{ relation: z.string().min(1), object: z.string().min(1) }`

- [x] Task 3: `query-service.ts` — check, listObjects, listUsers, expand (AC: #1, #2, #3, #4)
  - [x] Create `backend/src/services/query-service.ts`
  - [x] Implement `check(storeId, params)` — calls `openfgaClient.post('/stores/' + storeId + '/check', body)`
    - Build OpenFGA request body: `{ tuple_key: { user, relation, object }, authorization_model_id? }`
    - Transform response: extract `allowed` boolean from `OpenFgaCheckResponse`
    - Return `{ allowed: boolean }`
  - [x] Implement `listObjects(storeId, params)` — calls `openfgaClient.post('/stores/' + storeId + '/list-objects', body)`
    - Build OpenFGA request body: `{ user, relation, type, authorization_model_id? }`
    - Return `{ objects: string[] }` (passthrough, already in correct shape)
  - [x] Implement `listUsers(storeId, params)` — calls `openfgaClient.post('/stores/' + storeId + '/list-users', body)`
    - Build OpenFGA request body: `{ object: { type, id }, relation, user_filters: [{ type }], authorization_model_id? }`
    - Transform `OpenFgaListUsersResponse`: flatten `users` array from `[{ object: { type, id } }]` to `["type:id", ...]` string array
    - Return `{ users: string[] }`
  - [x] Implement `expand(storeId, params)` — calls `openfgaClient.post('/stores/' + storeId + '/expand', body)`
    - Build OpenFGA request body: `{ tuple_key: { relation, object }, authorization_model_id? }`
    - Return `{ tree: response.tree }` (passthrough the tree structure)

- [x] Task 4: `routes/queries.ts` — query POST endpoints (AC: #1, #2, #3, #4, #5)
  - [x] Create `backend/src/routes/queries.ts`
  - [x] Use `Router({ mergeParams: true })` — router is mounted at `/api/stores/:storeId/query` in `app.ts`
  - [x] `POST /check` — validate params + body, call `queryService.check(storeId, body)`, return 200
  - [x] `POST /list-objects` — validate params + body, call `queryService.listObjects(storeId, body)`, return 200
  - [x] `POST /list-users` — validate params + body, call `queryService.listUsers(storeId, body)`, return 200
  - [x] `POST /expand` — validate params + body, call `queryService.expand(storeId, body)`, return 200
  - [x] Apply `validate(queryParamsSchema, 'params')` to all routes
  - [x] Apply respective body schema validation to each route
  - [x] Express 5 async error propagation — no try/catch needed in routes

- [x] Task 5: Register query router in `app.ts` (AC: #1)
  - [x] In `backend/src/app.ts`, import and register: `app.use('/api/stores/:storeId/query', queryRouter)` — BEFORE the error handler middleware

- [x] Task 6: Tests — `query-service.test.ts` (AC: #1, #2, #3, #4)
  - [x] Create `backend/src/services/query-service.test.ts`
  - [x] Mock `openfga-client.ts` using Vitest `vi.mock`
  - [x] Test: `check` — calls POST `/stores/{id}/check` with `{ tuple_key: { user, relation, object } }`, returns `{ allowed: true }`
  - [x] Test: `check` — returns `{ allowed: false }` when OpenFGA returns false
  - [x] Test: `listObjects` — calls POST `/stores/{id}/list-objects` with `{ user, relation, type }`, returns `{ objects: [...] }`
  - [x] Test: `listObjects` — returns `{ objects: [] }` when no objects match
  - [x] Test: `listUsers` — calls POST `/stores/{id}/list-users` with correct body including `user_filters`, returns flattened `{ users: ["user:alice", ...] }`
  - [x] Test: `listUsers` — transforms `[{ object: { type: "user", id: "alice" } }]` to `["user:alice"]`
  - [x] Test: `expand` — calls POST `/stores/{id}/expand` with `{ tuple_key: { relation, object } }`, returns `{ tree: ... }`
  - [x] Test: all service functions propagate errors from openfgaClient (do NOT swallow)

- [x] Task 7: Tests — `routes/queries.test.ts` (AC: #1, #2, #3, #4, #5)
  - [x] Create `backend/src/routes/queries.test.ts`
  - [x] Mock `query-service.ts` using Vitest `vi.mock`
  - [x] Use supertest against the Express app
  - [x] Test: `POST /api/stores/store-01/query/check` with valid body returns 200 with `{ allowed: boolean }`
  - [x] Test: `POST /api/stores/store-01/query/check` with missing fields returns 400 validation error
  - [x] Test: `POST /api/stores/store-01/query/list-objects` with valid body returns 200 with `{ objects: [...] }`
  - [x] Test: `POST /api/stores/store-01/query/list-objects` with missing fields returns 400 validation error
  - [x] Test: `POST /api/stores/store-01/query/list-users` with valid body returns 200 with `{ users: [...] }`
  - [x] Test: `POST /api/stores/store-01/query/list-users` with missing fields returns 400 validation error
  - [x] Test: `POST /api/stores/store-01/query/expand` with valid body returns 200 with `{ tree: ... }`
  - [x] Test: `POST /api/stores/store-01/query/expand` with missing fields returns 400 validation error
  - [x] Test: When service throws (e.g., store not found), error handler returns appropriate status + error envelope

## Dev Notes

### Previous Story Intelligence (Stories 3.1, 2.1)

From Story 3.1 and 2.1 completion notes, the following patterns are confirmed and MUST be followed:

**Stack confirmed working:**
- Express 5.1.0 with ESM (`"type": "module"` in `backend/package.json`) — async errors in routes propagate to error handler automatically, no try/catch needed
- TypeScript 5.9 strict mode
- Pino for structured logging — import via `import { logger } from '../logger.js'`
- Zod v4 for validation via `validate(schema, target?)` middleware — supports `'body' | 'params' | 'query'`
- Vitest for all tests (unit + integration via supertest)

**`openfga-client.ts` interface (Story 1.2):**
```typescript
openfgaClient.get(path: string): Promise<unknown>
openfgaClient.post(path: string, body: unknown): Promise<unknown>
openfgaClient.delete(path: string, body?: unknown): Promise<unknown>
```
Import via: `import { openfgaClient } from '../services/openfga-client.js'`

**Error handling (Story 1.2):**
- Global error handler in `backend/src/middleware/error-handler.ts` catches thrown errors
- Errors from `openfga-client.ts` include `statusCode` and `details` properties — they propagate through Express 5 async routes to the error handler automatically
- Error envelope: `{ error: string, details?: any }`

**Known gotchas from previous stories:**
- `req.params['storeId']` typed as `string | string[]` — use `as string` cast since storeId is always a single path segment
- Vitest mocks require `as unknown as { ... }` double-cast for type assertions
- All imports must use `.js` extensions (ESM with TypeScript)
- Vitest config at `backend/vitest.config.ts` excludes `.stryker-tmp/**`

**Route pattern (confirmed from `tuples.ts`, `model.ts`, `stores.ts`):**
- Routes using `:storeId` from parent mount: `Router({ mergeParams: true })`
- Router mounted at `/api/stores/:storeId/<domain>` in `app.ts`
- Route handlers are thin: validate, call service, return JSON

### Architecture Compliance

- **Thin passthrough route:** `routes/queries.ts` receives HTTP, calls `queryService.*`, returns JSON. No business logic in the route. [Source: architecture.md#Architectural Boundaries]
- **Service layer owns logic:** `query-service.ts` builds OpenFGA request bodies, transforms responses. Routes do NOT construct OpenFGA payloads. [Source: architecture.md#Service Boundaries]
- **Single OpenFGA contact point:** ALL OpenFGA HTTP calls go through `openfga-client.ts`. No direct `fetch`/`axios` calls. [Source: architecture.md#Architectural Boundaries]
- **Error envelope:** `{ error: string, details?: any }` — enforced by global error handler. [Source: architecture.md#Format Patterns]
- **Zod on all routes:** Every route must have Zod validation on params and body. [Source: architecture.md#Authentication & Security]
- **Naming:** `query-service.ts`, `queries.ts` (kebab-case, plural for route file). [Source: architecture.md#Naming Patterns]
- **API endpoints:** `/api/stores/:storeId/query/check`, `/api/stores/:storeId/query/list-objects`, etc. (kebab-case). [Source: architecture.md#Naming Patterns]
- **NFR3:** Query response < 1 second end-to-end. The 5-second `AbortSignal.timeout` in `openfga-client.ts` already enforces a ceiling. [Source: prd.md#Performance]
- **NFR8:** Backend validates and sanitizes all input before forwarding to OpenFGA. [Source: prd.md#Security]

### Critical Technical Details

**OpenFGA Check API:**
```
POST /stores/{storeId}/check
```
Request body:
```json
{
  "tuple_key": {
    "user": "user:alice",
    "relation": "viewer",
    "object": "document:roadmap"
  },
  "authorization_model_id": "optional-model-id"
}
```
Response:
```json
{
  "allowed": true,
  "resolution": ""
}
```
- `tuple_key` wraps the user/relation/object (unlike our frontend-facing flat body)
- `authorization_model_id` is optional — when omitted, OpenFGA uses the latest model

**OpenFGA List Objects API:**
```
POST /stores/{storeId}/list-objects
```
Request body:
```json
{
  "user": "user:alice",
  "relation": "viewer",
  "type": "document",
  "authorization_model_id": "optional-model-id"
}
```
Response:
```json
{
  "objects": ["document:roadmap", "document:specs"]
}
```
- Fields go directly in the body (NO `tuple_key` wrapper for this endpoint)
- Response `objects` array contains full entity identifiers like `"document:roadmap"`

**OpenFGA List Users API:**
```
POST /stores/{storeId}/list-users
```
Request body:
```json
{
  "object": {
    "type": "document",
    "id": "roadmap"
  },
  "relation": "viewer",
  "user_filters": [
    { "type": "user" }
  ],
  "authorization_model_id": "optional-model-id"
}
```
Response:
```json
{
  "users": [
    { "object": { "type": "user", "id": "alice" } },
    { "object": { "type": "user", "id": "marco" } }
  ]
}
```
- `object` is a structured `{ type, id }` NOT a string like `"document:roadmap"`
- `user_filters` is REQUIRED by OpenFGA — at minimum `[{ type: "user" }]`
- Our frontend sends `{ object: { type, id }, relation }` — the service must add `user_filters` if not provided (default to extracting types from context or using a sensible default)
- Response `users` contains objects with nested `{ object: { type, id } }` — our service flattens these to `["user:alice", "user:marco"]` strings for the frontend

**OpenFGA Expand API:**
```
POST /stores/{storeId}/expand
```
Request body:
```json
{
  "tuple_key": {
    "relation": "viewer",
    "object": "document:roadmap"
  },
  "authorization_model_id": "optional-model-id"
}
```
Response:
```json
{
  "tree": {
    "root": {
      "name": "document:roadmap#viewer",
      "union": {
        "nodes": [...]
      }
    }
  }
}
```
- `tuple_key` wraps relation and object (no `user` field for expand)
- The tree structure is complex and recursive — pass it through as-is to the frontend
- Frontend Story 4.3 will handle tree rendering

**Backend endpoint to OpenFGA API mapping:**
| Our Endpoint | Method | OpenFGA Endpoint | OpenFGA Method | Body Wrapping |
|---|---|---|---|---|
| `/api/stores/:storeId/query/check` | POST | `/stores/{storeId}/check` | POST | Wrap in `tuple_key` |
| `/api/stores/:storeId/query/list-objects` | POST | `/stores/{storeId}/list-objects` | POST | Flat (pass fields directly) |
| `/api/stores/:storeId/query/list-users` | POST | `/stores/{storeId}/list-users` | POST | Structured `object`, add `user_filters` |
| `/api/stores/:storeId/query/expand` | POST | `/stores/{storeId}/expand` | POST | Wrap in `tuple_key` (no user) |

**Response transformation summary:**
- **Check:** Extract `allowed` boolean, discard `resolution` → `{ allowed: boolean }`
- **List Objects:** Passthrough `objects` array → `{ objects: string[] }`
- **List Users:** Flatten `[{ object: { type, id } }]` to `["type:id", ...]` → `{ users: string[] }`
- **Expand:** Passthrough `tree` → `{ tree: unknown }`

**Route mounting in `app.ts`:**
```typescript
import queryRouter from './routes/queries.js'
app.use('/api/stores/:storeId/query', queryRouter)
```
Must be placed BEFORE `app.use(errorHandler)`.

**ESM import extensions:** All imports must use `.js` extensions:
```typescript
import { openfgaClient } from '../services/openfga-client.js'
import { logger } from '../logger.js'
```

### File Structure After This Story

```
backend/
└── src/
    ├── app.ts                          # MODIFIED: register query router
    ├── routes/
    │   ├── queries.ts                  # NEW: POST /check, /list-objects, /list-users, /expand
    │   └── queries.test.ts             # NEW: route integration tests
    ├── services/
    │   ├── query-service.ts            # NEW: check, listObjects, listUsers, expand
    │   └── query-service.test.ts       # NEW: service unit tests
    ├── schemas/
    │   └── query.ts                    # NEW: Zod schemas for all query endpoints
    └── types/
        └── openfga.ts                  # MODIFIED: add query request/response types
```

No frontend files are created in this story. Stories 4.2 (Check Query UI) and 4.3 (List Objects, List Users, Expand UI) consume these endpoints.

### What NOT to Do

- **Do NOT implement any frontend code** — Story 4.1 is backend-only. `QueryConsole.vue`, `CheckQuery.vue`, and `frontend/src/stores/queries.ts` are built in Stories 4.2 and 4.3.
- **Do NOT use `@openfga/sdk`** — the project uses `openfga-client.ts` as a thin HTTP client. Never install or use the official SDK for API calls.
- **Do NOT use GET for query endpoints** — all four OpenFGA query APIs are POST. Our backend also exposes POST since query parameters go in the body.
- **Do NOT create a new HTTP client** — use `openfgaClient` from `openfga-client.ts` exclusively.
- **Do NOT put business logic in routes** — request body construction for OpenFGA and response transformation belong in `query-service.ts`.
- **Do NOT hardcode the storeId** — it comes from `req.params.storeId` via the route param.
- **Do NOT use `any` type** — TypeScript strict mode is enforced. Define proper types in `backend/src/types/openfga.ts`.
- **Do NOT use CommonJS `require()`** — backend is ESM (`"type": "module"`). All imports must use `import` with `.js` extensions.
- **Do NOT swallow errors in the service** — let `openfga-client.ts` errors propagate through to the Express error handler. No try/catch in the service.
- **Do NOT forget to wrap check/expand in `tuple_key`** — Check and Expand require `{ tuple_key: { ... } }` wrapping. List Objects and List Users do NOT use `tuple_key`.
- **Do NOT forget `user_filters` for List Users** — OpenFGA requires `user_filters` in the List Users request body. If the frontend doesn't send it, the service should provide a sensible default.
- **Do NOT return raw OpenFGA List Users response** — flatten `[{ object: { type, id } }]` to `["type:id"]` strings for the frontend.

### References

- [Source: epics.md#Story 4.1] — User story, all 6 acceptance criteria
- [Source: prd.md#FR23-FR26] — Permission Queries functional requirements
- [Source: prd.md#NFR3] — Query response < 1 second end-to-end
- [Source: prd.md#NFR8] — Backend validates and sanitizes all input
- [Source: architecture.md#Architectural Boundaries] — openfga-client as single contact point, route->service->client layering
- [Source: architecture.md#API & Communication Patterns] — Thin passthrough proxy, error envelope
- [Source: architecture.md#Naming Patterns] — `queries.ts`, `query-service.ts` kebab-case
- [Source: architecture.md#Structure Patterns] — Backend directory layout, co-located tests
- [Source: architecture.md#Format Patterns] — Error envelope `{ error, details? }`, HTTP status codes (200, 400, 500)
- [Source: implementation-artifacts/3-1-backend-tuple-endpoints.md] — Confirmed stack, Router mergeParams, Vitest patterns, ESM imports
- [Source: implementation-artifacts/2-1-backend-model-endpoint-and-dsl-conversion.md] — openfga-client interface, error-handler pattern, validate middleware

### Review Findings

- [x] [Review][Decision→Patch] `listUsers` user_filters changed to `[{ type: 'user' }]` — was `params.object.type` (object's type); changed to safe default `'user'`; null guard added for wildcard/userset entries; test updated. [query-service.ts, query-service.test.ts]

- [x] [Review][Patch] Missing request types added: CheckRequest, ListObjectsRequest, ListUsersRequest, ExpandRequest [types/openfga.ts]

- [x] [Review][Patch] Error propagation tests added for listUsers and expand [query-service.test.ts]

- [x] [Review][Defer] `validate` middleware does not reassign `req.params` after Zod parse [middleware/validate.ts] — deferred, pre-existing
- [x] [Review][Defer] Whitespace-only strings pass `z.string().min(1)` validation — deferred, pre-existing
- [x] [Review][Defer] 400 response `details` is Zod issue array, not a human-readable string [middleware/validate.ts] — deferred, pre-existing
- [x] [Review][Defer] No NFR performance test for 1-second response time (AC6) — deferred, out of scope for unit tests; AbortSignal timeout in openfga-client enforces ceiling
- [x] [Review][Defer] `storeId` not validated for path-traversal characters [schemas/query.ts] — deferred, pre-existing pattern across all routes
- [x] [Review][Defer] `req.params['storeId'] as string` cast — deferred, pre-existing pattern across all routes

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues. All patterns from Story 3.1 applied cleanly.

### Completion Notes List

- 4 query endpoints: check, list-objects, list-users, expand — all POST
- Check/Expand wrap params in `tuple_key`; List Objects uses flat body; List Users adds `user_filters`
- List Users response flattened from `[{object: {type, id}}]` to `["type:id"]` strings
- Expand tree passed through as-is (frontend renders it)
- 18 new tests (10 service + 8 route); 79 total backend tests pass
- Zod validation on all routes

### File List

- `backend/src/types/openfga.ts` — MODIFIED: added query request/response types
- `backend/src/schemas/query.ts` — NEW: Zod schemas for 4 query endpoints
- `backend/src/services/query-service.ts` — NEW: check, listObjects, listUsers, expand
- `backend/src/services/query-service.test.ts` — NEW: 10 unit tests
- `backend/src/routes/queries.ts` — NEW: 4 POST routes
- `backend/src/routes/queries.test.ts` — NEW: 9 integration tests
- `backend/src/app.ts` — MODIFIED: registered query router

## Change Log

- 2026-03-27: Story file created — status: ready-for-dev
- 2026-03-27: Implementation complete — status: review
