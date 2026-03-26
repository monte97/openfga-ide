<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Settings, Store } from 'lucide-vue-next'
import { useStoresStore } from '@/stores/stores'
import { useConnectionStore } from '@/stores/connection'
import StoreCard from '@/components/StoreCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const storesStore = useStoresStore()
const connectionStore = useConnectionStore()

const showCreateForm = ref(false)
const newStoreName = ref('')
const creating = ref(false)

const pendingDeleteId = ref<string | null>(null)
const pendingDeleteName = ref('')

const storeToDelete = computed(() =>
  storesStore.storeList.find((s) => s.id === pendingDeleteId.value) ?? null
)

onMounted(async () => {
  await storesStore.fetchStores()
})

async function submitCreate() {
  if (!newStoreName.value.trim()) return
  creating.value = true
  try {
    await storesStore.createStore(newStoreName.value.trim())
    newStoreName.value = ''
    showCreateForm.value = false
  } finally {
    creating.value = false
  }
}

function cancelCreate() {
  newStoreName.value = ''
  showCreateForm.value = false
}

function requestDelete(storeId: string, storeName: string) {
  pendingDeleteId.value = storeId
  pendingDeleteName.value = storeName
}

async function confirmDelete() {
  if (!pendingDeleteId.value) return
  await storesStore.deleteStore(pendingDeleteId.value)
  pendingDeleteId.value = null
  pendingDeleteName.value = ''
}

function cancelDelete() {
  pendingDeleteId.value = null
  pendingDeleteName.value = ''
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-text-emphasis">Store Administration</h1>
      <AppButton @click="showCreateForm = true">
        Create Store
      </AppButton>
    </div>

    <div v-if="showCreateForm" class="mb-6 p-4 rounded-lg border border-surface-border bg-surface-card">
      <h2 class="text-sm font-medium text-text-primary mb-3">New Store</h2>
      <form class="flex items-end gap-3" @submit.prevent="submitCreate">
        <AppInput
          v-model="newStoreName"
          placeholder="Store name"
          class="flex-1"
          autofocus
        />
        <AppButton type="submit" :loading="creating" :disabled="!newStoreName.trim()">
          Create
        </AppButton>
        <AppButton variant="secondary" type="button" @click="cancelCreate">
          Cancel
        </AppButton>
      </form>
    </div>

    <LoadingSpinner v-if="storesStore.loading" full-view />

    <div v-else-if="storesStore.error" class="text-error text-sm text-center py-8">
      {{ storesStore.error }}
    </div>

    <EmptyState
      v-else-if="storesStore.storeList.length === 0"
      :icon="Store"
      title="No stores on this instance"
      message="Create your first store to get started."
      action-label="Create Store"
      @action="showCreateForm = true"
    />

    <div v-else class="flex flex-col gap-3">
      <StoreCard
        v-for="store in storesStore.storeList"
        :key="store.id"
        :store="store"
        :is-active="connectionStore.storeId === store.id"
        @select="storesStore.selectStore(store.id)"
        @delete="requestDelete(store.id, store.name)"
      />
    </div>

    <ConfirmDialog
      :open="pendingDeleteId !== null"
      title="Delete Store"
      :message="`Are you sure you want to delete '${pendingDeleteName}'? This action cannot be undone.`"
      confirm-label="Delete"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
