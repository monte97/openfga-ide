<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'primary',
  loading: false,
  disabled: false,
  type: 'button',
})

const variantClasses = {
  primary: 'bg-info hover:bg-info/80 text-white',
  secondary: 'bg-surface-elevated hover:bg-surface-border text-text-primary',
  danger: 'bg-error hover:bg-error/80 text-white',
}
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :class="[
      'inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-info',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variantClasses[props.variant],
    ]"
  >
    <LoadingSpinner v-if="props.loading" size="sm" />
    <slot />
  </button>
</template>
