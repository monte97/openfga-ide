# Docker Release Design

## Goal

Publish two separate Docker images (`backend`, `frontend`) to GitHub Container Registry (ghcr.io), with automated versioning via `release-please` and a `demo/` folder for quickstart.

## Architecture

Single project version shared by both images (backend and frontend always released together with the same tag). Versioning is driven by Conventional Commits via `release-please`.

### Images

| Image | Tag pattern | Built on |
|---|---|---|
| `ghcr.io/monte97/openfga-ide/backend` | `edge`, `latest`, `1.0.0`, `1.0`, `1` | push master / tag `v*` |
| `ghcr.io/monte97/openfga-ide/frontend` | `edge`, `latest`, `1.0.0`, `1.0`, `1` | push master / tag `v*` |

- **`edge`** → latest build from `master`, updated on every push
- **`latest`** + semantic tags → created when a release PR is merged (tag `v*`)

---

## Components

### backend/Dockerfile

Multi-stage build:

**Stage `builder`** — `node:22-slim`
- `WORKDIR /app`
- Copy `package*.json`, run `npm ci`
- Copy source, run `npm run build` (tsc → `dist/`)

**Stage `production`** — `node:22-slim`
- `WORKDIR /app`
- Copy `package*.json`, run `npm ci --omit=dev`
- Copy `dist/` from builder
- `USER node`
- `EXPOSE 3000`
- `CMD ["node", "dist/server.js"]`

Environment variables expected at runtime:
- `PORT` (default `3000`)
- `OPENFGA_URL`
- `DATABASE_URL`

### frontend/Dockerfile

Multi-stage build:

**Stage `builder`** — `node:22-slim`
- `WORKDIR /app`
- Copy `package*.json`, run `npm ci`
- Copy source, run `npm run build` (vite → `dist/`)

**Stage `production`** — `nginx:alpine`
- Copy `dist/` to `/usr/share/nginx/html`
- Copy `nginx.conf.template` to `/etc/nginx/templates/`
- Copy `docker-entrypoint.sh` (runs `envsubst` then starts nginx)
- `EXPOSE 80`

Runtime environment variable:
- `BACKEND_URL` — URL of the backend service (e.g. `http://backend:3000`)

### frontend/nginx.conf.template

```nginx
server {
    listen 80;

    root /usr/share/nginx/html;
    index index.html;

    # Vue Router history mode
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend
    location /api/ {
        proxy_pass ${BACKEND_URL};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

`envsubst` replaces `${BACKEND_URL}` at container startup via nginx's built-in template processing (`/etc/nginx/templates/` is processed automatically by the official nginx image).

---

## Versioning — release-please

Files added to repo root:
- `.release-please-manifest.json` — tracks current version (e.g. `{"." : "0.1.0"}`)
- `release-please-config.json` — config for single-component release, updates `backend/package.json` and `frontend/package.json`

GitHub Actions workflow `.github/workflows/release-please.yml`:
- Runs on push to `master`
- Creates/updates a "Release PR" with changelog and version bump
- When Release PR is merged → creates tag `v1.0.0` + GitHub Release
- `bump-minor-pre-major: true` while version < 1.0.0

---

## GitHub Actions — release.yml

Trigger: `push` to `master` (→ `edge`) and `push` of tags `v*` (→ semantic + `latest`).

Two parallel jobs: `build-backend` and `build-frontend`.

Each job:
1. `actions/checkout@v4`
2. `docker/login-action` with `GITHUB_TOKEN` (ghcr.io, no extra secrets)
3. `docker/metadata-action` — generates tags:
   - on `master` push: `edge`
   - on tag `v1.0.0`: `1.0.0`, `1.0`, `1`, `latest`
4. `docker/setup-buildx-action` (multi-platform support, layer caching)
5. `docker/build-push-action` with `cache-from/cache-to: gha`

---

## demo/ folder

```
demo/
  docker-compose.yml       # quickstart with ghcr.io images
  demo-store.json          # importable OpenFGA store (model + tuples)
```

### demo/docker-compose.yml

Full stack using published images. Users run `docker compose -f demo/docker-compose.yml up`.

Services: `frontend`, `backend`, `openfga`, `postgres`.

`BACKEND_URL=http://backend:3000` wires frontend nginx proxy to backend.

### demo/demo-store.json

Enriched version of the E2E `SIMPLE_MODEL`: `user` + `document` types with `viewer`, `editor`, `owner` relations, plus sample tuples (e.g. `user:alice` as viewer of `document:readme`). Importable via the Import/Export page.

---

## File Summary

| File | Action |
|---|---|
| `backend/Dockerfile` | Create |
| `frontend/Dockerfile` | Create |
| `frontend/nginx.conf.template` | Create |
| `.release-please-manifest.json` | Create |
| `release-please-config.json` | Create |
| `.github/workflows/release-please.yml` | Create |
| `.github/workflows/release.yml` | Create |
| `demo/docker-compose.yml` | Create |
| `demo/demo-store.json` | Create |
