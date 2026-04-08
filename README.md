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

## Quick Start

```bash
git clone https://github.com/your-org/openfga-viewer
cd openfga-viewer
npm install

# Start backend (port 3000) and frontend (port 5173)
cd backend && npm run dev &
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and connect to your OpenFGA instance.

## Prerequisites

- Node.js 18+
- An OpenFGA instance (`docker run -p 8080:8080 openfga/openfga run`)
- PostgreSQL (for test suite storage — included in `docker compose up`)

## Documentation

| Language | Link |
|----------|------|
| 🇬🇧 English | [docs/en/01-getting-started.md](docs/en/01-getting-started.md) |
| 🇮🇹 Italiano | [docs/it/01-per-iniziare.md](docs/it/01-per-iniziare.md) |

## Demo Dataset

A ready-to-use document-sharing model is included at `demo/demo-document-sharing.json`. Load it via **Import / Export** to explore the tool with realistic data.

The demo models a workspace with users (`alice`, `bob`, `carol`, `dave`, `eve`, `frank`, `grace`), groups (`backend-team`, `frontend-team`, `design-team`), folders (`engineering`, `public`), and documents (`roadmap`, `architecture`, `onboarding`).

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
