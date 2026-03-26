import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppBadge from '../AppBadge.vue'

describe('AppBadge', () => {
  it('renders success variant', () => {
    const wrapper = mount(AppBadge, {
      props: { variant: 'success' },
      slots: { default: 'OK' },
    })
    expect(wrapper.classes()).toContain('bg-success/20')
    expect(wrapper.classes()).toContain('text-success')
  })

  it('renders error variant', () => {
    const wrapper = mount(AppBadge, {
      props: { variant: 'error' },
      slots: { default: 'Error' },
    })
    expect(wrapper.classes()).toContain('bg-error/20')
    expect(wrapper.classes()).toContain('text-error')
  })

  it('renders warning variant', () => {
    const wrapper = mount(AppBadge, {
      props: { variant: 'warning' },
      slots: { default: 'Warn' },
    })
    expect(wrapper.classes()).toContain('bg-warning/20')
    expect(wrapper.classes()).toContain('text-warning')
  })

  it('renders info variant', () => {
    const wrapper = mount(AppBadge, {
      props: { variant: 'info' },
      slots: { default: 'Info' },
    })
    expect(wrapper.classes()).toContain('bg-info/20')
    expect(wrapper.classes()).toContain('text-info')
  })

  it('applies aria-label when provided', () => {
    const wrapper = mount(AppBadge, {
      props: { variant: 'success', label: 'Status: connected' },
      slots: { default: 'Connected' },
    })
    expect(wrapper.attributes('aria-label')).toBe('Status: connected')
  })

  it('renders slot content', () => {
    const wrapper = mount(AppBadge, {
      props: { variant: 'info' },
      slots: { default: 'Badge Text' },
    })
    expect(wrapper.text()).toBe('Badge Text')
  })
})
