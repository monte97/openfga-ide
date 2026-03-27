import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import TupleTable from './TupleTable.vue'
import { useTupleStore } from '@/stores/tuples'

vi.stubGlobal('fetch', vi.fn())

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
})

let pinia: ReturnType<typeof createPinia>

function mountTable() {
  return mount(TupleTable, {
    global: { plugins: [pinia, router] },
  })
}

describe('TupleTable', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders table headers (User, Relation, Object)', () => {
    const wrapper = mountTable()
    const headers = wrapper.findAll('th')
    const texts = headers.map((h) => h.text())
    expect(texts).toContain('User')
    expect(texts).toContain('Relation')
    expect(texts).toContain('Object')
  })

  it('renders tuple rows with correct data', () => {
    const store = useTupleStore()
    store.tuples = [
      { key: { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' }, timestamp: 'ts' },
    ]

    const wrapper = mountTable()
    const row = wrapper.find('tbody tr')
    expect(row.text()).toContain('user:alice')
    expect(row.text()).toContain('viewer')
    expect(row.text()).toContain('document:roadmap')
  })

  it('renders TypeBadge for user and object columns', () => {
    const store = useTupleStore()
    store.tuples = [
      { key: { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' }, timestamp: 'ts' },
    ]

    const wrapper = mountTable()
    const badges = wrapper.findAllComponents({ name: 'TypeBadge' })
    expect(badges).toHaveLength(2)
  })

  it('"Load More" button visible when hasMore is true', () => {
    const store = useTupleStore()
    store.tuples = [{ key: { user: 'u:a', relation: 'r', object: 'o:b' }, timestamp: 'ts' }]
    store.continuationToken = 'next'

    const wrapper = mountTable()
    expect(wrapper.text()).toContain('Load More')
  })

  it('"Load More" button hidden when hasMore is false', () => {
    const store = useTupleStore()
    store.tuples = [{ key: { user: 'u:a', relation: 'r', object: 'o:b' }, timestamp: 'ts' }]
    store.continuationToken = null

    const wrapper = mountTable()
    expect(wrapper.text()).not.toContain('Load More')
  })

  it('shows tuple count text', () => {
    const store = useTupleStore()
    store.tuples = [
      { key: { user: 'u:a', relation: 'r', object: 'o:b' }, timestamp: 'ts' },
      { key: { user: 'u:c', relation: 'r', object: 'o:d' }, timestamp: 'ts' },
    ]

    const wrapper = mountTable()
    expect(wrapper.text()).toContain('Showing 2 tuples')
  })

  it('renders delete button per row', () => {
    const store = useTupleStore()
    store.tuples = [
      { key: { user: 'u:a', relation: 'r', object: 'o:b' }, timestamp: 'ts' },
    ]

    const wrapper = mountTable()
    const deleteBtn = wrapper.find('button[aria-label*="Delete tuple"]')
    expect(deleteBtn.exists()).toBe(true)
  })

  it('renders checkbox per row and select-all in header', () => {
    const store = useTupleStore()
    store.tuples = [
      { key: { user: 'u:a', relation: 'r', object: 'o:b' }, timestamp: 'ts' },
    ]

    const wrapper = mountTable()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThanOrEqual(2) // header + 1 row
  })
})
