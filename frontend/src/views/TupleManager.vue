<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Database, Settings, Plus } from 'lucide-vue-next'
import { useConnectionStore } from '@/stores/connection'
import { useTupleStore } from '@/stores/tuples'
import { useModelStore } from '@/stores/model'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AppButton from '@/components/common/AppButton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import TupleFilterBar from '@/components/tuples/TupleFilterBar.vue'
import TupleTable from '@/components/tuples/TupleTable.vue'
import AddTupleForm from '@/components/tuples/AddTupleForm.vue'

const connectionStore = useConnectionStore()
const tupleStore = useTupleStore()
const modelStore = useModelStore()

const showAddForm = ref(false)
const showDeleteDialog = ref(false)
const tupleTableRef = ref<InstanceType<typeof TupleTable> | null>(null)

const hasActiveFilters = computed(() =>
  !!(tupleStore.filterType || tupleStore.filterRelation || tupleStore.filterUser),
)

const selectedCount = computed(() => {
  return tupleTableRef.value?.getSelectedTuples()?.length ?? 0
})

onMounted(() => {
  if (connectionStore.storeId) {
    tupleStore.fetchTuples(connectionStore.storeId)
    modelStore.fetchModel(connectionStore.storeId)
  }
})

watch(
  () => connectionStore.storeId,
  (newId) => {
    if (newId) {
      tupleStore.resetTuples()
      tupleStore.fetchTuples(newId)
      modelStore.fetchModel(newId)
    } else {
      tupleStore.resetTuples()
    }
  },
)

function onTupleAdded() {
  showAddForm.value = false
}

async function onConfirmBatchDelete() {
  showDeleteDialog.value = false
  const selected = tupleTableRef.value?.getSelectedTuples() ?? []
  if (selected.length === 0) return
  await tupleStore.deleteTuplesBatch(connectionStore.storeId, selected)
  tupleTableRef.value?.clearSelection()
}
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
  <div v-else>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-semibold text-text-emphasis">Tuple Manager</h1>
      <div class="flex gap-2">
        <AppButton
          v-if="selectedCount > 0"
          variant="danger"
          @click="showDeleteDialog = true"
        >
          Delete Selected ({{ selectedCount }})
        </AppButton>
        <AppButton @click="showAddForm = !showAddForm">
          <Plus class="size-4" aria-hidden="true" />
          Add Tuple
        </AppButton>
      </div>
    </div>

    <AddTupleForm v-if="showAddForm" @added="onTupleAdded" />

    <LoadingSpinner
      v-if="tupleStore.loading && tupleStore.tuples.length === 0"
      :full-view="true"
    />
    <EmptyState
      v-else-if="tupleStore.tuples.length === 0 && !hasActiveFilters"
      :icon="Database"
      title="No tuples in this store"
      message="Add tuples to get started"
      action-label="Go to Import/Export"
      action-to="/import-export"
    />
    <template v-else>
      <TupleFilterBar />
      <TupleTable ref="tupleTableRef" />
    </template>

    <ConfirmDialog
      :open="showDeleteDialog"
      title="Delete Tuples"
      :message="`Delete ${selectedCount} selected tuples?`"
      confirm-label="Delete"
      variant="danger"
      @confirm="onConfirmBatchDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>
