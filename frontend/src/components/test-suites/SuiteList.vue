<script setup lang="ts">
import SuiteCard from './SuiteCard.vue'
import type { SuiteListItem } from '@/stores/suites'

defineProps<{
  suites: SuiteListItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  delete: [suite: SuiteListItem]
  open: [suite: SuiteListItem]
  create: []
  export: [suite: SuiteListItem]
  'ci-integration': [suite: SuiteListItem]
}>()
</script>

<template>
  <!-- Skeleton loading: 3 pulse rectangles -->
  <div v-if="loading" class="max-w-3xl space-y-3" aria-label="Loading suites" aria-busy="true">
    <div
      v-for="i in 3"
      :key="i"
      class="w-full h-24 bg-surface-elevated rounded-lg animate-pulse"
    />
  </div>

  <!-- Empty state: 3-step guided quick start -->
  <div v-else-if="suites.length === 0" class="max-w-3xl">
    <div class="flex flex-col items-center py-12 text-center gap-6">
      <div class="text-lg font-semibold text-text-primary">Get started with Test Suites</div>
      <ol class="flex flex-col gap-3 text-sm text-left w-full max-w-xs list-none">
        <li class="flex items-start gap-3">
          <span class="flex-shrink-0 flex items-center justify-center size-6 rounded-full bg-info/20 text-info font-semibold text-xs">1</span>
          <span class="text-text-secondary">Name your suite and add optional tags</span>
        </li>
        <li class="flex items-start gap-3">
          <span class="flex-shrink-0 flex items-center justify-center size-6 rounded-full bg-info/20 text-info font-semibold text-xs">2</span>
          <span class="text-text-secondary">Import a fixture (model + tuples)</span>
        </li>
        <li class="flex items-start gap-3">
          <span class="flex-shrink-0 flex items-center justify-center size-6 rounded-full bg-info/20 text-info font-semibold text-xs">3</span>
          <span class="text-text-secondary">Add your first test case</span>
        </li>
      </ol>
      <button
        class="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm bg-surface-elevated hover:bg-surface-border text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-info"
        @click="emit('create')"
      >
        Create your first suite
      </button>
    </div>
  </div>

  <!-- Suite list -->
  <div v-else class="max-w-3xl space-y-3">
    <SuiteCard
      v-for="suite in suites"
      :key="suite.id"
      :suite="suite"
      @delete="emit('delete', $event)"
      @open="emit('open', $event)"
      @export="emit('export', $event)"
      @ci-integration="emit('ci-integration', $event)"
    />
  </div>
</template>
