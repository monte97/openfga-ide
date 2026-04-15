# Getting Started

openfga-viewer is a browser-based tool for exploring and testing [OpenFGA](https://openfga.dev) authorization stores. It connects to any OpenFGA instance and lets you inspect models, manage relationship tuples, run permission queries, and author automated test suites.

## Prerequisites

- **Node.js** 22 or later
- **npm** 10 or later
- A running **OpenFGA** instance (local or remote)
  - Quickstart: `docker run -p 8080:8080 openfga/openfga run`

## Installation

```bash
git clone https://github.com/monte97/openfga-ide
cd openfga-ide
```

## Starting the App

```bash
# In two separate terminals:

# Backend (port 3000)
cd backend && npm ci && npm run dev

# Frontend (port 5173)
cd ../frontend && npm ci && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## First Connection

Click the **connection badge** in the top-right header to open the connection popover. Click **Edit Connection**, then:

1. Enter your OpenFGA URL (e.g. `http://localhost:8080`)
2. Click **Test** — a green check mark confirms the URL is reachable
3. Click **Save**

![Connection panel](../assets/screenshots/connection.png)

Once connected, use the store selector dropdown in the header to pick a store (or create one in **Store Admin** if the instance has none).

## Loading the Demo Dataset

A ready-to-use demo fixture is included at `demo/demo-store.json`. It models a document-sharing system with users and documents (`owner`, `editor`, `viewer` relations).

To load it:

1. Connect to your OpenFGA instance
2. Go to **Import / Export** in the navigation
3. Click **Import** and select `demo/demo-store.json`
4. The model and tuples are loaded into the active store

The demo dataset is used in all documentation screenshots.

## Running with Docker

The fastest way to run the full stack — no Node.js required:

```bash
docker compose -f demo/docker-compose.yml up
```

This pulls the pre-built images from GHCR and also starts OpenFGA and PostgreSQL. Open [http://localhost:5173](http://localhost:5173).

> If you already have an OpenFGA instance, see the [Docker Images](https://github.com/monte97/openfga-ide#docker-images) section in the README for a minimal compose snippet.

## Next Steps

- [Connection and Stores](02-connection-and-stores.md) — manage multiple OpenFGA stores
- [Model, Tuples, and Queries](03-model-tuples-queries.md) — explore your authorization data
- [Test Suites](06-test-suites.md) — automate permission verification
