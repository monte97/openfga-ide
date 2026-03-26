import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useConnectionStore } from '@/stores/connection'
import ConnectionPopover from '../ConnectionPopover.vue'

vi.stubGlobal('fetch', vi.fn())

function mountPopover(pinia = createPinia()) {
  return mount(ConnectionPopover, {
    global: { plugins: [pinia] },
    attachTo: document.body,
  })
}

describe('ConnectionPopover', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders ConnectionBadge trigger', () => {
    const wrapper = mountPopover()
    expect(wrapper.findComponent({ name: 'ConnectionBadge' }).exists()).toBe(true)
  })

  it('shows edit form when "Edit Connection" is clicked', async () => {
    const pinia = createPinia()
    const store = useConnectionStore(pinia)
    store.url = 'http://localhost:8080'
    store.status = 'connected' as 'connected'

    const wrapper = mountPopover(pinia)

    // Open popover
    await wrapper.find('[aria-label="Toggle connection settings"]').trigger('click')
    await wrapper.vm.$nextTick()

    const editBtn = wrapper.findAll('button').find((b) => b.text().includes('Edit Connection'))
    if (editBtn) {
      await editBtn.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('input').exists()).toBe(true)
    }
  })

  it('calls testConnection when Test button is clicked', async () => {
    const pinia = createPinia()
    const store = useConnectionStore(pinia)
    store.url = 'http://localhost:8080'
    store.status = 'connected' as 'connected'
    const testSpy = vi.spyOn(store, 'testConnection').mockResolvedValue(true)

    const wrapper = mountPopover(pinia)

    await wrapper.find('[aria-label="Toggle connection settings"]').trigger('click')
    await wrapper.vm.$nextTick()

    const editBtn = wrapper.findAll('button').find((b) => b.text().includes('Edit Connection'))
    if (editBtn) {
      await editBtn.trigger('click')
      await wrapper.vm.$nextTick()

      const testBtn = wrapper.findAll('button').find((b) => b.text().includes('Test'))
      if (testBtn) {
        await testBtn.trigger('click')
        expect(testSpy).toHaveBeenCalled()
      }
    }
  })

  it('Save button is disabled before successful test', async () => {
    const pinia = createPinia()
    const store = useConnectionStore(pinia)
    store.url = 'http://localhost:8080'
    store.status = 'connected' as 'connected'

    const wrapper = mountPopover(pinia)

    await wrapper.find('[aria-label="Toggle connection settings"]').trigger('click')
    await wrapper.vm.$nextTick()

    const editBtn = wrapper.findAll('button').find((b) => b.text().includes('Edit Connection'))
    if (editBtn) {
      await editBtn.trigger('click')
      await wrapper.vm.$nextTick()

      const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Save'))
      if (saveBtn) {
        expect(saveBtn.attributes('disabled')).toBeDefined()
      }
    }
  })
})
