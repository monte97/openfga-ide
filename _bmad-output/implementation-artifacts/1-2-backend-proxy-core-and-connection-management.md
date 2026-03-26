# Story 1.2: Backend Proxy Core and Connection Management

Status: review

## Story

As a developer,
I want the backend to connect to an OpenFGA instance and expose connection status endpoints,
so that the frontend can verify connectivity and the backend can proxy all OpenFGA operations securely.

## Acceptance Criteria

1. **Given** environment variables OPENFGA_URL and OPENFGA_API_KEY are set **When** the backend starts **Then** it creates an HTTP client configured to forward requests to the OpenFGA instance with the pre-shared key in the Authorization header
2. **Given** OPENFGA_STORE_ID is set in environment variables **When** the backend starts **Then** it uses that store ID as the default active store
3. **Given** the backend is running and connected **When** I send GET /api/connection **Then** I receive `{ "url": "<configured_url>", "storeId": "<active_store_id>", "status": "connected" }` with the API key NOT included in the response
4. **Given** the backend is running **When** I send POST /api/connection/test with `{ "url": "<openfga_url>" }` **Then** the backend attempts to reach the OpenFGA instance and returns `{ "status": "connected" }` on success or `{ "error": "Connection failed", "details": "<reason>" }` on failure
5. **Given** an invalid request body is sent to any backend endpoint **When** the Zod validation middleware processes the request **Then** it returns 400 with `{ "error": "Validation error", "details": "<zod_errors>" }`
6. **Given** the OpenFGA instance returns an error **When** the backend forwards the request **Then** it logs the error with Pino, wraps it in the error envelope `{ "error": "<message>", "details": "<context>" }`, and returns an appropriate HTTP status code (400/404/500)

## Tasks / Subtasks

