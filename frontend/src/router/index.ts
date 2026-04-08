import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/model-viewer',
    },
    {
      path: '/model-viewer',
      name: 'model-viewer',
      component: () => import('../views/ModelViewer.vue'),
    },
    {
      path: '/tuple-manager',
      name: 'tuple-manager',
      component: () => import('../views/TupleManager.vue'),
    },
    {
      path: '/query-console',
      name: 'query-console',
      component: () => import('../views/QueryConsole.vue'),
    },
    {
      path: '/relationship-graph',
      name: 'relationship-graph',
      component: () => import('../views/RelationshipGraph.vue'),
    },
    {
      path: '/store-admin',
      name: 'store-admin',
      component: () => import('../views/StoreAdmin.vue'),
    },
    {
      path: '/import-export',
      name: 'import-export',
      component: () => import('../views/ImportExport.vue'),
    },
    {
      path: '/test-suites',
      name: 'test-suites',
      component: () => import('../views/TestSuites.vue'),
    },
  ],
})

router.onError((err, to) => {
  if (err?.message?.includes('Failed to fetch dynamically imported module') ||
      err?.message?.includes('Importing a module script failed')) {
    window.location.href = to.fullPath
  }
})

export default router
