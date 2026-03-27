# Story 3.1: Backend Tuple Endpoints

Status: done

## Story

As a developer,
I want backend endpoints for tuple CRUD with pagination and filtering,
so that the frontend can display, add, and delete tuples on any store.

## Acceptance Criteria

1. **Given** a store with tuples exists **When** I send `GET /api/stores/:storeId/tuples` **Then** I receive `{ "tuples": [...], "continuationToken": "<token>" }` with paginated results

2. **Given** a store with tuples exists **When** I send `GET /api/stores/:storeId/tuples?type=user&relation=viewer&user=user:alice` **Then** I receive only tuples matching all provided filter criteria (AND logic)

3. **Given** valid tuple data **When** I send `POST /api/stores/:storeId/tuples` with `{ "user": "user:alice", "relation": "viewer", "object": "document:roadmap" }` **Then** the tuple is written to the store and I receive 201 with the created tuple

4. **Given** an existing tuple **When** I send `DELETE /api/stores/:storeId/tuples` with `{ "user": "user:alice", "relation": "viewer", "object": "document:roadmap" }` **Then** the tuple is deleted and I receive 200

5. **Given** multiple tuples to delete **When** I send `DELETE /api/stores/:storeId/tuples/batch` with `{ "deletes": [<tuple1>, <tuple2>, ...] }` **Then** all specified tuples are deleted and I receive 200 with a count of deleted tuples

6. **Given** invalid tuple data (missing fields, wrong format) **When** I send `POST /api/stores/:storeId/tuples` **Then** Zod validation returns 400 with `{ "error": "Validation error", "details": "<specifics>" }`

## Tasks / Subtasks

