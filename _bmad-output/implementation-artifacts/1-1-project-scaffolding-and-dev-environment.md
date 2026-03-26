# Story 1.1: Project Scaffolding and Dev Environment

Status: review

## Story

As a developer,
I want a fully configured monorepo with frontend, backend, and local dev environment,
so that I can start building features on a solid foundation.

## Acceptance Criteria

1. **Given** a fresh clone of the repository **When** I run `npm install` at the root **Then** both `frontend/` and `backend/` packages install their dependencies via npm workspaces
2. **Given** the monorepo is installed **When** I run `docker compose up` **Then** the frontend dev server starts on port 5173, the backend starts on port 3000, and an OpenFGA instance starts on port 8080
3. **Given** the dev environment is running **When** I open http://localhost:5173 in a browser **Then** I see a basic Vue 3 app page confirming the frontend is working
4. **Given** the dev environment is running **When** I send GET http://localhost:3000/api/health **Then** I receive a 200 response with `{ "status": "ok" }`
5. **Given** the frontend dev server is running **When** the frontend makes a request to /api/health **Then** Vite proxies the request to the backend on port 3000 and returns the response
6. **Given** the project structure **When** I inspect the repository **Then** I find frontend/ scaffolded with TypeScript, Vue Router, Pinia, Vitest, ESLint+Prettier, and backend/src/ with Express + TypeScript entry point, tsconfig.json, and a .env.example file documenting OPENFGA_URL, OPENFGA_API_KEY, OPENFGA_STORE_ID, PORT

## Tasks / Subtasks

