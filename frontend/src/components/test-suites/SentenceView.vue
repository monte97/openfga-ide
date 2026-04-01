<script setup lang="ts">
const props = defineProps<{
  user: string
  relation: string
  object: string
  expected: boolean
  result?: { passed: boolean; actual: boolean | null; durationMs?: number | null } | null
}>()
</script>

<template>
  <div
    :class="[
      'flex flex-wrap items-center gap-1.5 text-sm text-text-secondary py-2 px-3 border rounded-md',
      result && !result.passed
        ? 'bg-error/5 border-error/30'
        : 'bg-surface-card border-surface-border',
    ]"
    aria-label="Sentence preview"
  >
    <span>Can</span>
    <code
      v-if="user"
      class="px-1.5 py-0.5 rounded bg-surface-elevated text-info text-xs font-mono"
    >{{ user }}</code>
    <span v-else class="text-text-secondary/50 italic text-xs">user</span>

    <code
      v-if="relation"
      class="px-1.5 py-0.5 rounded bg-surface-elevated text-text-primary text-xs font-mono"
    >{{ relation }}</code>
    <span v-else class="text-text-secondary/50 italic text-xs">relation</span>

    <code
      v-if="object"
      class="px-1.5 py-0.5 rounded bg-surface-elevated text-warning text-xs font-mono"
    >{{ object }}</code>
    <span v-else class="text-text-secondary/50 italic text-xs">object</span>

    <span>?</span>
    <span class="mx-1">→</span>

    <!-- Result variant -->
    <template v-if="result">
      <template v-if="result.passed">
        <span class="font-medium text-success">
          {{ expected ? 'Yes' : 'No' }} ✓
        </span>
      </template>
      <template v-else-if="result.actual !== null">
        <span class="font-medium text-error">
          Expected: {{ expected ? 'Yes' : 'No' }}, Got:
        </span>
        <span class="font-medium text-error">{{ result.actual ? 'Yes' : 'No' }}</span>
      </template>
      <template v-else>
        <!-- actual=null means the check errored (network/API failure) -->
        <span class="font-medium text-error">Error</span>
      </template>
      <span v-if="result.durationMs != null" class="text-xs text-text-secondary/60 ml-1">
        {{ result.durationMs }}ms
      </span>
    </template>

    <!-- Default variant (no result) -->
    <template v-else>
      <span
        :class="[
          'font-medium',
          expected ? 'text-success' : 'text-error',
        ]"
      >
        {{ expected ? 'Allowed' : 'Denied' }}
      </span>
    </template>
  </div>
</template>
