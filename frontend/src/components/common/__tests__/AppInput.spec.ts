import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppInput from '../AppInput.vue'

describe('AppInput', () => {
  it('renders with initial modelValue', () => {
    const wrapper = mount(AppInput, { props: { modelValue: 'hello', id: 'test' } })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('hello')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(AppInput, { props: { modelValue: '', id: 'test' } })
    await wrapper.find('input').setValue('typed')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['typed'])
  })

  it('applies font-mono class when monospace prop is true', () => {
    const wrapper = mount(AppInput, { props: { monospace: true, modelValue: '', id: 'test' } })
    expect(wrapper.find('input').classes()).toContain('font-mono')
  })

  it('does not apply font-mono class when monospace is false', () => {
    const wrapper = mount(AppInput, { props: { monospace: false, modelValue: '', id: 'test' } })
    expect(wrapper.find('input').classes()).not.toContain('font-mono')
  })

  it('renders error message when error prop is provided', () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: '', error: 'This field is required', id: 'test' },
    })
    expect(wrapper.text()).toContain('This field is required')
  })

  it('sets aria-describedby when error is provided', () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: '', error: 'Required', id: 'myinput' },
    })
    expect(wrapper.find('input').attributes('aria-describedby')).toBe('myinput-error')
  })

  it('applies border-error class when error is provided', () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: '', error: 'Error', id: 'test' },
    })
    expect(wrapper.find('input').classes()).toContain('border-error')
  })

  it('does not render error message when error is empty', () => {
    const wrapper = mount(AppInput, { props: { modelValue: '', id: 'test' } })
    expect(wrapper.find('span').exists()).toBe(false)
  })
})
