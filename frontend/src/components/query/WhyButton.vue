<script setup lang="ts">
import { useQueryStore } from '@/stores/queries'
import { useConnectionStore } from '@/stores/connection'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ResolutionPath from './ResolutionPath.vue'

const queryStore = useQueryStore()
const connectionStore = useConnectionStore()

async function handleClick() {
  if (queryStore.expandLoading) return
  if (!queryStore.checkWhyExpanded && !queryStore.expandResult) {
    await queryStore.runExpand(connectionStore.storeId)
  }
  if (queryStore.expandResult) {
    queryStore.checkWhyExpanded = !queryStore.checkWhyExpanded
  }
}
</script>

<template>
  <div>
    <button
      class="text-sm text-info hover:text-info/80 transition-colors"
      @click="handleClick"
    >
      <LoadingSpinner v-if="queryStore.expandLoading" size="sm" />
      <span v-else>Why?</span>
    </button>
    <ResolutionPath
      v-if="queryStore.checkWhyExpanded && queryStore.expandResult && queryStore.checkResult"
      :expand-tree="queryStore.expandResult"
      :allowed="queryStore.checkResult.allowed"
    />
  </div>
</template>
