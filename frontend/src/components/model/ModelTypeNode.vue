<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { ModelNodeData } from '@/composables/useModelGraph'

const props = defineProps<{
  data: ModelNodeData
}>()

const MAX_VISIBLE_RELATIONS = 3
</script>

<template>
  <div
    tabindex="0"
    :aria-label="`Type: ${props.data.typeName}`"
    class="rounded-md overflow-hidden border border-surface-border focus:ring-2 focus:ring-info outline-none cursor-default w-40"
  >
    <!-- Colored header band -->
    <div
      class="px-3 py-1.5 text-sm font-semibold font-mono text-white truncate"
      :style="{ backgroundColor: props.data.color }"
    >
      {{ props.data.typeName }}
    </div>
    <!-- Relations list -->
    <div class="bg-surface-card px-3 py-1.5">
      <div
        v-for="rel in props.data.relations.slice(0, MAX_VISIBLE_RELATIONS)"
        :key="rel"
        class="text-xs font-mono text-text-secondary truncate"
      >
        {{ rel }}
      </div>
      <div
        v-if="props.data.relations.length > MAX_VISIBLE_RELATIONS"
        class="text-xs font-mono text-text-secondary"
      >
        +{{ props.data.relations.length - MAX_VISIBLE_RELATIONS }} more
      </div>
    </div>
    <!-- Vue Flow handles -->
    <Handle :position="Position.Left" type="target" />
    <Handle :position="Position.Right" type="source" />
  </div>
</template>
