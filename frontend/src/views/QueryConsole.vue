<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { Search, Settings } from 'lucide-vue-next'
import { useConnectionStore } from '@/stores/connection'
import { useModelStore } from '@/stores/model'
import { useQueryStore } from '@/stores/queries'
import EmptyState from '@/components/common/EmptyState.vue'
import AppTabs from '@/components/common/AppTabs.vue'
import CheckQuery from '@/components/query/CheckQuery.vue'
import ListObjectsQuery from '@/components/query/ListObjectsQuery.vue'
import ListUsersQuery from '@/components/query/ListUsersQuery.vue'
import ExpandQuery from '@/components/query/ExpandQuery.vue'

const connectionStore = useConnectionStore()
const modelStore = useModelStore()
const queryStore = useQueryStore()

const tabs = [
  { key: 'check', label: 'Check' },
  { key: 'list-objects', label: 'List Objects' },
  { key: 'list-users', label: 'List Users' },
  { key: 'expand', label: 'Expand' },
]

onMounted(() => {
  if (connectionStore.storeId) {
    modelStore.fetchModel(connectionStore.storeId)
  }
})

watch(
  () => connectionStore.storeId,
  (newStoreId) => {
    queryStore.reset()
    if (newStoreId) {
      modelStore.fetchModel(newStoreId)
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
  <template v-else-if="!modelStore.json">
    <EmptyState
      :icon="Search"
      title="No model loaded"
      message="A model is required to run queries"
      action-label="Go to Model Viewer"
      action-to="/model-viewer"
    />
  </template>
  <template v-else>
    <h1 class="text-xl font-semibold text-text-emphasis mb-4">Query Console</h1>
    <AppTabs :tabs="tabs" v-model="queryStore.activeTab">
      <template #check>
        <CheckQuery />
      </template>
      <template #list-objects>
        <ListObjectsQuery />
      </template>
      <template #list-users>
        <ListUsersQuery />
      </template>
      <template #expand>
        <ExpandQuery />
      </template>
    </AppTabs>
  </template>
</template>
