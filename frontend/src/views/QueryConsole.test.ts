import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import QueryConsole from './QueryConsole.vue'
import { useConnectionStore } from '@/stores/connection'
import { useModelStore } from '@/stores/model'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
})

let pinia: ReturnType<typeof createPinia>

function mountView() {
  return mount(QueryConsole, {
    global: {
      plugins: [pinia, router],
      stubs: { CheckQuery: true, ListObjectsQuery: true, ListUsersQuery: true, ExpandQuery: true },
    },
  })
}

describe('QueryConsole', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    fetchMock.mockReset()
  })

  it('renders "No store selected" EmptyState when storeId is empty', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('No store selected')
  })

  it('renders "No model loaded" EmptyState when model json is null', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ dsl: null, json: null, authorizationModelId: null }),
    })
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 20))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No model loaded')
  })

  it('renders AppTabs with all four tabs when store and model are available', async () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const modelStore = useModelStore()
    modelStore.json = { type_definitions: [] }

    const wrapper = mountView()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Check')
    expect(wrapper.text()).toContain('List Objects')
    expect(wrapper.text()).toContain('List Users')
    expect(wrapper.text()).toContain('Expand')
  })

  it('fetches model on mount when storeId is set', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ dsl: null, json: null, authorizationModelId: null }),
    })
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const modelStore = useModelStore()
    const fetchSpy = vi.spyOn(modelStore, 'fetchModel')

    mountView()
    await new Promise((r) => setTimeout(r, 10))

    expect(fetchSpy).toHaveBeenCalledWith('store-1')
  })
})
