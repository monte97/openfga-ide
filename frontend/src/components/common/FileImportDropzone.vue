<script setup lang="ts">
import { ref } from 'vue'
import { UploadCloud } from 'lucide-vue-next'

interface ImportPayload {
  storeName?: string
  model: Record<string, unknown> | null
  tuples: Array<{ user: string; relation: string; object: string }>
}

withDefaults(defineProps<{
  accept?: string
  disabled?: boolean
}>(), {
  accept: 'application/json',
  disabled: false,
})

const emit = defineEmits<{
  'file-selected': [file: File]
  'validation-error': [message: string]
}>()

const isDragOver = ref(false)
const error = ref<string | null>(null)
const parsedData = ref<ImportPayload | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

defineExpose({ parsedData })

function setError(msg: string) {
  error.value = msg
  emit('validation-error', msg)
}

function validateAndEmit(file: File) {
  if (!file.name.endsWith('.json')) {
    setError('Only JSON files are accepted')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setError('Invalid JSON file')
      return
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('model' in parsed) ||
      !('tuples' in parsed) ||
      !Array.isArray((parsed as Record<string, unknown>).tuples)
    ) {
      setError('Invalid format: file must contain "model" and "tuples" keys')
      return
    }
    error.value = null
    parsedData.value = parsed as ImportPayload
    emit('file-selected', file)
  }
  reader.readAsText(file)
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) validateAndEmit(file)
}

function onFileInputChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) validateAndEmit(file)
}
</script>

<template>
  <div
    class="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors text-center select-none"
    :class="[
      isDragOver ? 'border-info bg-info/10' : 'border-surface-border',
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-info/60',
    ]"
    @click="!disabled && fileInput?.click()"
    @dragover.prevent="!disabled && (isDragOver = true)"
    @dragleave="isDragOver = false"
    @drop.prevent="!disabled && onDrop($event)"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      class="hidden"
      :disabled="disabled"
      @change="onFileInputChange"
    />
    <slot>
      <UploadCloud class="size-8 text-text-secondary" />
      <span class="text-sm text-text-secondary">Drop a JSON file here, or click to browse</span>
    </slot>
    <p v-if="error" class="text-error text-sm mt-2">{{ error }}</p>
  </div>
</template>
