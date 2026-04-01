import { test as base, expect } from '@playwright/test'
import { BACKEND_URL } from '../config'

/**
 * Functional tests — Store Admin
 *
 * These tests do NOT use the `connected` fixture — Store Admin
 * manages stores independently of a pre-selected store.
 * Each test creates/cleans up stores as needed.
 */

/** Delete all stores on the instance to start clean. */
async function clearAllStores(): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/stores`)
  if (!res.ok) return
  const data = (await res.json()) as { stores?: { id: string }[] }
  if (!data.stores) return
  await Promise.all(
    data.stores.map((s) =>
      fetch(`${BACKEND_URL}/api/stores/${s.id}`, { method: 'DELETE' }),
    ),
  )
}

const test = base

test.beforeEach(async () => {
  await clearAllStores()
})

test.afterAll(async () => {
  await clearAllStores()
})

test.describe('Store Admin — empty state', () => {
  test('shows empty state when no stores exist', async ({ page }) => {
    await page.goto('/store-admin')
    await expect(page.getByText('No stores on this instance')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Create your first store to get started.')).toBeVisible()
  })
})

test.describe('Store Admin — create store', () => {
  test('creates a store and shows it in the list', async ({ page }) => {
    await page.goto('/store-admin')
    await expect(page.getByText('No stores on this instance')).toBeVisible({ timeout: 10_000 })

    // Both header and empty state have "Create Store" — click the first
    await page.getByRole('button', { name: 'Create Store' }).first().click()

    // Fill in the store name
    await page.getByPlaceholder('Store name').fill('E2E Test Store')

    // Submit
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Store card should appear
    await expect(page.getByText('E2E Test Store')).toBeVisible({ timeout: 10_000 })
  })

  test('Create button is disabled when name is empty', async ({ page }) => {
    await page.goto('/store-admin')
    await expect(page.getByText('No stores on this instance')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Create Store' }).first().click()

    // Create button should be disabled when name is empty
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled()

    // Form is still visible
    await expect(page.getByPlaceholder('Store name')).toBeVisible()
  })

  test('cancels create form', async ({ page }) => {
    await page.goto('/store-admin')
    await expect(page.getByText('No stores on this instance')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Create Store' }).first().click()
    await expect(page.getByPlaceholder('Store name')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByPlaceholder('Store name')).not.toBeVisible()
  })
})

test.describe('Store Admin — manage stores', () => {
  async function createStoreViaApi(name: string): Promise<string> {
    const res = await fetch(`${BACKEND_URL}/api/stores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = (await res.json()) as { id: string }
    return data.id
  }

  test('selects a store by clicking its card', async ({ page }) => {
    await createStoreViaApi('E2E Select Me')
    await page.goto('/store-admin')

    // Click the store card
    const card = page.getByRole('button').filter({ hasText: 'E2E Select Me' })
    await card.click()

    // Active badge should appear
    await expect(page.getByLabel('Active store')).toBeVisible({ timeout: 5_000 })
  })

  test('deletes a store after confirmation', async ({ page }) => {
    await createStoreViaApi('E2E Delete Me')
    await page.goto('/store-admin')

    // Wait for store to appear
    await expect(page.getByText('E2E Delete Me')).toBeVisible({ timeout: 10_000 })

    // Click Delete on the store card — exact match to avoid matching the card itself
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    // Confirm dialog
    await expect(page.getByText('Are you sure you want to delete')).toBeVisible({ timeout: 5_000 })
    // Two "Delete" buttons now: the card's and the dialog confirm — use last
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click()

    // Empty state should come back
    await expect(page.getByText('No stores on this instance')).toBeVisible({ timeout: 10_000 })
  })

  test('multiple stores are listed', async ({ page }) => {
    await createStoreViaApi('E2E Store Alpha')
    await createStoreViaApi('E2E Store Beta')
    await page.goto('/store-admin')

    await expect(page.getByText('E2E Store Alpha')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('E2E Store Beta')).toBeVisible()
  })
})
