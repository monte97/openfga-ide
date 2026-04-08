# User Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create bilingual (EN/IT) user documentation for openfga-viewer with a Playwright-based screenshot pipeline using the demo fixture.

**Architecture:** Static Markdown files in `docs/en/` (8 pages) and `docs/it/` (8 pages), a root `README.md`, and a `docs/scripts/capture-screenshots.ts` Playwright script that sets up demo state via the backend API, navigates each section, and saves 15 screenshots to `docs/assets/screenshots/`. Screenshots are shared between both languages.

**Tech Stack:** Playwright (`@playwright/test`, already installed), `tsx` (TypeScript runner, to be added), Markdown.

---

## File Map

| File | Action | Description |
|------|--------|-------------|
| `docs/assets/screenshots/.gitkeep` | Create | Ensures directory is tracked by git |
| `docs/scripts/capture-screenshots.ts` | Create | Playwright screenshot automation |
| `docs/en/01-getting-started.md` | Create | Installation, first run, first connection |
| `docs/en/02-connection-and-stores.md` | Create | Connection config, Store Admin |
| `docs/en/03-model-tuples-queries.md` | Create | Model viewer, tuple manager, query console |
| `docs/en/04-relationship-graph.md` | Create | Interactive graph canvas |
| `docs/en/05-import-export.md` | Create | Export, import, backup/restore |
| `docs/en/06-test-suites.md` | Create | Suite list, create, delete |
| `docs/en/07-suite-editor.md` | Create | Form editor, JSON editor, fixture editor |
| `docs/en/08-test-execution.md` | Create | Run, timeline, results |
| `docs/it/01-per-iniziare.md` | Create | (IT mirror of 01) |
| `docs/it/02-connessione-e-store.md` | Create | (IT mirror of 02) |
| `docs/it/03-modello-tuple-query.md` | Create | (IT mirror of 03) |
| `docs/it/04-grafo-delle-relazioni.md` | Create | (IT mirror of 04) |
| `docs/it/05-import-export.md` | Create | (IT mirror of 05) |
| `docs/it/06-suite-di-test.md` | Create | (IT mirror of 06) |
| `docs/it/07-editor-della-suite.md` | Create | (IT mirror of 07) |
| `docs/it/08-esecuzione-dei-test.md` | Create | (IT mirror of 08) |
| `README.md` | Create | Root entry point (EN, links to IT) |
| `package.json` | Modify | Add `docs:screenshots` script |

---

## Task 1: Directory structure and npm script

**Files:**
- Create: `docs/assets/screenshots/.gitkeep`
- Create: `docs/en/` (empty, populated in later tasks)
- Create: `docs/it/` (empty, populated in later tasks)
- Modify: `package.json` (root)

- [ ] **Step 1: Create asset directory placeholder**

```bash
mkdir -p docs/assets/screenshots docs/en docs/it docs/scripts
touch docs/assets/screenshots/.gitkeep
```

- [ ] **Step 2: Install tsx as dev dependency**

```bash
npm install --save-dev tsx
```

Verify: `cat package.json | grep tsx` should show `"tsx": "..."`.

- [ ] **Step 3: Add npm script to root package.json**

First, read the current `package.json` to see existing scripts:

```bash
cat package.json
```

Then edit `package.json` to add `docs:screenshots` to the `scripts` block. Keep every existing script intact. After the edit, the scripts block should look like this (assuming the baseline has only the three e2e scripts):

```json
"scripts": {
  "docs:screenshots": "tsx docs/scripts/capture-screenshots.ts",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:report": "playwright show-report"
}
```

If the file contains additional scripts, preserve them alongside the new one.

- [ ] **Step 4: Commit**

```bash
git add docs/assets/screenshots/.gitkeep package.json package-lock.json
git commit -m "chore: add docs directory structure and screenshots script entry"
```

---

## Task 2: Playwright screenshot script

**Files:**
- Create: `docs/scripts/capture-screenshots.ts`

This script assumes:
- Frontend running at `http://localhost:5173`
- Backend running at `http://localhost:3000`
- A local OpenFGA instance already configured in the backend (i.e. `OPENFGA_URL` env var is set, or the user has set the connection URL manually before running)

The script creates a fresh store, imports the demo fixture, creates a demo suite, then navigates and screenshots each section.

- [ ] **Step 1: Write the screenshot script**

Create `docs/scripts/capture-screenshots.ts` with this content:

```typescript
/**
 * docs/scripts/capture-screenshots.ts
 *
 * Captures all documentation screenshots using Playwright.
 *
 * Prerequisites:
 *   - Frontend running:  http://localhost:5173
 *   - Backend running:   http://localhost:3000
 *   - OpenFGA running and configured in the backend (OPENFGA_URL env var or
 *     previously set via the app's connection settings)
 *
 * Usage (must be run from the project root):
 *   npm run docs:screenshots
 */

import { chromium, Browser, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'
// Paths are anchored to the project root (where `npm run` is executed).
// We avoid __dirname/import.meta.url because the script must work under both
// CommonJS and ESM without conditional logic.
const PROJECT_ROOT = process.cwd()
const SHOTS_DIR = path.resolve(PROJECT_ROOT, 'docs', 'assets', 'screenshots')
const DEMO_FILE = path.resolve(PROJECT_ROOT, 'demo', 'demo-document-sharing.json')
const LS_KEY = 'openfga-viewer:selectedStoreId'
const VIEWPORT = { width: 1440, height: 900 }

// ──────────────────────────────────────────────────────────────────────────────
// API helpers
// ──────────────────────────────────────────────────────────────────────────────

async function api<T = unknown>(urlPath: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${opts.method ?? 'GET'} ${urlPath} → ${res.status}: ${body}`)
  }
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T)
}

// ──────────────────────────────────────────────────────────────────────────────
// Demo fixture loader
// ──────────────────────────────────────────────────────────────────────────────

type DemoFixture = {
  storeName: string
  model: unknown
  tuples: Array<{ user: string; relation: string; object: string }>
}

function loadDemoFixture(): DemoFixture {
  return JSON.parse(fs.readFileSync(DEMO_FILE, 'utf-8')) as DemoFixture
}

// ──────────────────────────────────────────────────────────────────────────────
// State setup
// ──────────────────────────────────────────────────────────────────────────────

async function setupDemoStore(demo: DemoFixture): Promise<string> {
  // Create a fresh store
  const store = await api<{ id: string }>('/api/stores', {
    method: 'POST',
    body: JSON.stringify({ name: demo.storeName }),
  })

  // Import the demo model and tuples
  await api(`/api/stores/${store.id}/import`, {
    method: 'POST',
    body: JSON.stringify({ model: demo.model, tuples: demo.tuples }),
  })

  console.log(`  Store created: ${store.id}`)
  return store.id
}

async function createDemoSuite(demo: DemoFixture): Promise<string> {
  // Suites are global (not per-store). The backend Zod schema requires:
  //   - expected: boolean (not string 'allowed'/'denied')
  //   - description/tags/severity nested under meta
  //   - severity enum: 'critical' | 'warning' | 'info'
  // The fixture MUST embed a real model + tuples — the run engine provisions an
  // ephemeral store from the fixture and fails if the model is null/missing.
  const suite = await api<{ id: string }>('/api/suites', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Document Sharing Smoke Tests',
      description: 'Verify core document access rules for the demo model',
      tags: ['demo', 'smoke'],
      definition: {
        groups: [
          {
            name: 'Owner access',
            description: 'Alice owns folder:engineering and its documents',
            testCases: [
              {
                user: 'user:alice',
                relation: 'viewer',
                object: 'document:roadmap',
                expected: true,
                meta: {
                  description: 'Alice can view her own document',
                  severity: 'critical',
                },
              },
              {
                user: 'user:alice',
                relation: 'editor',
                object: 'document:roadmap',
                expected: true,
                meta: {
                  description: 'Alice can edit her own document',
                  severity: 'critical',
                },
              },
              {
                user: 'user:alice',
                relation: 'owner',
                object: 'document:roadmap',
                expected: true,
                meta: {
                  description: 'Alice is the direct owner',
                  severity: 'critical',
                },
              },
            ],
          },
          {
            name: 'Team access via groups',
            description: 'Group membership grants access transitively through folders',
            testCases: [
              {
                user: 'user:bob',
                relation: 'editor',
                object: 'document:roadmap',
                expected: true,
                meta: {
                  description: 'Bob (backend-team) can edit roadmap via folder parent',
                  severity: 'warning',
                },
              },
              {
                user: 'user:dave',
                relation: 'viewer',
                object: 'document:roadmap',
                expected: true,
                meta: {
                  description: 'Dave has direct viewer access to roadmap',
                  severity: 'warning',
                },
              },
              {
                user: 'user:dave',
                relation: 'editor',
                object: 'document:roadmap',
                expected: false,
                meta: {
                  description: 'Dave cannot edit roadmap (only viewer)',
                  severity: 'warning',
                },
              },
              {
                user: 'user:grace',
                relation: 'viewer',
                object: 'document:onboarding',
                expected: true,
                meta: {
                  description: 'Grace has direct viewer access to onboarding doc',
                  severity: 'info',
                },
              },
            ],
          },
        ],
        fixture: {
          model: demo.model,
          tuples: demo.tuples,
        },
      },
    }),
  })
  console.log(`  Suite created: ${suite.id}`)
  return suite.id
}

