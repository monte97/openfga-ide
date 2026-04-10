# openfga-viewer

A browser-based tool for exploring and testing [OpenFGA](https://openfga.dev) authorization stores.

Connect to any OpenFGA instance to inspect authorization models, manage relationship tuples, run permission queries, visualize entity relationships, and author automated test suites.

![Model Viewer](docs/assets/screenshots/model-viewer-dsl.png)

## Features

- **Model Viewer** — Browse the authorization model as DSL or interactive graph
- **Tuple Manager** — Browse, filter, add, and delete relationship tuples
- **Query Console** — Run Check, List Objects, List Users, and Expand queries
- **Relationship Graph** — Visualize all entity relationships as an interactive canvas
- **Import / Export** — Backup and restore store data as JSON
- **Test Suite Management** — Define, save, and run automated permission checks with a fixture-based execution engine

## Quick Start — Docker (recommended)

The fastest way to run the full stack locally, no Node.js required:

```bash
docker compose -f demo/docker-compose.yml up
```

Open [http://localhost:5173](http://localhost:5173).

To load sample data, go to **Import / Export** and import `demo/demo-store.json`.

> The compose file pulls `ghcr.io/monte97/openfga-ide/{backend,frontend}:edge` and
> also starts OpenFGA and PostgreSQL for you.

## Docker Images

Published to [GitHub Container Registry](https://github.com/monte97/openfga-ide/pkgs/container/openfga-ide%2Fbackend):

| Image | Tags |
|---|---|
| `ghcr.io/monte97/openfga-ide/backend` | `latest`, `0.2.0`, `edge` |
| `ghcr.io/monte97/openfga-ide/frontend` | `latest`, `0.2.0`, `edge` |

- **`latest` / `0.2.0`** — latest stable release
- **`edge`** — built from every commit to `master`

### Environment variables

**Backend:**

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `OPENFGA_URL` | — | OpenFGA gRPC/HTTP endpoint (e.g. `http://openfga:8080`) |
| `DATABASE_URL` | — | PostgreSQL connection string (for test suites) |

**Frontend:**

| Variable | Description |
|---|---|
| `BACKEND_URL` | URL of the backend service (e.g. `http://backend:3000`) |

### Bring your own OpenFGA

If you already have an OpenFGA instance running, you only need the two app containers:

```yaml
services:
  backend:
    image: ghcr.io/monte97/openfga-ide/backend:latest
    environment:
      OPENFGA_URL: http://your-openfga:8080
      DATABASE_URL: postgres://user:pass@your-postgres/db
    ports:
      - "3000:3000"

  frontend:
    image: ghcr.io/monte97/openfga-ide/frontend:latest
    environment:
      BACKEND_URL: http://backend:3000
    ports:
      - "5173:80"
```

## Quick Start — from source

```bash
git clone https://github.com/monte97/openfga-ide
cd openfga-ide

# Start backend (port 3000) and frontend (port 5173)
cd backend && npm ci && npm run dev &
cd ../frontend && npm ci && npm run dev
```

Requires Node.js 22+ and a running OpenFGA instance.

## Documentation

| Language | Link |
|----------|------|
| 🇬🇧 English | [docs/en/01-getting-started.md](docs/en/01-getting-started.md) |
| 🇮🇹 Italiano | [docs/it/01-per-iniziare.md](docs/it/01-per-iniziare.md) |

## Demo Dataset

`demo/demo-store.json` contains a document-sharing model with `user` and `document` types (`owner`, `editor`, `viewer` relations) and a handful of sample tuples. Import it via **Import / Export** to explore the tool with realistic data.

## Development

```bash
# Run unit tests
cd frontend && npm test
cd backend && npm test

# Run E2E tests (requires Docker)
docker compose -f docker-compose.e2e.yml up -d
npm run test:e2e

# Regenerate documentation screenshots
npm run docs:screenshots
```

## License

MIT
