<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import type { Run } from '@/stores/runs'

const props = defineProps<{
  run: Run | null
  totalTestCases: number
}>()

type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed'

const PHASES = [
  { key: 'provisioning', label: 'Provisioning' },
  { key: 'fixtures', label: 'Loading fixtures' },
  { key: 'checks', label: 'Running checks' },
  { key: 'cleanup', label: 'Cleanup' },
] as const

const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null

function stopTicker() {
  if (ticker !== null) {
    clearInterval(ticker)
    ticker = null
  }
}

onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 100)
})

onUnmounted(stopTicker)

// Stop ticker when run reaches terminal state — no need to keep ticking after completion.
watch(
  () => props.run?.status,
  (status) => {
    if (status === 'completed' || status === 'failed') {
      stopTicker()
    }
  },
)

const phaseStatuses = computed((): [PhaseStatus, PhaseStatus, PhaseStatus, PhaseStatus] => {
  const run = props.run
  if (!run || run.status === 'pending') return ['pending', 'pending', 'pending', 'pending']
  if (run.status === 'provisioning') return ['running', 'pending', 'pending', 'pending']
  if (run.status === 'running') return ['completed', 'completed', 'running', 'pending']
  if (run.status === 'completed') return ['completed', 'completed', 'completed', 'completed']
  // failed — infer where failure occurred from presence of results
  if (run.results.length > 0) return ['completed', 'completed', 'failed', 'pending']
  return ['failed', 'pending', 'pending', 'pending']
})

const elapsedDisplay = computed((): string => {
  const run = props.run
  if (!run?.startedAt) return '0s'
  const start = Date.parse(run.startedAt)
  const end = run.completedAt ? Date.parse(run.completedAt) : now.value
  const ms = end - start
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
})

const progressCounter = computed((): string =>
  `${props.run?.results.length ?? 0}/${props.totalTestCases}`
)

function phaseAriaLabel(idx: number, phaseLabel: string): string {
  const status = phaseStatuses.value[idx]
  const checks = PHASES[idx].key === 'checks' ? `, ${progressCounter.value}` : ''
  const elapsed = status === 'running' ? `, ${elapsedDisplay.value}` : ''
  return `${phaseLabel}: ${status}${checks}${elapsed}`
}
</script>

<template>
  <ul class="px-4 py-3 space-y-2" role="list" aria-label="Execution phases">
    <li
      v-for="(phase, idx) in PHASES"
      :key="phase.key"
      class="flex items-center gap-3"
      :aria-label="phaseAriaLabel(idx, phase.label)"
    >
      <!-- Status icon -->
      <span class="w-5 h-5 flex items-center justify-center shrink-0 text-sm">
        <template v-if="phaseStatuses[idx] === 'pending'">
          <span class="text-text-secondary/50" aria-hidden="true">–</span>
        </template>
        <template v-else-if="phaseStatuses[idx] === 'running'">
          <LoadingSpinner size="sm" />
        </template>
        <template v-else-if="phaseStatuses[idx] === 'completed'">
          <span class="text-success font-bold" aria-hidden="true">✓</span>
        </template>
        <template v-else-if="phaseStatuses[idx] === 'failed'">
          <span class="text-error font-bold" aria-hidden="true">✗</span>
        </template>
      </span>

      <!-- Label -->
      <span
        :class="[
          'text-sm',
          phaseStatuses[idx] === 'pending' ? 'text-text-secondary/50' : '',
          phaseStatuses[idx] === 'running' ? 'text-text-primary font-medium' : '',
          phaseStatuses[idx] === 'completed' ? 'text-text-secondary' : '',
          phaseStatuses[idx] === 'failed' ? 'text-error' : '',
        ]"
      >{{ phase.label }}</span>

      <!-- Progress counter for running checks phase -->
      <span
        v-if="phase.key === 'checks' && phaseStatuses[idx] !== 'pending'"
        class="text-xs text-text-secondary ml-auto"
        data-testid="progress-counter"
      >{{ progressCounter }}</span>

      <!-- Elapsed time for the active phase -->
      <span
        v-else-if="phaseStatuses[idx] === 'running'"
        class="text-xs text-text-secondary ml-auto"
        data-testid="elapsed-timer"
      >{{ elapsedDisplay }}</span>
    </li>
  </ul>
</template>
