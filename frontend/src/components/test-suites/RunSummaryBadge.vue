<script setup lang="ts">
import { computed } from 'vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import type { Run } from '@/stores/runs'

const props = defineProps<{ run: Run | null }>()

const TERMINAL = ['completed', 'failed'] as const

const variant = computed((): 'gray' | 'amber' | 'green' | 'red' => {
  if (!props.run) return 'gray'
  if (!TERMINAL.includes(props.run.status as typeof TERMINAL[number])) return 'amber'
  if (props.run.status === 'completed') return 'green'
  return 'red'
})

const label = computed((): string => {
  if (!props.run) return 'Never run'
  if (!TERMINAL.includes(props.run.status as typeof TERMINAL[number])) return 'Running…'
  const s = props.run.summary
  if (!s) return 'Failed'
  return `${s.passed}/${s.total} passed`
})

const ariaLabel = computed((): string => {
  if (!props.run) return 'Never run'
  if (!TERMINAL.includes(props.run.status as typeof TERMINAL[number])) return 'Run in progress'
  const s = props.run.summary
  if (!s) return 'Run failed'
  return `${s.passed} of ${s.total} tests passed`
})

const variantClasses: Record<string, string> = {
  gray: 'bg-surface-elevated text-text-secondary',
  amber: 'bg-warning/20 text-warning',
  green: 'bg-success/20 text-success',
  red: 'bg-error/20 text-error',
}
</script>

<template>
  <span
    :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium', variantClasses[variant]]"
    :aria-label="ariaLabel"
    role="status"
    data-testid="run-summary-badge"
  >
    <LoadingSpinner v-if="variant === 'amber'" size="sm" />
    {{ label }}
  </span>
</template>
