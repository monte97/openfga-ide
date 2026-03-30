<script setup lang="ts">
import { useRelationshipGraphStore } from '@/stores/relationshipGraph'
import TypeBadge from '@/components/common/TypeBadge.vue'

const store = useRelationshipGraphStore()
</script>

<template>
  <div
    v-if="store.allTypes.length > 0"
    class="flex flex-wrap items-center gap-3 p-3 bg-surface-card border-b border-surface-border"
    role="group"
    aria-label="Filter graph by entity type"
  >
    <span class="text-xs text-text-secondary font-medium shrink-0">Show:</span>
    <label
      v-for="type in store.allTypes"
      :key="type"
      :for="`filter-type-${type}`"
      class="flex items-center gap-1.5 cursor-pointer"
    >
      <input
        :id="`filter-type-${type}`"
        type="checkbox"
        :checked="!store.hiddenTypes.has(type)"
        :aria-label="`Show/hide ${type} nodes`"
        class="accent-info cursor-pointer"
        @change="store.toggleTypeVisibility(type)"
      />
      <TypeBadge :type-name="type" />
    </label>
  </div>
</template>
