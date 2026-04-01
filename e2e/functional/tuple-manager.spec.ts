import { test, expect } from '../fixtures/connected'
import { seedStore, SIMPLE_MODEL } from '../fixtures/connected'

/**
 * Functional tests — Tuple Manager
 *
 * These tests use the `connected` fixture (store with storeId injected)
 * and seed a model so the relation dropdown is populated.
 */

test.describe('Tuple Manager — empty state', () => {
  test('shows empty tuple list with seeded model', async ({ page, storeId }) => {
    await seedStore(storeId, SIMPLE_MODEL)
    await page.goto('/tuple-manager')

    await expect(page.getByRole('heading', { name: 'Tuple Manager' })).toBeVisible({
      timeout: 10_000,
    })
    // Empty state message
    await expect(page.getByText('No tuples in this store')).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Tuple Manager — add tuple', () => {
  test('adds a tuple via the form and shows it in the table', async ({ page, storeId }) => {
    await seedStore(storeId, SIMPLE_MODEL)
    await page.goto('/tuple-manager')

    await expect(page.getByRole('heading', { name: 'Tuple Manager' })).toBeVisible({
      timeout: 10_000,
    })

    // Click "Add Tuple" to open the form
    await page.getByRole('button', { name: 'Add Tuple' }).click()

    // Fill in user
    await page.getByPlaceholder('user:alice').fill('user:alice')

    // Select relation — click the select, then pick "viewer"
    await page.getByText('Select relation...').click()
    await page.getByRole('option', { name: 'viewer' }).click()

    // Fill in object
    await page.getByPlaceholder('document:roadmap').fill('document:roadmap')

    // Submit
    await page.getByRole('button', { name: 'Add Tuple' }).last().click()

    // Tuple should appear in the table — use .first() to avoid matching the delete action cell
    await expect(page.getByRole('cell', { name: 'user:alice' }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('cell', { name: 'viewer', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'document:roadmap' }).first()).toBeVisible()
  })

  test('adds multiple tuples and shows count', async ({ page, storeId }) => {
    await seedStore(storeId, SIMPLE_MODEL, [
      { user: 'user:alice', relation: 'viewer', object: 'document:readme' },
      { user: 'user:bob', relation: 'editor', object: 'document:readme' },
    ])
    await page.goto('/tuple-manager')

    // Both tuples should appear
    await expect(page.getByText('user:alice')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('user:bob')).toBeVisible()
    await expect(page.getByText('Showing 2 tuples')).toBeVisible()
  })
})

test.describe('Tuple Manager — delete tuple', () => {
  test('deletes a tuple via the row action', async ({ page, storeId }) => {
    await seedStore(storeId, SIMPLE_MODEL, [
      { user: 'user:alice', relation: 'viewer', object: 'document:readme' },
    ])
    await page.goto('/tuple-manager')

    await expect(page.getByText('user:alice')).toBeVisible({ timeout: 10_000 })

    // Click the delete button on the row
    await page.getByLabel(/Delete tuple/).click()

    // Tuple should be removed
    await expect(page.getByText('user:alice')).not.toBeVisible({ timeout: 5_000 })
  })
})
