import { test, expect } from '../fixtures/connected'
import { BACKEND_URL } from '../config'

/**
 * Functional tests — Test Suites
 *
 * These tests require a connected store (injected via the `storeId` fixture).
 * Each test gets a fresh OpenFGA store created and cleaned up automatically.
 *
 * Coverage:
 * - Empty state renders on first visit
 * - Create suite — happy path
 * - Create suite — validation (name required)
 * - Delete suite with confirmation dialog
 * - Suite card navigates to editor tab
 */

/** Delete all suites in the DB to ensure a clean slate for each test. */
async function clearAllSuites(): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/suites`)
  if (!res.ok) return
  const data = (await res.json()) as { suites: { id: string }[] }
  await Promise.all(
    data.suites.map((s) =>
      fetch(`${BACKEND_URL}/api/suites/${s.id}`, { method: 'DELETE' }),
    ),
  )
}

test.beforeEach(async () => {
  await clearAllSuites()
})

test.describe('Test Suites — empty state', () => {
  test('shows empty state when no suites exist', async ({ page, storeId: _storeId }) => {
    await page.goto('/test-suites')
    await expect(page.getByText('Get started with Test Suites')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Create your first suite' })).toBeVisible()
  })
})

test.describe('Test Suites — create suite', () => {
  test('opens create form from empty state CTA', async ({ page, storeId: _storeId }) => {
    await page.goto('/test-suites')
    await page.getByRole('button', { name: 'Create your first suite' }).click()
    await expect(page.getByLabel('Create suite form')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'New Suite' })).toBeVisible()
  })

  test('creates a suite and shows it in the list', async ({ page, storeId: _storeId }) => {
    await page.goto('/test-suites')

    // Open form
    await page.getByRole('button', { name: 'Create your first suite' }).click()
    await expect(page.getByLabel('Create suite form')).toBeVisible()

    // Fill in name
    await page.getByLabel('Name').fill('My E2E Suite')

    // Submit — scope to form to avoid matching the "Create your first suite" empty-state button
    await page.getByLabel('Create suite form').getByRole('button', { name: 'Create' }).click()

    // Form closes and suite card appears
    await expect(page.getByLabel('Create suite form')).not.toBeVisible()
    await expect(page.getByRole('article', { name: 'Suite: My E2E Suite' })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('shows validation error when name is empty', async ({ page, storeId: _storeId }) => {
    await page.goto('/test-suites')

    await page.getByRole('button', { name: 'Create your first suite' }).click()
    await expect(page.getByLabel('Create suite form')).toBeVisible()

    // Submit without filling in name — scope to form
    await page.getByLabel('Create suite form').getByRole('button', { name: 'Create' }).click()

    // Error message should appear
    await expect(page.getByText('Name is required')).toBeVisible()

    // Form stays open
    await expect(page.getByLabel('Create suite form')).toBeVisible()
  })

  test('cancels create form without creating a suite', async ({ page, storeId: _storeId }) => {
    await page.goto('/test-suites')

    await page.getByRole('button', { name: 'Create your first suite' }).click()
    await expect(page.getByLabel('Create suite form')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByLabel('Create suite form')).not.toBeVisible()
    // Empty state is still shown
    await expect(page.getByText('Get started with Test Suites')).toBeVisible()
  })
})

test.describe('Test Suites — manage existing suite', () => {
  /**
   * Helper: create a suite via the UI and return the suite name.
   * After this the suite list should be visible.
   */
  async function createSuiteViaUi(page: import('@playwright/test').Page, name: string) {
    await page.goto('/test-suites')
    await page.getByRole('button', { name: 'Create your first suite' }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Create suite form').getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('article', { name: `Suite: ${name}` })).toBeVisible({
      timeout: 10_000,
    })
  }

  test('opens suite in editor tab on card click', async ({ page, storeId: _storeId }) => {
    const name = 'E2E Editor Test'
    await createSuiteViaUi(page, name)

    await page.getByRole('article', { name: `Suite: ${name}` }).click()

    // Should switch to Editor tab and show the suite editor
    await expect(page.getByRole('tab', { name: 'Editor' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('deletes a suite after confirmation', async ({ page, storeId: _storeId }) => {
    const name = 'E2E Delete Me'
    await createSuiteViaUi(page, name)

    // Open menu and click Delete
    await page.getByRole('button', { name: `Menu for suite ${name}` }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()

    // Confirm dialog should appear — wait for its message text
    await expect(
      page.getByText('This will permanently delete the suite'),
    ).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: 'Delete' }).last().click()

    // Suite is removed — empty state comes back
    await expect(page.getByText('Get started with Test Suites')).toBeVisible({ timeout: 10_000 })
  })

  test('New Suite button appears once suites exist', async ({ page, storeId: _storeId }) => {
    const name = 'E2E Has Suites'
    await createSuiteViaUi(page, name)

    // After creation the header "New Suite" button should be visible
    await expect(page.getByRole('button', { name: 'New Suite' })).toBeVisible()
  })
})
