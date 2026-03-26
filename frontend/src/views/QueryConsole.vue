<script setup lang="ts">
import { Search, Settings } from 'lucide-vue-next'
import { useConnectionStore } from '@/stores/connection'
import EmptyState from '@/components/common/EmptyState.vue'

const connectionStore = useConnectionStore()
</script>

<template>
  <EmptyState
    v-if="!connectionStore.storeId"
    :icon="Settings"
    title="No store selected"
    message="Select or create a store to get started."
    action-label="Go to Store Admin"
    action-to="/store-admin"
  />
  <EmptyState
    v-else
    :icon="Search"
    title="Query Console"
    message="No model loaded"
    action-label="Go to Model Viewer"
    action-to="/model-viewer"
  />
</template>
