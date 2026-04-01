/**
 * Global setup — runs once before all Playwright tests.
 *
 * Responsibilities:
 * 1. Wait for backend and frontend to be ready
 * 2. Verify the OpenFGA connection is active (configured via env var in compose)
 *
 * The backend is pre-configured with OPENFGA_URL=http://openfga:8080 via
 * docker-compose.e2e.yml — no manual connection setup is needed.
 *
 * Tests that require a selected store must handle store selection themselves
 * (e.g. via a fixture that calls PUT /api/connection with a storeId).
 */

const BACKEND_URL = 'http://localhost:3000'
const FRONTEND_URL = 'http://localhost:5173'
const POLL_INTERVAL_MS = 2_000
const TIMEOUT_MS = 120_000

async function waitForUrl(url: string): Promise<void> {
  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status < 500) return
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error(`Timeout waiting for ${url} after ${TIMEOUT_MS}ms`)
}

export default async function globalSetup(): Promise<void> {
  console.log('\n[E2E] Waiting for services to be ready...')
  await Promise.all([
    waitForUrl(`${BACKEND_URL}/api/health`),
    waitForUrl(FRONTEND_URL),
  ])
  console.log('[E2E] All services ready.\n')
}