// ──────────────────────────────────────────────────────────────────────────────
// Screenshot helpers
// ──────────────────────────────────────────────────────────────────────────────

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(SHOTS_DIR, name),
    animations: 'disabled',
  })
  console.log(`  ✓ ${name}`)
}

async function waitForApp(page: Page): Promise<void> {
  // Wait for the app shell (header with connection popover button) to be visible
  await page.waitForSelector('[aria-label="Toggle connection settings"]', { timeout: 15_000 })
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  fs.mkdirSync(SHOTS_DIR, { recursive: true })

  // ── Setup ──────────────────────────────────────────────────────────────────
  console.log('\n[docs:screenshots] Loading demo fixture...')
  const demo = loadDemoFixture()

  console.log('[docs:screenshots] Setting up demo state...')
  const storeId = await setupDemoStore(demo)
  const suiteId = await createDemoSuite(demo)
  void suiteId // suite is discovered via its name in the UI; id not needed here

  // ── Browser ────────────────────────────────────────────────────────────────
  console.log('[docs:screenshots] Launching browser...')
  const browser: Browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: VIEWPORT })

  // Inject selected store ID into localStorage before any page load
  await context.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: LS_KEY, value: storeId },
  )

  const page: Page = await context.newPage()

  try {
    // ── 1. Connection popover ────────────────────────────────────────────────
    console.log('[docs:screenshots] Capturing connection.png...')
    await page.goto(APP_URL)
    await waitForApp(page)
    // The ConnectionPopover trigger has aria-label="Toggle connection settings"
    await page.locator('[aria-label="Toggle connection settings"]').click()
    await page.waitForTimeout(300)
    // First view of the popover shows "Edit Connection" — click it to reveal
    // the URL field + Test/Save buttons, which is what the docs describe.
    await page.getByRole('button', { name: 'Edit Connection' }).click()
    await page.waitForTimeout(300)
    await shot(page, 'connection.png')
    // Close the popover by clicking elsewhere
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // ── 2. Model Viewer — DSL ────────────────────────────────────────────────
    console.log('[docs:screenshots] Capturing model-viewer-dsl.png...')
    await page.goto(`${APP_URL}/model-viewer`)
    await page.waitForTimeout(1200)
    await shot(page, 'model-viewer-dsl.png')

    // ── 3. Model Viewer — Graph ──────────────────────────────────────────────
    console.log('[docs:screenshots] Capturing model-viewer-graph.png...')
    // ModelViewer has two tabs: DSL and Graph — click Graph
    await page.getByRole('tab', { name: /graph/i }).click()
    await page.waitForTimeout(1500) // wait for Vue Flow to render nodes
    await shot(page, 'model-viewer-graph.png')

    // ── 4. Tuple Manager ────────────────────────────────────────────────────
    console.log('[docs:screenshots] Capturing tuples.png...')
    await page.goto(`${APP_URL}/tuple-manager`)
    await page.waitForTimeout(1000)
    await shot(page, 'tuples.png')

    // ── 5. Query Console — Check ─────────────────────────────────────────────
    console.log('[docs:screenshots] Capturing query-check.png...')
    await page.goto(`${APP_URL}/query-console`)
    await page.waitForTimeout(800)
    // CheckQuery uses AppInput wrappers with placeholders (user:alice, document:roadmap)
    // and an AppSelect (Headless UI Listbox) for relation.
    await page.locator('input[placeholder="user:alice"]').fill('user:alice')
    await page.locator('input[placeholder="document:roadmap"]').fill('document:roadmap')
    // Open the relation Listbox. The button's initial text is "Select relation..."
    // (after the model loads). Use a text-content filter.
    await page.locator('button').filter({ hasText: /select relation/i }).click()
    await page.waitForTimeout(200)
    await page.getByRole('option', { name: 'viewer' }).click()
    await page.getByRole('button', { name: 'Check' }).click()
    await page.waitForTimeout(1200)
    await shot(page, 'query-check.png')

    // ── 6. Query Console — List Objects ──────────────────────────────────────
    console.log('[docs:screenshots] Capturing query-list.png...')
    // QueryConsole has tabs: Check / List Objects / List Users / Expand
    await page.getByRole('tab', { name: /list objects/i }).click()
    await page.waitForTimeout(400)
    await page.locator('input[placeholder="user:alice"]').first().fill('user:alice')
    // Relation and type are both dropdowns in ListObjectsQuery — use a safe filter
    const listButtons = page.locator('button').filter({ hasText: /select relation|load model/i })
    await listButtons.first().click()
    await page.waitForTimeout(200)
    await page.getByRole('option', { name: 'viewer' }).click()
    const typeButtons = page.locator('button').filter({ hasText: /select type|load model/i })
    await typeButtons.first().click()
    await page.waitForTimeout(200)
    await page.getByRole('option', { name: 'document' }).click()
    await page.getByRole('button', { name: /list objects/i }).click()
    await page.waitForTimeout(1200)
    await shot(page, 'query-list.png')

    // ── 7. Query Console — Expand ────────────────────────────────────────────
    console.log('[docs:screenshots] Capturing query-expand.png...')
    await page.getByRole('tab', { name: /^expand$/i }).click()
    await page.waitForTimeout(400)
    await page.locator('input[placeholder="document:roadmap"]').first().fill('document:roadmap')
    await page.locator('button').filter({ hasText: /select relation|load model/i }).first().click()
    await page.waitForTimeout(200)
    await page.getByRole('option', { name: 'viewer' }).click()
    await page.getByRole('button', { name: /^expand$/i }).click()
    await page.waitForTimeout(1200)
    await shot(page, 'query-expand.png')

    // ── 8. Relationship Graph ────────────────────────────────────────────────
    console.log('[docs:screenshots] Capturing relationship-graph.png...')
    await page.goto(`${APP_URL}/relationship-graph`)
    await page.waitForTimeout(2500) // Vue Flow graph needs layout time
    await shot(page, 'relationship-graph.png')

    // ── 9. Import/Export ────────────────────────────────────────────────────
    console.log('[docs:screenshots] Capturing import-export.png...')
    await page.goto(`${APP_URL}/import-export`)
    await page.waitForTimeout(800)
    await shot(page, 'import-export.png')

    // ── 10. Test Suites — List ───────────────────────────────────────────────
    console.log('[docs:screenshots] Capturing test-suites-list.png...')
    await page.goto(`${APP_URL}/test-suites`)
    await page.waitForTimeout(1200)
    await shot(page, 'test-suites-list.png')

    // ── 11. Suite Editor — Form tab ──────────────────────────────────────────
    console.log('[docs:screenshots] Capturing suite-editor-form.png...')
    // SuiteCard has role="article" with aria-label="Suite: <name>"
    // Clicking it emits 'open' which TestSuites.vue handles by switching to Editor tab
    await page.getByRole('article', { name: 'Suite: Document Sharing Smoke Tests' }).click()
    await page.waitForTimeout(1000)
    await shot(page, 'suite-editor-form.png')

    // ── 12. Suite Editor — JSON tab ──────────────────────────────────────────
    console.log('[docs:screenshots] Capturing suite-editor-json.png...')
    // Inside the editor, the sub-tabs are Form / JSON / Fixture (manual tablist)
    await page.getByRole('tab', { name: 'JSON' }).click()
    await page.waitForTimeout(500)
    await shot(page, 'suite-editor-json.png')

    // ── 13. Suite Editor — Fixture tab ───────────────────────────────────────
    console.log('[docs:screenshots] Capturing suite-editor-fixture.png...')
    await page.getByRole('tab', { name: 'Fixture' }).click()
    await page.waitForTimeout(500)
    await shot(page, 'suite-editor-fixture.png')

    // ── 14. Test Execution — Running ─────────────────────────────────────────
    console.log('[docs:screenshots] Capturing test-execution-running.png...')
    // The Run Suite button lives inside SuiteEditor (not on the card).
    // data-testid="run-suite-button", enabled because hasFixture is true.
    // Return to the Form tab so the screenshot shows a familiar layout.
    await page.getByRole('tab', { name: 'Form' }).click()
    await page.waitForTimeout(400)
    await page.getByTestId('run-suite-button').click()
    // Screenshot immediately to catch the provisioning/running state
    await page.waitForTimeout(500)
    await shot(page, 'test-execution-running.png')

    // ── 15. Test Execution — Results ─────────────────────────────────────────
    console.log('[docs:screenshots] Capturing test-execution-results.png...')
    // Wait for the run to complete. The Run Suite button is loading while
    // isRunning is true; when the run reaches a terminal status, the loading
    // state is removed. We poll the button's disabled attribute.
    await page
      .waitForFunction(
        () => {
          const btn = document.querySelector('[data-testid="run-suite-button"]') as HTMLButtonElement | null
          if (!btn) return false
          // During run: disabled=true (loading). After terminal status: disabled=false.
          return !btn.disabled
        },
        { timeout: 25_000 },
      )
      .catch(() => {
        console.warn('  [warn] Run did not complete within 25s — taking screenshot anyway')
      })
    await page.waitForTimeout(800)
    await shot(page, 'test-execution-results.png')

    console.log('\n[docs:screenshots] ✅ All 15 screenshots captured.')
    console.log(`  Output: ${SHOTS_DIR}`)
  } finally {
    await browser.close()
  }
}

