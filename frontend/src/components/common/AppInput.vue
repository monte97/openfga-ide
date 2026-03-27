<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  monospace?: boolean
  error?: string
  placeholder?: string
  type?: string
  id?: string
}>(), {
  modelValue: '',
  monospace: false,
  error: '',
  type: 'text',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': []
}>()

const inputId = computed(() => props.id ?? `input-${Math.random().toString(36).slice(2, 9)}`)
const errorId = computed(() => `${inputId.value}-error`)
</script>

<template>
  <div class="flex flex-col gap-1">
    <input
      :id="inputId"
      :value="props.modelValue"
      :type="props.type"
      :placeholder="props.placeholder"
      :aria-describedby="props.error ? errorId : undefined"
      :aria-invalid="props.error ? 'true' : undefined"
      :class="[
        'w-full px-3 py-2 rounded-md text-sm bg-surface-card border transition-colors',
        'text-text-primary placeholder:text-text-secondary',
        'focus:outline-none focus:ring-2 focus:ring-info',
        props.error ? 'border-error' : 'border-surface-border',
        props.monospace ? 'font-mono' : '',
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="emit('blur')"
    />
    <span
      v-if="props.error"
      :id="errorId"
      class="text-xs text-error"
    >{{ props.error }}</span>
  </div>
</template>
