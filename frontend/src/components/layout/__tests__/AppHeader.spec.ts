import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppHeader from '../AppHeader.vue'
import { useConnectionStore } from '@/stores/connection'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

describe('AppHeader', () => {
  beforeEach(async () => {
    await router.push('/')
    fetchMock.mockReset()
  })

  it('renders app title', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ url: '', storeId: '', status: 'connected' }) })
    const wrapper = mount(AppHeader, { global: { plugins: [pinia, router] } })
    expect(wrapper.text()).toContain('OpenFGA Viewer')
  })

  it('calls fetchConnection and fetchStores on mount', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'http://h:8080', storeId: '', status: 'connected' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ stores: [] }) })

    mount(AppHeader, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/connection', expect.any(Object))
    expect(fetchMock).toHaveBeenCalledWith('/api/stores', expect.any(Object))
  })

  it('shows "Select a store..." text when connected but no store selected', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ url: '', storeId: '', status: 'connected' }) })

    const store = useConnectionStore()
    store.url = 'http://h:8080'
    store.storeId = ''
    store.status = 'connected' as 'connected'

    const wrapper = mount(AppHeader, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Select a store...')
  })

  it('shows ConnectionPopover component', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ url: '', storeId: '', status: 'connected' }) })

    const store = useConnectionStore()
    store.status = 'connected' as 'connected'

    const wrapper = mount(AppHeader, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'ConnectionPopover' }).exists()).toBe(true)
  })
})
