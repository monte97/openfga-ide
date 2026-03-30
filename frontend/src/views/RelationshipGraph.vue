<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { Settings } from 'lucide-vue-next'
import { useConnectionStore } from '@/stores/connection'
import { useRelationshipGraphStore } from '@/stores/relationshipGraph'
import RelationshipGraphCanvas from '@/components/graph/RelationshipGraphCanvas.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const connectionStore = useConnectionStore()
const graphStore = useRelationshipGraphStore()

onMounted(() => {
  if (connectionStore.storeId) {
    graphStore.loadGraph(connectionStore.storeId)
  }
})

watch(
  () => connectionStore.storeId,
  (newStoreId) => {
    if (newStoreId) {
      graphStore.loadGraph(newStoreId)
    } else {
      graphStore.resetFilters()
    }
  },
)
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <!-- No store selected -->
    <EmptyState
      v-if="!connectionStore.storeId"
      :icon="Settings"
      title="No store selected"
      message="Select or create a store to get started"
      action-label="Go to Store Admin"
      action-to="/store-admin"
    />

    <!-- Store selected: canvas handles loading/empty/data states -->
    <template v-else>
      <h1 class="text-xl font-semibold text-text-emphasis mb-4">Relationship Graph</h1>
      <div class="flex-1 min-h-0">
        <RelationshipGraphCanvas />
      </div>
    </template>
  </div>
</template>
