<script setup lang="ts">
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/vue'
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: string | null
  options: Array<{ value: string; label: string }>
  placeholder?: string
  allowFreeText?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const query = ref('')

const filteredOptions = computed(() => {
  if (!query.value) return props.options
  const q = query.value.toLowerCase()
  return props.options.filter((o) => o.label.toLowerCase().includes(q))
})

const selectedLabel = computed(
  () => props.options.find((o) => o.value === props.modelValue)?.label ?? ''
)

function onSelect(value: string) {
  emit('update:modelValue', value)
  query.value = ''
}

function onBlur() {
  if (props.allowFreeText && query.value.trim()) {
    emit('update:modelValue', query.value.trim())
    query.value = ''
  }
}
</script>

<template>
  <Combobox :model-value="props.modelValue" @update:model-value="onSelect">
    <div class="relative">
      <ComboboxInput
        :display-value="() => selectedLabel"
        :placeholder="props.placeholder ?? 'Search...'"
        :class="[
          'w-full px-3 py-2 rounded-md text-sm',
          'bg-surface-card border border-surface-border text-text-primary',
          'placeholder:text-text-secondary',
          'focus:outline-none focus:ring-2 focus:ring-info',
        ]"
        @change="query = $event.target.value"
        @blur="onBlur"
      />
      <ComboboxOptions
        v-if="filteredOptions.length > 0"
        class="absolute z-10 w-full mt-1 bg-surface-elevated border border-surface-border rounded-md shadow-lg overflow-auto max-h-60 focus:outline-none"
      >
        <ComboboxOption
          v-for="option in filteredOptions"
          :key="option.value"
          v-slot="{ active, selected }"
          :value="option.value"
          as="template"
        >
          <li
            :class="[
              'px-3 py-2 text-sm cursor-pointer',
              active ? 'bg-surface-border text-text-emphasis' : 'text-text-primary',
              selected ? 'font-medium' : '',
            ]"
          >
            {{ option.label }}
          </li>
        </ComboboxOption>
      </ComboboxOptions>
    </div>
  </Combobox>
</template>
