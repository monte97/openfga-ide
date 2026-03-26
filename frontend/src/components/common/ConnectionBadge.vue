<script setup lang="ts">
const props = defineProps<{
  status: 'connected' | 'error' | 'disconnected'
}>()

const statusConfig = {
  connected: { dotClass: 'bg-success', label: 'Connected', variant: 'success' as const },
  error: { dotClass: 'bg-error', label: 'Connection Error', variant: 'error' as const },
  disconnected: { dotClass: 'bg-text-secondary', label: 'Not Connected', variant: 'info' as const },
}

const config = statusConfig[props.status]
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-sm">
    <span :class="['size-2 rounded-full', config.dotClass]" aria-hidden="true" />
    <span :class="props.status === 'connected' ? 'text-success' : props.status === 'error' ? 'text-error' : 'text-text-secondary'">
      {{ config.label }}
    </span>
  </span>
</template>
