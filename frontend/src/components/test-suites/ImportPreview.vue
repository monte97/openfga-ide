<script setup lang="ts">
import { ref, computed } from 'vue'
import { UploadCloud } from 'lucide-vue-next'
import ImportJsonEditor from './ImportJsonEditor.vue'
import type { ImportSuitePayload, ZodIssue } from '@/schemas/suite'
import AppButton from '@/components/common/AppButton.vue'

interface ValidationResult {
  valid: boolean
  errors: ZodIssue[]
  parsed: ImportSuitePayload | null
}

const emit = defineEmits<{
  confirm: [payload: ImportSuitePayload]
  cancel: []
}>()

const jsonText = ref('')
const fileLoaded = ref(false)
const validationResult = ref<ValidationResult | null>(null)
const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const loadError = ref<string | null>(null)

function isJsonFile(file: File): boolean {
  return file.type === 'application/json' || file.name.endsWith('.json')
}

function loadFile(file: File) {
  if (!isJsonFile(file)) {
    loadError.value = 'Only JSON files are supported.'
    return
  }
  loadError.value = null
  const reader = new FileReader()
  reader.onload = (e) => {
    jsonText.value = (e.target?.result as string) ?? ''
    fileLoaded.value = true
  }
  reader.onerror = () => { loadError.value = 'Failed to read file. Please try again.' }
  reader.onabort = () => { loadError.value = 'File read was cancelled.' }
  reader.readAsText(file)
}

function onFileInputChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) loadFile(file)
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}

function onValidationResult(result: ValidationResult) {
  validationResult.value = result
}

const summaryInfo = computed(() => {
  const p = validationResult.value?.parsed
  if (!p) return null
  const groupCount = p.definition?.groups.length ?? 0
  const testCount = p.definition?.groups.reduce((s, g) => s + g.testCases.length, 0) ?? 0
  const tupleCount = (p.definition?.fixture?.tuples as unknown[])?.length ?? 0
  return { name: p.name, groupCount, testCount, tupleCount }
})

const hasSyntaxError = computed(() => {
  if (!fileLoaded.value || !jsonText.value) return false
  try { JSON.parse(jsonText.value); return false } catch { return true }
})

function onImport() {
  if (!validationResult.value?.valid || !validationResult.value.parsed) return
  emit('confirm', validationResult.value.parsed)
}
</script>

<template>
  <!-- File pick phase -->
  <div v-if="!fileLoaded">
    <div
      class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 cursor-pointer transition-colors"
      :class="isDragOver ? 'border-info bg-info/10' : 'border-surface-border hover:border-info/60'"
      data-testid="import-preview-dropzone"
      @click="fileInput?.click()"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        class="hidden"
        data-testid="import-preview-file-input"
        @change="onFileInputChange"
      />
      <UploadCloud class="size-8 text-text-secondary" aria-hidden="true" />
      <span class="text-sm text-text-secondary">Drop a suite JSON file here, or click to browse</span>
    </div>
    <div
      v-if="loadError"
      class="mt-3 flex items-center gap-2 rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
      data-testid="import-preview-load-error"
    >
      {{ loadError }}
    </div>
    <div class="mt-4 flex justify-end">
      <AppButton variant="secondary" data-testid="import-preview-cancel-btn" @click="emit('cancel')">
        Cancel
      </AppButton>
    </div>
  </div>

  <!-- Editor phase -->
  <div v-else class="flex flex-col gap-3">
    <div class="border border-surface-border rounded-lg overflow-hidden" style="height: 360px">
      <ImportJsonEditor
        v-model="jsonText"
        @validation-result="onValidationResult"
      />
    </div>

    <!-- Validation banner -->
    <div aria-live="polite" aria-atomic="true">
      <!-- JSON syntax error -->
      <div
        v-if="hasSyntaxError"
        class="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning"
        data-testid="import-preview-syntax-banner"
      >
        Fix JSON syntax errors first
      </div>

      <!-- Zod errors -->
      <div
        v-else-if="validationResult && !validationResult.valid"
        class="flex items-center gap-2 rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
        data-testid="import-preview-error-banner"
      >
        {{ validationResult.errors.length }} error{{ validationResult.errors.length !== 1 ? 's' : '' }} found — fix to enable import
      </div>

      <!-- Valid -->
      <div
        v-else-if="validationResult?.valid && summaryInfo"
        class="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        data-testid="import-preview-valid-banner"
      >
        Will create: {{ summaryInfo.name }} — {{ summaryInfo.groupCount }} groups, {{ summaryInfo.testCount }} tests, fixture with {{ summaryInfo.tupleCount }} tuples
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex justify-end gap-2">
      <AppButton
        variant="secondary"
        data-testid="import-preview-cancel-btn"
        @click="emit('cancel')"
      >
        Cancel
      </AppButton>
      <AppButton
        variant="primary"
        data-testid="import-preview-confirm-btn"
        :disabled="!validationResult?.valid"
        @click="onImport"
      >
        Import
      </AppButton>
    </div>
  </div>
</template>
