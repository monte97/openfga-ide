<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '@/stores/connection'
import ConnectionPopover from './ConnectionPopover.vue'
import StoreSelector from './StoreSelector.vue'

const connectionStore = useConnectionStore()
const { status, storeId } = storeToRefs(connectionStore)

onMounted(async () => {
  await connectionStore.fetchConnection()
  await connectionStore.fetchStores()
})
</script>

<template>
  <header
    role="banner"
    class="fixed top-0 left-0 right-0 h-14 bg-surface-card border-b border-surface-border z-30 flex items-center justify-between px-4"
  >
    <span class="text-lg font-semibold text-text-emphasis">OpenFGA Viewer</span>

    <div class="flex items-center gap-3">
      <slot name="connection">
        <!-- Connected + store selected: show store selector -->
        <template v-if="status === 'connected' && storeId">
          <ConnectionPopover />
          <StoreSelector />
        </template>

        <!-- Connected + no store: show pulsing prompt -->
        <template v-else-if="status === 'connected'">
          <ConnectionPopover />
          <span class="text-sm text-text-secondary animate-pulse">Select a store...</span>
          <StoreSelector />
        </template>

        <!-- Error or loading -->
        <template v-else>
          <ConnectionPopover />
        </template>
      </slot>
    </div>
  </header>
</template>
