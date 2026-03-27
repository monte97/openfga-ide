<script setup lang="ts">
import { ref, watch } from 'vue'
import { FileCode2, Copy } from 'lucide-vue-next'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { highlightDsl } from '@/composables/useShiki'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ dsl: string | null }>()

const toast = useToast()
const highlightedHtml = ref<string>('')
const highlighting = ref(false)

watch(
  () => props.dsl,
  async (newDsl) => {
    if (!newDsl) {
      highlightedHtml.value = ''
      return
    }
    highlighting.value = true
    try {
      highlightedHtml.value = await highlightDsl(newDsl)
    } finally {
      highlighting.value = false
    }
  },
  { immediate: true },
)

async function copyDsl() {
  if (!props.dsl) return
  try {
    await navigator.clipboard.writeText(props.dsl)
    toast.show({ type: 'success', message: 'DSL copied to clipboard' })
  } catch {
    toast.show({ type: 'error', message: 'Failed to copy to clipboard' })
  }
}
</script>

<template>
  <EmptyState
    v-if="!props.dsl"
    :icon="FileCode2"
    message="No authorization model loaded"
    action-label="Go to Import/Export"
    action-to="/import-export"
  />
  <div v-else class="relative">
    <div class="absolute top-2 right-2 z-10">
      <AppButton variant="secondary" @click="copyDsl">
        <Copy class="size-4" aria-hidden="true" />
        Copy
      </AppButton>
    </div>
    <div v-if="highlightedHtml" class="overflow-auto rounded-lg bg-surface-elevated p-4 font-mono text-sm" v-html="highlightedHtml" />
    <pre v-else class="overflow-auto rounded-lg bg-surface-elevated p-4 font-mono text-sm text-text-primary whitespace-pre-wrap">{{ props.dsl }}</pre>
  </div>
</template>
