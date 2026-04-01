<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus } from 'lucide-vue-next'
import { useSuiteStore } from '@/stores/suites'
import type { SuiteListItem } from '@/stores/suites'
import { useToast } from '@/composables/useToast'
import AppTabs from '@/components/common/AppTabs.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SuiteList from '@/components/test-suites/SuiteList.vue'
import CiIntegrationDialog from '@/components/test-suites/CiIntegrationDialog.vue'
import ImportPreview from '@/components/test-suites/ImportPreview.vue'
import SuiteEditor from './SuiteEditor.vue'
import type { ImportSuitePayload } from '@/schemas/suite'

const suiteStore = useSuiteStore()
const toast = useToast()

// Tabs
const tabs = [
  { key: 'suites', label: 'Suites' },
  { key: 'editor', label: 'Editor' },
]
const activeTab = ref('suites')
const editorSuite = ref<SuiteListItem | null>(null)

onMounted(() => suiteStore.fetchSuites())

// Create form
const showCreateForm = ref(false)
const newName = ref('')
const newDescription = ref('')
const newTags = ref('')
const createError = ref('')
const creating = ref(false)

function openCreateForm() {
  showCreateForm.value = true
  newName.value = ''
  newDescription.value = ''
  newTags.value = ''
  createError.value = ''
}

function cancelCreate() {
  showCreateForm.value = false
}

async function submitCreate() {
  if (!newName.value.trim()) {
    createError.value = 'Name is required'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const tags = newTags.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    await suiteStore.createSuite({
      name: newName.value.trim(),
      description: newDescription.value.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    })
    showCreateForm.value = false
  } catch (err) {
    createError.value = (err as Error).message
  } finally {
    creating.value = false
  }
}

// Delete
const suiteToDelete = ref<SuiteListItem | null>(null)
const deleting = ref(false)

function onDeleteRequested(suite: SuiteListItem) {
  suiteToDelete.value = suite
}

function cancelDelete() {
  suiteToDelete.value = null
}

async function confirmDelete() {
  if (!suiteToDelete.value) return
  deleting.value = true
  try {
    await suiteStore.deleteSuite(suiteToDelete.value.id)
    suiteToDelete.value = null
  } catch (err) {
    toast.show({ type: 'error', message: (err as Error).message || 'Failed to delete suite' })
  } finally {
    deleting.value = false
  }
}

// Open in editor
function openInEditor(suite: SuiteListItem) {
  editorSuite.value = suite
  activeTab.value = 'editor'
}

// Export
function onExportSuite(suite: SuiteListItem) {
  void suiteStore.exportSuite(suite.id, suite.name)
}

// CI Integration
const ciDialogSuite = ref<SuiteListItem | null>(null)

function onCiIntegration(suite: SuiteListItem) {
  ciDialogSuite.value = suite
}

// Import
const showImportPreview = ref(false)

async function onImportConfirm(payload: ImportSuitePayload) {
  try {
    await suiteStore.importSuite(payload)
    showImportPreview.value = false
  } catch {
    // error already surfaced via useApi toast
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <AppTabs v-model="activeTab" :tabs="tabs">
      <!-- Suites tab -->
      <template #suites>
        <!-- Import Preview (replaces suite list) -->
        <ImportPreview
          v-if="showImportPreview"
          class="pt-4"
          @confirm="onImportConfirm"
          @cancel="showImportPreview = false"
        />

        <div v-else class="pt-4">
          <!-- Header row -->
          <div class="flex items-center justify-between mb-4 max-w-3xl">
            <h1 class="text-lg font-semibold text-text-emphasis">Test Suites</h1>
            <div class="flex items-center gap-2">
              <AppButton variant="secondary" @click="showImportPreview = true">
                Import Suite
              </AppButton>
              <AppButton
                v-if="suiteStore.suites.length > 0"
                variant="primary"
                @click="openCreateForm"
              >
                <Plus class="size-4" aria-hidden="true" />
                New Suite
              </AppButton>
            </div>
          </div>

          <!-- Fetch error banner -->
          <div
            v-if="suiteStore.error"
            role="alert"
            class="max-w-3xl mb-4 flex items-center gap-2 rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
          >
            {{ suiteStore.error }}
          </div>

          <!-- Create form panel -->
          <div
            v-if="showCreateForm"
            class="max-w-3xl mb-4 bg-surface-card border border-surface-border rounded-lg p-4"
            aria-label="Create suite form"
          >
            <h2 class="text-sm font-semibold text-text-emphasis mb-3">New Suite</h2>
            <div class="flex flex-col gap-3">
              <div>
                <label class="block text-xs text-text-secondary mb-1" for="suite-name">Name <span class="text-error">*</span></label>
                <AppInput
                  id="suite-name"
                  v-model="newName"
                  placeholder="e.g. Document access policies"
                  :error="createError"
                />
              </div>
              <div>
                <label class="block text-xs text-text-secondary mb-1" for="suite-description">Description</label>
                <AppInput
                  id="suite-description"
                  v-model="newDescription"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label class="block text-xs text-text-secondary mb-1" for="suite-tags">Tags <span class="text-text-secondary">(comma-separated)</span></label>
                <AppInput
                  id="suite-tags"
                  v-model="newTags"
                  placeholder="e.g. auth, critical"
                />
              </div>
              <div class="flex gap-2 justify-end">
                <AppButton variant="secondary" @click="cancelCreate">Cancel</AppButton>
                <AppButton variant="primary" :loading="creating" @click="submitCreate">Create</AppButton>
              </div>
            </div>
          </div>

          <!-- Suite list / empty state / skeleton -->
          <SuiteList
            :suites="suiteStore.suites"
            :loading="suiteStore.loading"
            @delete="onDeleteRequested"
            @open="openInEditor"
            @create="openCreateForm"
            @export="onExportSuite"
            @ci-integration="onCiIntegration"
          />
        </div>
      </template>

      <!-- Editor tab -->
      <template #editor>
        <div class="h-full">
          <SuiteEditor v-if="editorSuite" :suite="editorSuite" />
          <div v-else class="pt-4 text-text-secondary text-sm">
            Select a suite from the Suites tab to open it here
          </div>
        </div>
      </template>
    </AppTabs>

    <!-- CI Integration dialog -->
    <CiIntegrationDialog
      :open="!!ciDialogSuite"
      :suite="ciDialogSuite"
      @close="ciDialogSuite = null"
    />

    <!-- Delete confirmation dialog -->
    <ConfirmDialog
      :open="!!suiteToDelete"
      :title="`Delete '${suiteToDelete?.name ?? ''}'?`"
      message="This will permanently delete the suite and all its test cases. This action cannot be undone."
      confirm-label="Delete"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
