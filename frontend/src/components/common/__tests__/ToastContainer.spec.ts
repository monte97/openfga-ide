import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ToastContainer from '../ToastContainer.vue'
import { useToast } from '@/composables/useToast'

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // clear all toasts before each test
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  afterEach(() => {
    vi.useRealTimers()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  it('shows a toast when show() is called', async () => {
    const { show } = useToast()
    const wrapper = mount(ToastContainer)
    show({ type: 'success', message: 'Test message' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Test message')
  })

  it('success toast auto-dismisses after 5s', async () => {
    const { show } = useToast()
    const wrapper = mount(ToastContainer)
    show({ type: 'success', message: 'Auto dismiss' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Auto dismiss')
    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Auto dismiss')
  })

  it('error toast auto-dismisses after 8s', async () => {
    const { show } = useToast()
    const wrapper = mount(ToastContainer)
    show({ type: 'error', message: 'Persistent error' })
    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(7999)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Persistent error')
    vi.advanceTimersByTime(1)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Persistent error')
  })

  it('clicking the dismiss button removes the toast', async () => {
    const { show } = useToast()
    const wrapper = mount(ToastContainer)
    show({ type: 'info', message: 'Dismiss me' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Dismiss me')
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Dismiss me')
  })

  it('has aria-live="polite" for non-error notifications', () => {
    const wrapper = mount(ToastContainer)
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true)
  })

  it('has aria-live="assertive" for error notifications', () => {
    const wrapper = mount(ToastContainer)
    expect(wrapper.find('[aria-live="assertive"]').exists()).toBe(true)
  })
})
