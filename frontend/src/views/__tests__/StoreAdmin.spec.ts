import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ref } from 'vue'

vi.stubGlobal('ResizeObserver', class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
})

const fetchStorsMock = vi.fn()
const createStoreMock = vi.fn()
const deleteStoreMock = vi.fn()
const selectStoreMock = vi.fn()

const storeListRef = ref<Array<{ id: string; name: string; created_at: string; updated_at: string }>>([])
const loadingRef = ref(false)
const errorRef = ref<string | null>(null)

vi.mock('@/stores/stores', () => ({
  useStoresStore: () => ({
    storeList: storeListRef.value,
    loading: loadingRef.value,
    error: errorRef.value,
    fetchStores: fetchStorsMock,
    createStore: createStoreMock,
    deleteStore: deleteStoreMock,
    selectStore: selectStoreMock,
  }),
}))

vi.mock('@/stores/connection', () => ({
  useConnectionStore: () => ({
    storeId: ref('').value,
  }),
}))

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/store-admin', component: { template: '<div />' } },
  ],
})

async function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const { default: StoreAdmin } = await import('../StoreAdmin.vue')
  const wrapper = mount(StoreAdmin, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return wrapper
}

describe('StoreAdmin', () => {
  beforeEach(async () => {
    fetchStorsMock.mockReset().mockResolvedValue(undefined)
    createStoreMock.mockReset()
    deleteStoreMock.mockReset()
    selectStoreMock.mockReset()
    storeListRef.value = []
    loadingRef.value = false
    errorRef.value = null
    await router.push('/')
  })

  it('calls fetchStores on mount', async () => {
    await mountView()
    expect(fetchStorsMock).toHaveBeenCalledOnce()
  })

  it('shows empty state when no stores', async () => {
    storeListRef.value = []
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('No stores on this instance')
  })

  it('shows store list when stores exist', async () => {
    storeListRef.value = [
      { id: 'store-1', name: 'Alpha', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: 'store-2', name: 'Beta', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Beta')
  })

  it('shows Create Store button and opens form on click', async () => {
    const wrapper = await mountView()
    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('Create Store'))
    expect(createBtn).toBeTruthy()
    await createBtn!.trigger('click')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('calls createStore with trimmed name on form submit', async () => {
    createStoreMock.mockResolvedValue({ id: 'new-1', name: 'New', created_at: '', updated_at: '' })
    const wrapper = await mountView()

    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('Create Store'))
    await createBtn!.trigger('click')

    const input = wrapper.find('input')
    await input.setValue('  New Store  ')

    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()

    expect(createStoreMock).toHaveBeenCalledWith('New Store')
  })

  it('does not submit when name is empty', async () => {
    const wrapper = await mountView()
    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('Create Store'))
    await createBtn!.trigger('click')

    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()

    expect(createStoreMock).not.toHaveBeenCalled()
  })

  it('shows ConfirmDialog when delete is triggered from StoreCard', async () => {
    storeListRef.value = [
      { id: 'store-1', name: 'My Store', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('delete')
    await wrapper.vm.$nextTick()

    const dialog = wrapper.findComponent({ name: 'ConfirmDialog' })
    expect(dialog.props('open')).toBe(true)
    expect(dialog.props('message')).toContain("My Store")
  })

  it('calls deleteStore when confirm dialog confirmed', async () => {
    deleteStoreMock.mockResolvedValue(undefined)
    storeListRef.value = [
      { id: 'store-1', name: 'My Store', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('delete')
    await wrapper.vm.$nextTick()

    const dialog = wrapper.findComponent({ name: 'ConfirmDialog' })
    await dialog.vm.$emit('confirm')
    await flushPromises()

    expect(deleteStoreMock).toHaveBeenCalledWith('store-1')
  })

  it('calls selectStore when StoreCard select is emitted', async () => {
    storeListRef.value = [
      { id: 'store-1', name: 'Alpha', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('select')

    expect(selectStoreMock).toHaveBeenCalledWith('store-1')
  })

  it('shows error message when fetchStores fails', async () => {
    errorRef.value = 'Connection refused'
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('Connection refused')
  })
})
