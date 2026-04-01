import { test, expect } from '@playwright/test'

/**
 * Smoke tests — Navigation
 *
 * Verify that the app shell renders and all routes are reachable
 * without crashes or blank pages.
 *
 * These tests do NOT require a specific store state — they only
 * assert that the correct view is mounted and the sidebar works.
 */

test.describe('App shell', () => {
  test('loads the app and renders the sidebar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  })

  test('redirects / to /model-viewer', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/model-viewer/)
  })
})

test.describe('Sidebar navigation', () => {
  const routes = [
    { label: 'Model Viewer', path: '/model-viewer' },
    { label: 'Tuple Manager', path: '/tuple-manager' },
    { label: 'Query Console', path: '/query-console' },
    { label: 'Relationship Graph', path: '/relationship-graph' },
    { label: 'Store Admin', path: '/store-admin' },
    { label: 'Import / Export', path: '/import-export' },
    { label: 'Test Suites', path: '/test-suites' },
  ]

  for (const { label, path } of routes) {
    test(`navigates to ${label}`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: label })
        .click()
      await expect(page).toHaveURL(new RegExp(path))
      // Page should not be blank — at minimum the sidebar is still present
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    })
  }
})

test.describe('Test Suites page', () => {
  test('renders the Test Suites view', async ({ page }) => {
    await page.goto('/test-suites')
    // Either the suite list or an empty state should be visible
    await expect(
      page.getByRole('heading', { name: /test suite/i }).or(
        page.getByText(/no suite/i)
      )
    ).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Store Admin page', () => {
  test('renders the Store Administration heading', async ({ page }) => {
    await page.goto('/store-admin')
    await expect(
      page.getByRole('heading', { name: 'Store Administration' })
    ).toBeVisible({ timeout: 10_000 })
  })
})
