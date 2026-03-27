<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import AppBadge from '@/components/common/AppBadge.vue'
import type { ModelNodeData } from '@/composables/useModelGraph'

const props = defineProps<{
  node: ModelNodeData | null
}>()

const emit = defineEmits<{ close: [] }>()

const isOpen = ref(false)
const panelRef = ref<HTMLElement | null>(null)

watch(
  () => props.node,
  async (val) => {
    if (val) {
      await nextTick()
      isOpen.value = true
    } else {
      isOpen.value = false
    }
  },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.node) emit('close')
}

function onClickOutside(e: MouseEvent) {
  if (!props.node || !panelRef.value) return
  if (!panelRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('mousedown', onClickOutside)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <aside
    v-show="props.node"
    ref="panelRef"
    aria-label="Type details"
    role="complementary"
    :class="[
      'inspector-panel absolute top-0 right-0 h-full w-80 bg-surface-card border-l border-surface-border z-10 overflow-y-auto',
      { 'is-open': isOpen },
    ]"
  >
    <template v-if="props.node">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-surface-border">
        <div class="flex items-center gap-2">
          <span
            class="inline-block w-3 h-3 rounded-full flex-shrink-0"
            :style="{ backgroundColor: props.node.color }"
          />
          <span class="font-mono font-semibold text-text-emphasis">{{ props.node.typeName }}</span>
        </div>
        <button
          class="text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-info rounded"
          aria-label="Close panel"
          @click="emit('close')"
        >
          <X class="size-4" />
        </button>
      </div>

      <!-- Relations -->
      <div class="p-4 border-b border-surface-border">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          Relations
        </h3>
        <div v-if="props.node.relations.length === 0" class="text-xs text-text-secondary">
          No relations defined
        </div>
        <div v-else class="flex flex-wrap gap-1">
          <AppBadge v-for="rel in props.node.relations" :key="rel" variant="info">
            {{ rel }}
          </AppBadge>
        </div>
      </div>

      <!-- Directly assignable user types -->
      <div class="p-4 border-b border-surface-border">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          Directly assigned user types
        </h3>
        <div v-if="props.node.directlyAssignableTypes.length === 0" class="text-xs text-text-secondary">
          None
        </div>
        <div v-else class="flex flex-wrap gap-1">
          <AppBadge
            v-for="(t, i) in props.node.directlyAssignableTypes"
            :key="i"
            variant="info"
          >
            {{ t.type }}{{ t.relation ? `#${t.relation}` : '' }}
          </AppBadge>
        </div>
      </div>

      <!-- Referenced by -->
      <div class="p-4">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          Used in relations of other types
        </h3>
        <div v-if="props.node.referencedByTypes.length === 0" class="text-xs text-text-secondary">
          Not referenced by other types
        </div>
        <div v-else class="space-y-1">
          <div
            v-for="(ref, i) in props.node.referencedByTypes"
            :key="i"
            class="text-xs font-mono text-text-secondary"
          >
            <span class="text-text-primary">{{ ref.type }}</span>
            <span class="text-text-secondary">#{{ ref.relation }}</span>
          </div>
        </div>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.inspector-panel {
  transform: translateX(100%);
  transition: transform 0.2s ease;
}

.inspector-panel.is-open {
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .inspector-panel {
    transition: none;
  }
}
</style>
