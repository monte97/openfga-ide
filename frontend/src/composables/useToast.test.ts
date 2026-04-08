import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('show() adds a toast and returns an id', () => {
    const { show, toasts } = useToast()
    const id = show({ type: 'success', message: 'Done' })
    expect(typeof id).toBe('string')
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('Done')
  })

  it('dismiss() removes the toast by id', () => {
    const { show, dismiss, toasts } = useToast()
    const id = show({ type: 'success', message: 'Hello' })
    dismiss(id)
    expect(toasts).toHaveLength(0)
  })

  it('non-error toasts auto-dismiss after 5 seconds', () => {
    const { show, toasts } = useToast()
    show({ type: 'success', message: 'Auto' })
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(5000)
    expect(toasts).toHaveLength(0)
  })

  it('error toasts auto-dismiss after 8 seconds', () => {
    const { show, toasts } = useToast()
    show({ type: 'error', message: 'Oops' })
    vi.advanceTimersByTime(7999)
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts).toHaveLength(0)
  })

  describe('error toast cap (AC5)', () => {
    it('caps at 3 error toasts — 4th replaces the oldest', () => {
      const { show, toasts } = useToast()
      const id1 = show({ type: 'error', message: 'Error 1' })
      show({ type: 'error', message: 'Error 2' })
      show({ type: 'error', message: 'Error 3' })
      show({ type: 'error', message: 'Error 4' })

      const errorToasts = toasts.filter((t) => t.type === 'error')
      expect(errorToasts).toHaveLength(3)
      // Oldest (id1) must be gone
      expect(toasts.find((t) => t.id === id1)).toBeUndefined()
      // Newest must be present
      expect(toasts.some((t) => t.message === 'Error 4')).toBe(true)
    })

    it('does NOT cap non-error toasts', () => {
      const { show, toasts } = useToast()
      show({ type: 'success', message: 'S1' })
      show({ type: 'success', message: 'S2' })
      show({ type: 'success', message: 'S3' })
      show({ type: 'success', message: 'S4' })

      expect(toasts.filter((t) => t.type === 'success')).toHaveLength(4)
    })

    it('cap is error-only — non-error toasts survive when errors are capped', () => {
      const { show, toasts } = useToast()
      const successId = show({ type: 'success', message: 'Keep me' })
      show({ type: 'error', message: 'E1' })
      show({ type: 'error', message: 'E2' })
      show({ type: 'error', message: 'E3' })
      show({ type: 'error', message: 'E4' }) // triggers cap, removes E1

      const errorToasts = toasts.filter((t) => t.type === 'error')
      expect(errorToasts).toHaveLength(3)
      // Success toast unaffected
      expect(toasts.find((t) => t.id === successId)).toBeDefined()
    })
  })
})
