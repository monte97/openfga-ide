<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { MoreVertical } from 'lucide-vue-next'
import type { SuiteListItem } from '@/stores/suites'

const props = defineProps<{
  suite: SuiteListItem
}>()

const emit = defineEmits<{
  delete: [suite: SuiteListItem]
  open: [suite: SuiteListItem]
  export: [suite: SuiteListItem]
  'ci-integration': [suite: SuiteListItem]
}>()

const menuOpen = ref(false)

function toggleMenu(e: MouseEvent) {
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
}

function onDeleteClick(e: MouseEvent) {
  e.stopPropagation()
  menuOpen.value = false
  emit('delete', props.suite)
}

function onExportClick(e: MouseEvent) {
  e.stopPropagation()
  menuOpen.value = false
  emit('export', props.suite)
}

function onCiIntegrationClick(e: MouseEvent) {
  e.stopPropagation()
  menuOpen.value = false
  emit('ci-integration', props.suite)
}

function closeOnOutside(e: MouseEvent) {
  const el = (e.target as HTMLElement)
  if (!el.closest('[data-suite-menu]')) {
    menuOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', closeOnOutside))
onUnmounted(() => document.removeEventListener('mousedown', closeOnOutside))
</script>

<template>
  <div
    :class="[
      'group relative w-full bg-surface-card border rounded-lg p-4 hover:border-info/50 transition-colors cursor-pointer',
      suite.lastRun?.status === 'failed' ? 'border-error/40 bg-error/5' : 'border-surface-border',
    ]"
    role="article"
    :aria-label="`Suite: ${suite.name}`"
    @click="emit('open', suite)"
  >
    <!-- Three-dot menu -->
    <div
      data-suite-menu
      class="absolute top-3 right-3"
    >
      <button
        class="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-info"
        :aria-label="`Menu for suite ${suite.name}`"
        :aria-expanded="menuOpen"
        @click="toggleMenu"
      >
        <MoreVertical class="size-4" aria-hidden="true" />
      </button>
      <div
        v-show="menuOpen"
        class="absolute right-0 top-full mt-1 w-44 bg-surface-card border border-surface-border rounded-md shadow-lg z-10"
        role="menu"
      >
        <button
          class="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-info focus:ring-inset"
          role="menuitem"
          data-testid="suite-menu-export"
          @click="onExportClick"
        >
          Export
        </button>
        <button
          class="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-info focus:ring-inset"
          role="menuitem"
          data-testid="suite-menu-ci"
          @click="onCiIntegrationClick"
        >
          CI Integration
        </button>
        <hr class="border-surface-border my-1" />
        <button
          class="w-full text-left px-3 py-2 text-sm text-error hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-error focus:ring-inset"
          role="menuitem"
          @click="onDeleteClick"
        >
          Delete
        </button>
      </div>
    </div>

    <!-- Card content -->
    <div class="pr-8">
      <h3 class="text-text-emphasis font-semibold text-base leading-snug">{{ suite.name }}</h3>
      <p v-if="suite.description" class="text-text-secondary text-sm mt-1">{{ suite.description }}</p>

      <!-- Tags -->
      <div v-if="suite.tags.length > 0" class="flex flex-wrap gap-1.5 mt-2">
        <span
          v-for="tag in suite.tags"
          :key="tag"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-elevated text-text-secondary"
        >
          {{ tag }}
        </span>
      </div>

      <!-- Footer: counts + last-run badge -->
      <div class="flex items-center gap-4 mt-3 text-xs text-text-secondary">
        <span>— groups · — tests</span>

        <!-- Never run -->
        <span
          v-if="!suite.lastRun"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary"
          data-testid="suite-card-last-run-badge"
        >
          Never run
        </span>

        <!-- In-flight run -->
        <span
          v-else-if="['pending', 'provisioning', 'running'].includes(suite.lastRun.status)"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary text-xs"
          data-testid="suite-card-last-run-badge"
        >
          Running…
        </span>

        <!-- Completed/failed with summary -->
        <span
          v-else-if="suite.lastRun.summary"
          :class="[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            suite.lastRun.summary.failed > 0 || suite.lastRun.summary.errored > 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success',
          ]"
          data-testid="suite-card-last-run-badge"
        >
          {{ suite.lastRun.summary.passed }}/{{ suite.lastRun.summary.total }} passed
        </span>

        <!-- Failed with no summary (provisioning error) -->
        <span
          v-else
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/10 text-error text-xs"
          data-testid="suite-card-last-run-badge"
        >
          Failed
        </span>
      </div>
    </div>
  </div>
</template>
