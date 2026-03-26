<script setup lang="ts">
import { FileCode2, Settings } from 'lucide-vue-next'
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
    :icon="FileCode2"
    title="Model Viewer"
    message="No authorization model loaded"
    action-label="Go to Import/Export"
    action-to="/import-export"
  />
</template>
