/**
 * Fixture: connected
 *
 * Provides a Playwright test context where:
 * 1. A fresh OpenFGA store is created via the backend API
 * 2. The store ID is injected into localStorage before page load
 *    (key: 'openfga-viewer:selectedStoreId') — mirrors what the app writes
 *    when the user selects a store via the UI
 * 3. The store is deleted after the test to keep the environment clean
 *
 * Usage:
 *   import { test, expect } from '@/fixtures/connected'
 *   test('something', async ({ page, storeId }) => { ... })
 */

import { test as base, expect } from '@playwright/test'
import { AppPage } from './base'
import { BACKEND_URL } from '../config'
const LS_KEY = 'openfga-viewer:selectedStoreId'

async function createStore(name: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/stores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`Failed to create store: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { id: string }
  return data.id
}

async function deleteStore(storeId: string): Promise<void> {
  await fetch(`${BACKEND_URL}/api/stores/${storeId}`, { method: 'DELETE' })
}

/** Seed a store with a model and optional tuples via the import API. */
export async function seedStore(
  storeId: string,
  model: unknown,
  tuples: Array<{ user: string; relation: string; object: string }> = [],
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/stores/${storeId}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, tuples }),
  })
  if (!res.ok) throw new Error(`Failed to seed store: ${res.status} ${await res.text()}`)
}

/** Minimal OpenFGA model with user + document types. */
export const SIMPLE_MODEL = {
  schema_version: '1.1',
  type_definitions: [
    { type: 'user', relations: {}, metadata: null },
    {
      type: 'document',
      relations: {
        viewer: { this: {} },
        editor: { this: {} },
      },
      metadata: {
        relations: {
          viewer: { directly_related_user_types: [{ type: 'user' }] },
          editor: { directly_related_user_types: [{ type: 'user' }] },
        },
      },
    },
  ],
}

type ConnectedFixtures = {
  app: AppPage
  storeId: string
}

export const test = base.extend<ConnectedFixtures>({
  storeId: async ({ page }, use) => {
    const id = await createStore(`e2e-test-${Date.now()}`)

    // Inject storeId before the page loads so the connection store picks it up
    await page.addInitScript(
      ({ key, value }) => {
        localStorage.setItem(key, value)
      },
      { key: LS_KEY, value: id },
    )

    await use(id)

    await deleteStore(id)
  },

  app: async ({ page }, use) => {
    await use(new AppPage(page))
  },
})

export { expect }
