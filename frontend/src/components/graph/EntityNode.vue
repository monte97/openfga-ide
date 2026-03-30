<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { EntityNodeData } from '@/composables/useRelationshipGraph'

const props = defineProps<NodeProps<EntityNodeData>>()

function splitEntity(entityId: string): { prefix: string; instance: string } {
  const colon = entityId.indexOf(':')
  if (colon === -1) return { prefix: entityId, instance: '' }
  return { prefix: entityId.slice(0, colon), instance: entityId.slice(colon + 1) }
}
</script>

<template>
  <div
    class="relative flex items-center bg-surface-card border border-surface-border rounded-md px-3 py-2 w-[180px] focus:outline-none focus:ring-2 focus:ring-info"
    tabindex="0"
    :aria-label="`Entity: ${props.data.entityId}`"
  >
    <!-- Colored left accent bar -->
    <div
      class="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
      :style="{ backgroundColor: props.data.color }"
    />
    <!-- Entity text: typeName dimmed + instance emphasized -->
    <span class="pl-2 font-mono text-xs truncate">
      <span class="text-text-secondary">{{ splitEntity(props.data.entityId).prefix }}:</span>
      <span class="text-text-primary">{{ splitEntity(props.data.entityId).instance }}</span>
    </span>
    <!-- Vue Flow handles -->
    <Handle type="target" :position="Position.Top" />
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>
