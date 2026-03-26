import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

// Re-create router with memory history for testing
async function makeRouter() {
  const { default: routes } = await import('../index')
  // We can't easily extract routes from the existing router,
  // so test by navigating and checking matched routes
  return routes
}

describe('router', () => {
  it('all 6 named routes are defined', async () => {
    const router = await makeRouter()
    const routeNames = router.getRoutes().map((r) => r.name).filter(Boolean)
    expect(routeNames).toContain('model-viewer')
    expect(routeNames).toContain('tuple-manager')
    expect(routeNames).toContain('query-console')
    expect(routeNames).toContain('relationship-graph')
    expect(routeNames).toContain('store-admin')
    expect(routeNames).toContain('import-export')
  })

  it('/ redirects to /model-viewer', async () => {
    const testRouter = createRouter({
      history: createMemoryHistory(),
      routes: (await makeRouter()).getRoutes(),
    })
    await testRouter.push('/')
    await testRouter.isReady()
    expect(testRouter.currentRoute.value.path).toBe('/model-viewer')
  })

  it('/model-viewer route resolves', async () => {
    const testRouter = createRouter({
      history: createMemoryHistory(),
      routes: (await makeRouter()).getRoutes(),
    })
    await testRouter.push('/model-viewer')
    expect(testRouter.currentRoute.value.name).toBe('model-viewer')
  })

  it('/store-admin route resolves', async () => {
    const testRouter = createRouter({
      history: createMemoryHistory(),
      routes: (await makeRouter()).getRoutes(),
    })
    await testRouter.push('/store-admin')
    expect(testRouter.currentRoute.value.name).toBe('store-admin')
  })
})
