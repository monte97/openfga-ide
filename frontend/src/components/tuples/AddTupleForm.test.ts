import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AddTupleForm from './AddTupleForm.vue'

vi.stubGlobal('fetch', vi.fn())

let pinia: ReturnType<typeof createPinia>

function mountForm() {
  return mount(AddTupleForm, {
    global: { plugins: [pinia] },
  })
}

describe('AddTupleForm', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders user and object input fields and a submit button', () => {
    const wrapper = mountForm()
    expect(wrapper.find('input[placeholder="user:alice"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="document:roadmap"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Add Tuple')
  })

  it('shows validation error when user field is invalid on blur', async () => {
    const wrapper = mountForm()
    const userInput = wrapper.find('input[placeholder="user:alice"]')
    await userInput.setValue('alice')
    await userInput.trigger('blur')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('type:id')
  })

  it('submit button shows "Add Tuple" label', () => {
    const wrapper = mountForm()
    const buttons = wrapper.findAll('button')
    const addBtn = buttons.find((b) => b.text().includes('Add Tuple'))
    expect(addBtn).toBeDefined()
  })

  it('clears validation error when user provides valid type:id', async () => {
    const wrapper = mountForm()
    const userInput = wrapper.find('input[placeholder="user:alice"]')
    await userInput.setValue('no-colon')
    await userInput.trigger('blur')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('type:id')

    await userInput.setValue('user:alice')
    await userInput.trigger('blur')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('type:id')
  })
})