main().catch((err: Error) => {
  console.error('\n[docs:screenshots] ❌ Error:', err.message)
  process.exit(1)
})
```

- [ ] **Step 2: Commit**

```bash
git add docs/scripts/capture-screenshots.ts
git commit -m "feat(docs): add Playwright screenshot capture script"
```

---

## Task 3: Generate screenshots

**Prerequisite:** Both frontend and backend must be running, and the backend must be configured with an OpenFGA URL.

- [ ] **Step 1: Start the app in one terminal**

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

- [ ] **Step 2: Verify OpenFGA is accessible**

The backend needs `OPENFGA_URL` set (e.g. `http://localhost:8080`). Check with:

```bash
curl http://localhost:3000/api/connection
```

Expected: `{"url":"http://localhost:8080","storeId":""}` (or a store ID if already set).

If `url` is empty, set it:

```bash
curl -X POST http://localhost:3000/api/connection \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:8080"}'
```

- [ ] **Step 3: Run the screenshot script**

```bash
npm run docs:screenshots
```

Expected output:
```
[docs:screenshots] Setting up demo state...
  Store created: <id>
  Suite created: <id>
[docs:screenshots] Launching browser...
[docs:screenshots] Capturing connection.png...
  ✓ connection.png
[docs:screenshots] Capturing model-viewer-dsl.png...
  ✓ model-viewer-dsl.png
... (13 more)
[docs:screenshots] ✅ All 15 screenshots captured.
  Output: /path/to/docs/assets/screenshots
```

- [ ] **Step 4: Verify output**

```bash
ls docs/assets/screenshots/
```

Expected: 15 `.png` files.

- [ ] **Step 5: Commit screenshots**

```bash
git add docs/assets/screenshots/
git commit -m "docs: add documentation screenshots (generated from demo fixture)"
```

---

## Task 4: English documentation — 01-getting-started.md

**Files:**
- Create: `docs/en/01-getting-started.md`

- [ ] **Step 1: Write the file**

```markdown
# Getting Started

openfga-viewer is a browser-based tool for exploring and testing [OpenFGA](https://openfga.dev) authorization stores. It connects to any OpenFGA instance and lets you inspect models, manage relationship tuples, run permission queries, and author automated test suites.

## Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- A running **OpenFGA** instance (local or remote)
  - Quickstart: `docker run -p 8080:8080 openfga/openfga run`

## Installation

```bash
git clone https://github.com/your-org/openfga-viewer
cd openfga-viewer
npm install
```

## Starting the App

```bash
# In two separate terminals:

# Backend (port 3000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
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

A ready-to-use demo fixture is included at `demo/demo-document-sharing.json`. It models a document-sharing system with users, groups, folders, and documents.

To load it:

1. Connect to your OpenFGA instance
2. Go to **Import / Export** in the navigation
3. Click **Import** and select `demo/demo-document-sharing.json`
4. The model and tuples are loaded into the active store

The demo dataset is used in all documentation screenshots.

## Running with Docker

```bash
docker compose up
```

