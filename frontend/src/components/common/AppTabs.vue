<script setup lang="ts">
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { computed } from 'vue'

const props = defineProps<{
  tabs: Array<{ key: string; label: string }>
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedIndex = computed(() =>
  props.tabs.findIndex((t) => t.key === props.modelValue)
)

function onTabChange(index: number) {
  emit('update:modelValue', props.tabs[index].key)
}
</script>

<template>
  <TabGroup :selected-index="selectedIndex" @change="onTabChange">
    <TabList class="flex border-b border-surface-border">
      <Tab
        v-for="tab in props.tabs"
        :key="tab.key"
        v-slot="{ selected }"
        as="template"
      >
        <button
          :class="[
            'px-4 py-2 text-sm font-medium transition-colors -mb-px',
            'focus:outline-none focus:ring-2 focus:ring-info focus:ring-inset',
            selected
              ? 'border-b-2 border-info text-text-emphasis'
              : 'text-text-secondary hover:text-text-primary',
          ]"
        >
          {{ tab.label }}
        </button>
      </Tab>
    </TabList>
    <TabPanels>
      <TabPanel v-for="tab in props.tabs" :key="tab.key">
        <slot :name="tab.key" />
      </TabPanel>
    </TabPanels>
  </TabGroup>
</template>
