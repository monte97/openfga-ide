<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import type { SuiteListItem } from '@/stores/suites'

const props = defineProps<{
  open: boolean
  suite: SuiteListItem | null
}>()

const emit = defineEmits<{
  close: []
}>()

const snippet = computed(() => {
  if (!props.suite) return ''
  const origin = window.location.origin
  const id = props.suite.id
  return `# Trigger suite run:\ncurl -X POST ${origin}/api/suites/${id}/run \\\n  -H "Content-Type: application/json" \\\n  -d '{}'\n\n# Poll for result (replace RUN_ID with the runId from the response):\ncurl ${origin}/api/runs/RUN_ID`
})

function onCopy() {
  void navigator.clipboard.writeText(snippet.value)
}
</script>

<template>
  <Dialog :open="props.open" aria-modal="true" @close="emit('close')">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/60" aria-hidden="true" @click="emit('close')" />
      <DialogPanel class="relative bg-surface-card border border-surface-border rounded-lg p-6 w-full max-w-lg shadow-xl">
        <DialogTitle class="text-text-emphasis font-semibold text-base mb-4">
          CI Integration — {{ props.suite?.name }}
        </DialogTitle>
        <pre
          data-testid="ci-dialog-snippet"
          class="bg-surface-elevated border border-surface-border rounded-md p-3 text-xs font-mono text-text-primary overflow-x-auto whitespace-pre-wrap mb-2"
        >{{ snippet }}</pre>
        <p class="text-text-secondary text-xs mb-6">
          Run multiple suites sequentially with separate curl calls.
        </p>
        <div class="flex justify-end gap-3">
          <button
            data-testid="ci-dialog-copy-btn"
            class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-info/10 text-info hover:bg-info/20 transition-colors focus:outline-none focus:ring-2 focus:ring-info"
            @click="onCopy"
          >
            Copy
          </button>
          <button
            class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-surface-elevated text-text-primary hover:bg-surface-border transition-colors focus:outline-none focus:ring-2 focus:ring-info"
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>
