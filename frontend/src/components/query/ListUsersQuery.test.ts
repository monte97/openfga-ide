import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ListUsersQuery from './ListUsersQuery.vue'
import { useQueryStore } from '@/stores/queries'
import { useConnectionStore } from '@/stores/connection'

vi.stubGlobal('fetch', vi.fn())

let pinia: ReturnType<typeof createPinia>

function mountComponent() {
  return mount(ListUsersQuery, {
    global: { plugins: [pinia] },
  })
}

describe('ListUsersQuery', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders Object Type, Object ID, Relation fields and List Users button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Object Type')
    expect(wrapper.text()).toContain('Object ID')
    expect(wrapper.text()).toContain('Relation')
    expect(wrapper.text()).toContain('List Users')
  })

  it('calls queryStore.listUsers with storeId when button clicked with valid inputs', async () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-test')
    const queryStore = useQueryStore()
    queryStore.listUsersInputs.objectType = 'document'
    queryStore.listUsersInputs.objectId = 'roadmap'
    queryStore.listUsersInputs.relation = 'viewer'
    queryStore.listUsers = vi.fn().mockResolvedValue(undefined)

    const wrapper = mountComponent()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('List Users'))
    await btn!.trigger('click')

    expect(queryStore.listUsers).toHaveBeenCalledWith('store-test')
  })

  it('button is disabled when inputs are incomplete', () => {
    const wrapper = mountComponent()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('List Users'))
    expect(btn!.attributes('disabled')).toBeDefined()
  })

  it('renders TypeBadge and identifier text for each result user', () => {
    const queryStore = useQueryStore()
    queryStore.listUsersResult = ['user:alice', 'user:bob']

    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('user:alice')
    expect(wrapper.text()).toContain('user:bob')
    const badges = wrapper.findAllComponents({ name: 'TypeBadge' })
    expect(badges.length).toBe(2)
    expect(badges[0].props('typeName')).toBe('user')
  })

  it('renders "No users found" when result is empty array', () => {
    const queryStore = useQueryStore()
    queryStore.listUsersResult = []

    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('No users found')
  })

  it('does not render result area when result is null', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).not.toContain('No users found')
  })

  it('shows "Listing..." text when loading', () => {
    const queryStore = useQueryStore()
    queryStore.listUsersLoading = true

    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Listing...')
  })
})
