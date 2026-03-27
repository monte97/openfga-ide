<script setup lang="ts">
import { ref, computed } from 'vue'
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/vue'
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '@/stores/connection'
import { useStoresStore } from '@/stores/stores'

const connectionStore = useConnectionStore()
const storesStore = useStoresStore()
const { stores, storeId, activeStoreName } = storeToRefs(connectionStore)

const query = ref('')

const filteredStores = computed(() => {
  const storeList = stores.value ?? []
  if (!query.value) return storeList
  const q = query.value.toLowerCase()
  return storeList.filter((s) => s.name.toLowerCase().includes(q))
})

function onSelect(id: string | null) {
  if (id) storesStore.selectStore(id)
  query.value = ''
}
</script>

<template>
  <Combobox :model-value="storeId" @update:model-value="onSelect">
    <div class="relative">
      <ComboboxInput
        :display-value="() => activeStoreName ?? ''"
        placeholder="Select a store..."
        :class="[
          'w-48 px-3 py-1.5 rounded-md text-sm bg-surface-elevated border border-surface-border',
          'text-text-primary placeholder:text-text-secondary animate-pulse-placeholder',
          'focus:outline-none focus:ring-2 focus:ring-info',
          !storeId ? 'placeholder:animate-pulse' : '',
        ]"
        @change="query = $event.target.value"
      />
      <ComboboxOptions
        v-if="filteredStores.length > 0"
        class="absolute right-0 top-full mt-1 w-64 bg-surface-elevated border border-surface-border rounded-md shadow-lg overflow-auto max-h-48 z-50 focus:outline-none"
      >
        <ComboboxOption
          v-for="store in filteredStores"
          :key="store.id"
          v-slot="{ active, selected }"
          :value="store.id"
          as="template"
        >
          <li
            :class="[
              'px-3 py-2 text-sm cursor-pointer',
              active ? 'bg-surface-border text-text-emphasis' : 'text-text-primary',
              selected ? 'font-medium' : '',
            ]"
          >
            <span class="block truncate">{{ store.name }}</span>
            <span class="block text-xs text-text-secondary font-mono">{{ store.id }}</span>
          </li>
        </ComboboxOption>
      </ComboboxOptions>
    </div>
  </Combobox>
</template>