The app is available at [http://localhost:5173](http://localhost:5173) with the backend at port 3000 (same ports as the bare-host dev setup). An isolated E2E environment lives in `docker-compose.e2e.yml` and uses ports 5174 / 3001.

## Next Steps

- [Connection and Stores](02-connection-and-stores.md) — manage multiple OpenFGA stores
- [Model, Tuples, and Queries](03-model-tuples-queries.md) — explore your authorization data
- [Test Suites](06-test-suites.md) — automate permission verification
```

- [ ] **Step 2: Commit**

```bash
git add docs/en/01-getting-started.md
git commit -m "docs(en): add getting-started page"
```

---

## Task 5: English documentation — 02-connection-and-stores.md

**Files:**
- Create: `docs/en/02-connection-and-stores.md`

- [ ] **Step 1: Write the file**

```markdown
# Connection and Stores

openfga-viewer connects to one OpenFGA instance at a time. Within that instance, you can switch between multiple stores. Your connection settings and selected store are saved in the browser and restored on next visit.

## Connection Configuration

Click the **connection indicator** in the top-right header (the colored badge) to open the connection popover. The popover first shows the current URL and a status badge.

Click **Edit Connection** to edit. You'll see:

![Connection panel](../assets/screenshots/connection.png)

| Field | Description |
|-------|-------------|
| **URL** | The base URL of your OpenFGA HTTP API (e.g. `http://localhost:8080`) |

Click **Test** to verify that the URL is reachable. A green check mark appears below the field on success. Once the test succeeds, the **Save** button becomes enabled — click it to persist the URL.

A green dot in the header confirms an active connection. A red dot means the URL is unreachable.

## Selecting a Store

The **store selector** is the dropdown in the header. It lists all stores in the connected OpenFGA instance. Type to filter by name.

- Click any store to make it the active store
- The active store is used for all model, tuple, query, and test suite operations
- If no matching stores are found, the dropdown shows "No stores found"

## Store Admin

Navigate to **Store Admin** in the sidebar to create and delete stores.

**Create a store:**
1. Click **New Store**
2. Enter a name
3. Click **Create** — the new store appears in the list and is automatically selected

**Delete a store:**
1. Find the store in the list
2. Click the **⋯** menu → **Delete**
3. Confirm the dialog — deletion is permanent and cannot be undone

> **Note:** Deleting a store removes all its model and tuple data from OpenFGA. Test suites are stored separately in the viewer's database and are not deleted.

## Connection Status

The header shows a real-time connection status:

| Indicator | Meaning |
|-----------|---------|
| 🟢 Green | Connected to OpenFGA, store selected |
| 🟡 Yellow | Connected, but no store selected |
| 🔴 Red | Cannot reach the OpenFGA URL |
```

- [ ] **Step 2: Commit**

```bash
git add docs/en/02-connection-and-stores.md
git commit -m "docs(en): add connection-and-stores page"
```

---

## Task 6: English documentation — 03-model-tuples-queries.md

**Files:**
- Create: `docs/en/03-model-tuples-queries.md`

- [ ] **Step 1: Write the file**

```markdown
# Model, Tuples, and Queries

These three views are the core of openfga-viewer's exploration capabilities. They map directly to the three fundamental concepts in OpenFGA: the authorization model, the relationship tuples, and the permission queries.

## Model Viewer

Navigate to **Model Viewer** in the sidebar.

### DSL View

The DSL view shows the active store's authorization model in OpenFGA's domain-specific language.

![Model Viewer — DSL](../assets/screenshots/model-viewer-dsl.png)

Syntax highlighting makes it easy to read type definitions, relations, and computed usersets. The DSL is read-only in this view.

In the demo model, you'll see four types: `user`, `group`, `folder`, and `document`. The `document` type inherits viewer/editor access from its parent `folder` via `tupleToUserset`.

### Graph View

Click the **Graph** tab to see the model as an interactive node diagram.

![Model Viewer — Graph](../assets/screenshots/model-viewer-graph.png)

Each type is a node. Edges represent relations and their derivation rules (direct, computed userset, tuple-to-userset). Click any node to highlight its connections. Scroll or pinch to zoom; drag to pan.

---

## Tuple Manager

Navigate to **Tuple Manager** to browse and edit relationship tuples.

![Tuple Manager](../assets/screenshots/tuples.png)

### Browsing Tuples

Tuples are displayed in a paginated table with three columns: **User**, **Relation**, **Object**. Use the filter inputs at the top to search by any field.

### Adding a Tuple

1. Click **Add Tuple**
2. Fill in the **User**, **Relation**, and **Object** fields (with autocomplete from the active model)
3. Click **Save**

Example: `user:frank` — `viewer` — `document:architecture`

### Deleting a Tuple

Click the **delete** icon on any row. A confirmation dialog prevents accidental deletion.

> **Tip:** Deleting a tuple removes it from the OpenFGA store immediately. This affects live permission checks.

---

## Query Console

Navigate to **Query Console** to run OpenFGA permission queries against the active store.

### Check

The **Check** tab answers: *"Does this user have this relation on this object?"*

![Query Console — Check](../assets/screenshots/query-check.png)

| Field | Example |
|-------|---------|
| User | `user:alice` |
| Relation | `viewer` |
| Object | `document:roadmap` |

The result is shown as a large green **Allowed** or red **Denied** indicator. Click **Why?** to expand the authorization tree that explains how the result was derived.

### List Objects

The **List Objects** tab answers: *"Which objects of this type does this user have this relation on?"*

![Query Console — List Objects](../assets/screenshots/query-list.png)

| Field | Example |
|-------|---------|
| User | `user:alice` |
| Relation | `viewer` |
| Type | `document` |

Result: a list of all matching objects (e.g. `document:roadmap`, `document:architecture`, `document:onboarding`).

### List Users

The **List Users** tab answers: *"Which users have this relation on this object?"*

| Field | Example |
|-------|---------|
| Relation | `editor` |
| Object | `document:roadmap` |

Result: a list of all users with the specified relation on the object, including those derived through groups.

### Expand

The **Expand** tab shows the full authorization tree for a relation on an object.

![Query Console — Expand](../assets/screenshots/query-expand.png)

| Field | Example |
|-------|---------|
| Relation | `viewer` |
| Object | `document:roadmap` |

Result: a collapsible tree showing every user or group that has `viewer` access, and through which rule (direct, computed userset, or tuple-to-userset).
```

- [ ] **Step 2: Commit**

```bash
git add docs/en/03-model-tuples-queries.md
git commit -m "docs(en): add model-tuples-queries page"
```

---

## Task 7: English documentation — 04-relationship-graph.md

**Files:**
- Create: `docs/en/04-relationship-graph.md`

- [ ] **Step 1: Write the file**

```markdown
# Relationship Graph

The Relationship Graph provides an interactive visual canvas of all relationship tuples in the active store. Unlike the Model Viewer's graph (which shows the authorization schema), this canvas shows **actual data** — who is connected to what.

Navigate to **Relationship Graph** in the sidebar.

![Relationship Graph](../assets/screenshots/relationship-graph.png)

## Navigating the Canvas

| Action | How |
|--------|-----|
| Pan | Click and drag on empty canvas area |
| Zoom in/out | Scroll wheel or pinch gesture |
| Fit all nodes | Click the **Fit** button in the toolbar |
| Select a node | Single click |

## Filtering

Use the filter panel on the left to narrow the visible nodes:

- **Type filter:** Show only nodes of specific types (e.g. only `document` and `user`)
- **Relation filter:** Show only edges for specific relations (e.g. only `owner` edges)

Filters update the graph in real time. Reset them to show the full graph again.

## Node Inspector

Click any node to open the **Inspector Panel** on the right. The panel shows:

- The node's type and identifier
- All **outgoing** relations (tuples where this entity is the user)
- All **incoming** relations (tuples where this entity is the object)

For example, clicking `folder:engineering` shows that `user:alice` is its `owner` and `group:backend-team#member` is its `editor`.

The inspector panel helps trace access chains without running individual queries.

## Performance Note

The graph loads all tuples in the active store. For stores with thousands of tuples, the initial render may take a few seconds. The graph remains interactive during progressive loading.
```

- [ ] **Step 2: Commit**

```bash
git add docs/en/04-relationship-graph.md
git commit -m "docs(en): add relationship-graph page"
```

---

## Task 8: English documentation — 05-import-export.md

**Files:**
- Create: `docs/en/05-import-export.md`

- [ ] **Step 1: Write the file**

```markdown
# Import and Export

Navigate to **Import / Export** in the sidebar.

![Import and Export](../assets/screenshots/import-export.png)

The import/export feature lets you save and restore the complete state of an OpenFGA store (model + tuples) as a single JSON file. This is useful for backups, migrating data between instances, and sharing demo datasets.

## Export

Exports the authorization model and all tuples from the active store as a JSON file.

1. Click **Export store**
2. The browser downloads a file named `<store-name>-<date>.json`

The exported file has this structure:

```json
{
  "storeName": "My Store",
  "exportedAt": "2026-04-08T12:00:00.000Z",
  "model": { "schema_version": "1.1", "type_definitions": [...] },
  "tuples": [
    { "user": "user:alice", "relation": "owner", "object": "document:roadmap" }
  ]
}
```

This format is identical to the demo fixture in `demo/demo-document-sharing.json`.

## Import

Imports a model and tuples from a JSON file into the active store. The import adds data — it does not delete existing tuples or replace the model unless the model has changed.

**Import from file:**
1. Click **Import** (or drag and drop a file onto the import area)
2. A validation preview shows the model types and tuple count found in the file
3. Review the preview, then click **Confirm import**

**Validation errors** are shown if the file is malformed or the JSON does not match the expected schema. Fix the file and re-import.

> **Warning:** Importing a model that conflicts with existing tuples may cause those tuples to become invalid in OpenFGA. Review the model changes carefully before importing.

## Backup and Restore Workflow

To back up and restore a store:

1. **Export** from the source store
2. Connect to the target instance and select (or create) the target store
3. **Import** the exported file into the target store

This workflow works across OpenFGA instances and versions, as long as the model schema version is compatible.
```

- [ ] **Step 2: Commit**

```bash
git add docs/en/05-import-export.md
git commit -m "docs(en): add import-export page"
```

---

## Task 9: English documentation — 06-test-suites.md

**Files:**
- Create: `docs/en/06-test-suites.md`

- [ ] **Step 1: Write the file**

```markdown
# Test Suites

Navigate to **Test Suites** in the sidebar.

Test suites let you define, save, and run automated permission checks against your OpenFGA model. Each suite is a named collection of test cases that verify expected access rules.

## What Is a Test Suite?

A test suite contains:

- **Metadata** — name, description, tags
- **Groups** — logical sections that group related test cases
- **Test cases** — individual permission checks, each specifying user, relation, object, and expected result (`allowed` or `denied`)
- **Fixture** — optional model and tuple overrides loaded into an ephemeral store before each run

Suites are stored in the viewer's PostgreSQL database and are independent of the connected OpenFGA instance. The same suite can be run against different instances.

## Suite List

![Test Suites — List](../assets/screenshots/test-suites-list.png)

The suite list shows all saved suites. Each suite card displays:

- Suite name and description
- Tags
- Last run status (✅ passed, ❌ failed, or — if never run)
- The number of groups and test cases

Click a suite card to open it in the **Editor** tab.

## Creating a Suite

1. Click **New Suite** (or **Create your first suite** if the list is empty)
2. Enter a **Name** (required) and optional **Description** and **Tags**
3. Click **Create**

The suite is created with an empty definition and opens immediately in the Editor tab.

## Deleting a Suite

1. Click the **⋯** menu on the suite card
2. Click **Delete**
3. Confirm the dialog — deletion is permanent

Deleting a suite removes it from the database. Completed run results associated with the suite are also deleted.

## Last Run Status

The suite card shows the result of the most recent run:

| Badge | Meaning |
|-------|---------|
| ✅ All passed | Every test case passed in the last run |
| ❌ N failed | One or more test cases failed or errored |
| — | Suite has never been run |

Click a suite card and go to the **Runs** tab to see the full run history.
```

- [ ] **Step 2: Commit**

```bash
git add docs/en/06-test-suites.md
git commit -m "docs(en): add test-suites page"
```

---

## Task 10: English documentation — 07-suite-editor.md

**Files:**
- Create: `docs/en/07-suite-editor.md`

- [ ] **Step 1: Write the file**

```markdown
# Suite Editor

Open a suite from the Test Suites list to enter the editor. The editor has three tabs: **Form**, **JSON**, and **Fixture**.

## Form Editor

The Form tab provides a structured way to manage groups and test cases.

![Suite Editor — Form](../assets/screenshots/suite-editor-form.png)

### Groups

Groups are collapsible sections that organize related test cases. A suite can have any number of groups.

**Add a group:** Click **+ Add Group** at the bottom of the suite tree. Enter a name and optional description.

**Delete a group:** Click the **⋯** menu on the group header → **Delete group**. This also deletes all test cases in the group.

**Reorder groups:** Drag the group handle (≡) to a new position.

### Test Cases

Each test case specifies a permission check.

**Add a test case:** Click **+ Add Test Case** inside a group. Fill in:

| Field | Description | Example |
|-------|-------------|---------|
| User | The entity requesting access | `user:alice` |
| Relation | The relation being checked | `viewer` |
| Object | The resource being accessed | `document:roadmap` |
| Expected | The expected result | `allowed` or `denied` (stored as `true`/`false` in JSON) |
| Description | Optional human-readable label | "Alice can read her doc" |
| Tags | Optional labels for filtering | `smoke`, `critical` |
| Severity | Optional risk level | `critical`, `warning`, `info` |

Fields for User, Relation, and Object support autocomplete from the active store's model.

**Edit a test case:** Click any test case row to expand its form inline.

**Delete a test case:** Click the **×** icon on the test case row.

---

## JSON Editor

The JSON tab shows the full suite definition as a raw JSON document.

![Suite Editor — JSON](../assets/screenshots/suite-editor-json.png)

You can edit the JSON directly. The editor validates the document structure in real time and highlights errors. Switching back to the Form tab reflects your JSON changes immediately — there is no data loss on mode switch.

The JSON structure:

```json
{
  "groups": [
    {
      "name": "Group name",
      "description": "Optional description",
      "testCases": [
        {
          "user": "user:alice",
          "relation": "viewer",
          "object": "document:roadmap",
          "expected": true,
          "meta": {
            "description": "Optional label",
            "tags": [],
            "severity": "critical"
          }
        }
      ]
    }
  ]
}
```

- **`expected`** is a boolean: `true` means the check should return allowed, `false` means denied.
- **`meta`** holds optional metadata (description, tags, severity). The severity enum is `"critical" | "warning" | "info"`.

> **Note:** The JSON editor does not include the fixture definition. Use the Fixture tab for that.

---

## Fixture Editor

The Fixture tab lets you embed a model and tuples directly into the suite definition.

![Suite Editor — Fixture](../assets/screenshots/suite-editor-fixture.png)

When a fixture is defined, each test run creates an **ephemeral OpenFGA store** loaded with the fixture's model and tuples, instead of using the active store's data. This makes the test suite self-contained and reproducible.

**Defining a fixture:**

The fixture is a JSON object with two keys:

```json
{
  "model": { "schema_version": "1.1", "type_definitions": [...] },
  "tuples": [
    { "user": "user:alice", "relation": "owner", "object": "document:roadmap" }
  ]
}
```

**Import from current store:** Click **Import from current store** to populate the fixture with the active store's model and all its tuples. This is the quickest way to create a reproducible snapshot.

**Leave fixture empty:** If the fixture is `null` or empty, the test run uses the active store's live data. This is useful for running regression checks against production data.
```

- [ ] **Step 2: Commit**

```bash
git add docs/en/07-suite-editor.md
git commit -m "docs(en): add suite-editor page"
```

---

## Task 11: English documentation — 08-test-execution.md

**Files:**
- Create: `docs/en/08-test-execution.md`

- [ ] **Step 1: Write the file**

```markdown
# Test Execution

## Triggering a Run

Open a suite from the **Test Suites** list. In the editor header, click the **Run Suite** button to start execution.

> **Note:** The Run Suite button is disabled until the suite has a fixture. A fixture (model + tuples) is always required — it defines the ephemeral store against which every test case is executed. If the button is disabled, switch to the **Fixture** tab and define or import a fixture first.

## Execution Phases

Each run goes through four phases shown in a timeline:

![Test Execution — Running](../assets/screenshots/test-execution-running.png)

| Phase | Description |
|-------|-------------|
| **Provisioning** | An ephemeral OpenFGA store is created for this run |
| **Loading fixtures** | The suite's fixture (model + tuples) is loaded into the ephemeral store |
| **Running checks** | Each test case is executed as a `Check` call against the ephemeral store |
| **Cleanup** | The ephemeral store is deleted, regardless of pass/fail outcome |

The viewer polls for run updates every 2 seconds. If polling encounters 5 consecutive errors, it stops automatically and shows a **Retry** button.

## Reading Results

When the run completes:

![Test Execution — Results](../assets/screenshots/test-execution-results.png)

The header shows a summary: **total**, **passed**, **failed**, and **errored** counts, plus the total duration.

Below the summary, each test case shows:

| Column | Description |
|--------|-------------|
| Status | ✅ Pass, ❌ Fail, ⚠️ Error |
| Description | The test case label |
| User / Relation / Object | The check parameters |
| Expected | `allowed` or `denied` |
| Actual | The result returned by OpenFGA |
| Duration | Time for this individual check |

**Failed test cases** — where actual ≠ expected — are highlighted in red. These indicate that the authorization model or the fixture data does not match the intended access rules.

**Errored test cases** — where the check itself failed (e.g. network error, invalid tuple) — are shown with a warning icon and an error message.

## Distinction: Test Failure vs Execution Error

- **Test failure**: The check ran successfully but the result differs from expected. This means your authorization policy is incorrect.
- **Execution error**: The check could not be performed (OpenFGA unreachable, fixture failed to load, invalid model). These do not reflect your policy — fix the infrastructure issue first.

## Run History

Each completed run is saved. Open a suite and go to the **Runs** tab to see all past runs with their timestamps and summary results.

The most recent run result is also shown on the suite card in the suite list.
```

- [ ] **Step 2: Commit**

```bash
git add docs/en/08-test-execution.md
git commit -m "docs(en): add test-execution page"
```

---

## Task 12: Italian documentation — 01-per-iniziare.md

**Files:**
- Create: `docs/it/01-per-iniziare.md`

- [ ] **Step 1: Write the file**

```markdown
# Per Iniziare

openfga-viewer è uno strumento browser per esplorare e testare i store di autorizzazione [OpenFGA](https://openfga.dev). Si connette a qualsiasi istanza OpenFGA e permette di ispezionare modelli, gestire tuple di relazione, eseguire query sui permessi e creare suite di test automatizzate.

## Prerequisiti

- **Node.js** 18 o superiore
- **npm** 9 o superiore
- Un'istanza **OpenFGA** in esecuzione (locale o remota)
  - Avvio rapido: `docker run -p 8080:8080 openfga/openfga run`

## Installazione

```bash
git clone https://github.com/your-org/openfga-viewer
cd openfga-viewer
npm install
```

## Avviare l'App

```bash
# In due terminali separati:

# Backend (porta 3000)
cd backend && npm run dev

# Frontend (porta 5173)
cd frontend && npm run dev
```

Apri [http://localhost:5173](http://localhost:5173) nel browser.

## Prima Connessione

Clicca sul **badge di connessione** nell'header in alto a destra per aprire il popover di connessione. Clicca **Edit Connection**, poi:

1. Inserisci l'URL di OpenFGA (es. `http://localhost:8080`)
2. Clicca **Test** — una spunta verde conferma che l'URL è raggiungibile
3. Clicca **Save**

![Pannello di connessione](../assets/screenshots/connection.png)

Una volta connessa, usa il dropdown di selezione store nell'header per scegliere uno store (o creane uno in **Store Admin** se l'istanza non ne ha).

## Caricare il Dataset Demo

Un fixture demo è incluso in `demo/demo-document-sharing.json`. Modella un sistema di condivisione documenti con utenti, gruppi, cartelle e documenti.

Per caricarlo:

1. Connettiti alla tua istanza OpenFGA
2. Vai su **Import / Export** nella navigazione
3. Clicca **Importa** e seleziona `demo/demo-document-sharing.json`
4. Il modello e le tuple vengono caricati nello store attivo

Questo dataset è usato in tutti gli screenshot della documentazione.

## Avvio con Docker

```bash
docker compose up
```

L'app è disponibile su [http://localhost:5173](http://localhost:5173) con il backend sulla porta 3000 (stesse porte del setup dev bare-host). Un ambiente E2E isolato è definito in `docker-compose.e2e.yml` e usa le porte 5174 / 3001.

## Passi Successivi

- [Connessione e Store](02-connessione-e-store.md) — gestire più store OpenFGA
- [Modello, Tuple e Query](03-modello-tuple-query.md) — esplorare i dati di autorizzazione
- [Suite di Test](06-suite-di-test.md) — automatizzare la verifica dei permessi
```

- [ ] **Step 2: Commit**

```bash
git add docs/it/01-per-iniziare.md
git commit -m "docs(it): add per-iniziare page"
```

---

## Task 13: Italian documentation — 02-connessione-e-store.md

**Files:**
- Create: `docs/it/02-connessione-e-store.md`

- [ ] **Step 1: Write the file**

```markdown
# Connessione e Store

openfga-viewer si connette a un'istanza OpenFGA alla volta. All'interno di quell'istanza, è possibile passare tra più store. Le impostazioni di connessione e lo store selezionato vengono salvati nel browser e ripristinati alla visita successiva.

## Configurazione della Connessione

Clicca sull'**indicatore di connessione** nell'header in alto a destra (il badge colorato) per aprire il popover di connessione. Il popover mostra prima l'URL corrente e un badge di stato.

Clicca **Edit Connection** per modificare. Vedrai:

![Pannello di connessione](../assets/screenshots/connection.png)

| Campo | Descrizione |
|-------|-------------|
| **URL** | L'URL base dell'API HTTP di OpenFGA (es. `http://localhost:8080`) |

Clicca **Test** per verificare che l'URL sia raggiungibile. Una spunta verde appare sotto il campo in caso di successo. Una volta che il test passa, il bottone **Save** diventa abilitato — cliccalo per salvare l'URL.

Un punto verde nell'header conferma una connessione attiva. Un punto rosso indica che l'URL non è raggiungibile.

## Selezionare uno Store

Il **selettore store** è il dropdown nell'header. Elenca tutti gli store nell'istanza OpenFGA connessa. Digita per filtrare per nome.

- Clicca su qualsiasi store per renderlo lo store attivo
- Lo store attivo viene usato per tutte le operazioni su modello, tuple, query e suite di test
- Se non ci sono store corrispondenti alla ricerca, il dropdown mostra "Nessuno store trovato"

## Store Admin

Vai su **Store Admin** nella barra laterale per creare ed eliminare store.

**Creare uno store:**
1. Clicca **Nuovo Store**
2. Inserisci un nome
3. Clicca **Crea** — il nuovo store appare nella lista e viene selezionato automaticamente

**Eliminare uno store:**
1. Trova lo store nella lista
2. Clicca il menu **⋯** → **Elimina**
3. Conferma il dialogo — l'eliminazione è permanente e non può essere annullata

> **Nota:** Eliminare uno store rimuove tutti i suoi dati di modello e tuple da OpenFGA. Le suite di test sono salvate separatamente nel database del viewer e non vengono eliminate.

## Stato della Connessione

L'header mostra lo stato della connessione in tempo reale:

| Indicatore | Significato |
|-----------|-------------|
| 🟢 Verde | Connesso a OpenFGA, store selezionato |
| 🟡 Giallo | Connesso, ma nessuno store selezionato |
| 🔴 Rosso | Impossibile raggiungere l'URL di OpenFGA |
```

- [ ] **Step 2: Commit**

```bash
git add docs/it/02-connessione-e-store.md
git commit -m "docs(it): add connessione-e-store page"
```

---

## Task 14: Italian documentation — 03-modello-tuple-query.md

**Files:**
- Create: `docs/it/03-modello-tuple-query.md`

- [ ] **Step 1: Write the file**

```markdown
# Modello, Tuple e Query

Queste tre viste sono il nucleo delle capacità di esplorazione di openfga-viewer. Corrispondono direttamente ai tre concetti fondamentali di OpenFGA: il modello di autorizzazione, le tuple di relazione e le query sui permessi.

## Visualizzatore del Modello

Vai su **Model Viewer** nella barra laterale.

### Vista DSL

La vista DSL mostra il modello di autorizzazione dello store attivo nel linguaggio specifico di dominio di OpenFGA.

![Model Viewer — DSL](../assets/screenshots/model-viewer-dsl.png)

L'evidenziazione della sintassi rende facile leggere le definizioni dei tipi, le relazioni e gli usersets calcolati. Il DSL è in sola lettura in questa vista.

Nel modello demo, troverai quattro tipi: `user`, `group`, `folder` e `document`. Il tipo `document` eredita l'accesso viewer/editor dalla `folder` padre tramite `tupleToUserset`.

### Vista Grafo

Clicca la tab **Grafo** per vedere il modello come diagramma di nodi interattivo.

![Model Viewer — Graph](../assets/screenshots/model-viewer-graph.png)

Ogni tipo è un nodo. Le frecce rappresentano le relazioni e le loro regole di derivazione (diretta, computed userset, tuple-to-userset). Clicca su un nodo per evidenziarne le connessioni. Scorri o pinch per zoomare; trascina per spostarti.

---

## Gestore delle Tuple

Vai su **Tuple Manager** per navigare e modificare le tuple di relazione.

![Tuple Manager](../assets/screenshots/tuples.png)

### Navigare le Tuple

Le tuple sono visualizzate in una tabella paginata con tre colonne: **User**, **Relation**, **Object**. Usa i filtri in alto per cercare per qualsiasi campo.

### Aggiungere una Tupla

1. Clicca **Aggiungi Tupla**
2. Compila i campi **User**, **Relation** e **Object** (con autocomplete dal modello attivo)
3. Clicca **Salva**

Esempio: `user:frank` — `viewer` — `document:architecture`

### Eliminare una Tupla

Clicca l'icona **elimina** su qualsiasi riga. Un dialogo di conferma previene eliminazioni accidentali.

> **Attenzione:** Eliminare una tupla la rimuove immediatamente dallo store OpenFGA. Questo influisce sui controlli dei permessi in tempo reale.

---

## Console delle Query

Vai su **Query Console** per eseguire query sui permessi di OpenFGA contro lo store attivo.

### Check

La tab **Check** risponde alla domanda: *"Questo utente ha questa relazione su questo oggetto?"*

![Query Console — Check](../assets/screenshots/query-check.png)

| Campo | Esempio |
|-------|---------|
| User | `user:alice` |
| Relation | `viewer` |
| Object | `document:roadmap` |

Il risultato è mostrato come un grande indicatore verde **Consentito** o rosso **Negato**. Clicca **Perché?** per espandere l'albero di autorizzazione che spiega come è stato derivato il risultato.

### List Objects

La tab **List Objects** risponde alla domanda: *"Su quali oggetti di questo tipo questo utente ha questa relazione?"*

![Query Console — List Objects](../assets/screenshots/query-list.png)

| Campo | Esempio |
|-------|---------|
| User | `user:alice` |
| Relation | `viewer` |
| Type | `document` |

Risultato: una lista di tutti gli oggetti corrispondenti (es. `document:roadmap`, `document:architecture`, `document:onboarding`).

### List Users

La tab **List Users** risponde alla domanda: *"Quali utenti hanno questa relazione su questo oggetto?"*

| Campo | Esempio |
|-------|---------|
| Relation | `editor` |
| Object | `document:roadmap` |

Risultato: una lista di tutti gli utenti con la relazione specificata sull'oggetto, inclusi quelli derivati tramite gruppi.

### Expand

La tab **Expand** mostra l'albero di autorizzazione completo per una relazione su un oggetto.

![Query Console — Expand](../assets/screenshots/query-expand.png)

| Campo | Esempio |
|-------|---------|
| Relation | `viewer` |
| Object | `document:roadmap` |

Risultato: un albero espandibile che mostra ogni utente o gruppo con accesso `viewer`, e tramite quale regola (diretta, computed userset, o tuple-to-userset).
```

- [ ] **Step 2: Commit**

```bash
git add docs/it/03-modello-tuple-query.md
git commit -m "docs(it): add modello-tuple-query page"
```

---

## Task 15: Italian documentation — 04-grafo-delle-relazioni.md

**Files:**
- Create: `docs/it/04-grafo-delle-relazioni.md`

- [ ] **Step 1: Write the file**

```markdown
# Grafo delle Relazioni

Il Grafo delle Relazioni fornisce una tela visiva interattiva di tutte le tuple di relazione nello store attivo. A differenza del grafo del Model Viewer (che mostra lo schema di autorizzazione), questa tela mostra **dati reali** — chi è connesso a cosa.

Vai su **Relationship Graph** nella barra laterale.

![Grafo delle Relazioni](../assets/screenshots/relationship-graph.png)

## Navigare la Tela

| Azione | Come |
|--------|------|
| Spostare | Clicca e trascina sull'area vuota della tela |
| Zoom avanti/indietro | Rotella del mouse o gesto di pinch |
| Adattare tutti i nodi | Clicca il pulsante **Adatta** nella barra degli strumenti |
| Selezionare un nodo | Click singolo |

## Filtraggio

Usa il pannello filtri a sinistra per ridurre i nodi visibili:

- **Filtro tipo:** Mostra solo nodi di tipi specifici (es. solo `document` e `user`)
- **Filtro relazione:** Mostra solo frecce per relazioni specifiche (es. solo frecce `owner`)

I filtri aggiornano il grafo in tempo reale. Reimpostali per mostrare il grafo completo.

## Pannello Inspector

Clicca su qualsiasi nodo per aprire il **Pannello Inspector** a destra. Il pannello mostra:

- Il tipo e l'identificatore del nodo
- Tutte le relazioni **in uscita** (tuple dove questa entità è lo user)
- Tutte le relazioni **in entrata** (tuple dove questa entità è l'object)

Ad esempio, cliccando su `folder:engineering` viene mostrato che `user:alice` è il suo `owner` e `group:backend-team#member` è il suo `editor`.

Il pannello inspector aiuta a tracciare le catene di accesso senza eseguire query individuali.

## Nota sulle Prestazioni

Il grafo carica tutte le tuple nello store attivo. Per store con migliaia di tuple, il render iniziale potrebbe richiedere qualche secondo. Il grafo rimane interattivo durante il caricamento progressivo.
```

- [ ] **Step 2: Commit**

```bash
git add docs/it/04-grafo-delle-relazioni.md
git commit -m "docs(it): add grafo-delle-relazioni page"
```

---

## Task 16: Italian documentation — 05-import-export.md

**Files:**
- Create: `docs/it/05-import-export.md`

- [ ] **Step 1: Write the file**

```markdown
# Import ed Export

Vai su **Import / Export** nella barra laterale.

![Import ed Export](../assets/screenshots/import-export.png)

La funzionalità di import/export permette di salvare e ripristinare lo stato completo di uno store OpenFGA (modello + tuple) come singolo file JSON. È utile per backup, migrazione di dati tra istanze e condivisione di dataset demo.

## Export

Esporta il modello di autorizzazione e tutte le tuple dallo store attivo come file JSON.

1. Clicca **Esporta store**
2. Il browser scarica un file chiamato `<nome-store>-<data>.json`

Il file esportato ha questa struttura:

```json
{
  "storeName": "Il Mio Store",
  "exportedAt": "2026-04-08T12:00:00.000Z",
  "model": { "schema_version": "1.1", "type_definitions": [...] },
  "tuples": [
    { "user": "user:alice", "relation": "owner", "object": "document:roadmap" }
  ]
}
```

Questo formato è identico al fixture demo in `demo/demo-document-sharing.json`.

## Import

Importa un modello e delle tuple da un file JSON nello store attivo. L'import aggiunge dati — non elimina le tuple esistenti né sostituisce il modello a meno che il modello non sia cambiato.

**Importa da file:**
1. Clicca **Importa** (oppure trascina un file nell'area di import)
2. Un'anteprima di validazione mostra i tipi del modello e il numero di tuple trovati nel file
3. Rivedi l'anteprima, poi clicca **Conferma import**

**Gli errori di validazione** vengono mostrati se il file è malformato o il JSON non corrisponde allo schema atteso. Correggi il file e reimporta.

> **Attenzione:** Importare un modello che va in conflitto con le tuple esistenti potrebbe rendere quelle tuple invalide in OpenFGA. Rivedi attentamente le modifiche al modello prima di importare.

## Workflow di Backup e Ripristino

Per fare il backup e ripristinare uno store:

1. **Esporta** dallo store sorgente
2. Connettiti all'istanza target e seleziona (o crea) lo store target
3. **Importa** il file esportato nello store target

Questo workflow funziona tra istanze OpenFGA diverse e versioni diverse, purché la versione dello schema del modello sia compatibile.
```

- [ ] **Step 2: Commit**

```bash
git add docs/it/05-import-export.md
git commit -m "docs(it): add import-export page"
```

---

## Task 17: Italian documentation — 06-suite-di-test.md

**Files:**
- Create: `docs/it/06-suite-di-test.md`

- [ ] **Step 1: Write the file**

```markdown
# Suite di Test

Vai su **Test Suites** nella barra laterale.

Le suite di test permettono di definire, salvare ed eseguire controlli automatici sui permessi contro il tuo modello OpenFGA. Ogni suite è una raccolta nominata di test case che verificano le regole di accesso attese.

## Cos'è una Suite di Test?

Una suite di test contiene:

- **Metadati** — nome, descrizione, tag
- **Gruppi** — sezioni logiche che raggruppano test case correlati
- **Test case** — singoli controlli sui permessi, ognuno specificando user, relation, object e risultato atteso (`allowed` o `denied`)
- **Fixture** — override opzionali di modello e tuple caricati in uno store effimero prima di ogni esecuzione

Le suite sono salvate nel database PostgreSQL del viewer e sono indipendenti dall'istanza OpenFGA connessa. La stessa suite può essere eseguita contro istanze diverse.

## Lista delle Suite

![Suite di Test — Lista](../assets/screenshots/test-suites-list.png)

La lista delle suite mostra tutte le suite salvate. Ogni card della suite visualizza:

- Nome e descrizione della suite
- Tag
- Stato dell'ultima esecuzione (✅ passata, ❌ fallita, o — se mai eseguita)
- Il numero di gruppi e test case

Clicca una card della suite per aprirla nella tab **Editor**.

## Creare una Suite

1. Clicca **Nuova Suite** (o **Crea la tua prima suite** se la lista è vuota)
2. Inserisci un **Nome** (obbligatorio) e opzionalmente **Descrizione** e **Tag**
3. Clicca **Crea**

La suite viene creata con una definizione vuota e si apre immediatamente nella tab Editor.

## Eliminare una Suite

1. Clicca il menu **⋯** sulla card della suite
2. Clicca **Elimina**
3. Conferma il dialogo — l'eliminazione è permanente

Eliminare una suite la rimuove dal database. Anche i risultati delle esecuzioni associate alla suite vengono eliminati.

## Stato dell'Ultima Esecuzione

La card della suite mostra il risultato dell'esecuzione più recente:

| Badge | Significato |
|-------|-------------|
| ✅ Tutti passati | Ogni test case è passato nell'ultima esecuzione |
| ❌ N falliti | Uno o più test case sono falliti o in errore |
| — | La suite non è mai stata eseguita |

Clicca una card della suite e vai alla tab **Runs** per vedere la cronologia completa delle esecuzioni.
```

- [ ] **Step 2: Commit**

```bash
git add docs/it/06-suite-di-test.md
git commit -m "docs(it): add suite-di-test page"
```

---

## Task 18: Italian documentation — 07-editor-della-suite.md

**Files:**
- Create: `docs/it/07-editor-della-suite.md`

- [ ] **Step 1: Write the file**

```markdown
# Editor della Suite

Apri una suite dalla lista Test Suites per entrare nell'editor. L'editor ha tre tab: **Form**, **JSON** e **Fixture**.

## Editor Form

La tab Form fornisce un modo strutturato per gestire gruppi e test case.

![Editor della Suite — Form](../assets/screenshots/suite-editor-form.png)

### Gruppi

I gruppi sono sezioni espandibili che organizzano i test case correlati. Una suite può avere qualsiasi numero di gruppi.

**Aggiungere un gruppo:** Clicca **+ Aggiungi Gruppo** in fondo all'albero della suite. Inserisci un nome e una descrizione opzionale.

**Eliminare un gruppo:** Clicca il menu **⋯** nell'intestazione del gruppo → **Elimina gruppo**. Questo elimina anche tutti i test case nel gruppo.

**Riordinare i gruppi:** Trascina la maniglia del gruppo (≡) in una nuova posizione.

### Test Case

Ogni test case specifica un controllo sui permessi.

**Aggiungere un test case:** Clicca **+ Aggiungi Test Case** all'interno di un gruppo. Compila:

| Campo | Descrizione | Esempio |
|-------|-------------|---------|
| User | L'entità che richiede l'accesso | `user:alice` |
| Relation | La relazione da controllare | `viewer` |
| Object | La risorsa a cui si accede | `document:roadmap` |
| Expected | Il risultato atteso | `allowed` o `denied` (salvato come `true`/`false` nel JSON) |
| Description | Etichetta leggibile opzionale | "Alice può leggere il suo documento" |
| Tags | Etichette opzionali per il filtraggio | `smoke`, `critical` |
| Severity | Livello di rischio opzionale | `critical`, `warning`, `info` |

I campi User, Relation e Object supportano l'autocomplete dal modello dello store attivo.

**Modificare un test case:** Clicca su qualsiasi riga del test case per espanderne il form in linea.

**Eliminare un test case:** Clicca l'icona **×** sulla riga del test case.

---

## Editor JSON

La tab JSON mostra la definizione completa della suite come documento JSON grezzo.

![Editor della Suite — JSON](../assets/screenshots/suite-editor-json.png)

Puoi modificare il JSON direttamente. L'editor valida la struttura del documento in tempo reale ed evidenzia gli errori. Passare di nuovo alla tab Form riflette immediatamente le modifiche JSON — non c'è perdita di dati nel cambio di modalità.

La struttura JSON:

```json
{
  "groups": [
    {
      "name": "Nome del gruppo",
      "description": "Descrizione opzionale",
      "testCases": [
        {
          "user": "user:alice",
          "relation": "viewer",
          "object": "document:roadmap",
          "expected": true,
          "meta": {
            "description": "Etichetta opzionale",
            "tags": [],
            "severity": "critical"
          }
        }
      ]
    }
  ]
}
```

- **`expected`** è un booleano: `true` significa che il check dovrebbe restituire allowed, `false` significa denied.
- **`meta`** contiene i metadati opzionali (description, tags, severity). L'enum di severity è `"critical" | "warning" | "info"`.

> **Nota:** L'editor JSON non include la definizione della fixture. Usa la tab Fixture per quella.

---

## Editor Fixture

La tab Fixture permette di incorporare un modello e delle tuple direttamente nella definizione della suite.

![Editor della Suite — Fixture](../assets/screenshots/suite-editor-fixture.png)

Quando una fixture è definita, ogni esecuzione di test crea uno **store OpenFGA effimero** caricato con il modello e le tuple della fixture, invece di usare i dati dello store attivo. Questo rende la suite di test autonoma e riproducibile.

**Definire una fixture:**

La fixture è un oggetto JSON con due chiavi:

```json
{
  "model": { "schema_version": "1.1", "type_definitions": [...] },
  "tuples": [
    { "user": "user:alice", "relation": "owner", "object": "document:roadmap" }
  ]
}
```

**Importa dallo store corrente:** Clicca **Importa dallo store corrente** per popolare la fixture con il modello dello store attivo e tutte le sue tuple. È il modo più rapido per creare uno snapshot riproducibile.

**Lasciare la fixture vuota:** Se la fixture è `null` o vuota, l'esecuzione del test usa i dati live dello store attivo. Utile per eseguire controlli di regressione su dati di produzione.
```

- [ ] **Step 2: Commit**

```bash
git add docs/it/07-editor-della-suite.md
git commit -m "docs(it): add editor-della-suite page"
```

---

## Task 19: Italian documentation — 08-esecuzione-dei-test.md

**Files:**
- Create: `docs/it/08-esecuzione-dei-test.md`

- [ ] **Step 1: Write the file**

```markdown
# Esecuzione dei Test

## Avviare un'Esecuzione

Apri una suite dalla lista **Test Suites**. Nell'header dell'editor, clicca il pulsante **Run Suite** per avviare l'esecuzione.

> **Nota:** Il pulsante Run Suite è disabilitato finché la suite non ha una fixture. Una fixture (modello + tuple) è sempre obbligatoria — definisce lo store effimero contro cui viene eseguito ogni test case. Se il pulsante è disabilitato, vai alla tab **Fixture** e definisci o importa una fixture prima.

## Fasi di Esecuzione

Ogni esecuzione attraversa quattro fasi mostrate in una timeline:

![Esecuzione in corso](../assets/screenshots/test-execution-running.png)

| Fase | Descrizione |
|------|-------------|
| **Provisioning** | Viene creato uno store OpenFGA effimero per questa esecuzione |
| **Loading fixtures** | La fixture della suite (modello + tuple) viene caricata nello store effimero |
| **Running checks** | Ogni test case viene eseguito come chiamata `Check` contro lo store effimero |
| **Cleanup** | Lo store effimero viene eliminato, indipendentemente dall'esito |

Il viewer effettua il polling per gli aggiornamenti del run ogni 2 secondi. Se il polling incontra 5 errori consecutivi, si ferma automaticamente e mostra un pulsante **Riprova**.

## Leggere i Risultati

Al termine dell'esecuzione:

![Risultati dell'esecuzione](../assets/screenshots/test-execution-results.png)

L'intestazione mostra un riepilogo: conteggi di **totale**, **passati**, **falliti** ed **in errore**, più la durata totale.

Sotto il riepilogo, ogni test case mostra:

| Colonna | Descrizione |
|---------|-------------|
| Stato | ✅ Passato, ❌ Fallito, ⚠️ Errore |
| Descrizione | L'etichetta del test case |
| User / Relation / Object | I parametri del controllo |
| Atteso | `allowed` o `denied` |
| Effettivo | Il risultato restituito da OpenFGA |
| Durata | Tempo per questo singolo controllo |

**I test case falliti** — dove effettivo ≠ atteso — sono evidenziati in rosso. Indicano che il modello di autorizzazione o i dati della fixture non corrispondono alle regole di accesso previste.

**I test case in errore** — dove il controllo stesso è fallito (es. rete non disponibile, tupla non valida) — vengono mostrati con un'icona di avviso e un messaggio di errore.

## Distinzione: Fallimento del Test vs Errore di Esecuzione

- **Fallimento del test**: Il controllo è andato a buon fine ma il risultato differisce dall'atteso. Significa che la tua politica di autorizzazione non è corretta.
- **Errore di esecuzione**: Il controllo non ha potuto essere eseguito (OpenFGA non raggiungibile, caricamento fixture fallito, modello non valido). Non riflettono la tua policy — risolvi prima il problema di infrastruttura.

## Cronologia delle Esecuzioni

Ogni esecuzione completata viene salvata. Apri una suite e vai alla tab **Runs** per vedere tutte le esecuzioni passate con i relativi timestamp e risultati riepilogativi.

Il risultato dell'esecuzione più recente è mostrato anche sulla card della suite nella lista.
```

- [ ] **Step 2: Commit**

```bash
git add docs/it/08-esecuzione-dei-test.md
git commit -m "docs(it): add esecuzione-dei-test page"
```

---

## Task 20: Root README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the file**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add root README with quick start and documentation links"
```

---

## Self-Review Checklist

After all tasks are complete:

- [ ] All 15 screenshots exist in `docs/assets/screenshots/`
- [ ] All 8 EN pages exist in `docs/en/` with correct screenshot references (`../assets/screenshots/xxx.png`)
- [ ] All 8 IT pages exist in `docs/it/` with correct screenshot references
- [ ] `README.md` exists at root with links to both language versions
- [ ] `npm run docs:screenshots` succeeds with no errors
- [ ] All screenshot `![]()` references in docs point to files that actually exist
