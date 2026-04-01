import { test as base, type Page } from '@playwright/test'

export class AppPage {
  constructor(readonly page: Page) {}

  async goto(path = '/') {
    await this.page.goto(path)
    // Wait for the app shell to be mounted (sidebar is always present)
    await this.page.waitForSelector('[data-testid="app-sidebar"]', { timeout: 10_000 })
  }

  sidebar() {
    return this.page.getByRole('navigation', { name: 'Main navigation' })
  }

  navLink(name: string) {
    return this.sidebar().getByRole('link', { name })
  }
}

type Fixtures = { app: AppPage }

export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    await use(new AppPage(page))
  },
})

export { expect } from '@playwright/test'
