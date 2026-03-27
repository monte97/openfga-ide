import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import TupleManager from './TupleManager.vue'
import { useConnectionStore } from '@/stores/connection'
import { useTupleStore } from '@/stores/tuples'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
})

let pinia: ReturnType<typeof createPinia>

function mountView() {
  return mount(TupleManager, {
    global: { plugins: [pinia, router] },
  })
}

describe('TupleManager', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    fetchMock.mockReset()
  })

  it('renders "No store selected" EmptyState when storeId is empty', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('No store selected')
  })

  it('calls tupleStore.fetchTuples on mount when store is selected', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ tuples: [], continuationToken: null }),
    })

    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const tupleStore = useTupleStore()
    const fetchSpy = vi.spyOn(tupleStore, 'fetchTuples')

    mountView()
    await new Promise((r) => setTimeout(r, 10))

    expect(fetchSpy).toHaveBeenCalledWith('store-1')
  })

  it('shows LoadingSpinner when loading and no tuples', async () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const tupleStore = useTupleStore()
    tupleStore.loading = true

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => new Promise(() => {}),
    })

    const wrapper = mountView()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
  })

  it('shows EmptyState when tuples are empty and no filters active', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ tuples: [], continuationToken: null }),
    })

    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 20))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No tuples in this store')
  })

  it('shows TupleFilterBar + TupleTable when tuples exist', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        tuples: [{ key: { user: 'u:a', relation: 'r', object: 'o:b' }, timestamp: 'ts' }],
        continuationToken: null,
      }),
    })

    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 20))
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'TupleFilterBar' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'TupleTable' }).exists()).toBe(true)
  })

  it('shows TupleFilterBar + TupleTable when filters active even if empty', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ tuples: [], continuationToken: null }),
    })

    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')

    const tupleStore = useTupleStore()
    tupleStore.filterType = 'document'

    const wrapper = mountView()
    await new Promise((r) => setTimeout(r, 20))
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'TupleFilterBar' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'TupleTable' }).exists()).toBe(true)
  })
})
