<script setup lang="ts">
import { computed } from 'vue'
import { Trash2, Archive } from 'lucide-vue-next'
import AppButton from '@/components/common/AppButton.vue'

interface StoreInfo {
  id: string
  name: string
  created_at: string
  updated_at: string
}

const props = defineProps<{
  store: StoreInfo
  isActive: boolean
}>()

const emit = defineEmits<{
  select: []
  delete: []
}>()

const formattedDate = computed(() =>
  new Date(props.store.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
)

const truncatedId = computed(() =>
  props.store.id.length > 20 ? `${props.store.id.slice(0, 20)}…` : props.store.id
)

function onDelete(e: Event) {
  e.stopPropagation()
  emit('delete')
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="group relative flex items-center justify-between gap-4 rounded-lg border p-4 cursor-pointer transition-colors bg-surface-card hover:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-info"
    :class="props.isActive ? 'border-info' : 'border-surface-border'"
    @click="emit('select')"
    @keydown.enter="emit('select')"
    @keydown.space.prevent="emit('select')"
  >
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2 mb-1">
        <span
          v-if="props.isActive"
          class="inline-block size-2 rounded-full bg-info flex-shrink-0"
          aria-label="Active store"
        />
        <span class="font-medium text-text-emphasis truncate">{{ props.store.name }}</span>
      </div>
      <div class="font-mono text-xs text-text-secondary truncate">{{ truncatedId }}</div>
      <div class="text-xs text-text-secondary mt-1">Created {{ formattedDate }}</div>
    </div>

    <div class="flex items-center gap-2 flex-shrink-0">
      <AppButton
        variant="secondary"
        disabled
        title="Coming in Phase 2"
        @click.stop
        @keydown.stop
      >
        <Archive class="size-4" />
        Backup
      </AppButton>
      <AppButton variant="danger" @click="onDelete" @keydown.stop>
        <Trash2 class="size-4" />
        Delete
      </AppButton>
    </div>
  </div>
</template>
