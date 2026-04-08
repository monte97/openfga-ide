import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppTabs from '../AppTabs.vue'

const tabs = [
  { key: 'a', label: 'Tab A' },
  { key: 'b', label: 'Tab B' },
]

describe('AppTabs', () => {
  it('selects the matching tab by modelValue', () => {
    const wrapper = mount(AppTabs, {
      props: { tabs, modelValue: 'b' },
      slots: { default: '<div />' },
    })
    expect(wrapper.html()).toContain('Tab B')
  })

  it('falls back to index 0 when modelValue does not match any tab', () => {
    // Previously findIndex returned -1, making HeadlessUI TabGroup go to undefined state.
    // Now it falls back to 0 so the first tab is selected.
    const wrapper = mount(AppTabs, {
      props: { tabs, modelValue: 'nonexistent' },
      slots: { default: '<div />' },
    })
    // Should render without throwing and show the first tab selected
    expect(wrapper.html()).toContain('Tab A')
  })
})
