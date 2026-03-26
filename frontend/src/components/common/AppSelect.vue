<script setup lang="ts">
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue'
import { ChevronDown, Check } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string | null
  options: Array<{ value: string; label: string }>
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedLabel = computed(
  () => props.options.find((o) => o.value === props.modelValue)?.label ?? props.placeholder ?? 'Select...'
)
</script>

<template>
  <Listbox :model-value="props.modelValue" @update:model-value="emit('update:modelValue', $event)">
    <div class="relative">
      <ListboxButton
        :class="[
          'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm',
          'bg-surface-card border border-surface-border text-text-primary',
          'focus:outline-none focus:ring-2 focus:ring-info',
          !props.modelValue ? 'text-text-secondary' : '',
        ]"
      >
        <span>{{ selectedLabel }}</span>
        <ChevronDown class="size-4 text-text-secondary" aria-hidden="true" />
      </ListboxButton>
      <ListboxOptions
        class="absolute z-10 w-full mt-1 bg-surface-elevated border border-surface-border rounded-md shadow-lg overflow-auto max-h-60 focus:outline-none"
      >
        <ListboxOption
          v-for="option in props.options"
          :key="option.value"
          v-slot="{ active, selected }"
          :value="option.value"
          as="template"
        >
          <li
            :class="[
              'flex items-center justify-between px-3 py-2 text-sm cursor-pointer',
              active ? 'bg-surface-border text-text-emphasis' : 'text-text-primary',
            ]"
          >
            <span>{{ option.label }}</span>
            <Check v-if="selected" class="size-4 text-info" aria-hidden="true" />
          </li>
        </ListboxOption>
      </ListboxOptions>
    </div>
  </Listbox>
</template>
