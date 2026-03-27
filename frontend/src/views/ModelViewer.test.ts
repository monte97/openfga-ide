import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ModelViewer from './ModelViewer.vue'
import { useConnectionStore } from '@/stores/connection'
import { useModelStore } from '@/stores/model'

vi.mock('@/composables/useShiki', () => ({
  highlightDsl: vi.fn().mockResolvedValue('<pre><code>mocked</code></pre>'),
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
})

let pinia: ReturnType<typeof createPinia>

function mountViewer() {
  return mount(ModelViewer, {
    global: {
      plugins: [pinia, router],
    },
  })
}

describe('ModelViewer', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    fetchMock.mockReset()
  })

  it('renders "No store selected" EmptyState when storeId is empty', () => {
    const wrapper = mountViewer()
    expect(wrapper.text()).toContain('No store selected')
  })

  it('calls modelStore.fetchModel on mount when store is selected', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ dsl: null, json: null, authorizationModelId: null }),
    })

    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const modelStore = useModelStore()
    const fetchSpy = vi.spyOn(modelStore, 'fetchModel')

    mountViewer()
    await new Promise((r) => setTimeout(r, 10))

    expect(fetchSpy).toHaveBeenCalledWith('store-1')
  })

  it('shows LoadingSpinner when modelStore.loading is true', async () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const modelStore = useModelStore()
    modelStore.loading = true

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => new Promise(() => {}),
    })

    const wrapper = mountViewer()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
  })

  it('shows ModelDslView when loading is false and dsl tab is active', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ dsl: 'model\n  schema 1.1', json: {}, authorizationModelId: 'mid' }),
    })

    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const wrapper = mountViewer()
    await new Promise((r) => setTimeout(r, 20))
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'ModelDslView' }).exists()).toBe(true)
  })

  it('renders both DSL and Graph tabs in AppTabs', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ dsl: null, json: null, authorizationModelId: null }),
    })

    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const wrapper = mountViewer()
    await wrapper.vm.$nextTick()

    const tabButtons = wrapper.findAll('button')
    const labels = tabButtons.map((b) => b.text())
    expect(labels).toContain('DSL')
    expect(labels).toContain('Graph')
  })
})
