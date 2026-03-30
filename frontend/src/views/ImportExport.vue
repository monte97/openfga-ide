<script setup lang="ts">
import { ref } from 'vue'
import { ArrowUpDown } from 'lucide-vue-next'
import { useConnectionStore } from '@/stores/connection'
import { useImportExportStore } from '@/stores/importExport'
import { useImport } from '@/composables/useImport'
import EmptyState from '@/components/common/EmptyState.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FileImportDropzone from '@/components/common/FileImportDropzone.vue'

const connectionStore = useConnectionStore()
const importExportStore = useImportExportStore()
const { importing, importToNewStore, importToCurrentStore } = useImport()

const selectedFile = ref<File | null>(null)
const parsedPayload = ref<{ model: Record<string, unknown> | null; tuples: Array<{ user: string; relation: string; object: string }> } | null>(null)
const dropzoneRef = ref<InstanceType<typeof FileImportDropzone> | null>(null)

const showNewStoreForm = ref(false)
const newStoreName = ref('')
const showImportCurrentConfirm = ref(false)

function onFileSelected(file: File) {
  selectedFile.value = file
  parsedPayload.value = dropzoneRef.value?.parsedData ?? null
}

function resetImportState() {
  selectedFile.value = null
  parsedPayload.value = null
  showNewStoreForm.value = false
  newStoreName.value = ''
  showImportCurrentConfirm.value = false
}

async function submitImportToNew() {
  if (!newStoreName.value.trim() || !parsedPayload.value) return
  try {
    await importToNewStore(newStoreName.value.trim(), parsedPayload.value)
    resetImportState()
  } catch {
    // error toast already shown by useApi
  }
}

async function confirmImportToCurrent() {
  if (!parsedPayload.value) return
  showImportCurrentConfirm.value = false
  try {
    await importToCurrentStore(parsedPayload.value)
    resetImportState()
  } catch {
    // error toast already shown by useApi
  }
}
</script>

<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-xl font-semibold text-text-emphasis mb-6">Import / Export</h1>

    <EmptyState
      v-if="!connectionStore.storeId"
      :icon="ArrowUpDown"
      title="No store selected"
      message="Select a store to get started."
    />

    <template v-else>
      <div class="mb-4 p-4 rounded-lg border border-surface-border bg-surface-card">
        <div class="text-sm text-text-secondary mb-1">Active store</div>
        <div class="font-medium text-text-emphasis">{{ connectionStore.activeStoreName ?? connectionStore.storeId }}</div>
        <div class="font-mono text-xs text-text-secondary mt-1">{{ connectionStore.storeId }}</div>
      </div>

      <!-- Export section -->
      <div class="mb-4 p-4 rounded-lg border border-surface-border bg-surface-card">
        <h2 class="text-sm font-semibold text-text-primary mb-1">Export</h2>
        <p class="text-sm text-text-secondary mb-4">
          Download the store's authorization model and all tuples as a single JSON file.
        </p>
        <div v-if="importExportStore.error" class="mb-3 text-sm text-error">
          {{ importExportStore.error }}
        </div>
        <AppButton
          :loading="importExportStore.loading"
          :disabled="importExportStore.loading"
          @click="importExportStore.exportStore(connectionStore.storeId, connectionStore.activeStoreName ?? connectionStore.storeId)"
        >
          <ArrowUpDown class="size-4" />
          Export
        </AppButton>
      </div>

      <!-- Import section -->
      <div class="p-4 rounded-lg border border-surface-border bg-surface-card">
        <h2 class="text-sm font-semibold text-text-primary mb-1">Import</h2>
        <p class="text-sm text-text-secondary mb-4">
          Import a JSON backup file to restore a store's model and tuples.
        </p>

        <FileImportDropzone
          ref="dropzoneRef"
          class="mb-4"
          @file-selected="onFileSelected"
        />

        <div v-if="selectedFile" class="mb-4 text-sm text-text-secondary">
          <span class="font-medium text-text-primary">{{ selectedFile.name }}</span>
          —
          {{ parsedPayload?.tuples.length ?? 0 }} tuples
        </div>

        <div v-if="selectedFile" class="flex gap-2 flex-wrap">
          <AppButton
            :disabled="importing"
            :loading="importing"
            @click="showNewStoreForm = !showNewStoreForm"
          >
            Import to New Store
          </AppButton>
          <AppButton
            variant="secondary"
            :disabled="importing"
            @click="showImportCurrentConfirm = true"
          >
            Import to Current Store
          </AppButton>
        </div>

        <div v-if="showNewStoreForm" class="mt-4 p-4 rounded-lg border border-surface-border bg-surface-elevated">
          <h3 class="text-sm font-medium text-text-primary mb-3">New Store Name</h3>
          <form class="flex items-end gap-3" @submit.prevent="submitImportToNew">
            <AppInput
              v-model="newStoreName"
              placeholder="Store name"
              class="flex-1"
              autofocus
            />
            <AppButton
              type="submit"
              :loading="importing"
              :disabled="!newStoreName.trim() || importing"
            >
              Import
            </AppButton>
            <AppButton variant="secondary" type="button" @click="showNewStoreForm = false">
              Cancel
            </AppButton>
          </form>
        </div>
      </div>
    </template>

    <ConfirmDialog
      :open="showImportCurrentConfirm"
      title="Overwrite Current Store"
      message="This will overwrite the current model. Continue?"
      confirm-label="Import"
      variant="info"
      @confirm="confirmImportToCurrent"
      @cancel="showImportCurrentConfirm = false"
    />
  </div>
</template>
