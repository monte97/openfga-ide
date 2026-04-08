import { reactive } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  timeoutId?: ReturnType<typeof setTimeout>
}

const toasts = reactive<Toast[]>([])

const MAX_ERROR_TOASTS = 3

export function useToast() {
  function show({ type, message }: { type: Toast['type']; message: string }): string {
    if (type === 'error') {
      const errorToasts = toasts.filter((t) => t.type === 'error')
      if (errorToasts.length >= MAX_ERROR_TOASTS) {
        dismiss(errorToasts[0].id)
      }
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const toast: Toast = { id, type, message }

    if (type !== 'error') {
      toast.timeoutId = setTimeout(() => dismiss(id), 5000)
    }

    toasts.push(toast)
    return id
  }

  function dismiss(id: string) {
    const index = toasts.findIndex((t) => t.id === id)
    if (index !== -1) {
      const toast = toasts[index]
      if (toast.timeoutId !== undefined) {
        clearTimeout(toast.timeoutId)
      }
      toasts.splice(index, 1)
    }
  }

  return { show, dismiss, toasts }
}
