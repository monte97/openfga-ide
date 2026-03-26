<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const borderColors = {
  success: 'border-success',
  error: 'border-error',
  warning: 'border-warning',
  info: 'border-info',
}

const textColors = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
}
</script>

<template>
  <div
    class="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    aria-live="polite"
    aria-label="Notifications"
  >
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'flex items-start gap-3 px-4 py-3 rounded-md shadow-lg',
          'bg-surface-elevated border-l-4 min-w-64 max-w-sm',
          borderColors[toast.type],
        ]"
        role="alert"
      >
        <p :class="['text-sm flex-1 text-text-primary']">
          <span :class="['font-medium mr-1', textColors[toast.type]]">
            {{ toast.type.charAt(0).toUpperCase() + toast.type.slice(1) }}:
          </span>
          {{ toast.message }}
        </p>
        <button
          class="text-text-secondary hover:text-text-primary flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-info rounded"
          :aria-label="`Dismiss ${toast.type} notification`"
          @click="dismiss(toast.id)"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
