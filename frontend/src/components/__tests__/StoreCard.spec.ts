import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StoreCard from '../StoreCard.vue'

const store = {
  id: 'store-abc-123',
  name: 'My Store',
  created_at: '2024-06-15T10:00:00Z',
  updated_at: '2024-06-15T10:00:00Z',
}

describe('StoreCard', () => {
  it('renders store name and ID', () => {
    const wrapper = mount(StoreCard, { props: { store, isActive: false } })
    expect(wrapper.text()).toContain('My Store')
    expect(wrapper.text()).toContain('store-abc-123')
  })

  it('shows active indicator when isActive is true', () => {
    const wrapper = mount(StoreCard, { props: { store, isActive: true } })
    expect(wrapper.find('[aria-label="Active store"]').exists()).toBe(true)
    expect(wrapper.classes()).toContain('border-info')
  })

  it('does not show active indicator when isActive is false', () => {
    const wrapper = mount(StoreCard, { props: { store, isActive: false } })
    expect(wrapper.find('[aria-label="Active store"]').exists()).toBe(false)
    expect(wrapper.classes()).not.toContain('border-info')
  })

  it('emits select on card click', async () => {
    const wrapper = mount(StoreCard, { props: { store, isActive: false } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('emits select on Enter key', async () => {
    const wrapper = mount(StoreCard, { props: { store, isActive: false } })
    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('emits delete when Delete button clicked (no select emitted)', async () => {
    const wrapper = mount(StoreCard, { props: { store, isActive: false } })
    const buttons = wrapper.findAll('button')
    const deleteBtn = buttons.find((b) => b.text().includes('Delete'))
    expect(deleteBtn).toBeTruthy()
    await deleteBtn!.trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('select')).toBeFalsy()
  })

  it('Backup button emits backup event with store id (not disabled)', async () => {
    const wrapper = mount(StoreCard, { props: { store, isActive: false } })
    const buttons = wrapper.findAll('button')
    const backupBtn = buttons.find((b) => b.text().includes('Backup'))
    expect(backupBtn).toBeTruthy()
    expect(backupBtn!.attributes('disabled')).toBeUndefined()
    await backupBtn!.trigger('click')
    expect(wrapper.emitted('backup')).toBeTruthy()
    expect(wrapper.emitted('backup')![0]).toEqual(['store-abc-123'])
    expect(wrapper.emitted('select')).toBeFalsy()
  })

  it('truncates long store IDs', () => {
    const longIdStore = { ...store, id: 'a'.repeat(30) }
    const wrapper = mount(StoreCard, { props: { store: longIdStore, isActive: false } })
    const text = wrapper.text()
    expect(text).toContain('…')
    expect(text).not.toContain('a'.repeat(30))
  })
})