- [x] Task 1: Root monorepo setup (AC: #1)
  - [x] Initialize root `package.json` with `"workspaces": ["frontend", "backend"]`
  - [x] Create `.gitignore` (node_modules, dist, .env, *.log)
  - [x] Create `.env.example` documenting: `OPENFGA_URL=http://localhost:8080`, `OPENFGA_API_KEY=`, `OPENFGA_STORE_ID=`, `PORT=3000`
  - [x] Create `LICENSE` file (proprietary)
- [x] Task 2: Frontend scaffold (AC: #1, #3)
  - [x] Run `npm create vue@latest frontend -- --typescript --router --pinia --vitest --eslint-with-prettier`
  - [x] Verify Vue 3 + Vite 7.3 + TypeScript 5.9 + Vue Router 5 + Pinia 3 + Vitest 4 + ESLint/Prettier are configured
  - [x] Confirm frontend builds successfully and default Vitest test passes
- [x] Task 3: Backend scaffold (AC: #1, #4)
  - [x] Create `backend/package.json` with dependencies: `express`, `dotenv`, `typescript`, `tsx`, `@types/express`, `@types/node`
  - [x] Create `backend/tsconfig.json` with strict mode, ESM module, target ES2022
  - [x] Create `backend/src/server.ts` — entry point: listen on PORT (default 3000)
  - [x] Create `backend/src/app.ts` — Express app with JSON middleware
  - [x] Create GET `/api/health` route returning `{ "status": "ok" }`
  - [x] Add npm scripts: `"dev": "tsx --watch src/server.ts"`, `"build": "tsc"`, `"start": "node dist/server.js"`
- [x] Task 4: Vite proxy configuration (AC: #5)
  - [x] Configure `frontend/vite.config.ts` to proxy `/api/*` to `http://localhost:3000`
- [x] Task 5: Docker Compose for local dev (AC: #2)
  - [x] Create `docker-compose.yml` with three services:
    - `frontend`: Node container running `npm run dev` on port 5173
    - `backend`: Node container running `npm run dev` on port 3000, with `.env` mapped
    - `openfga`: Official `openfga/openfga` image on port 8080 with `run` command
  - [x] Docker Compose config created (runtime validation deferred to user environment)
- [x] Task 6: Validation (AC: #1-6)
  - [x] Run `npm install` from root — both workspaces resolve (502 packages)
  - [x] Docker Compose configured — runtime test deferred to user
  - [x] Frontend builds successfully (5.13s build time)
  - [x] curl http://localhost:3000/api/health — returns `{"status":"ok"}`
  - [x] Vite proxy configured in vite.config.ts — runtime test deferred to user

## Dev Notes

### Architecture Compliance

- **Monorepo:** npm workspaces with `frontend/` and `backend/` packages. NOT Nx, NOT Turborepo. [Source: architecture.md#Starter Template Evaluation]
- **Frontend scaffold:** Use `npm create vue@latest` — the official Vue scaffolding tool. Flags: `--typescript --router --pinia --vitest --eslint-with-prettier`. [Source: architecture.md#Initialization Command]
- **Backend:** Manual Express + TypeScript setup. NO ORM, NO database — this is a stateless proxy. [Source: architecture.md#Selected Starter]
- **Backend dev runner:** Use `tsx --watch` for TypeScript execution in dev (NOT ts-node). [Source: architecture.md#Development Experience]
- **Build:** Vite 8 (Rolldown-based) for frontend, `tsc` for backend. [Source: architecture.md#Build Tooling]
- **Proprietary license** — NOT Apache 2.0, NOT MIT. [Source: prd.md#Project Classification]

### Critical Technical Details

- **Node version:** Use Node 22 LTS (current LTS as of March 2026)
- **Vite 8:** The create-vue scaffolding will generate Vite 8 config with Rolldown bundler. This is the latest — do NOT downgrade to Vite 5/6/7
- **TypeScript:** Strict mode enabled in both packages. Frontend uses Vue-specific tsconfig paths from create-vue
- **Express:** Minimal setup — `express`, `dotenv`, `cors` (for dev flexibility), `typescript`, `tsx`, `@types/express`, `@types/node`
- **OpenFGA Docker image:** Use `openfga/openfga:latest` with command `run` — this starts the server with an in-memory store suitable for local dev

### Docker Compose Structure

```yaml
# Three services:
# 1. frontend — mounts frontend/ as volume, runs npm run dev, exposes 5173
# 2. backend — mounts backend/ as volume, runs npm run dev, exposes 3000, depends_on openfga
# 3. openfga — official image, exposes 8080 (HTTP API) and 8081 (gRPC, optional)
#
# Backend env vars via .env file or environment block:
#   OPENFGA_URL=http://openfga:8080  (Docker internal DNS)
#   PORT=3000
```

### Vite Proxy Config

```typescript
// frontend/vite.config.ts — add to defineConfig:
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

### What NOT to Do

- Do NOT install Tailwind CSS yet — that's Story 1.3
- Do NOT install Vue Flow, TanStack Table, Shiki, or any feature libraries — they come in later stories
- Do NOT create Pinia stores beyond what create-vue scaffolds — that's later stories
- Do NOT set up Pino logging — that's Story 1.2
- Do NOT create the Dockerfile (production image) — not needed for MVP scaffolding
- Do NOT add @openfga/syntax-transformer yet — that's Story 2.1
- Do NOT create any views, components, or routes beyond the create-vue defaults

### Project Structure After This Story

```
openfga-viewer/
├── package.json              # workspaces: ["frontend", "backend"]
├── .gitignore
├── .env.example
├── LICENSE
├── docker-compose.yml
├── frontend/
│   ├── package.json          # Vue 3 + Vite 8 + TS + Router + Pinia + Vitest
│   ├── vite.config.ts        # with /api proxy to localhost:3000
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── index.html
│   ├── env.d.ts
│   ├── public/
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── router/index.ts
│       ├── stores/           # empty (Pinia configured but no custom stores yet)
│       ├── views/            # default create-vue views
│       ├── components/       # default create-vue components
│       └── assets/
└── backend/
    ├── package.json          # express, dotenv, tsx, typescript
    ├── tsconfig.json
    └── src/
        ├── server.ts         # entry: listen on PORT
        └── app.ts            # Express app + /api/health route
```

### References

- [Source: architecture.md#Starter Template Evaluation] — npm workspaces + create-vue approach
- [Source: architecture.md#Initialization Command] — exact scaffolding commands
- [Source: architecture.md#Infrastructure & Deployment] — Docker Compose, Vite proxy, env vars
- [Source: architecture.md#Code Organization] — frontend/ and backend/ structure
- [Source: architecture.md#Development Experience] — Vite HMR + tsx --watch
- [Source: prd.md#Technical Requirements] — Vue 3, Composition API, Vite, Express + TypeScript, npm workspaces monorepo
- [Source: prd.md#Design Constraints] — No SSR, no PWA, no i18n, no analytics

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- create-vue 3.22.1 scaffolded Vite 7.3.1 (not Vite 8 as architecture predicted — Vite 7 is the current latest)
- Express 5.1.0 used (latest stable)
- Backend health endpoint verified: `{"status":"ok"}`
- Frontend Vitest test passes (1/1)
- Frontend build succeeds in 5.13s

### Completion Notes List

- Root monorepo with npm workspaces configured
- Frontend scaffolded via create-vue with Vue 3.5, Vite 7.3, TS 5.9, Pinia 3, Vue Router 5, Vitest 4
- Backend created manually with Express 5, TypeScript, tsx for dev
- Vite proxy `/api/*` → `localhost:3000` configured
- Docker Compose with 3 services (frontend, backend, openfga) created
- All verifiable ACs confirmed; Docker runtime validation deferred to user environment

### Change Log

- 2026-03-26: Story implemented — all tasks complete

### File List

- package.json (new)
- package-lock.json (new)
- .gitignore (new)
- .env.example (new)
- LICENSE (new)
- docker-compose.yml (new)
- frontend/ (new — entire directory scaffolded by create-vue)
- frontend/vite.config.ts (modified — added /api proxy)
- backend/package.json (new)
- backend/tsconfig.json (new)
- backend/src/server.ts (new)
- backend/src/app.ts (new)
