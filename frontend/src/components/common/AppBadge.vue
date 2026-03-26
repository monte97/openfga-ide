<script setup lang="ts">
const props = defineProps<{
  variant: 'success' | 'error' | 'warning' | 'info'
  label?: string
}>()

const variantClasses = {
  success: 'bg-success/20 text-success',
  error: 'bg-error/20 text-error',
  warning: 'bg-warning/20 text-warning',
  info: 'bg-info/20 text-info',
}
</script>

<template>
  <span
    :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variantClasses[props.variant]]"
    :aria-label="props.label"
  >
    <slot />
  </span>
</template>
