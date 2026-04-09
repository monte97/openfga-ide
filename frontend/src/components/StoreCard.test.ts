import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import StoreCard from './StoreCard.vue'

const mockStore = {
  id: 'store-01',
  name: 'Test Store',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('StoreCard.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders store name', () => {
    const wrapper = mount(StoreCard, { props: { store: mockStore, isActive: false } })
    expect(wrapper.text()).toContain('Test Store')
  })

  it('emits select on card click', async () => {
    const wrapper = mount(StoreCard, { props: { store: mockStore, isActive: false } })
    await wrapper.find('[role="button"]').trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('emits delete when delete button is clicked', async () => {
    const wrapper = mount(StoreCard, { props: { store: mockStore, isActive: false } })
    const buttons = wrapper.findAll('button')
    const deleteBtn = buttons.find((b) => b.text().includes('Delete'))
    await deleteBtn!.trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })

  it('emits backup with store id when Backup button is clicked', async () => {
    const wrapper = mount(StoreCard, { props: { store: mockStore, isActive: false } })
    const buttons = wrapper.findAll('button')
    const backupBtn = buttons.find((b) => b.text().includes('Backup'))
    await backupBtn!.trigger('click')
    expect(wrapper.emitted('backup')).toBeTruthy()
    expect(wrapper.emitted('backup')![0]).toEqual(['store-01'])
  })

  it('does not emit select when Backup button is clicked (stopPropagation)', async () => {
    const wrapper = mount(StoreCard, { props: { store: mockStore, isActive: false } })
    const buttons = wrapper.findAll('button')
    const backupBtn = buttons.find((b) => b.text().includes('Backup'))
    await backupBtn!.trigger('click')
    expect(wrapper.emitted('select')).toBeFalsy()
  })

  it('emits restore with store id when Restore button is clicked', async () => {
    const wrapper = mount(StoreCard, { props: { store: mockStore, isActive: false } })
    const buttons = wrapper.findAll('button')
    const restoreBtn = buttons.find((b) => b.text().includes('Restore'))
    await restoreBtn!.trigger('click')
    expect(wrapper.emitted('restore')).toBeTruthy()
    expect(wrapper.emitted('restore')![0]).toEqual(['store-01'])
  })

  it('does not emit select when Restore button is clicked', async () => {
    const wrapper = mount(StoreCard, { props: { store: mockStore, isActive: false } })
    const buttons = wrapper.findAll('button')
    const restoreBtn = buttons.find((b) => b.text().includes('Restore'))
    await restoreBtn!.trigger('click')
    expect(wrapper.emitted('select')).toBeFalsy()
  })
})
