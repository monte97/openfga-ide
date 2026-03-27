<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Settings } from 'lucide-vue-next'
import { useConnectionStore } from '@/stores/connection'
import { useModelStore } from '@/stores/model'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AppTabs from '@/components/common/AppTabs.vue'
import ModelDslView from '@/components/model/ModelDslView.vue'
import ModelGraphView from '@/components/model/ModelGraphView.vue'

const connectionStore = useConnectionStore()
const modelStore = useModelStore()

const activeTab = ref<string>('dsl')

onMounted(() => {
  if (connectionStore.storeId) {
    modelStore.fetchModel(connectionStore.storeId)
  }
})

watch(
  () => connectionStore.storeId,
  (newId) => {
    if (newId) {
      modelStore.fetchModel(newId)
    } else {
      modelStore.reset()
    }
  },
)
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
  <AppTabs
    v-else
    v-model="activeTab"
    :tabs="[
      { key: 'dsl', label: 'DSL' },
      { key: 'graph', label: 'Graph' },
    ]"
  >
    <template #dsl>
      <div class="p-4">
        <LoadingSpinner v-if="modelStore.loading" :full-view="true" />
        <ModelDslView v-else :dsl="modelStore.dsl" />
      </div>
    </template>
    <template #graph>
      <div class="h-[600px]">
        <ModelGraphView />
      </div>
    </template>
  </AppTabs>
</template>
