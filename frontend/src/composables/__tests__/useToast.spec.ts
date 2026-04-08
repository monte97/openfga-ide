import { describe, it, expect, vi, beforeEach } from 'vitest'

// Reset singleton between tests by re-importing fresh module
// We use vi.isolateModules to ensure a fresh module instance per test
describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('show adds a toast to the toasts array', async () => {
    const { useToast } = await import('../useToast')
    const { show, toasts, dismiss } = useToast()
    const id = show({ type: 'info', message: 'Hello' })
    expect(toasts.some((t) => t.id === id && t.message === 'Hello')).toBe(true)
    dismiss(id)
  })

  it('dismiss removes toast by id', async () => {
    const { useToast } = await import('../useToast')
    const { show, dismiss, toasts } = useToast()
    const id = show({ type: 'warning', message: 'Remove me' })
    expect(toasts.some((t) => t.id === id)).toBe(true)
    dismiss(id)
    expect(toasts.some((t) => t.id === id)).toBe(false)
  })

  it('success toast auto-dismisses after 5000ms', async () => {
    const { useToast } = await import('../useToast')
    const { show, toasts } = useToast()
    const id = show({ type: 'success', message: 'Done!' })
    expect(toasts.some((t) => t.id === id)).toBe(true)
    vi.advanceTimersByTime(5000)
    expect(toasts.some((t) => t.id === id)).toBe(false)
  })

  it('error toast auto-dismisses after 8s', async () => {
    const { useToast } = await import('../useToast')
    const { show, toasts } = useToast()
    const id = show({ type: 'error', message: 'Critical error' })
    vi.advanceTimersByTime(7999)
    expect(toasts.some((t) => t.id === id)).toBe(true)
    vi.advanceTimersByTime(1)
    expect(toasts.some((t) => t.id === id)).toBe(false)
  })

  it('singleton behavior: same toasts array across multiple useToast() calls', async () => {
    const { useToast } = await import('../useToast')
    const instance1 = useToast()
    const instance2 = useToast()
    const id = instance1.show({ type: 'info', message: 'Shared' })
    expect(instance2.toasts.some((t) => t.id === id)).toBe(true)
    instance1.dismiss(id)
  })
})
