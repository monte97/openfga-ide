<script setup lang="ts">
import { List } from 'lucide-vue-next'
import { useQueryStore } from '@/stores/queries'
import { useConnectionStore } from '@/stores/connection'
import { useModelOptions } from '@/composables/useModelOptions'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppButton from '@/components/common/AppButton.vue'
import TypeBadge from '@/components/common/TypeBadge.vue'

const queryStore = useQueryStore()
const connectionStore = useConnectionStore()
const { relationOptions, typeOptions } = useModelOptions()

function handleSubmit() {
  queryStore.listObjects(connectionStore.storeId)
}

function extractTypeName(identifier: string): string {
  return identifier.split(':')[0] || identifier
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end gap-3">
      <div class="flex-1">
        <label class="text-sm text-text-secondary mb-1 block">User</label>
        <AppInput
          v-model="queryStore.listObjectsInputs.user"
          :monospace="true"
          placeholder="user:alice"
          @keydown.enter="handleSubmit"
        />
      </div>
      <div class="flex-1">
        <label class="text-sm text-text-secondary mb-1 block">Relation</label>
        <AppSelect
          v-model="queryStore.listObjectsInputs.relation"
          :options="relationOptions"
          :placeholder="relationOptions.length ? 'Select relation...' : 'Load model first'"
        />
      </div>
      <div class="flex-1">
        <label class="text-sm text-text-secondary mb-1 block">Type</label>
        <AppSelect
          v-model="queryStore.listObjectsInputs.type"
          :options="typeOptions"
          :placeholder="typeOptions.length ? 'Select type...' : 'Load model first'"
        />
      </div>
      <AppButton
        variant="primary"
        :loading="queryStore.listObjectsLoading"
        :disabled="!queryStore.listObjectsInputs.user || !queryStore.listObjectsInputs.relation || !queryStore.listObjectsInputs.type"
        @click="handleSubmit"
      >
        <List class="size-4" />
        {{ queryStore.listObjectsLoading ? 'Listing...' : 'List Objects' }}
      </AppButton>
    </div>

    <div v-if="queryStore.listObjectsResult !== null">
      <div v-if="queryStore.listObjectsResult.length === 0" class="text-text-secondary text-sm">
        No objects found
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <div
          v-for="obj in queryStore.listObjectsResult"
          :key="obj"
          class="flex items-center gap-1.5"
        >
          <TypeBadge :type-name="extractTypeName(obj)" />
          <span class="font-mono text-sm text-text-primary">{{ obj }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
