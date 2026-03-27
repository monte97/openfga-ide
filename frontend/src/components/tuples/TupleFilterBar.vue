<script setup lang="ts">
import { watch, computed, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import AppButton from '@/components/common/AppButton.vue'
import { useTupleStore } from '@/stores/tuples'
import { useConnectionStore } from '@/stores/connection'

const tupleStore = useTupleStore()
const connectionStore = useConnectionStore()

const hasFilters = computed(() =>
  !!(tupleStore.filterType || tupleStore.filterRelation || tupleStore.filterUser),
)
let debounceTimer: ReturnType<typeof setTimeout> | undefined

function onFilterChange() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (connectionStore.storeId) {
      tupleStore.resetTuples()
      tupleStore.fetchTuples(connectionStore.storeId)
    }
  }, 300)
}

function clearAll() {
  tupleStore.clearFilters()
  if (connectionStore.storeId) {
    tupleStore.resetTuples()
    tupleStore.fetchTuples(connectionStore.storeId)
  }
}

watch(
  () => [tupleStore.filterType, tupleStore.filterRelation, tupleStore.filterUser],
  () => onFilterChange(),
)

onUnmounted(() => clearTimeout(debounceTimer))
</script>

<template>
  <div class="flex items-center gap-3 mb-4">
    <div class="relative flex-1">
      <input
        v-model="tupleStore.filterType"
        placeholder="Filter by type..."
        class="w-full px-3 py-2 pr-8 rounded-md text-sm bg-surface-card border border-surface-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-info font-mono"
      />
      <button
        v-if="tupleStore.filterType"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
        aria-label="Clear type filter"
        @click="tupleStore.filterType = ''"
      >
        <X class="size-3.5" />
      </button>
    </div>
    <div class="relative flex-1">
      <input
        v-model="tupleStore.filterRelation"
        placeholder="Filter by relation..."
        class="w-full px-3 py-2 pr-8 rounded-md text-sm bg-surface-card border border-surface-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-info font-mono"
      />
      <button
        v-if="tupleStore.filterRelation"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
        aria-label="Clear relation filter"
        @click="tupleStore.filterRelation = ''"
      >
        <X class="size-3.5" />
      </button>
    </div>
    <div class="relative flex-1">
      <input
        v-model="tupleStore.filterUser"
        placeholder="Filter by user..."
        class="w-full px-3 py-2 pr-8 rounded-md text-sm bg-surface-card border border-surface-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-info font-mono"
      />
      <button
        v-if="tupleStore.filterUser"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
        aria-label="Clear user filter"
        @click="tupleStore.filterUser = ''"
      >
        <X class="size-3.5" />
      </button>
    </div>
    <AppButton
      v-if="hasFilters"
      variant="secondary"
      @click="clearAll"
    >
      Clear All
    </AppButton>
  </div>
</template>
