<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Store } from 'lucide-vue-next'
import { useStoresStore } from '@/stores/stores'
import { useConnectionStore } from '@/stores/connection'
import { useImportExportStore } from '@/stores/importExport'
import { useImport } from '@/composables/useImport'
import StoreCard from '@/components/StoreCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FileImportDropzone from '@/components/common/FileImportDropzone.vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'

const storesStore = useStoresStore()
const connectionStore = useConnectionStore()
const importExportStore = useImportExportStore()
const { importing, importToStore } = useImport()

const showCreateForm = ref(false)
const newStoreName = ref('')
const creating = ref(false)

const pendingDeleteId = ref<string | null>(null)
const pendingDeleteName = ref('')

// Restore dialog state
const restoreDialogOpen = ref(false)
const restoreTargetId = ref<string | null>(null)
const restoreTargetName = ref('')
const restoreDropzoneRef = ref<InstanceType<typeof FileImportDropzone> | null>(null)
const restoreSelectedFile = ref<File | null>(null)
const restorePayload = ref<{ model: Record<string, unknown> | null; tuples: Array<{ user: string; relation: string; object: string }> } | null>(null)
const showRestoreConfirm = ref(false)

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
  } catch {
    // useApi already shows a toast on error; keep form open so user can retry
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
  try {
    await storesStore.deleteStore(pendingDeleteId.value)
  } finally {
    pendingDeleteId.value = null
    pendingDeleteName.value = ''
  }
}

function cancelDelete() {
  pendingDeleteId.value = null
  pendingDeleteName.value = ''
}

function handleBackup(storeId: string, storeName: string) {
  importExportStore.exportStore(storeId, storeName, 'Backup')
}

function requestRestore(storeId: string) {
  const store = storesStore.storeList.find((s) => s.id === storeId) ?? null
  restoreTargetId.value = storeId
  restoreTargetName.value = store?.name ?? storeId
  restoreSelectedFile.value = null
  restorePayload.value = null
  restoreDialogOpen.value = true
}

function onRestoreFileSelected(file: File) {
  restoreSelectedFile.value = file
  restorePayload.value = restoreDropzoneRef.value?.parsedData ?? null
}

async function confirmRestore() {
  if (!restoreTargetId.value || !restorePayload.value) return
  showRestoreConfirm.value = false
  try {
    await importToStore(restoreTargetId.value, restorePayload.value)
    restoreDialogOpen.value = false
    restoreSelectedFile.value = null
    restorePayload.value = null
  } catch {
    // error toast already shown by useApi
  }
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
        @backup="(id) => handleBackup(id, store.name)"
        @restore="(id) => requestRestore(id)"
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

    <!-- Restore Dialog -->
    <Dialog :open="restoreDialogOpen" aria-modal="true" @close="restoreDialogOpen = false">
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/60" aria-hidden="true" @click="restoreDialogOpen = false" />
        <DialogPanel class="relative bg-surface-card border border-surface-border rounded-lg p-6 w-full max-w-md shadow-xl">
          <DialogTitle class="text-text-emphasis font-semibold text-base mb-2">
            Restore Store
          </DialogTitle>
          <p class="text-text-secondary text-sm mb-4">
            Select a backup file to restore <span class="font-medium text-text-primary">{{ restoreTargetName }}</span>.
          </p>

          <FileImportDropzone
            ref="restoreDropzoneRef"
            class="mb-4"
            @file-selected="onRestoreFileSelected"
          />

          <div v-if="restoreSelectedFile" class="mb-4 text-sm text-text-secondary">
            <span class="font-medium text-text-primary">{{ restoreSelectedFile.name }}</span>
            — {{ restorePayload?.tuples.length ?? 0 }} tuples
          </div>

          <div class="flex justify-end gap-3">
            <AppButton variant="secondary" @click="restoreDialogOpen = false">
              Cancel
            </AppButton>
            <AppButton
              :disabled="!restoreSelectedFile || importing"
              :loading="importing"
              @click="showRestoreConfirm = true"
            >
              Restore
            </AppButton>
          </div>
        </DialogPanel>
      </div>
    </Dialog>

    <ConfirmDialog
      :open="showRestoreConfirm"
      title="Overwrite Store"
      :message="`This will overwrite the model of '${restoreTargetName}'. Continue?`"
      confirm-label="Import"
      variant="info"
      @confirm="confirmRestore"
      @cancel="showRestoreConfirm = false"
    />
  </div>
</template>
