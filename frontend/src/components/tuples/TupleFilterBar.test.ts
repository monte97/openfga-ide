import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TupleFilterBar from './TupleFilterBar.vue'
import { useTupleStore } from '@/stores/tuples'

vi.stubGlobal('fetch', vi.fn())

let pinia: ReturnType<typeof createPinia>

function mountFilterBar() {
  return mount(TupleFilterBar, {
    global: { plugins: [pinia] },
  })
}

describe('TupleFilterBar', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders three filter inputs with correct placeholders', () => {
    const wrapper = mountFilterBar()
    const inputs = wrapper.findAll('input')
    expect(inputs).toHaveLength(3)
    expect(inputs[0].attributes('placeholder')).toBe('Filter by type...')
    expect(inputs[1].attributes('placeholder')).toBe('Filter by relation...')
    expect(inputs[2].attributes('placeholder')).toBe('Filter by user...')
  })

  it('clear button appears when input has content', async () => {
    const store = useTupleStore()
    store.filterType = 'document'

    const wrapper = mountFilterBar()
    const clearBtns = wrapper.findAll('button[aria-label*="Clear"]')
    expect(clearBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('"Clear All" button visible when any filter is active', async () => {
    const store = useTupleStore()
    store.filterType = 'doc'

    const wrapper = mountFilterBar()
    // Wait for watcher to trigger hasFilters update
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Clear All')
  })

  it('"Clear All" button hidden when no filters are active', () => {
    const wrapper = mountFilterBar()
    expect(wrapper.text()).not.toContain('Clear All')
  })
})