- [x] Task 1: TypeScript types for tuple domain (AC: #1, #2, #3, #4, #5)
  - [x] In `backend/src/types/openfga.ts` (MODIFY existing file), add:
    - `TupleKey` — `{ user: string, relation: string, object: string }`
    - `Tuple` — `{ key: TupleKey, timestamp: string }` (as returned by OpenFGA Read API)
    - `ReadTuplesResponse` — `{ tuples: Tuple[], continuationToken: string | null }` (our backend response shape, camelCase)
    - `OpenFgaReadResponse` — `{ tuples: Array<{ key: { user: string, relation: string, object: string }, timestamp: string }>, continuation_token: string }` (raw OpenFGA shape, snake_case)

- [x] Task 2: Zod schemas for tuple routes (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `backend/src/schemas/tuple.ts`
  - [x] `tupleParamsSchema` — `{ storeId: z.string().min(1) }` for route params
  - [x] `tupleQuerySchema` — `{ type: z.string().optional(), relation: z.string().optional(), user: z.string().optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(), continuationToken: z.string().optional() }` for GET query params
  - [x] `tupleBodySchema` — `{ user: z.string().min(1), relation: z.string().min(1), object: z.string().min(1) }` for POST body and DELETE body
  - [x] `tupleBatchDeleteSchema` — `{ deletes: z.array(tupleBodySchema).min(1).max(100) }` for DELETE /batch

- [x] Task 3: `tuple-service.ts` — read, write, delete tuples (AC: #1, #2, #3, #4, #5)
  - [x] Create `backend/src/services/tuple-service.ts`
  - [x] Implement `readTuples(storeId, filters?)` — calls `openfgaClient.post('/stores/' + storeId + '/read', body)` (NOTE: OpenFGA Read is POST, not GET!)
    - Build request body: `{ tuple_key: { user?, relation?, object? }, page_size?, continuation_token? }`
    - For `type` filter (from query param): map to `tuple_key.object` prefix — the OpenFGA Read API filters by object type when `object` is set to `<type>:` (with colon). So `type=document` becomes `tuple_key.object = "document:"`
    - For `relation` filter: set `tuple_key.relation`
    - For `user` filter: set `tuple_key.user`
    - Omit any field from `tuple_key` that is not provided (partial filters are valid)
    - If `tuple_key` would be empty (no filters), omit it entirely from the body
    - Transform OpenFGA snake_case response to camelCase: `continuation_token` -> `continuationToken`
    - Return `{ tuples: [...], continuationToken: token || null }`
  - [x] Implement `writeTuple(storeId, tupleKey)` — calls `openfgaClient.post('/stores/' + storeId + '/write', { writes: { tuple_keys: [tupleKey] } })`
    - Returns the tuple key that was written
  - [x] Implement `deleteTuple(storeId, tupleKey)` — calls `openfgaClient.post('/stores/' + storeId + '/write', { deletes: { tuple_keys: [tupleKey] } })`
    - NOTE: OpenFGA uses the `/write` endpoint for BOTH writes and deletes, with `writes` and `deletes` fields in the body
  - [x] Implement `deleteTuplesBatch(storeId, tupleKeys)` — calls `openfgaClient.post('/stores/' + storeId + '/write', { deletes: { tuple_keys: tupleKeys } })`
    - Returns `{ deleted: tupleKeys.length }`

- [x] Task 4: `routes/tuples.ts` — tuple CRUD endpoints (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `backend/src/routes/tuples.ts`
  - [x] Use `Router({ mergeParams: true })` — router is mounted at `/api/stores/:storeId/tuples` in `app.ts`
  - [x] `GET /` — validate params + query, call `tupleService.readTuples(storeId, filters)`, return 200
  - [x] `POST /` — validate params + body, call `tupleService.writeTuple(storeId, tupleKey)`, return 201
  - [x] `DELETE /` — validate params + body, call `tupleService.deleteTuple(storeId, tupleKey)`, return 200
  - [x] `DELETE /batch` — validate params + body, call `tupleService.deleteTuplesBatch(storeId, tupleKeys)`, return 200
  - [x] Apply `validate(tupleParamsSchema, 'params')` to all routes
  - [x] Apply `validate(tupleQuerySchema, 'query')` to GET route
  - [x] Apply `validate(tupleBodySchema)` to POST and DELETE / routes
  - [x] Apply `validate(tupleBatchDeleteSchema)` to DELETE /batch route
  - [x] Express 5 async error propagation — no try/catch needed in routes

- [x] Task 5: Register tuple router in `app.ts` (AC: #1)
  - [x] In `backend/src/app.ts`, import and register: `app.use('/api/stores/:storeId/tuples', tupleRouter)` — BEFORE the error handler middleware

- [x] Task 6: Tests — `tuple-service.test.ts` (AC: #1, #2, #3, #4, #5)
  - [x] Create `backend/src/services/tuple-service.test.ts`
  - [x] Mock `openfga-client.ts` using Vitest `vi.mock`
  - [x] Test: `readTuples` without filters — calls POST `/stores/{id}/read` with empty body, returns transformed response
  - [x] Test: `readTuples` with type filter — sends `tuple_key.object = "document:"` (with colon)
  - [x] Test: `readTuples` with all filters — sends correct `tuple_key` with user, relation, object
  - [x] Test: `readTuples` with pagination params — sends `page_size` and `continuation_token`
  - [x] Test: `readTuples` transforms `continuation_token` to `continuationToken` in response
  - [x] Test: `writeTuple` — calls POST `/stores/{id}/write` with `{ writes: { tuple_keys: [...] } }`
  - [x] Test: `deleteTuple` — calls POST `/stores/{id}/write` with `{ deletes: { tuple_keys: [...] } }`
  - [x] Test: `deleteTuplesBatch` — calls POST `/stores/{id}/write` with multiple tuple keys in deletes
  - [x] Test: service propagates errors from openfgaClient (do NOT swallow)

- [x] Task 7: Tests — `routes/tuples.test.ts` (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `backend/src/routes/tuples.test.ts`
  - [x] Mock `tuple-service.ts` using Vitest `vi.mock`
  - [x] Use supertest against the Express app
  - [x] Test: `GET /api/stores/store-01/tuples` returns 200 with `{ tuples, continuationToken }`
  - [x] Test: `GET /api/stores/store-01/tuples?type=user&relation=viewer` passes filters to service
  - [x] Test: `POST /api/stores/store-01/tuples` with valid body returns 201
  - [x] Test: `POST /api/stores/store-01/tuples` with missing fields returns 400 validation error
  - [x] Test: `DELETE /api/stores/store-01/tuples` with valid body returns 200
  - [x] Test: `DELETE /api/stores/store-01/tuples/batch` with valid body returns 200 with count
  - [x] Test: `DELETE /api/stores/store-01/tuples/batch` with empty array returns 400 validation error
  - [x] Test: When service throws (e.g., store not found), error handler returns appropriate status + error envelope

### Review Findings

- [x] [Review][Patch] pageSize query param forwarded as string — fixed: Number() cast in service
- [x] [Review][Defer] Single delete response {success} vs batch {deleted} — minor inconsistency, deferred

## Dev Notes

### Previous Story Intelligence (Stories 2.1, 1.6, 1.2)

From Story 2.1 completion notes and Epic 1/2 dev records, the following patterns are confirmed and MUST be followed:

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

**Known gotchas from Story 2.1 Dev Agent Record:**
- `req.params['storeId']` typed as `string | string[]` — use `as string` cast since storeId is always a single path segment
- Vitest mocks require `as unknown as { ... }` double-cast for type assertions
- All imports must use `.js` extensions (ESM with TypeScript)
- Vitest config at `backend/vitest.config.ts` excludes `.stryker-tmp/**`

**Route pattern (confirmed from `model.ts` and `stores.ts`):**
- Routes using `:storeId` from parent mount: `Router({ mergeParams: true })`
- Routes self-contained (like stores.ts): `Router()` with full path
- Model router mounted at `/api/stores/:storeId/model` — follow same pattern for tuples

### Architecture Compliance

- **Thin passthrough route:** `routes/tuples.ts` receives HTTP, calls `tupleService.*`, returns JSON. No business logic in the route. [Source: architecture.md#Architectural Boundaries]
- **Service layer owns logic:** `tuple-service.ts` builds OpenFGA request bodies, transforms responses. Routes do NOT construct OpenFGA payloads. [Source: architecture.md#Service Boundaries]
- **Single OpenFGA contact point:** ALL OpenFGA HTTP calls go through `openfga-client.ts`. No direct `fetch`/`axios` calls. [Source: architecture.md#Architectural Boundaries]
- **Error envelope:** `{ error: string, details?: any }` — enforced by global error handler. [Source: architecture.md#Format Patterns]
- **Zod on all routes:** Every route (GET, POST, DELETE) must have Zod validation. [Source: architecture.md#Authentication & Security]
- **Naming:** `tuple-service.ts`, `tuples.ts` (kebab-case, plural for route file). [Source: architecture.md#Naming Patterns]
- **NFR4:** Tuple table must handle 10K tuples smoothly — backend must support pagination properly. [Source: prd.md#Performance]
- **NFR8:** Backend validates and sanitizes all input before forwarding to OpenFGA. [Source: prd.md#Security]

### Critical Technical Details

**OpenFGA Read Tuples API (POST, not GET!):**
```
POST /stores/{storeId}/read
```
Request body:
```json
{
  "tuple_key": {
    "user": "user:alice",
    "relation": "viewer",
    "object": "document:"
  },
  "page_size": 50,
  "continuation_token": "eyJza..."
}
```
- It is `POST`, not GET — OpenFGA uses POST for read because filter criteria go in the body
- `tuple_key` fields are ALL optional — omit any field to not filter by it
- If no filters at all, omit `tuple_key` entirely or send `{}`
- To filter by object type (e.g., all `document` tuples), set `object` to `"document:"` (type followed by colon)
- Response:
```json
{
  "tuples": [
    {
      "key": { "user": "user:alice", "relation": "viewer", "object": "document:roadmap" },
      "timestamp": "2026-03-27T10:30:00Z"
    }
  ],
  "continuation_token": "eyJza..."
}
```
- `continuation_token` is empty string `""` when no more pages (NOT null/undefined)

**OpenFGA Write Tuples API (single endpoint for writes AND deletes!):**
```
POST /stores/{storeId}/write
```
Write request body:
```json
{
  "writes": {
    "tuple_keys": [
      { "user": "user:alice", "relation": "viewer", "object": "document:roadmap" }
    ]
  }
}
```
Delete request body:
```json
{
  "deletes": {
    "tuple_keys": [
      { "user": "user:alice", "relation": "viewer", "object": "document:roadmap" }
    ]
  }
}
```
- The `/write` endpoint handles BOTH writes and deletes via separate fields in the body
- Returns `{}` (empty object) on success with 200 status
- Can include both `writes` and `deletes` in the same request (not needed for this story, but good to know)

**Backend endpoint to OpenFGA API mapping:**
| Our Endpoint | Method | OpenFGA Endpoint | OpenFGA Method |
|---|---|---|---|
| `GET /api/stores/:storeId/tuples` | GET | `/stores/{storeId}/read` | POST |
| `POST /api/stores/:storeId/tuples` | POST | `/stores/{storeId}/write` | POST |
| `DELETE /api/stores/:storeId/tuples` | DELETE | `/stores/{storeId}/write` | POST |
| `DELETE /api/stores/:storeId/tuples/batch` | DELETE | `/stores/{storeId}/write` | POST |

**Response transformation (snake_case from OpenFGA to camelCase for frontend):**
- `continuation_token` -> `continuationToken`
- Tuple `key` object fields (`user`, `relation`, `object`) are already camelCase-compatible
- `timestamp` stays as-is

**Route mounting in `app.ts`:**
```typescript
import tupleRouter from './routes/tuples.js'
app.use('/api/stores/:storeId/tuples', tupleRouter)
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
    ├── app.ts                          # MODIFIED: register tuple router
    ├── routes/
    │   ├── tuples.ts                   # NEW: GET, POST, DELETE, DELETE /batch
    │   └── tuples.test.ts              # NEW: route integration tests
    ├── services/
    │   ├── tuple-service.ts            # NEW: readTuples, writeTuple, deleteTuple, deleteTuplesBatch
    │   └── tuple-service.test.ts       # NEW: service unit tests
    ├── schemas/
    │   └── tuple.ts                    # NEW: Zod schemas for all tuple endpoints
    └── types/
        └── openfga.ts                  # MODIFIED: add TupleKey, Tuple, ReadTuplesResponse, OpenFgaReadResponse
```

No frontend files are created in this story. Stories 3.2 (Tuple Table) and 3.3 (Add/Delete Tuples) consume these endpoints.

### What NOT to Do

- **Do NOT implement any frontend code** — Story 3.1 is backend-only. `TupleTable.vue`, `TupleForm.vue`, and `frontend/src/stores/tuples.ts` are built in Stories 3.2 and 3.3.
- **Do NOT use `@openfga/sdk`** — the project uses `openfga-client.ts` as a thin HTTP client. Never install or use the official SDK for API calls.
- **Do NOT use GET for reading tuples** — OpenFGA's Read API is POST (filters go in the request body). Our backend exposes GET to the frontend but internally calls POST on OpenFGA.
- **Do NOT use `openfgaClient.delete()` for tuple deletion** — OpenFGA uses the `/write` endpoint for both writes and deletes. Use `openfgaClient.post()` with a `deletes` field in the body.
- **Do NOT create a new HTTP client** — use `openfgaClient` from `openfga-client.ts` exclusively.
- **Do NOT put business logic in routes** — request body construction for OpenFGA and response transformation belong in `tuple-service.ts`.
- **Do NOT hardcode the storeId** — it comes from `req.params.storeId` via the route param.
- **Do NOT use `any` type** — TypeScript strict mode is enforced. Define proper types in `backend/src/types/openfga.ts`.
- **Do NOT use CommonJS `require()`** — backend is ESM (`"type": "module"`). All imports must use `import` with `.js` extensions.
- **Do NOT swallow errors in the service** — let `openfga-client.ts` errors propagate through to the Express error handler. No try/catch in the service unless there is a specific graceful degradation requirement (there isn't for tuples, unlike the DSL transformer).
- **Do NOT forget to transform `continuation_token` to `continuationToken`** — the frontend expects camelCase. Check for empty string `""` and convert to `null`.

### References

- [Source: epics.md#Story 3.1] — User story, all 6 acceptance criteria
- [Source: prd.md#FR18-FR22] — Tuple Management functional requirements
- [Source: prd.md#NFR4] — Tuple table pagination: smooth with up to 10,000 tuples
- [Source: prd.md#NFR8] — Backend validates and sanitizes all input
- [Source: architecture.md#Architectural Boundaries] — openfga-client as single contact point, route->service->client layering
- [Source: architecture.md#API & Communication Patterns] — Thin passthrough proxy, error envelope
- [Source: architecture.md#Naming Patterns] — `tuples.ts`, `tuple-service.ts` kebab-case
- [Source: architecture.md#Structure Patterns] — Backend directory layout, co-located tests
- [Source: architecture.md#Format Patterns] — Error envelope `{ error, details? }`, HTTP status codes (200, 201, 400, 404, 500)
- [Source: implementation-artifacts/2-1-backend-model-endpoint-and-dsl-conversion.md] — Confirmed stack, Router mergeParams, Vitest double-cast pattern, ESM import extensions
- [Source: implementation-artifacts/1-2-backend-proxy-core-and-connection-management.md] — openfga-client interface, error-handler pattern, validate middleware

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues encountered. All patterns from Story 2.1 applied cleanly.

### Completion Notes List

- `TupleKey`, `Tuple`, `ReadTuplesResponse`, `OpenFgaReadResponse` types added to `openfga.ts`
- Zod schemas: `tupleParamsSchema`, `tupleQuerySchema`, `tupleBodySchema`, `tupleBatchDeleteSchema` in `schemas/tuple.ts`
- `tuple-service.ts`: `readTuples` (POST /read with filters + pagination + snake→camelCase), `writeTuple`, `deleteTuple`, `deleteTuplesBatch` (all via POST /write)
- `routes/tuples.ts`: GET, POST, DELETE, DELETE /batch with Zod validation on all routes
- Router registered in `app.ts` at `/api/stores/:storeId/tuples` before error handler
- 18 new backend tests (10 service + 8 route); 61 total backend tests pass

### File List

- `backend/src/types/openfga.ts` — MODIFIED: added TupleKey, Tuple, ReadTuplesResponse, OpenFgaReadResponse
- `backend/src/schemas/tuple.ts` — NEW: Zod schemas for tuple endpoints
- `backend/src/services/tuple-service.ts` — NEW: readTuples, writeTuple, deleteTuple, deleteTuplesBatch
- `backend/src/services/tuple-service.test.ts` — NEW: 10 unit tests
- `backend/src/routes/tuples.ts` — NEW: GET, POST, DELETE, DELETE /batch
- `backend/src/routes/tuples.test.ts` — NEW: 8 integration tests
- `backend/src/app.ts` — MODIFIED: registered tuple router

## Change Log

- 2026-03-27: Story file created — status: ready-for-dev
- 2026-03-27: Implementation complete — status: review
- 2026-03-27: Code review complete — status: done