- [x] Task 1: Config module and environment loading (AC: #1, #2)
  - [x] Create `backend/src/config.ts` — loads and validates env vars: OPENFGA_URL, OPENFGA_API_KEY, OPENFGA_STORE_ID, PORT
  - [x] Export typed config object with defaults (PORT=3000, OPENFGA_URL=http://localhost:8080)
  - [x] Update `backend/src/server.ts` to use config module instead of raw process.env
- [x] Task 2: Pino logger setup (AC: #6)
  - [x] Install `pino` v10.3.1 dependency
  - [x] Create Pino logger instance in `backend/src/logger.ts` (dedicated file)
  - [x] Configure structured JSON logging with configurable level
- [x] Task 3: OpenFGA HTTP client (AC: #1, #2)
  - [x] Create `backend/src/services/openfga-client.ts`
  - [x] Implement HTTP client that injects Authorization: Bearer header with pre-shared key
  - [x] Accept base URL as mutable config (updateUrl, updateApiKey methods)
  - [x] Expose methods: `get(path)`, `post(path, body)`, `delete(path, body)` using native fetch()
  - [x] Store active storeId from config (mutable via public property)
  - [x] Implement testConnection(url?) method via GET /stores
- [x] Task 4: Error handler middleware (AC: #6)
  - [x] Create `backend/src/middleware/error-handler.ts`
  - [x] Catch all errors, log with Pino (include request method, path, error message, stack)
  - [x] Return consistent error envelope: `{ "error": "<message>", "details": "<context>" }`
  - [x] Map error types to HTTP status codes via err.statusCode, default 500
  - [x] Register as last middleware in `backend/src/app.ts`
- [x] Task 5: Zod validation middleware (AC: #5)
  - [x] Install `zod` v4.3.6 dependency
  - [x] Create `backend/src/middleware/validate.ts` — factory function: `validate(schema)` returns Express middleware
  - [x] Validates `req.body` against provided Zod schema via safeParse
  - [x] On failure: returns 400 with `{ "error": "Validation error", "details": <zod_issues> }`
- [x] Task 6: Connection routes (AC: #3, #4)
  - [x] Create `backend/src/routes/connection.ts`
  - [x] GET /api/connection — returns `{ url, storeId, status }` (API key NEVER included)
  - [x] POST /api/connection/test — accepts `{ url }`, attempts connection, returns `{ status: "connected" }` or 502 error envelope
  - [x] Create `backend/src/schemas/connection.ts` — Zod schema for test connection request body
  - [x] Register routes in `backend/src/app.ts`
- [x] Task 7: API types (AC: #3, #4, #6)
  - [x] Create `backend/src/types/api.ts` — ErrorEnvelope type, ConnectionStatus type
  - [x] Create `backend/src/types/openfga.ts` — StoreInfo, ListStoresResponse types
- [x] Task 8: Tests (AC: #1-6)
  - [x] Create `backend/src/services/openfga-client.test.ts` — 7 tests: auth header injection, URL construction, error handling, mutable URL, testConnection
  - [x] Create `backend/src/routes/connection.test.ts` — 4 tests: GET /api/connection, POST validation, unreachable URL, health regression
  - [x] Create `backend/src/middleware/error-handler.test.ts` — 3 tests: generic error, statusCode, details
  - [x] Create `backend/src/middleware/validate.test.ts` — 3 tests: valid body, missing fields, invalid format
  - [x] Install vitest v4.1.2 for backend, added test script to package.json

## Dev Notes

### Previous Story Intelligence (Story 1.1)

- Express 5.1.0 is installed (latest stable, supports async error handling natively)
- Backend uses ESM (`"type": "module"` in package.json)
- TypeScript 5.9 with strict mode, target ES2022, module Node16
- `tsx --watch` for dev, `tsc` for build
- `backend/src/app.ts` exists with Express app + `/api/health` route
- `backend/src/server.ts` exists with dotenv + listen

### Architecture Compliance

- **Config:** Create `backend/src/config.ts` for env var loading. [Source: architecture.md#Project Structure]
- **OpenFGA client:** `backend/src/services/openfga-client.ts` is the SINGLE point of contact with OpenFGA. ALL services use it. Auth header injected here. URL must be mutable (supports runtime update in Story 1.5). [Source: architecture.md#Architectural Boundaries]
- **Error handling:** Global error handler middleware → Pino log → error envelope `{ error, details? }`. HTTP status: 200/201 success, 400 validation, 404 not found, 500 server/OpenFGA error. [Source: architecture.md#Format Patterns]
- **Validation:** Zod on ALL backend routes via `validate.ts` middleware factory. [Source: architecture.md#Authentication & Security]
- **Logging:** Pino for structured JSON logging. [Source: architecture.md#Infrastructure & Deployment]
- **API pattern:** Thin passthrough proxy — mirrors OpenFGA REST API under `/api/*`. Backend adds: auth injection, Zod validation, error translation. [Source: architecture.md#API & Communication Patterns]
- **Security:** API key NEVER exposed to frontend. Read from OPENFGA_API_KEY env var only. [Source: architecture.md#Authentication & Security]
- **Backend file naming:** kebab-case: `openfga-client.ts`, `error-handler.ts`, `validate.ts`. [Source: architecture.md#Naming Patterns]
- **Test location:** Co-located — `openfga-client.test.ts` next to `openfga-client.ts`. [Source: architecture.md#Structure Patterns]

### Critical Technical Details

- **Zod v4:** Use `zod` v4.x (latest). Import as `import { z } from 'zod'`. v4 has different error format than v3 — use `z.safeParse()` and format errors with `error.issues`
- **Pino:** Install `pino`. Create logger: `import pino from 'pino'; const logger = pino()`. In error handler: `logger.error({ err, req: { method, url } }, 'Request failed')`
- **Express 5 async errors:** Express 5 automatically catches async errors in route handlers — no need for `express-async-errors` wrapper or manual try/catch in every route. But the global error handler middleware must still be registered as the LAST middleware
- **OpenFGA connection test:** The simplest way to test connectivity is `GET /stores` on the OpenFGA instance — if it returns 200, the instance is reachable. Use native `fetch()` (available in Node 22)
- **OpenFGA auth:** The pre-shared key goes in `Authorization: Bearer <key>` header on every request to the OpenFGA instance

### File Structure After This Story

```
backend/src/
├── server.ts               # Updated: uses config module
├── app.ts                  # Updated: registers routes, middleware, Pino
├── config.ts               # NEW: env var loading and validation
├── routes/
│   └── connection.ts       # NEW: GET /api/connection, POST /api/connection/test
├── services/
│   └── openfga-client.ts   # NEW: HTTP client with auth injection
├── middleware/
│   ├── error-handler.ts    # NEW: global error → Pino log → error envelope
│   └── validate.ts         # NEW: Zod validation middleware factory
├── schemas/
│   └── connection.ts       # NEW: Zod schema for connection test
└── types/
    ├── api.ts              # NEW: ErrorEnvelope, ConnectionStatus types
    └── openfga.ts          # NEW: OpenFGA response type placeholders
```

### What NOT to Do

- Do NOT install `@openfga/sdk` — we use raw HTTP via our own `openfga-client.ts` for full control
- Do NOT create routes for stores, tuples, queries, model, or import/export — those are Stories 1.6, 3.1, 4.1, 2.1, 6.1
- Do NOT implement runtime URL update endpoint (PUT /api/connection) — that's Story 1.5
- Do NOT add CORS middleware — same-origin deployment means no CORS needed
- Do NOT create frontend code — this is a backend-only story

### References

- [Source: architecture.md#Data Architecture] — Zod v4.3.x for validation
- [Source: architecture.md#Authentication & Security] — Pre-shared key, no user auth, Zod on all routes
- [Source: architecture.md#API & Communication Patterns] — Thin passthrough proxy, error envelope
- [Source: architecture.md#Infrastructure & Deployment] — Pino logging, dotenv config
- [Source: architecture.md#Backend Organization] — File structure: routes/, services/, middleware/, schemas/, types/
- [Source: architecture.md#Format Patterns] — Error envelope format, HTTP status codes
- [Source: architecture.md#Process Patterns] — Error handling flow
- [Source: architecture.md#Architectural Boundaries] — openfga-client.ts as single contact point

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Pino 10.3.1, Zod 4.3.6, Vitest 4.1.2 installed
- Express 5 async error handling confirmed working
- GET /api/connection returns url+storeId+status, no API key
- POST /api/connection/test validates URL format via Zod, returns 502 on unreachable
- 18 backend tests pass across 4 files in 954ms
- Frontend regression: 1/1 test still passes

### Completion Notes List

- Config module extracts env vars with typed defaults
- Pino logger in dedicated logger.ts file, structured JSON output
- OpenFGA client uses native fetch(), injects Bearer auth header, mutable URL/storeId for future store switching
- Error handler middleware: catches all errors, logs with Pino, returns error envelope
- Zod validation middleware: factory pattern, safeParse, returns 400 with issues array
- Connection routes: GET /api/connection (status), POST /api/connection/test (connectivity check)
- API types: ErrorEnvelope, ConnectionStatus, StoreInfo, ListStoresResponse
- All tests co-located next to source files per architecture spec

### Change Log

- 2026-03-26: Story implemented — all 8 tasks complete, 18 tests passing

### File List

- backend/src/config.ts (new)
- backend/src/logger.ts (new)
- backend/src/server.ts (modified — uses config module)
- backend/src/app.ts (modified — registers routes, error handler)
- backend/src/services/openfga-client.ts (new)
- backend/src/services/openfga-client.test.ts (new)
- backend/src/middleware/error-handler.ts (new)
- backend/src/middleware/error-handler.test.ts (new)
- backend/src/middleware/validate.ts (new)
- backend/src/middleware/validate.test.ts (new)
- backend/src/routes/connection.ts (new)
- backend/src/routes/connection.test.ts (new)
- backend/src/schemas/connection.ts (new)
- backend/src/types/api.ts (new)
- backend/src/types/openfga.ts (new)
- backend/package.json (modified — added pino, zod, vitest, test script)
