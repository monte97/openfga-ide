import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from '../AppButton.vue'

describe('AppButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(AppButton, { slots: { default: 'Click me' } })
    expect(wrapper.text()).toContain('Click me')
  })

  it('applies primary variant classes by default', () => {
    const wrapper = mount(AppButton, { slots: { default: 'Button' } })
    expect(wrapper.classes()).toContain('bg-info')
  })

  it('applies secondary variant classes', () => {
    const wrapper = mount(AppButton, {
      props: { variant: 'secondary' },
      slots: { default: 'Button' },
    })
    expect(wrapper.classes()).toContain('bg-surface-elevated')
  })

  it('applies danger variant classes', () => {
    const wrapper = mount(AppButton, {
      props: { variant: 'danger' },
      slots: { default: 'Button' },
    })
    expect(wrapper.classes()).toContain('bg-error')
  })

  it('emits click event', async () => {
    const wrapper = mount(AppButton, { slots: { default: 'Button' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('is disabled and does not emit click when loading', async () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
      slots: { default: 'Loading' },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(AppButton, {
      props: { disabled: true },
      slots: { default: 'Button' },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('shows LoadingSpinner when loading', () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
      slots: { default: 'Loading' },
    })
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
  })
})
