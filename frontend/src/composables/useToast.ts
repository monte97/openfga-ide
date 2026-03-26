import { reactive } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  timeoutId?: ReturnType<typeof setTimeout>
}

const toasts = reactive<Toast[]>([])

export function useToast() {
  function show({ type, message }: { type: Toast['type']; message: string }): string {
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
