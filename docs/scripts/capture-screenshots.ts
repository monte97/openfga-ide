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
